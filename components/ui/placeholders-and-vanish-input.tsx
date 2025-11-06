"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import type { ForwardedRef } from "react"
import { cn } from "@/lib/utils"

export interface PlaceholdersAndVanishInputHandle {
  submit: () => void
}

interface PlaceholdersAndVanishInputProps {
  placeholders: string[]
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  className?: string
  showSubmitButton?: boolean
}

interface PixelPoint {
  x: number
  y: number
  r: number
  color: string
}

function PlaceholdersAndVanishInputBase(
  {
    placeholders,
    onChange,
    onSubmit,
    className,
    showSubmitButton = true,
  }: PlaceholdersAndVanishInputProps,
  ref: ForwardedRef<PlaceholdersAndVanishInputHandle>,
) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const [value, setValue] = useState("")
  const [animating, setAnimating] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const newDataRef = useRef<PixelPoint[]>([])

  useImperativeHandle(ref, () => ({
    submit: () => {
      formRef.current?.requestSubmit()
    },
  }))

  const startAnimation = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, 3000)
  }, [placeholders.length])

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    } else if (document.visibilityState === "visible" && !intervalRef.current) {
      startAnimation()
    }
  }, [startAnimation])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    startAnimation()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [handleVisibilityChange, startAnimation])

  const draw = useCallback(() => {
    if (!inputRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = 800
    const height = 800
    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)

    const computedStyles = getComputedStyle(inputRef.current)
    const fontSize = parseFloat(computedStyles.getPropertyValue("font-size"))
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`
    ctx.fillStyle = "#FFF"
    ctx.fillText(value, 16, 40)

    const imageData = ctx.getImageData(0, 0, width, height)
    const pixelData = imageData.data
    const points: PixelPoint[] = []

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        const r = pixelData[index]
        const g = pixelData[index + 1]
        const b = pixelData[index + 2]
        const a = pixelData[index + 3]

        if (r !== 0 || g !== 0 || b !== 0 || a !== 0) {
          points.push({
            x,
            y,
            r: 1,
            color: `rgba(${r}, ${g}, ${b}, ${a})`,
          })
        }
      }
    }

    newDataRef.current = points
  }, [value])

  useEffect(() => {
    draw()
  }, [draw])

  const animate = useCallback((start: number) => {
    const animateFrame = (position = 0) => {
      requestAnimationFrame(() => {
        const updated: PixelPoint[] = []
        for (const point of newDataRef.current) {
          if (point.x < position) {
            updated.push(point)
            continue
          }

          if (point.r <= 0) {
            point.r = 0
            continue
          }

          point.x += Math.random() > 0.5 ? 1 : -1
          point.y += Math.random() > 0.5 ? 1 : -1
          point.r -= 0.05 * Math.random()
          updated.push(point)
        }

        newDataRef.current = updated
        const ctx = canvasRef.current?.getContext("2d")
        if (ctx) {
          ctx.clearRect(position, 0, 800, 800)
          for (const point of newDataRef.current) {
            if (point.x > position) {
              ctx.beginPath()
              ctx.rect(point.x, point.y, point.r, point.r)
              ctx.fillStyle = point.color
              ctx.strokeStyle = point.color
              ctx.stroke()
            }
          }
        }

        if (newDataRef.current.length > 0) {
          animateFrame(position - 8)
        } else {
          setValue("")
          setAnimating(false)
        }
      })
    }

    animateFrame(start)
  }, [])

  const vanishAndSubmit = useCallback(() => {
    setAnimating(true)
    draw()

    const inputValue = inputRef.current?.value || ""
    if (inputValue) {
      let maxX = 0
      for (const point of newDataRef.current) {
        if (point.x > maxX) {
          maxX = point.x
        }
      }
      animate(maxX)
    }
  }, [animate, draw])

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (animating) return
      vanishAndSubmit()
      onSubmit?.(event)
    },
    [animating, onSubmit, vanishAndSubmit],
  )

  return (
    <form
      ref={formRef}
      className={cn(
  "relative mx-auto h-12 w-full max-w-xl overflow-hidden rounded-full bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] transition duration-200 dark:bg-zinc-800",
        value && "bg-gray-50",
        className,
      )}
      onSubmit={handleSubmit}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute left-2 top-[20%] origin-top-left scale-50 text-base filter invert pr-20 pointer-events-none sm:left-8",
          !animating ? "opacity-0" : "opacity-100",
          "dark:invert-0",
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => {
          if (!animating) {
            setValue(event.target.value)
            onChange?.(event)
          }
        }}
        className={cn(
          "relative z-50 h-full w-full rounded-full border-none bg-transparent pl-4 pr-20 text-sm text-black focus:outline-none focus:ring-0 sm:pl-10 sm:text-base dark:text-white",
          animating && "text-transparent dark:text-transparent",
        )}
      />
      {showSubmitButton && (
        <button
          type="submit"
          disabled={!value}
          className="absolute right-2 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black transition duration-200 disabled:bg-gray-100 dark:bg-zinc-900 dark:disabled:bg-zinc-800"
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-gray-300"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <motion.path
              d="M5 12l14 0"
              initial={{ strokeDasharray: "50%", strokeDashoffset: "50%" }}
              animate={{ strokeDashoffset: value ? 0 : "50%" }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
            <path d="M13 18l6 -6" />
            <path d="M13 6l6 6" />
          </motion.svg>
        </button>
      )}

      <div className="pointer-events-none absolute inset-0 flex items-center rounded-full">
        <AnimatePresence mode="wait">
          {!value && (
            <motion.p
              key={`current-placeholder-${currentPlaceholder}`}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.3, ease: "linear" }}
              className="w-[calc(100%-2rem)] truncate pl-4 text-left text-sm font-normal text-neutral-500 sm:pl-12 sm:text-base dark:text-zinc-500"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}

export const PlaceholdersAndVanishInput = forwardRef<PlaceholdersAndVanishInputHandle, PlaceholdersAndVanishInputProps>(
  PlaceholdersAndVanishInputBase,
)

PlaceholdersAndVanishInput.displayName = "PlaceholdersAndVanishInput"
