/**
 * Supabase requests occasionally fail before a response is received (for
 * example while a local network connection is being re-established). Retrying
 * only those transport failures makes writes reliable without repeating a
 * request that the server has already answered.
 */
export async function fetchSupabase(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Could not reach Supabase after 3 attempts: ${detail}`);
}
