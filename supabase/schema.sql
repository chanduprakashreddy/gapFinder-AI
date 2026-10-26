-- GapFinder AI schema. Run once in the Supabase SQL editor.
-- Every table is protected by per-user row-level security. API routes use a client
-- built from the caller's JWT, so RLS is enforced. The service key is used only by `npm run seed`.

create extension if not exists vector;

create table subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  exam_date date,
  daily_minutes int not null default 60 check (daily_minutes between 10 and 720),
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('syllabus','notes','textbook','past_paper')),
  page_count int,
  char_count int,
  chunk_count int not null default 0,
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  description text,
  weight numeric not null default 1 check (weight > 0),
  position int not null default 0,
  embedding vector(768), -- 768 for Gemini text-embedding-004 (or 1536 if using OpenAI text-embedding-3-small)
  created_at timestamptz not null default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  topic_score real,                       -- cosine similarity of chunk to its linked topic (kept so linking can be measured)
  kind text not null,
  heading text,
  content text not null,
  page int,
  position int,
  embedding vector(768) not null -- 768 for Gemini text-embedding-004 (or 1536 if using OpenAI text-embedding-3-small)
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  chunk_id uuid references chunks(id) on delete set null,
  question text not null,
  options jsonb not null,
  correct_index int not null check (correct_index between 0 and 3),
  difficulty int not null check (difficulty between 1 and 3),
  evidence text not null,                 -- verbatim passage excerpt that proves the answer
  created_at timestamptz not null default now()
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_id uuid not null unique references questions(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  selected_index int not null,
  correct boolean not null,
  difficulty int not null,
  explanation text,
  created_at timestamptz not null default now()
);

create index on documents (subject_id);
create index on topics (subject_id);
create index on chunks (subject_id, kind);
create index on chunks (topic_id);
create index on chunks using hnsw (embedding vector_cosine_ops);
create index on questions (quiz_id);
create index on attempts (subject_id, created_at);

do $$
declare t text;
begin
  foreach t in array array['subjects','documents','topics','chunks','quizzes','questions','attempts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- RETRIEVAL: the only function that supplies facts to the LLM. Study material only (not syllabus, not past-paper questions).
create or replace function match_chunks(
  query_embedding vector(768), p_subject uuid, match_count int default 6, p_topic uuid default null
) returns table (id uuid, document_id uuid, topic_id uuid, heading text, content text, page int, similarity float)
language sql stable security invoker as $$
  select c.id, c.document_id, c.topic_id, c.heading, c.content, c.page,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.user_id = auth.uid() and c.subject_id = p_subject
    and c.kind in ('notes','textbook')
    and (p_topic is null or c.topic_id = p_topic)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- TOPIC LINKING: assign every non-syllabus chunk to its nearest topic and store the score.
create or replace function link_chunks(p_subject uuid, p_min real default 0.25) returns int
language plpgsql security invoker as $$
declare n int;
begin
  with best as (
    select c.id as chunk_id, x.topic_id, x.sim
    from chunks c
    cross join lateral (
      select t.id as topic_id, 1 - (t.embedding <=> c.embedding) as sim
      from topics t
      where t.subject_id = p_subject and t.user_id = auth.uid() and t.embedding is not null
      order by t.embedding <=> c.embedding
      limit 1
    ) x
    where c.subject_id = p_subject and c.user_id = auth.uid() and c.kind <> 'syllabus'
  )
  update chunks c
     set topic_id = case when b.sim >= p_min then b.topic_id else null end,
         topic_score = b.sim
    from best b
   where c.id = b.chunk_id;
  get diagnostics n = row_count;
  return n;
end $$;
