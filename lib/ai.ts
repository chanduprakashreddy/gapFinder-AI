import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';

type Provider = 'google' | 'groq' | 'openrouter' | 'openai';

const isGoogle = () => Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const provider = (): Provider => {
  const selected = process.env.AI_PROVIDER?.toLowerCase();
  if (selected === 'google' || selected === 'groq' || selected === 'openrouter' || selected === 'openai') return selected;
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (isGoogle()) return 'google';
  return 'openai';
};

const googleProvider = () =>
  createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

const openaiProvider = () =>
  createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

/** Groq exposes an OpenAI-compatible chat endpoint. */
const groqProvider = () =>
  createOpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

/** OpenRouter exposes its model catalogue through an OpenAI-compatible API. */
const openRouterProvider = () =>
  createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });

export const chatModel = () => {
  if (provider() === 'google') {
    return googleProvider()(process.env.CHAT_MODEL ?? 'gemini-3.5-flash');
  }
  if (provider() === 'groq') {
    return groqProvider()(process.env.CHAT_MODEL ?? 'openai/gpt-oss-20b');
  }
  if (provider() === 'openrouter') {
    return openRouterProvider()(process.env.CHAT_MODEL ?? 'openrouter/free');
  }
  return openaiProvider()(process.env.CHAT_MODEL ?? 'gpt-4o-mini');
};

/**
 * Whether the current AI provider is actually usable.
 * Returns false when no API key is configured for the selected provider.
 */
export function isAIAvailable(): boolean {
  const p = provider();
  if (p === 'google') return isGoogle();
  if (p === 'groq') return Boolean(process.env.GROQ_API_KEY);
  if (p === 'openrouter') return Boolean(process.env.OPENROUTER_API_KEY);
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

/** Track whether the AI provider has recently failed, to avoid repeated slow timeouts */
let _aiFailedRecently = false;
let _aiFailedAt = 0;
const AI_FAILURE_COOLDOWN = 60_000; // 1 minute cooldown after a failure

export function markAIFailed() {
  _aiFailedRecently = true;
  _aiFailedAt = Date.now();
}

export function isAIHealthy(): boolean {
  if (!_aiFailedRecently) return true;
  if (Date.now() - _aiFailedAt > AI_FAILURE_COOLDOWN) {
    _aiFailedRecently = false;
    return true;
  }
  return false;
}

const embedModel = () => {
  if (provider() === 'google') {
    return googleProvider().textEmbeddingModel('gemini-embedding-001', {
      outputDimensionality: 768,
    });
  }
  // The pgvector columns are vector(768), and text-embedding-3-small supports
  // reduced dimensions. Keeping all hosted providers at 768 makes switching
  // providers safe for newly ingested subjects.
  return openaiProvider().embedding('text-embedding-3-small', { dimensions: 768 });
};

const localEmbeddings = () => process.env.EMBEDDING_PROVIDER === 'local' || provider() === 'groq' || provider() === 'openrouter';
const LOCAL_DIMENSIONS = 768;

/**
 * A deterministic 768-dimensional hashing embedding for no-cost local RAG.
 * It keeps vectors in pgvector and works best for the course-specific terms
 * found in a student's own notes. Set a hosted embedding provider later for
 * broader semantic matching.
 */
function localEmbed(text: string): number[] {
  const vector = new Array<number>(LOCAL_DIMENSIONS).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? [];
  const terms = [...words, ...words.slice(1).map((word, index) => `${words[index]}_${word}`)];
  for (const term of terms) {
    let hash = 2166136261;
    for (let i = 0; i < term.length; i++) hash = Math.imul(hash ^ term.charCodeAt(i), 16777619);
    const index = (hash >>> 0) % LOCAL_DIMENSIONS;
    vector[index] += hash & 1 ? 1 : -1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => value / magnitude);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (localEmbeddings()) return texts.map(localEmbed);
  try {
    const out: number[][] = [];
    const batchSize = provider() === 'google' ? 100 : 256;
    for (let i = 0; i < texts.length; i += batchSize) {
      const { embeddings } = await embedMany({ model: embedModel(), values: texts.slice(i, i + batchSize) });
      out.push(...embeddings);
    }
    return out;
  } catch (e) {
    console.warn('Hosted embedding failed, falling back to local:', e);
    return texts.map(localEmbed);
  }
}

export async function embedQuery(q: string): Promise<number[]> {
  if (localEmbeddings()) return localEmbed(q);
  try {
    const { embedding } = await embed({ model: embedModel(), value: q });
    return embedding;
  } catch (e) {
    console.warn('Hosted query embedding failed, falling back to local:', e);
    return localEmbed(q);
  }
}
