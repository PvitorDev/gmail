/** URL pública do WebSocket (configure em .env.local: NEXT_PUBLIC_WS_URL=ws://localhost:3005) */
export const DEFAULT_WS_URL = "ws://localhost:3005"

export function getWebSocketUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim()
  return fromEnv || DEFAULT_WS_URL
}
