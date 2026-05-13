/** WebSocket no Railway (use `wss` em HTTPS) */
export const RAILWAY_WS_URL = "wss://gmail-production-967c.up.railway.app"

/** Em `next dev`, todos os browsers usam o mesmo WS local por defeito (porta do `pnpm run ws:server`). */
export const LOCAL_DEV_WS_URL = "ws://localhost:8085"

/**
 * URL do WebSocket.
 * - Fora de `development`: **sempre** `RAILWAY_WS_URL` (fixo no código).
 * - Em `development`: `NEXT_PUBLIC_WS_URL` se definido, senão `LOCAL_DEV_WS_URL`.
 */
export function getWebSocketUrl(): string {
  if (process.env.NODE_ENV !== "development") {
    return RAILWAY_WS_URL
  }
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim()
  if (fromEnv) return fromEnv
  return LOCAL_DEV_WS_URL
}
