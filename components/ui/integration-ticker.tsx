"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface Integration {
  name: string
  logo: string
  type?: string
}

interface IntegrationTickerProps {
  integrations: Integration[]
  direction?: "left" | "right"
  speed?: number
}

export function IntegrationTicker({ 
  integrations, 
  direction = "left",
  speed = 30 
}: IntegrationTickerProps) {
  const duplicatedIntegrations = [...integrations, ...integrations]

  return (
    <div className="relative w-full overflow-hidden py-12">
      {/* Gradient overlays */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-32 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-32 bg-gradient-to-l from-black to-transparent" />

      <motion.div
        className="flex gap-8"
        animate={{
          x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {duplicatedIntegrations.map((integration, index) => (
          <div
            key={`${integration.name}-${index}`}
            className="group flex flex-shrink-0 flex-col items-center gap-3"
          >
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/10 group-hover:scale-110">
              <div className="relative h-full w-full">
                {integration.logo.startsWith('http') ? (
                  <Image
                    src={integration.logo}
                    alt={integration.name}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/80">
                    {integration.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/80 transition-colors group-hover:text-white">
                {integration.name}
              </p>
              {integration.type && (
                <p className="text-xs text-white/40">{integration.type}</p>
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
