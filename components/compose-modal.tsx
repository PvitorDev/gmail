"use client"

import { X, Minus, Maximize2, Paperclip, Link, Smile, MoreVertical, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"
import type { Message } from "@/hooks/use-websocket"

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (content: string, subject: string, room: string) => void
  room: string
  onRoomCommit: (room: string) => void
  messages: Message[]
  isConnected: boolean
}

export function ComposeModal({
  isOpen,
  onClose,
  onSend,
  room,
  onRoomCommit,
  messages,
  isConnected,
}: ComposeModalProps) {
  const [messageInput, setMessageInput] = useState("")
  const [toField, setToField] = useState(room)
  const [subjectField, setSubjectField] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) setToField(room)
  }, [isOpen, room])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!messageInput.trim() || !isConnected) return
    const r = toField.trim() || "geral"
    onRoomCommit(r)
    onSend(messageInput.trim(), subjectField.trim(), r)
    setMessageInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-t-lg bg-card shadow-2xl transition-all",
        isMinimized
          ? "bottom-0 right-20 h-12 w-72"
          : isMaximized
            ? "inset-4 h-auto w-auto"
            : "bottom-0 right-20 h-[500px] w-[520px]"
      )}
    >
      <div className="flex h-12 items-center justify-between bg-foreground px-4 text-card">
        <span className="text-sm font-medium">Nova mensagem</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-card hover:bg-card/10"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-card hover:bg-card/10"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-card hover:bg-card/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="border-b border-border">
            <div className="flex items-center border-b border-border px-4 py-2">
              <span className="shrink-0 text-sm text-muted-foreground">Para</span>
              <div className="ml-2 min-w-0 flex-1">
                <Input
                  className="h-7 border-none p-0 text-sm shadow-none focus-visible:ring-0"
                  placeholder="Nome da sala"
                  value={toField}
                  onChange={(e) => setToField(e.target.value)}
                  onBlur={() => onRoomCommit(toField.trim() || "geral")}
                  disabled={!isConnected}
                  aria-label="Sala (destinatário)"
                />
              </div>
            </div>
            <div className="flex items-center px-4 py-2">
              <span className="shrink-0 text-sm text-muted-foreground">Assunto</span>
              <div className="ml-2 min-w-0 flex-1">
                <Input
                  className="h-7 border-none p-0 text-sm shadow-none focus-visible:ring-0"
                  placeholder="Qualquer assunto"
                  value={subjectField}
                  onChange={(e) => setSubjectField(e.target.value)}
                  disabled={!isConnected}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-card p-4">
            {!isConnected ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-sm text-muted-foreground">
                  A ligar ao servidor…
                  <br />
                  <span className="text-xs">Se não conectar, confira se o WebSocket está a correr e a variável NEXT_PUBLIC_WS_URL.</span>
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem nesta sala ainda. Escreve abaixo para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      message.isOwn
                        ? "ml-auto bg-accent text-accent-foreground"
                        : "mr-auto bg-muted text-muted-foreground"
                    )}
                  >
                    <div className="mb-1 text-xs opacity-70">
                      {message.sender} •{" "}
                      {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card p-4">
            <div className="mb-3 min-h-[60px]">
              <textarea
                className="h-full w-full resize-none border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder={
                  isConnected ? "Escreva a mensagem (corpo do e-mail)…" : "À espera de ligação…"
                }
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isConnected}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  onClick={handleSend}
                  disabled={!isConnected || !messageInput.trim()}
                  className="rounded-md bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Link className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  )
}
