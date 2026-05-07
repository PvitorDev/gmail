/** WebSocket no Railway (use `wss` em HTTPS) */
export const RAILWAY_WS_URL = "wss://gmail-production-967c.up.railway.app"

/**
 * URL do WebSocket.
 * - Produção / deploy: Railway por defeito.
 * - Local: cria `.env.local` com `NEXT_PUBLIC_WS_URL=ws://localhost:3005` (ou a porta do teu `ws:server`).
 */
export function getWebSocketUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim()
  return fromEnv || RAILWAY_WS_URL
}
