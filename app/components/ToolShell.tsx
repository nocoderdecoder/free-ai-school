'use client'

import { useState, useRef, useEffect } from 'react'

// Simple markdown-to-JSX renderer for tool output
function RenderResult({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-3" />)
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-bold text-white mt-6 mb-2">
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key++} className="text-base font-semibold text-white/90 mt-4 mb-1">
          {line.slice(4)}
        </h4>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} className="flex gap-3 text-white/70 text-sm leading-relaxed">
          <span className="text-white/30 shrink-0 mt-0.5">—</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(
        <p key={key++} className="font-semibold text-white text-sm">
          {line.slice(2, -2)}
        </p>
      )
    } else {
      elements.push(
        <p key={key++} className="text-white/70 text-sm leading-relaxed">
          {renderInline(line)}
        </p>
      )
    }
  }
  return <div className="space-y-1">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  )
}

type ToolShellProps = {
  name: string
  description: string
  estimatedTime?: string
  children: (props: {
    onSubmit: (fetchPromise: Promise<Response>) => void
    isLoading: boolean
    isComplete: boolean
  }) => React.ReactNode
}

export function ToolShell({ name, description, estimatedTime, children }: ToolShellProps) {
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (fetchPromise: Promise<Response>) => {
    setResult('')
    setError('')
    setIsLoading(true)
    setIsComplete(false)

    try {
      const response = await fetchPromise
      if (!response.ok) {
        const err = await response.text()
        setError(err || 'Something went wrong. Please try again.')
        setIsLoading(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) {
        setError('No response stream available.')
        setIsLoading(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setResult(prev => prev + chunk)
        // Scroll result into view as it streams
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    } catch (e) {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
      setIsComplete(true)
    }
  }

  const handleReset = () => {
    setResult('')
    setError('')
    setIsLoading(false)
    setIsComplete(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-8 pt-28 pb-32">
      {/* Back link */}
      <a href="/tools" className="section-label mb-8 inline-block hover:text-white transition">
        ← Tools
      </a>

      {/* Tool header */}
      <div className="mt-4 mb-10">
        <h1 className="heading-page mb-3">{name}</h1>
        <p className="text-white/60 text-xl leading-relaxed">{description}</p>
        {estimatedTime && (
          <p className="text-white/25 text-sm mt-2">{estimatedTime}</p>
        )}
      </div>

      {/* Form — always visible unless complete */}
      {!isComplete && (
        <div className="border border-white/10 rounded-xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          {children({ onSubmit: handleSubmit, isLoading, isComplete })}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !result && (
        <div className="border border-white/10 rounded-xl p-8 text-center mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center justify-center gap-3 text-white/40">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.4s]" />
            <span className="text-sm ml-2">Claude is thinking…</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Streaming result */}
      {result && (
        <div ref={resultRef} className="border border-white/10 rounded-xl p-6 mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          {/* Result header */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-white/40 uppercase tracking-widest">Generating…</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-white/40 uppercase tracking-widest">Complete</span>
                </>
              )}
            </div>
            {isComplete && (
              <button
                onClick={() => navigator.clipboard?.writeText(result)}
                className="text-xs text-white/30 hover:text-white transition"
              >
                Copy
              </button>
            )}
          </div>
          <RenderResult text={result} />
        </div>
      )}

      {/* Try another button */}
      {isComplete && (
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="border border-white/20 px-6 py-3 rounded-full text-sm font-medium hover:border-white/40 transition btn-press"
          >
            ← Try another
          </button>
          <a
            href="/tools"
            className="text-white/30 px-4 py-3 text-sm hover:text-white transition"
          >
            See all tools
          </a>
        </div>
      )}
    </div>
  )
}
