"use client"

import {
  Menu,
  Search,
  Settings,
  HelpCircle,
  Grid3X3,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Trash2,
  Tag,
  AlertCircle,
  Archive,
  Pencil,
  Plus,
  Video,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useWebSocket, type MessageReplyRef } from "@/hooks/use-websocket"
import { ComposeModal } from "./compose-modal"
import { EmailList } from "./email-list"
import { NameSetupModal } from "./name-setup-modal"
import { getWebSocketUrl } from "@/lib/ws-config"

const ROOM_STORAGE_KEY = "fake-gmail-room"

const sidebarItems = [
  { icon: Inbox, label: "Caixa de entrada", count: 3, active: true },
  { icon: Star, label: "Com estrela", count: 0 },
  { icon: Clock, label: "Adiados", count: 0 },
  { icon: Send, label: "Enviados", count: 0 },
  { icon: FileText, label: "Rascunhos", count: 1 },
  { icon: MoreVertical, label: "Mais", count: 0, isMore: true },
]

const bottomItems = [
  { icon: Trash2, label: "Lixeira" },
  { icon: Tag, label: "Categorias" },
  { icon: AlertCircle, label: "Spam" },
]

export function GmailInterface() {
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [userName, setUserName] = useState("")
  const [nameGateOpen, setNameGateOpen] = useState(false)
  const [boot, setBoot] = useState(false)
  const [room, setRoom] = useState("geral")

  const wsUrl = getWebSocketUrl()

  const { isConnected, messages, connect, sendMessage } = useWebSocket({
    url: wsUrl,
    localSender: userName,
    room,
  })

  useEffect(() => {
    const savedName = localStorage.getItem("fake-gmail-user-name")?.trim()
    if (savedName) setUserName(savedName)
    else setNameGateOpen(true)
    const savedRoom = localStorage.getItem(ROOM_STORAGE_KEY)?.trim()
    if (savedRoom) setRoom(savedRoom)
    setBoot(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(ROOM_STORAGE_KEY, room)
  }, [room])

  useEffect(() => {
    if (!boot || nameGateOpen || !userName) return
    connect()
  }, [boot, nameGateOpen, userName, connect])

  const handleNameComplete = (name: string) => {
    setUserName(name)
    setNameGateOpen(false)
  }

  const handleRoomCommit = (next: string) => {
    const r = next.trim() || "geral"
    setRoom(r)
  }

  const handleSendMessage = (
    content: string,
    subject: string,
    roomForSend: string,
    replyTo?: MessageReplyRef
  ) => {
    const r = roomForSend.trim() || "geral"
    if (r !== room) setRoom(r)
    sendMessage(content, userName, subject, r, replyTo)
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <NameSetupModal isOpen={boot && nameGateOpen} onComplete={handleNameComplete} />

      <header className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 75 24" className="h-6 w-auto">
              <path fill="#EA4335" d="M0 0h6v24H0z" />
              <path fill="#FBBC05" d="M9 0h6v24H9z" />
              <path fill="#34A853" d="M18 0h6v24H18z" />
              <path fill="#4285F4" d="M27 0h6v24H27z" />
            </svg>
            <span className="text-xl font-normal text-muted-foreground">Gmail</span>
          </div>
        </div>

        <div className="flex flex-1 justify-center px-8">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar e-mail"
              className="h-12 w-full rounded-full border-none bg-secondary pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Grid3X3 className="h-5 w-5" />
          </Button>
          <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {(userName || "?").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 flex-col border-r border-border bg-sidebar py-4">
          <div className="px-4 pb-4">
            <Button
              onClick={() => setIsComposeOpen(true)}
              className="flex h-14 w-fit items-center gap-3 rounded-2xl bg-accent px-6 text-accent-foreground shadow-md hover:bg-accent/90 hover:shadow-lg"
            >
              <Pencil className="h-5 w-5" />
              <span className="font-medium">Escrever</span>
            </Button>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                className={cn(
                  "flex w-full items-center gap-4 rounded-r-full px-3 py-2 text-sm transition-colors",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count > 0 && (
                  <span className="text-xs font-medium">{item.count}</span>
                )}
              </button>
            ))}

            <div className="my-4 border-t border-sidebar-border" />

            {bottomItems.map((item) => (
              <button
                key={item.label}
                className="flex w-full items-center gap-4 rounded-r-full px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-sidebar-border px-4 pt-4">
            <div
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs",
                isConnected
                  ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-muted-foreground"
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span>{isConnected ? "Sincronizado" : "A ligar…"}</span>
                <span className="truncate text-[10px] opacity-80" title={wsUrl}>
                  Sala: {room} · {wsUrl}
                </span>
              </span>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <input type="checkbox" className="h-4 w-4 rounded border-border" />
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {messages.length > 0
                ? `1-${messages.length} de ${messages.length}`
                : "Nenhuma mensagem"}
            </span>
          </div>

          <div className="flex border-b border-border">
            <button className="flex items-center gap-2 border-b-2 border-primary px-6 py-3 text-sm font-medium text-foreground">
              <Inbox className="h-4 w-4" />
              Principal
            </button>
            <button className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground hover:bg-muted/50">
              <Users className="h-4 w-4" />
              Social
            </button>
            <button className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground hover:bg-muted/50">
              <Tag className="h-4 w-4" />
              Promoções
            </button>
          </div>

          <EmailList />
        </main>

        <aside className="flex w-14 flex-col items-center gap-4 border-l border-border bg-sidebar py-4">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
              <path d="M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Users className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Plus className="h-5 w-5" />
          </Button>
        </aside>
      </div>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendMessage}
        room={room}
        onRoomCommit={handleRoomCommit}
        messages={messages}
        isConnected={isConnected}
      />
    </div>
  )
}
