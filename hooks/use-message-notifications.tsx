"use client"

import type { MutableRefObject } from "react"
import { useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import type { Message } from "@/hooks/use-websocket"

const QUEUE_GAP_MS = 450

function snapshotMessage(m: Message): Message {
  return {
    ...m,
    timestamp: new Date(m.timestamp),
    replyTo: m.replyTo ? { ...m.replyTo } : undefined,
  }
}

function showDesktopNotification(msg: Message, onInteract: (m: Message) => void) {
  const snap = snapshotMessage(msg)
  const body =
    msg.content.length > 200 ? `${msg.content.slice(0, 200)}…` : msg.content || "(sem texto)"
  const icon =
    typeof window !== "undefined" ? `${window.location.origin}/icon.svg` : undefined
  try {
    const n = new Notification(msg.sender, {
      body,
      silent: true,
      tag: msg.id,
      icon,
    })
    n.onclick = () => {
      n.close()
      window.focus()
      onInteract(snap)
    }
  } catch {
    toast.custom(
      (id) => (
        <button
          type="button"
          className="w-[min(100vw-2rem,22rem)] rounded-lg border border-border bg-popover p-3 text-left text-popover-foreground shadow-md"
          onClick={() => {
            toast.dismiss(id)
            onInteract(snap)
          }}
        >
          <div className="font-medium text-foreground">{msg.sender}</div>
          <div className="mt-1 text-sm text-muted-foreground">{body}</div>
        </button>
      ),
      { duration: 8000 }
    )
  }
}

async function drainQueue(
  queueRef: MutableRefObject<Message[]>,
  drainingRef: MutableRefObject<boolean>,
  getInteract: () => (m: Message) => void
) {
  if (drainingRef.current) return
  drainingRef.current = true
  while (queueRef.current.length > 0) {
    const msg = queueRef.current.shift()!
    const onInteract = getInteract()
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      showDesktopNotification(msg, onInteract)
    }
    await new Promise((r) => setTimeout(r, QUEUE_GAP_MS))
  }
  drainingRef.current = false
}

/**
 * Notificações nativas do sistema (Chrome / SO) via Notification API, silenciosas.
 * O primeiro lote após lista vazia (histórico / sala) não dispara.
 * Se `new Notification` falhar, usa toast na página como fallback.
 */
export function useMessageNotifications(
  enabled: boolean,
  messages: Message[],
  onInteract: (msg: Message) => void
) {
  const hydratedRef = useRef(false)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<Message[]>([])
  const drainingRef = useRef(false)
  const onInteractRef = useRef(onInteract)
  onInteractRef.current = onInteract

  const kick = useCallback(() => {
    void drainQueue(queueRef, drainingRef, () => onInteractRef.current)
  }, [])

  useEffect(() => {
    if (messages.length === 0) {
      prevIdsRef.current = new Set()
      hydratedRef.current = false
      return
    }

    if (!hydratedRef.current) {
      prevIdsRef.current = new Set(messages.map((m) => m.id))
      hydratedRef.current = true
      return
    }

    const prev = prevIdsRef.current
    const newcomers = messages.filter((m) => !prev.has(m.id))
    prevIdsRef.current = new Set(messages.map((m) => m.id))

    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") {
      return
    }

    for (const m of newcomers) {
      if (!m.isOwn) queueRef.current.push(m)
    }
    kick()
  }, [messages, enabled, kick])
}
