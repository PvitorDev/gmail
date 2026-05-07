"use client"

import { Star, Archive } from "lucide-react"
import { cn } from "@/lib/utils"

// Apenas e-mails fictícios na lista; o chat em tempo real fica só no compose
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

export function EmailList() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-border">
        {fakeEmails.map((email) => (
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
              <span
                className={cn(
                  "w-44 truncate text-sm",
                  email.isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {email.sender}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    email.isUnread ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {email.subject}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  — {email.preview}
                </span>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs",
                  email.isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                )}
              >
                {email.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
