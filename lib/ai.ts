import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';

const isGoogle = () => Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const googleProvider = () =>
  createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

const openaiProvider = () =>
  createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

export const chatModel = () => {
  if (isGoogle()) {
    return googleProvider()(process.env.CHAT_MODEL ?? 'gemini-2.5-flash');
  }
  return openaiProvider()(process.env.CHAT_MODEL ?? 'gpt-4o-mini');
};

const embedModel = () => {
  if (isGoogle()) {
    return googleProvider().textEmbeddingModel('gemini-embedding-001', {
      outputDimensionality: 768,
    });
  }
  return openaiProvider().embedding('text-embedding-3-small');
};

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const batchSize = isGoogle() ? 100 : 256;
  for (let i = 0; i < texts.length; i += batchSize) {
    const { embeddings } = await embedMany({ model: embedModel(), values: texts.slice(i, i + batchSize) });
    out.push(...embeddings);
  }
  return out;
}

export async function embedQuery(q: string): Promise<number[]> {
  const { embedding } = await embed({ model: embedModel(), value: q });
  return embedding;
}
