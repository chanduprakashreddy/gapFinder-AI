import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[k] = v;
  }
});

import { ingestDocument } from '../lib/ingest.js';
import { createQuiz } from '../lib/quiz.js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFullFlow() {
  console.log('=== STEP 1: Authenticating ===');
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  });
  if (authErr) throw authErr;
  console.log('Logged in as user:', auth.user.id);

  console.log('\n=== STEP 2: Creating a new test subject ===');
  const { data: sub, error: subErr } = await sb.from('subjects').insert({
    user_id: auth.user.id,
    name: 'Biochemistry 202: Enzymes and Metabolism',
    daily_minutes: 60,
  }).select('id').single();
  if (subErr) throw subErr;
  console.log('Subject created:', sub.id);

  console.log('\n=== STEP 3: Ingesting study material as "syllabus" (testing dual topic extraction + passage chunking) ===');
  const docContent = `
# Unit 1: Enzyme Catalysis and Kinetics
Enzymes are biological catalysts that increase the rate of chemical reactions without being consumed in the process.
They function by lowering the activation energy required for a reaction to proceed from substrate to transition state.
The Michaelis-Menten model describes the velocity of an enzymatic reaction as a function of substrate concentration.
The Michaelis constant, Km, represents the substrate concentration at which the reaction velocity is half of Vmax.
Competitive inhibitors bind directly to the active site of the enzyme and increase the apparent Km without altering Vmax.
Noncompetitive inhibitors bind to an allosteric site and decrease Vmax without changing Km.

# Unit 2: Cellular Metabolism and ATP Synthesis
Glycolysis occurs in the cytosol and converts one glucose molecule into two pyruvate molecules, yielding a net of 2 ATP and 2 NADH.
Under aerobic conditions, pyruvate enters the mitochondrial matrix where pyruvate dehydrogenase converts it into acetyl-CoA.
The citric acid cycle oxidizes acetyl-CoA to produce CO2, transferring high-energy electrons to NAD+ and FAD to form NADH and FADH2.
Oxidative phosphorylation uses the electron transport chain across the inner mitochondrial membrane to pump protons into the intermembrane space.
ATP synthase utilizes the resulting proton-motive force to synthesize ATP from ADP and inorganic phosphate.
`;

  const ingestRes = await ingestDocument(sb, auth.user.id, {
    subjectId: sub.id,
    kind: 'syllabus',
    title: 'Biochemistry Course Pack',
    pages: [{ page: 1, text: docContent }],
  });
  console.log('Ingest result:', ingestRes);

  console.log('\n=== STEP 4: Verifying chunks and topics in Database ===');
  const { data: topics } = await sb.from('topics').select('id, name, weight').eq('subject_id', sub.id);
  console.log(`Topics count: ${topics?.length}`);
  topics?.forEach(t => console.log(`  - ${t.name}`));

  const { data: chunks } = await sb.from('chunks').select('id, heading, topic_id, kind').eq('subject_id', sub.id);
  console.log(`Chunks count: ${chunks?.length}`);
  chunks?.forEach(c => console.log(`  - [kind: ${c.kind}] topic_id: ${c.topic_id} | ${c.heading}`));

  console.log('\n=== STEP 5: Generating Quiz Questions ===');
  const quiz = await createQuiz(sb, auth.user.id, sub.id, { count: 3 });
  console.log(`Quiz created successfully! Total questions: ${quiz.questions.length}`);
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    console.log(`\nQuestion ${i + 1} (${q.topicName}, Difficulty ${q.difficulty}):`);
    console.log(`Q: ${q.question}`);
    console.log(`Options: ${q.options.map((o, idx) => `[${String.fromCharCode(65 + idx)}] ${o}`).join('  ')}`);
    console.log(`Source Citation: ${q.citation.title} › ${q.citation.heading}`);
  }

  console.log('\n=== STEP 6: Cleaning up test subject ===');
  await sb.from('subjects').delete().eq('id', sub.id);
  console.log('Cleaned up test subject successfully.');
}

testFullFlow().catch(console.error);
