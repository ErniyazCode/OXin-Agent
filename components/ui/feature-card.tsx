"use client"

import { motion } from "framer-motion"
import { type LucideIcon } from "lucide-react"

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  gradient?: string
  delay?: number
  badge?: string
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient = "from-violet-500/20 via-fuchsia-500/20 to-cyan-500/20",
  delay = 0,
  badge,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.3 }
      }}
      className="group relative"
    >
      {/* Glow effect container */}
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-30" />
      
      {/* Card */}
      <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl transition-all duration-300 group-hover:border-white/20">
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
        
        {/* Badge */}
        {badge && (
          <div className="absolute right-6 top-6">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60 ring-1 ring-white/20">
              {badge}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="mb-6 inline-flex rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/20 group-hover:scale-110">
            <Icon className="h-8 w-8 text-white/60 transition-colors duration-300 group-hover:text-white" />
          </div>

          {/* Title */}
          <h3 className="mb-3 text-2xl font-bold text-white transition-all duration-300 group-hover:translate-x-1">
            {title}
          </h3>

          {/* Description */}
          <p className="text-base leading-relaxed text-white/60 transition-colors duration-300 group-hover:text-white/80">
            {description}
          </p>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      </div>
    </motion.div>
  )
}
