/**
 * Utility function to add timeout to any promise
 * Prevents infinite loading states when API calls hang
 */
export const withTimeout = <T,>(
  promise: Promise<T>, 
  timeoutMs: number = 10000,
  errorMessage: string = 'Request timeout'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

/**
 * Safe wrapper for API calls with timeout and error fallback
 * Returns fallback value if request fails or times out
 */
export const safeApiCall = async <T,>(
  promise: Promise<T>,
  fallbackValue: T,
  timeoutMs: number = 10000
): Promise<T> => {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch (error) {
    console.warn('API call failed or timed out, using fallback:', error);
    return fallbackValue;
  }
};
