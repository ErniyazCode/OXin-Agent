"use client"

import { motion } from "framer-motion"
import { Quote } from "lucide-react"

interface TestimonialCardProps {
  quote: string
  author: string
  role?: string
  tested?: string
  avatar?: string
  delay?: number
}

export function TestimonialCard({
  quote,
  author,
  role,
  tested,
  avatar,
  delay = 0,
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
      className="group relative h-full"
    >
      {/* Glow effect */}
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-20" />
      
      <div className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl transition-all duration-300 group-hover:border-white/20">
        {/* Badge */}
        {tested && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Tested: {tested}
            </span>
          </div>
        )}

        {/* Quote icon */}
        <div className="mb-4 opacity-20">
          <Quote className="h-8 w-8 text-white" />
        </div>

        {/* Quote */}
        <blockquote className="mb-6 flex-1 text-base leading-relaxed text-white/80">
          "{quote}"
        </blockquote>

        {/* Author */}
        <div className="flex items-center gap-3">
          {avatar ? (
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-white/10">
              <img src={avatar} alt={author} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
              {author.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-white">{author}</p>
            {role && <p className="text-sm text-white/50">{role}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
