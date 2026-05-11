"use client"

import type { ReactNode } from "react"

const URL_RE =
  /\b(https?:\/\/[^\s<>"'{}|\\^`[\]]+|\bwww\.[^\s<>"'{}|\\^`[\]]+)/gi

function safeHttpUrl(href: string): string | null {
  try {
    const u = new URL(href)
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    return u.href
  } catch {
    return null
  }
}

/** Parte texto em nós React: texto simples + links seguros (http/https). */
export function linkifyText(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(URL_RE)) {
    const full = m[0]
    const i = m.index ?? 0
    if (i > last) {
      out.push(text.slice(last, i))
    }
    const hrefCandidate = full.startsWith("www.") ? `https://${full}` : full
    const safe = safeHttpUrl(hrefCandidate)
    if (safe) {
      out.push(
        <a
          key={`l-${i}-${k++}`}
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-primary underline underline-offset-2 hover:opacity-90"
        >
          {full}
        </a>
      )
    } else {
      out.push(full)
    }
    last = i + full.length
  }
  if (last < text.length) {
    out.push(text.slice(last))
  }
  return out.length > 0 ? out : [text]
}

export function LinkifiedMessageBody({ text }: { text: string }) {
  return (
    <span className="inline whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {linkifyText(text)}
    </span>
  )
}
