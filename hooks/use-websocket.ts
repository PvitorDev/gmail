"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface Message {
  id: string
  content: string
  sender: string
  timestamp: Date
  isOwn: boolean
  subject?: string
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
              }
            })
            setMessages(mapped)
            return
          }

          if (data.type === "join") return

          const sender = data.sender || "Desconhecido"
          const message: Message = {
            id: data.id || crypto.randomUUID(),
            content: data.content,
            sender,
            timestamp: new Date(data.timestamp || Date.now()),
            isOwn: sameSender(sender, localSenderRef.current),
            subject: typeof data.subject === "string" ? data.subject : undefined,
          }
          setMessages((prev) => [...prev, message])
          onMessage?.(message)
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
      roomOverride?: string
    ) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return false

      const room =
        (roomOverride?.trim() || roomRef.current || "default").trim() || "default"

      const message = {
        id: crypto.randomUUID(),
        content,
        sender,
        timestamp: new Date().toISOString(),
        room,
        subject: subject ?? "",
      }

      try {
        wsRef.current.send(JSON.stringify(message))
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
