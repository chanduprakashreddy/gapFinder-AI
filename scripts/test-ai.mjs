import fs from 'fs';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed, generateObject } from 'ai';
import { z } from 'zod';

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[k] = v;
  }
});

console.log('GEMINI_API_KEY prefix:', process.env.GEMINI_API_KEY?.slice(0, 8));
console.log('CHAT_MODEL:', process.env.CHAT_MODEL);

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function run() {
  console.log('Testing chat model...');
  try {
    const chatRes = await generateObject({
      model: google(process.env.CHAT_MODEL || 'gemini-2.5-flash'),
      schema: z.object({ answer: z.string() }),
      prompt: 'Hello! Respond with a simple greeting.',
    });
    console.log('Chat model result:', chatRes.object);
  } catch (e) {
    console.error('Chat model error:', e);
  }

  console.log('\nTesting embedding model: gemini-embedding-001 ...');
  try {
    const embRes = await embed({
      model: google.textEmbeddingModel('gemini-embedding-001', { outputDimensionality: 768 }),
      value: 'hello world',
    });
    console.log('Embedding result dims:', embRes.embedding.length);
  } catch (e) {
    console.error('gemini-embedding-001 error:', e.message || e);
  }

  console.log('\nTesting embedding model: text-embedding-004 ...');
  try {
    const embRes2 = await embed({
      model: google.textEmbeddingModel('text-embedding-004', { outputDimensionality: 768 }),
      value: 'hello world',
    });
    console.log('text-embedding-004 result dims:', embRes2.embedding.length);
  } catch (e) {
    console.error('text-embedding-004 error:', e.message || e);
  }
}

run();
