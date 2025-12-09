"use client"

import { motion, useAnimationControls } from "framer-motion"
import { useEffect, useMemo } from "react"

interface PulseDotsProps {
  count?: number
  color?: string
  size?: number
  spacing?: number
}

export function PulseDots({ 
  count = 3, 
  color = "bg-violet-500",
  size = 8,
  spacing = 4 
}: PulseDotsProps) {
  return (
    <div className="flex items-center gap-${spacing}">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`h-${size} w-${size} rounded-full ${color}`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  )
}

interface FloatingParticlesProps {
  count?: number
  size?: "sm" | "md" | "lg"
  color?: string
  speed?: "slow" | "normal" | "fast"
}

export function FloatingParticles({ 
  count = 20, 
  size = "md",
  color = "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20",
  speed = "normal"
}: FloatingParticlesProps) {
  const sizes = { sm: "w-1 h-1", md: "w-2 h-2", lg: "w-3 h-3" }
  const speeds = { slow: 30, normal: 20, fast: 10 }
  
  // Generate consistent positions using useMemo to avoid hydration errors
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: (i * 37.5 + 12.3) % 100, // Deterministic positions
      top: (i * 47.2 + 23.1) % 100,
      duration: speeds[speed] + (i % 10),
      delay: (i % 5),
    }))
  }, [count, speed, speeds])
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute ${sizes[size]} ${color}`}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            borderRadius: "50%",
            filter: "blur(4px)",
          }}
          animate={{
            y: [-20, -40, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

interface GradientBorderProps {
  children: React.ReactNode
  className?: string
  borderWidth?: number
  animated?: boolean
}

export function GradientBorder({ 
  children, 
  className = "",
  borderWidth = 2,
  animated = true 
}: GradientBorderProps) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 opacity-75 blur-sm"
        animate={animated ? {
          rotate: [0, 360],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="relative rounded-3xl bg-black">
        {children}
      </div>
    </div>
  )
}

interface ShimmerEffectProps {
  children: React.ReactNode
  className?: string
}

export function ShimmerEffect({ children, className = "" }: ShimmerEffectProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {children}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{
          translateX: ["100%", "-100%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  )
}

interface CounterAnimationProps {
  value: number
  duration?: number
  className?: string
}

export function CounterAnimation({ value, duration = 2000, className = "" }: CounterAnimationProps) {
  const controls = useAnimationControls()
  
  useEffect(() => {
    controls.start({
      opacity: [0, 1],
      y: [20, 0],
    })
  }, [value, controls])

  return (
    <motion.span
      className={className}
      animate={controls}
      transition={{ duration: duration / 1000 }}
    >
      {value}
    </motion.span>
  )
}
