import { randomUUID } from "node:crypto"
import { WebSocketServer, WebSocket } from "ws"

type Client = WebSocket & { room?: string }

/** Mensagem de chat no fio (use-websocket + sala + assunto) */
interface ChatWire {
  id: string
  content: string
  sender: string
  timestamp: string
  room: string
  subject: string
}

const PORT = Number(process.env.PORT ?? process.env.WS_PORT) || 8080
/** Máximo de mensagens guardadas por sala (memória) */
const HISTORY_LIMIT = Number(process.env.WS_HISTORY_LIMIT) || 50

const wss = new WebSocketServer({ port: PORT })

const roomHistory = new Map<string, ChatWire[]>()

function pushRoomHistory(msg: ChatWire) {
  const key = msg.room
  const prev = roomHistory.get(key) ?? []
  const next = [...prev, msg].slice(-HISTORY_LIMIT)
  roomHistory.set(key, next)
}

function sendHistory(socket: Client, room: string) {
  if (socket.readyState !== WebSocket.OPEN) return
  const messages = roomHistory.get(room) ?? []
  socket.send(
    JSON.stringify({
      type: "history",
      room,
      messages,
    })
  )
}

function normalizeChat(
  data: Record<string, unknown>,
  fallbackRoom: string
): string | null {
  const roomRaw = data.room
  const room =
    typeof roomRaw === "string" && roomRaw.trim()
      ? roomRaw.trim().slice(0, 200)
      : fallbackRoom

  const subjectRaw = data.subject
  const subject =
    typeof subjectRaw === "string" ? subjectRaw.slice(0, 500) : ""

  const msg: ChatWire = {
    id: typeof data.id === "string" ? data.id : randomUUID(),
    content: typeof data.content === "string" ? data.content : "",
    sender: typeof data.sender === "string" ? data.sender : "Desconhecido",
    timestamp:
      typeof data.timestamp === "string"
        ? data.timestamp
        : new Date().toISOString(),
    room,
    subject,
  }
  return JSON.stringify(msg)
}

function broadcastRoom(room: string, payload: string) {
  for (const client of wss.clients) {
    const c = client as Client
    if (client.readyState !== WebSocket.OPEN) continue
    if (c.room !== room) continue
    client.send(payload)
  }
}

function recordAndBroadcast(payload: string) {
  const msg = JSON.parse(payload) as ChatWire
  pushRoomHistory(msg)
  broadcastRoom(msg.room, payload)
}

wss.on("connection", (socket: Client) => {
  socket.room = "default"

  socket.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      if (!raw.trim()) return
      const msg: ChatWire = {
        id: randomUUID(),
        content: raw,
        sender: "Desconhecido",
        timestamp: new Date().toISOString(),
        room: socket.room || "default",
        subject: "",
      }
      const payload = JSON.stringify(msg)
      recordAndBroadcast(payload)
      return
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "type" in parsed &&
      (parsed as { type: string }).type === "join" &&
      "room" in parsed
    ) {
      const r = String((parsed as { room: unknown }).room || "default").trim()
      socket.room = r ? r.slice(0, 200) : "default"
      sendHistory(socket, socket.room)
      return
    }

    if (typeof parsed !== "object" || parsed === null) return

    const payload = normalizeChat(parsed as Record<string, unknown>, socket.room || "default")
    if (!payload) return
    recordAndBroadcast(payload)
  })
})

wss.on("listening", () => {
  console.log(
    `WebSocket na porta ${PORT} (histórico até ${HISTORY_LIMIT} msgs/sala)`
  )
  const pub = process.env.RAILWAY_PUBLIC_DOMAIN
  if (pub) console.log(`Cliente: use wss://${pub}`)
})

process.on("SIGINT", () => {
  wss.close(() => process.exit(0))
})

process.on("SIGTERM", () => {
  wss.close(() => process.exit(0))
})
