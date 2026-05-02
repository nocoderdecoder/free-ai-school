'use client'
import dynamic from 'next/dynamic'

const SpeakingSpeedApp = dynamic(() => import('./SpeakingSpeedApp'), { ssr: false })

export default function SpeakingSpeedPage() {
  return <SpeakingSpeedApp />
}
