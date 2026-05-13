"use client"

import {
  X,
  Minus,
  Maximize2,
  Paperclip,
  Link,
  Smile,
  MoreVertical,
  Trash2,
  Send,
  MoreHorizontal,
  ArrowDown,
  Reply,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect, useCallback } from "react"
import type { Message, MessageReplyRef } from "@/hooks/use-websocket"
import { LinkifiedMessageBody } from "@/lib/linkify-message"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const REPLY_EXCERPT_MAX = 280
const SCROLL_BOTTOM_THRESHOLD_PX = 80

function excerptForReply(content: string): string {
  const t = content.trim().replace(/\s+/g, " ")
  if (t.length <= REPLY_EXCERPT_MAX) return t
  return `${t.slice(0, REPLY_EXCERPT_MAX - 1)}…`
}

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (
    content: string,
    subject: string,
    room: string,
    replyTo?: MessageReplyRef
  ) => void
  room: string
  onRoomCommit: (room: string) => void
  messages: Message[]
  isConnected: boolean
  /** Define resposta em cadeia (ex. clique numa notificação). */
  replyToMessagePreset?: Message | null
  onReplyPresetConsumed?: () => void
}

export function ComposeModal({
  isOpen,
  onClose,
  onSend,
  room,
  onRoomCommit,
  messages,
  isConnected,
  replyToMessagePreset = null,
  onReplyPresetConsumed,
}: ComposeModalProps) {
  const [messageInput, setMessageInput] = useState("")
  const [toField, setToField] = useState(room)
  const [subjectField, setSubjectField] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)

  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) setToField(room)
  }, [isOpen, room])

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = messagesScrollRef.current
    if (!el) return
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    } else {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  const updateJumpVisibility = useCallback(() => {
    const el = messagesScrollRef.current
    if (!el) {
      setShowJumpToBottom(false)
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    const distFromBottom = scrollHeight - scrollTop - clientHeight
    setShowJumpToBottom(distFromBottom > SCROLL_BOTTOM_THRESHOLD_PX)
  }, [])

  useEffect(() => {
    if (!isOpen || isMinimized) return
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom(false)
        updateJumpVisibility()
      })
    })
    return () => cancelAnimationFrame(t)
  }, [isOpen, isMinimized, messages, scrollToBottom, updateJumpVisibility])

  const handleScroll = () => {
    updateJumpVisibility()
  }

  const handleSend = () => {
    if (!messageInput.trim() || !isConnected) return
    const r = toField.trim() || "geral"
    onRoomCommit(r)
    const replyPayload: MessageReplyRef | undefined = replyingTo
      ? {
          id: replyingTo.id,
          sender: replyingTo.sender,
          content: excerptForReply(replyingTo.content),
        }
      : undefined
    onSend(messageInput.trim(), subjectField.trim(), r, replyPayload)
    setMessageInput("")
    setReplyingTo(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startReply = (message: Message) => {
    setReplyingTo(message)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  useEffect(() => {
    if (!isOpen || !replyToMessagePreset) return
    setReplyingTo(replyToMessagePreset)
    requestAnimationFrame(() => textareaRef.current?.focus())
    onReplyPresetConsumed?.()
  }, [isOpen, replyToMessagePreset, onReplyPresetConsumed])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed z-50 flex min-h-0 flex-col overflow-hidden rounded-t-lg bg-card shadow-2xl transition-all",
        isMinimized
          ? "bottom-0 right-20 h-12 w-72"
          : isMaximized
            ? "inset-4 h-auto w-auto"
            : "bottom-0 right-20 h-[500px] w-[520px]"
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between bg-foreground px-4 text-card">
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
          <div className="shrink-0 border-b border-border">
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

          <div className="relative min-h-0 flex-1">
            <div
              ref={messagesScrollRef}
              onScroll={handleScroll}
              className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden bg-card p-4"
            >
              {!isConnected ? (
                <div className="flex h-full min-h-[120px] items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground">
                    A ligar ao servidor…
                    <br />
                    <span className="text-xs">
                      Se não conectar, confira se o WebSocket está a correr e a variável
                      NEXT_PUBLIC_WS_URL.
                    </span>
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full min-h-[120px] items-center justify-center">
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
                        "group flex w-full max-w-full gap-1",
                        message.isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "relative min-w-0 max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          message.isOwn
                            ? "bg-accent text-accent-foreground"
                            : "mr-auto bg-muted text-muted-foreground"
                        )}
                      >
                        <div className="absolute right-0.5 top-0.5 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-current hover:bg-background/20"
                                aria-label="Ações da mensagem"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => startReply(message)}>
                                <Reply className="h-4 w-4" />
                                Responder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {message.replyTo ? (
                          <div
                            className={cn(
                              "mb-2 border-l-2 pl-2 text-xs opacity-90",
                              message.isOwn ? "border-accent-foreground/50" : "border-muted-foreground/50"
                            )}
                          >
                            <div className="break-words font-medium">{message.replyTo.sender}</div>
                            <div className="mt-0.5 break-words [overflow-wrap:anywhere]">
                              <LinkifiedMessageBody text={message.replyTo.content} />
                            </div>
                          </div>
                        ) : null}

                        <div className="mb-1 break-words pr-7 text-xs opacity-70">
                          {message.sender} •{" "}
                          {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="break-words [overflow-wrap:anywhere]">
                          <LinkifiedMessageBody text={message.content} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isConnected && messages.length > 0 && showJumpToBottom ? (
              <div className="pointer-events-none absolute bottom-3 right-3 flex justify-end">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="pointer-events-auto h-9 w-9 rounded-full shadow-md"
                  onClick={() => scrollToBottom(true)}
                  aria-label="Ir para a última mensagem"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border bg-card p-4">
            {replyingTo ? (
              <div className="mb-2 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">
                    Responder a {replyingTo.sender}
                  </span>
                  <p className="mt-0.5 line-clamp-2 break-words text-muted-foreground">
                    {excerptForReply(replyingTo.content)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Cancelar resposta"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
            <div className="mb-3 min-h-[60px]">
              <textarea
                ref={textareaRef}
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
