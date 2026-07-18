import type { CSSProperties } from 'react'

export type SignalRibbonState =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'

export type SignalRibbonProps = Readonly<{
  level?: number
  state?: SignalRibbonState
  label?: string
  compact?: boolean
}>

const BAR_SHAPE = [0.2, 0.34, 0.56, 0.78, 0.46, 0.66, 0.92, 0.58, 0.38, 0.74, 1, 0.62, 0.42, 0.7, 0.9, 0.52, 0.3, 0.48]

function barHeight(level: number, shape: number, state: SignalRibbonState) {
  if (state === 'error') return 7 + shape * 7
  if (state === 'requesting' || state === 'thinking') return 8 + shape * 16
  if (state === 'speaking') return 9 + shape * 22
  return 7 + (5 + level * 24) * shape
}

export function SignalRibbon({
  level = 0,
  state = 'idle',
  label,
  compact = false,
}: SignalRibbonProps) {
  const safeLevel = Math.min(1, Math.max(0, level))

  return (
    <div
      className={`vx-signalRibbon is-${state}${compact ? ' is-compact' : ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="vx-signalRibbonLine" />
      <span className="vx-signalRibbonBars">
        {BAR_SHAPE.map((shape, index) => (
          <i
            // The shape is stable by position and intentionally decorative.
            key={index}
            style={{
              '--vx-bar-height': `${barHeight(safeLevel, shape, state)}px`,
              '--vx-bar-delay': `${index * -45}ms`,
            } as CSSProperties}
          />
        ))}
      </span>
      <span className="vx-signalRibbonDot" />
    </div>
  )
}
