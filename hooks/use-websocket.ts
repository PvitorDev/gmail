"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface MessageReplyRef {
  id: string
  sender: string
  content: string
}

export interface Message {
  id: string
  content: string
  sender: string
  timestamp: Date
  isOwn: boolean
  subject?: string
  replyTo?: MessageReplyRef
}

function stringifyField(value: unknown, maxLen: number): string {
  if (typeof value === "string") return value.slice(0, maxLen)
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, maxLen)
  return ""
}

function mapReplyPayload(raw: unknown): MessageReplyRef | undefined {
  if (typeof raw !== "object" || raw === null) return undefined
  const o = raw as Record<string, unknown>
  const id = stringifyField(o.id, 120)
  const sender = stringifyField(o.sender, 200)
  const content = stringifyField(o.content, 500)
  if (!id || !sender) return undefined
  return { id, sender, content }
}

interface UseWebSocketOptions {
  url: string
  localSender?: string
  room: string
  onMessage?: (message: Message) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

function sameSender(a: string, b: string) {
  return a.trim() === b.trim()
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { url, localSender, room, onMessage, onConnect, onDisconnect, onError } = options
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localSenderRef = useRef(localSender ?? "Você")
  const roomRef = useRef((room || "default").trim() || "default")
  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    localSenderRef.current = localSender ?? "Você"
  }, [localSender])

  useEffect(() => {
    const r = room.trim() || "default"
    roomRef.current = r
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "join", room: r }))
      setMessages([])
    }
  }, [room])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const connect = useCallback(() => {
    if (!url?.trim()) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        ws.send(JSON.stringify({ type: "join", room: roomRef.current }))
        onConnect?.()
      }

      ws.onclose = () => {
        setIsConnected(false)
        onDisconnect?.()
        wsRef.current = null
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current()
        }, 3000)
      }

      ws.onerror = (error) => {
        onError?.(error)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "history" && Array.isArray(data.messages)) {
            const mapped: Message[] = data.messages.map((m: Record<string, unknown>) => {
              const sender = String(m.sender ?? "Desconhecido")
              const replyTo = mapReplyPayload(m.replyTo)
              return {
                id: String(m.id ?? crypto.randomUUID()),
                content: String(m.content ?? ""),
                sender,
                timestamp: new Date(
                  typeof m.timestamp === "string" || typeof m.timestamp === "number"
                    ? m.timestamp
                    : Date.now()
                ),
                isOwn: sameSender(sender, localSenderRef.current),
                subject: typeof m.subject === "string" ? m.subject : undefined,
                ...(replyTo ? { replyTo } : {}),
              }
            })
            setMessages(mapped)
            return
          }

          if (data.type === "join") return

          const sender = data.sender || "Desconhecido"
          const id = typeof data.id === "string" ? data.id : crypto.randomUUID()
          const replyFromWire = mapReplyPayload(data.replyTo)
          if (
            process.env.NODE_ENV === "development" &&
            process.env.NEXT_PUBLIC_WS_DEBUG === "1" &&
            !data.type &&
            typeof data.content === "string"
          ) {
            console.debug("[ws:frame]", {
              id,
              sender,
              hasReplyTo: Boolean(replyFromWire),
            })
          }
          const message: Message = {
            id,
            content: typeof data.content === "string" ? data.content : String(data.content ?? ""),
            sender,
            timestamp: new Date(data.timestamp || Date.now()),
            isOwn: sameSender(sender, localSenderRef.current),
            subject: typeof data.subject === "string" ? data.subject : undefined,
            ...(replyFromWire ? { replyTo: replyFromWire } : {}),
          }

          let toNotify: Message = message
          setMessages((prev) => {
            const i = prev.findIndex((m) => m.id === id)
            if (i === -1) return [...prev, message]
            const merged: Message = {
              ...message,
              replyTo: message.replyTo ?? prev[i]!.replyTo,
            }
            toNotify = merged
            return [...prev.slice(0, i), merged, ...prev.slice(i + 1)]
          })
          onMessage?.(toNotify)
        } catch {
          const message: Message = {
            id: crypto.randomUUID(),
            content: event.data,
            sender: "Desconhecido",
            timestamp: new Date(),
            isOwn: false,
          }
          setMessages((prev) => [...prev, message])
          onMessage?.(message)
        }
      }
    } catch {
      setIsConnected(false)
    }
  }, [url, onConnect, onDisconnect, onError, onMessage])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const sendMessage = useCallback(
    (
      content: string,
      sender: string = "Você",
      subject?: string,
      roomOverride?: string,
      replyTo?: MessageReplyRef
    ) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return false

      const room =
        (roomOverride?.trim() || roomRef.current || "default").trim() || "default"

      const id = crypto.randomUUID()
      const message: Record<string, unknown> = {
        id,
        content,
        sender,
        timestamp: new Date().toISOString(),
        room,
        subject: subject ?? "",
      }
      const replyPayload = replyTo
        ? {
            id: replyTo.id.slice(0, 120),
            sender: replyTo.sender.slice(0, 200),
            content: replyTo.content.slice(0, 500),
          }
        : undefined
      if (replyPayload) {
        message.replyTo = replyPayload
      }

      try {
        wsRef.current.send(JSON.stringify(message))
        const optimistic: Message = {
          id,
          content,
          sender,
          timestamp: new Date(),
          isOwn: sameSender(sender, localSenderRef.current),
          subject: subject?.trim() ? subject : undefined,
          ...(replyPayload ? { replyTo: replyPayload } : {}),
        }
        setMessages((prev) => (prev.some((m) => m.id === id) ? prev : [...prev, optimistic]))
        return true
      } catch {
        return false
      }
    },
    []
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    messages,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
  }
}
