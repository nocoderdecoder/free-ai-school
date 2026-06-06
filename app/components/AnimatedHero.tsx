'use client'

import { motion } from 'framer-motion'

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
}

export function AnimatedHero({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      className="relative max-w-3xl mx-auto px-8 pt-32 pb-24"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="hero-gradient" />
      <div className="relative z-10">{children}</div>
    </motion.section>
  )
}

export function HeroItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  )
}
