/**
 * Fetch con timeout usando AbortController
 * @param url - URL a la que hacer fetch
 * @param options - Opciones del fetch (method, headers, body, etc.)
 * @param timeoutMs - Tiempo máximo de espera en milisegundos (default: 15000)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout (${timeoutMs}ms) - la conexión está tardando demasiado. Verifica tu conexión a internet.`);
    }
    throw error;
  }
}
