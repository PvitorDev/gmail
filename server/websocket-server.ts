import { randomUUID } from "node:crypto"
import { WebSocketServer, WebSocket } from "ws"

type Client = WebSocket & { room?: string; spyId?: string }

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

/** Desativa logs de “espia” com WS_SPY_LOGS=0 ou false */
const SPY_LOGS =
  process.env.WS_SPY_LOGS !== "0" && process.env.WS_SPY_LOGS !== "false"

function spy(...parts: unknown[]) {
  if (!SPY_LOGS) return
  console.log("[ws-debug]", ...parts)
}

const wss = new WebSocketServer({ port: PORT })

const roomHistory = new Map<string, ChatWire[]>()
/** Salas que já receberam pelo menos um join (para log “nova sala”) */
const roomsTouched = new Set<string>()

function countClientsInRoom(room: string): number {
  let n = 0
  for (const client of wss.clients) {
    const c = client as Client
    if (c.room === room && client.readyState === WebSocket.OPEN) n++
  }
  return n
}

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

function logMessagePreview(msg: ChatWire) {
  const max = 400
  const text =
    msg.content.length > max ? `${msg.content.slice(0, max)}…` : msg.content
  spy(
    `💬 sala="${msg.room}" | ${msg.sender} | assunto="${msg.subject || "—"}" |`,
    text.replace(/\s+/g, " ").trim() || "(vazio)"
  )
}

wss.on("connection", (socket: Client) => {
  socket.room = "default"
  socket.spyId = randomUUID().slice(0, 8)

  spy(`+ ligou cliente=${socket.spyId} | total≈${wss.clients.size}`)

  socket.on("close", () => {
    spy(
      `- desligou cliente=${socket.spyId} | ultima_sala="${socket.room}" | total≈${wss.clients.size}`
    )
  })

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
      logMessagePreview(msg)
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
      const nextRoom = r ? r.slice(0, 200) : "default"
      const prevRoom = socket.room

      if (!roomsTouched.has(nextRoom)) {
        roomsTouched.add(nextRoom)
        spy(
          `🆕 SALA NOVA (primeiro join) "${nextRoom}" | por cliente=${socket.spyId}`
        )
      }

      socket.room = nextRoom
      const histCount = roomHistory.get(nextRoom)?.length ?? 0
      const n = countClientsInRoom(nextRoom)
      spy(
        `🚪 join cliente=${socket.spyId} | de "${prevRoom}" → "${nextRoom}" | nesta sala: ${n} cliente(s) | histórico: ${histCount} msg`
      )

      sendHistory(socket, socket.room)
      return
    }

    if (typeof parsed !== "object" || parsed === null) return

    const payload = normalizeChat(parsed as Record<string, unknown>, socket.room || "default")
    if (!payload) return
    const msg = JSON.parse(payload) as ChatWire
    logMessagePreview(msg)
    recordAndBroadcast(payload)
  })
})

wss.on("listening", () => {
  console.log(
    `WebSocket na porta ${PORT} (histórico até ${HISTORY_LIMIT} msgs/sala)`
  )
  if (SPY_LOGS) {
    console.log(
      "Logs de conversas/salas: [ws-debug] (desliga com WS_SPY_LOGS=0)"
    )
  }
  const pub = process.env.RAILWAY_PUBLIC_DOMAIN
  if (pub) console.log(`Cliente: use wss://${pub}`)
})

process.on("SIGINT", () => {
  wss.close(() => process.exit(0))
})

process.on("SIGTERM", () => {
  wss.close(() => process.exit(0))
})
