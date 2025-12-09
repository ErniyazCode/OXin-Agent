"use client"

import { motion } from "framer-motion"
import { Check, Sparkles } from "lucide-react"
import { Button } from "./button"

interface PricingCardProps {
  name: string
  price: string
  currency?: string
  period?: string
  description: string
  features: string[]
  popular?: boolean
  ctaText?: string
  onSelect?: () => void
  delay?: number
}

export function PricingCard({
  name,
  price,
  currency = "SOL",
  period = "per month",
  description,
  features,
  popular = false,
  ctaText = "Get Started",
  onSelect,
  delay = 0,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8 }}
      className={`group relative ${popular ? "scale-105" : ""}`}
    >
      {/* Popular badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.3 }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg"
          >
            <Sparkles className="h-3 w-3" />
            MOST POPULAR
          </motion.div>
        </div>
      )}

      {/* Glow effect */}
      <div className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-r ${
        popular 
          ? "from-violet-600 via-fuchsia-600 to-cyan-600 opacity-30 blur-xl" 
          : "from-violet-600 to-fuchsia-600 opacity-0 blur-lg"
      } transition-opacity duration-500 group-hover:opacity-30`} />
      
      <div className={`relative flex h-full flex-col overflow-hidden rounded-3xl border backdrop-blur-xl transition-all duration-300 ${
        popular
          ? "border-white/20 bg-black/60"
          : "border-white/10 bg-black/40 group-hover:border-white/20"
      }`}>
        {/* Header */}
        <div className="p-8 pb-6">
          <h3 className="text-2xl font-bold text-white">{name}</h3>
          <p className="mt-2 text-sm text-white/60">{description}</p>
          
          {/* Price */}
          <div className="mt-6">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">{price}</span>
              <span className="text-xl font-semibold text-white/60">{currency}</span>
            </div>
            <p className="mt-1 text-sm text-white/40">{period}</p>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 border-t border-white/10 p-8">
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: delay + 0.1 + index * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 ring-1 ring-emerald-500/20">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-sm text-white/80">{feature}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="p-8 pt-0">
          <Button
            onClick={onSelect}
            className={`w-full ${
              popular
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                : "bg-white/5 hover:bg-white/10"
            } border-0 text-white transition-all`}
            size="lg"
          >
            {ctaText}
          </Button>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      </div>
    </motion.div>
  )
}
