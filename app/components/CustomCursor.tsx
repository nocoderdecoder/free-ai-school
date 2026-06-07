'use client'

import { useEffect, useState, useRef } from 'react'

export function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(false)
  const raf = useRef(0)
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    if (isTouchDevice) return

    setVisible(true)

    function onMove(e: MouseEvent) {
      target.current = { x: e.clientX, y: e.clientY }
    }

    function tick() {
      setPos((prev) => ({
        x: prev.x + (target.current.x - prev.x) * 0.15,
        y: prev.y + (target.current.y - prev.y) * 0.15,
      }))
      raf.current = requestAnimationFrame(tick)
    }

    function onOver(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest('[data-cursor]')
      if (el) {
        setHovered(true)
        setLabel(el.getAttribute('data-cursor') || '')
      }
    }

    function onOut(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest('[data-cursor]')
      if (el) {
        setHovered(false)
        setLabel('')
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    window.addEventListener('mouseout', onOut)
    raf.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      window.removeEventListener('mouseout', onOut)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  if (!visible) return null

  return (
    <>
      {/* Outer glow — follows with lag */}
      <div
        className="fixed pointer-events-none z-[9998] rounded-full transition-transform duration-300"
        style={{
          width: hovered ? 64 : 32,
          height: hovered ? 64 : 32,
          transform: `translate(${pos.x - (hovered ? 32 : 16)}px, ${pos.y - (hovered ? 32 : 16)}px)`,
          background: `radial-gradient(circle, var(--accent-glow), transparent 70%)`,
          opacity: 0.6,
        }}
      />
      {/* Label */}
      {hovered && label && (
        <div
          className="fixed pointer-events-none z-[9999] text-[10px] uppercase tracking-widest font-medium"
          style={{
            transform: `translate(${pos.x + 20}px, ${pos.y + 20}px)`,
            color: 'var(--accent)',
          }}
        >
          {label}
        </div>
      )}
    </>
  )
}
