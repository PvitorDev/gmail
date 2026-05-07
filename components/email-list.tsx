"use client"

import { Star, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Message } from "@/hooks/use-websocket"

interface EmailListProps {
  messages: Message[]
  isConnected: boolean
}

// Fake emails to make it look like a real inbox
const fakeEmails = [
  {
    id: "1",
    sender: "Google",
    subject: "Alerta de segurança",
    preview: "Detectamos um novo login na sua conta...",
    time: "10:30",
    isUnread: true,
    hasAttachment: false,
  },
  {
    id: "2",
    sender: "LinkedIn",
    subject: "Você tem 5 novas conexões",
    preview: "Veja quem quer se conectar com você...",
    time: "09:15",
    isUnread: true,
    hasAttachment: false,
  },
  {
    id: "3",
    sender: "Equipe de TI",
    subject: "Manutenção programada",
    preview: "Informamos que haverá manutenção nos servidores...",
    time: "Ontem",
    isUnread: false,
    hasAttachment: true,
  },
]

export function EmailList({ messages, isConnected }: EmailListProps) {
  // Convert messages to look like emails
  type MessageEmail = {
    id: string
    sender: string
    subject: string
    preview: string
    time: string
    isUnread: boolean
    hasAttachment: boolean
    isMessage: true
    isOwn: boolean
  }

  type FakeEmail = (typeof fakeEmails)[number]
  type InboxRow = MessageEmail | FakeEmail

  const messageEmails: MessageEmail[] = messages.map((msg) => {
    const body = (msg.content ?? "").trim()
    const subject = body.slice(0, 50) + (body.length > 50 ? "..." : "")

    return {
      id: msg.id,
      sender: msg.sender,
      subject,
      preview: "",
      time: new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      isUnread: !msg.isOwn,
      hasAttachment: false,
      isMessage: true,
      isOwn: msg.isOwn,
    }
  })

  const allEmails: InboxRow[] = [...messageEmails.slice().reverse(), ...fakeEmails]

  return (
    <div className="flex-1 overflow-y-auto">
      {allEmails.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <svg className="mb-4 h-24 w-24 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="1.5" />
            <path d="M2 7l10 6 10-6" strokeWidth="1.5" />
          </svg>
          <p className="text-lg">Sua caixa de entrada está vazia</p>
          <p className="text-sm">Clique em &quot;Escrever&quot; para enviar uma mensagem</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {allEmails.map((email) => (
            <div
              key={email.id}
              className={cn(
                "group flex cursor-pointer items-center gap-2 px-4 py-2 transition-colors hover:bg-muted/50 hover:shadow-sm",
                email.isUnread && "bg-card font-medium"
              )}
            >
              <input type="checkbox" className="h-4 w-4 rounded border-border opacity-0 group-hover:opacity-100" />
              <button className="text-muted-foreground opacity-0 hover:text-yellow-500 group-hover:opacity-100">
                <Star className="h-4 w-4" />
              </button>
              <button className="text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100">
                <Archive className="h-4 w-4" />
              </button>
              
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className={cn(
                  "w-44 truncate text-sm",
                  email.isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                )}>
                  {email && "isOwn" in email
                    ? email.isOwn
                      ? "Você"
                      : email.sender
                    : email.sender}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={cn(
                    "truncate text-sm",
                    email.isUnread ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {email.subject}
                  </span>
                  {email.preview ? (
                    <span className="truncate text-sm text-muted-foreground">
                      — {email.preview}
                    </span>
                  ) : null}
                </div>
                {"isOwn" in email && (
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs",
                    email.isOwn ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                  )}>
                    {email.isOwn ? "Enviado" : "Recebido"}
                  </span>
                )}
                <span className={cn(
                  "shrink-0 text-xs",
                  email.isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                )}>
                  {email.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
