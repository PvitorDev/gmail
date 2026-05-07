"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from "lucide-react"

const STORAGE_KEY = "fake-gmail-user-name"

function writeStoredUserName(name: string) {
  localStorage.setItem(STORAGE_KEY, name.trim() || "Visitante")
}

interface NameSetupModalProps {
  isOpen: boolean
  onComplete: (name: string) => void
}

export function NameSetupModal({ isOpen, onComplete }: NameSetupModalProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  if (!isOpen) return null

  const submit = () => {
    const n = name.trim()
    if (!n) {
      setError("Digite um nome para entrar na sala")
      return
    }
    setError("")
    writeStoredUserName(n)
    onComplete(n)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Bem-vindo</h2>
            <p className="text-sm text-muted-foreground">Como quer ser chamado?</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name">Seu nome</Label>
          <Input
            id="display-name"
            autoFocus
            placeholder="Ex.: Ana"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background"
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button className="mt-6 w-full" onClick={submit}>
          Entrar
        </Button>
      </div>
    </div>
  )
}
