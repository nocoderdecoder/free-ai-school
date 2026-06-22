'use client'

import { useState, useRef } from 'react'

type Variant = 'dark' | 'light'

// Simple markdown-to-JSX renderer for tool output
function RenderResult({ text, variant = 'dark' }: { text: string; variant?: Variant }) {
  const isLight = variant === 'light'
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  const h3Class = isLight ? 'font-serif text-lg mt-6 mb-2' : 'text-lg font-bold text-white mt-6 mb-2'
  const h3Style = isLight ? { color: 'var(--ed-text-dark)', fontWeight: 400 } : undefined

  const h4Class = isLight ? 'text-base font-semibold mt-4 mb-1' : 'text-base font-semibold text-white/90 mt-4 mb-1'
  const h4Style = isLight ? { color: 'var(--ed-text-dark)' } : undefined

  const listRowClass = isLight ? 'flex gap-3 text-sm leading-relaxed' : 'flex gap-3 text-white/70 text-sm leading-relaxed'
  const listRowStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const listMarkerClass = isLight ? 'shrink-0 mt-0.5' : 'text-white/30 shrink-0 mt-0.5'
  const listMarkerStyle = isLight ? { color: 'var(--ed-text-light)' } : undefined

  const boldLineClass = isLight ? 'text-sm' : 'font-semibold text-white text-sm'
  const boldLineStyle = isLight ? { color: 'var(--ed-text)', fontWeight: 600 } : undefined

  const paragraphClass = isLight ? 'text-sm leading-relaxed' : 'text-white/70 text-sm leading-relaxed'
  const paragraphStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-3" />)
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={key++} className={h3Class} style={h3Style}>{line.slice(3)}</h3>)
    } else if (line.startsWith('### ')) {
      elements.push(<h4 key={key++} className={h4Class} style={h4Style}>{line.slice(4)}</h4>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} className={listRowClass} style={listRowStyle}>
          <span className={listMarkerClass} style={listMarkerStyle}>—</span>
          <span>{renderInline(line.slice(2), variant)}</span>
        </div>
      )
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={key++} className={boldLineClass} style={boldLineStyle}>{line.slice(2, -2)}</p>)
    } else {
      elements.push(<p key={key++} className={paragraphClass} style={paragraphStyle}>{renderInline(line, variant)}</p>)
    }
  }
  return <div className="space-y-1">{elements}</div>
}

function renderInline(text: string, variant: Variant = 'dark'): React.ReactNode {
  const isLight = variant === 'light'
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? (
              <strong key={i} className={isLight ? 'font-semibold' : 'font-semibold text-white'} style={isLight ? { color: 'var(--ed-text)' } : undefined}>
                {part.slice(2, -2)}
              </strong>
            )
          : part
      )}
    </>
  )
}

type ToolShellProps = {
  name: string
  description: string
  estimatedTime?: string
  variant?: Variant
  children: (props: {
    onSubmit: (fetchPromise: Promise<Response>) => void
    isLoading: boolean
    isComplete: boolean
  }) => React.ReactNode
}

