"use client"

import { useScroll, useTransform, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

interface TimelineEntry {
  title: string
  content: React.ReactNode
}

interface TimelineProps {
  data: TimelineEntry[]
  heading?: React.ReactNode
  description?: React.ReactNode
  className?: string
}

export const Timeline = ({ data, heading, description, className }: TimelineProps) => {
  const barRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!barRef.current) {
      return
    }

    const measure = () => {
      const rect = barRef.current?.getBoundingClientRect()
      setHeight(rect?.height ?? 0)
    }

    measure()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const resizeObserver = new ResizeObserver(measure)

    resizeObserver.observe(barRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  })

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])

  const itemVariants = {
    hidden: { opacity: 0, y: 48, scale: 0.96 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.85,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    }),
  }

  return (
    <section ref={containerRef} className={className}>
      {(heading || description) && (
        <div className="mx-auto mb-10 max-w-7xl px-4 md:px-8 lg:px-10">
          {heading}
          {description}
        </div>
      )}

      <div ref={barRef} className="relative mx-auto max-w-7xl pb-20">
        {data.map((item, index) => (
          <motion.div
            key={item.title + index.toString()}
            className="flex justify-start pt-10 md:gap-10 md:pt-36"
            custom={index}
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.25 }}
          >
            <div className="sticky top-40 z-40 flex max-w-xs flex-col items-center self-start md:w-full md:max-w-sm md:flex-row">
              <div className="absolute left-3 h-10 w-10 rounded-full bg-background/90 shadow-[0_12px_30px_rgba(5,10,25,0.55)] md:left-3" />
              <div className="absolute left-5 h-6 w-6 rounded-full border-2 border-emerald-400/80 bg-emerald-400/30 shadow-[0_0_20px_rgba(52,211,153,0.4)] md:left-5" />
              <h3 className="hidden text-4xl font-semibold tracking-tight text-white/90 md:block md:pl-16">
                {item.title}
              </h3>
            </div>

            <div className="relative w-full pl-20 pr-4 md:pl-4">
              <h3 className="mb-4 block text-2xl font-semibold tracking-tight text-white/90 md:hidden">{item.title}</h3>
              {item.content}
            </div>
          </motion.div>
        ))}
        <div
          style={{ height: `${height}px` }}
          className="absolute left-8 top-0 w-0.5 bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent via-white/20 to-transparent mask-[linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] md:left-8"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="absolute inset-x-0 top-0 w-0.5 rounded-full bg-linear-to-t from-emerald-400 via-cyan-400/60 to-transparent"
          />
        </div>
      </div>
    </section>
  )
}

export type { TimelineEntry }
