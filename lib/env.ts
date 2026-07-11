export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
  requestTimeoutMs: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 10000),
};
