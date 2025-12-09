"use client"

import { motion } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import { AnimatedCounter } from "./animated-counter"

interface MetricCardProps {
  icon: LucideIcon
  title: string
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
  description?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  delay?: number
  gradient?: string
}

export function MetricCard({
  icon: Icon,
  title,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  description,
  trend = "neutral",
  trendValue,
  delay = 0,
  gradient = "from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20",
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 20px 50px rgba(139, 92, 246, 0.15)",
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl transition-all hover:border-white/20"
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition-all group-hover:bg-white/10 group-hover:ring-white/20">
            <Icon className="h-5 w-5 text-white/60 transition-colors group-hover:text-white" />
          </div>
          {trendValue && (
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              trend === "up" ? "bg-emerald-500/10 text-emerald-400" :
              trend === "down" ? "bg-red-500/10 text-red-400" :
              "bg-white/5 text-white/60"
            }`}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-white/50">{title}</p>
          <div className="mt-2 text-3xl font-bold text-white">
            <AnimatedCounter 
              value={value} 
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </div>
          {description && (
            <p className="mt-2 text-xs text-white/40">{description}</p>
          )}
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-violet-500/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
    </motion.div>
  )
}