export function ToolShell({ name, description, estimatedTime, variant = 'dark', children }: ToolShellProps) {
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  const isLight = variant === 'light'

  const cardClass = isLight ? 'rounded-xl p-6 mb-6' : 'border border-white/10 rounded-xl p-6 mb-6'
  const cardStyle = isLight ? { background: 'var(--ed-card-warm)', border: '1px solid var(--ed-border)' } : { backgroundColor: 'var(--ed-card-warm)' }

  const loadingCardClass = isLight ? 'rounded-xl p-8 text-center mb-6' : 'border border-white/10 rounded-xl p-8 text-center mb-6'
  const loadingTextClass = isLight ? 'flex items-center justify-center gap-3' : 'flex items-center justify-center gap-3 text-white/40'
  const loadingTextStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const errorClass = isLight
    ? 'border rounded-xl p-6 mb-6 text-sm border-red-300 bg-red-50 text-red-700'
    : 'border border-red-500/20 bg-red-500/5 rounded-xl p-6 mb-6 text-red-400 text-sm'

  const resultHeaderClass = isLight ? 'flex items-center justify-between mb-5 pb-4' : 'flex items-center justify-between mb-5 pb-4 border-b border-white/10'
  const resultHeaderStyle = isLight ? { borderBottom: '1px solid var(--ed-border)' } : undefined

  const statusLabelClass = isLight ? 'text-xs uppercase tracking-widest' : 'text-xs text-white/40 uppercase tracking-widest'
  const statusLabelStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const copyButtonClass = isLight ? 'text-xs transition' : 'text-xs text-white/30 hover:text-white transition'
  const copyButtonStyle = isLight ? { color: 'var(--ed-text-faint)' } : undefined

  const backLinkClass = isLight ? 'section-label mb-8 inline-block transition' : 'section-label mb-8 inline-block hover:text-white transition'
  const backLinkStyle = isLight ? { color: 'var(--ed-text-muted)' } : undefined

  const descriptionClass = isLight ? 'text-xl leading-relaxed' : 'text-white/60 text-xl leading-relaxed'
  const descriptionStyle = isLight ? { color: 'var(--ed-text-secondary)' } : undefined

  const estimatedTimeClass = isLight ? 'text-sm mt-2' : 'text-white/25 text-sm mt-2'
  const estimatedTimeStyle = isLight ? { color: 'var(--ed-text-light)' } : undefined

  const tryAnotherClass = isLight ? 'px-6 py-3 rounded-full text-sm font-medium transition btn-press' : 'border border-white/20 px-6 py-3 rounded-full text-sm font-medium hover:border-white/40 transition btn-press'
  const tryAnotherStyle = isLight ? { border: '1px solid var(--ed-border)', color: 'var(--ed-text)' } : undefined

  const seeAllClass = isLight ? 'px-4 py-3 text-sm transition' : 'text-white/30 px-4 py-3 text-sm hover:text-white transition'
  const seeAllStyle = isLight ? { color: 'var(--ed-text-faint)' } : undefined

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
      <a href="/tools" className={backLinkClass} style={backLinkStyle}>← Tools</a>

      <div className="mt-4 mb-10">
        <h1 className="heading-page mb-3">{name}</h1>
        <p className={descriptionClass} style={descriptionStyle}>{description}</p>
        {estimatedTime && (
          <p className={estimatedTimeClass} style={estimatedTimeStyle}>{estimatedTime}</p>
        )}
      </div>

      {!isComplete && (
        <div className={cardClass} style={cardStyle}>
          {children({ onSubmit: handleSubmit, isLoading, isComplete })}
        </div>
      )}

      {isLoading && !result && (
        <div className={loadingCardClass} style={cardStyle}>
          <div className={loadingTextClass} style={loadingTextStyle}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:0.4s]" />
            <span className="text-sm ml-2">Claude is thinking…</span>
          </div>
        </div>
      )}

      {error && (
        <div className={errorClass}>{error}</div>
      )}

      {result && (
        <div ref={resultRef} className={cardClass} style={cardStyle}>
          <div className={resultHeaderClass} style={resultHeaderStyle}>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={statusLabelClass} style={statusLabelStyle}>Generating…</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className={statusLabelClass} style={statusLabelStyle}>Complete</span>
                </>
              )}
            </div>
            {isComplete && (
              <button onClick={() => navigator.clipboard?.writeText(result)} className={copyButtonClass} style={copyButtonStyle}>
                Copy
              </button>
            )}
          </div>
          <RenderResult text={result} variant={variant} />
        </div>
      )}

      {isComplete && (
        <div className="flex gap-4">
          <button onClick={handleReset} className={tryAnotherClass} style={tryAnotherStyle}>
            ← Try another
          </button>
          <a href="/tools" className={seeAllClass} style={seeAllStyle}>
            See all tools
          </a>
        </div>
      )}
    </div>
  )
}
