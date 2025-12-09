"use client"

import { motion } from "framer-motion"
import { Circle } from "lucide-react"

interface StatusBadgeProps {
  status: "operational" | "degraded" | "down"
  text?: string
  showPulse?: boolean
}

export function StatusBadge({ status, text, showPulse = true }: StatusBadgeProps) {
  const statusConfig = {
    operational: {
      color: "emerald",
      text: text || "System Operational",
      bgClass: "bg-emerald-500/10",
      textClass: "text-emerald-400",
      ringClass: "ring-emerald-500/20",
    },
    degraded: {
      color: "amber",
      text: text || "Degraded Performance",
      bgClass: "bg-amber-500/10",
      textClass: "text-amber-400",
      ringClass: "ring-amber-500/20",
    },
    down: {
      color: "red",
      text: text || "Service Down",
      bgClass: "bg-red-500/10",
      textClass: "text-red-400",
      ringClass: "ring-red-500/20",
    },
  }

  const config = statusConfig[status]

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 rounded-full ${config.bgClass} px-4 py-2 ring-1 ${config.ringClass}`}
    >
      <span className="relative flex h-2 w-2">
        <Circle className={`h-2 w-2 fill-current ${config.textClass}`} />
        {showPulse && status === "operational" && (
          <>
            <motion.span
              className={`absolute inline-flex h-full w-full rounded-full ${config.bgClass}`}
              animate={{ scale: [1, 2, 2], opacity: [0.5, 0, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.span
              className={`absolute inline-flex h-full w-full rounded-full ${config.bgClass}`}
              animate={{ scale: [1, 2, 2], opacity: [0.5, 0, 0] }}
              transition={{ duration: 2, delay: 1, repeat: Infinity }}
            />
          </>
        )}
      </span>
      <span className={`text-sm font-medium ${config.textClass}`}>{config.text}</span>
    </motion.span>
  )
}
