'use client'
import { useEffect, useRef } from 'react'

export function CursorSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = spotlightRef.current
    if (!el) return

    const handleMouseMove = (e: MouseEvent) => {
      el.style.background = `radial-gradient(700px circle at ${e.clientX}px ${e.clientY}px, rgba(100, 140, 255, 0.08), transparent 40%)`
    }

    // Default position: upper-center of viewport
    el.style.background = `radial-gradient(700px circle at 50vw 30vh, rgba(100, 140, 255, 0.06), transparent 40%)`

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <>
      {/* Cursor spotlight glow */}
      <div ref={spotlightRef} className="pointer-events-none fixed inset-0 z-50" />
      {/* Film grain noise texture */}
      <div className="noise-overlay" />
    </>
  )
}
