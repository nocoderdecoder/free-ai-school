'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const duration = 1500
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

interface Metric {
  value: number
  suffix?: string
  label: string
}

export function MetricsStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <motion.div
      className="border-y py-8"
      style={{ borderColor: 'var(--ed-border)' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-3xl mx-auto px-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <p className="text-2xl font-bold tracking-tight">
              <AnimatedNumber value={metric.value} suffix={metric.suffix} />
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--ed-text-faint)' }}>
              {metric.label}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
