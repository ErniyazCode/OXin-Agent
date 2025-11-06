"use client"

import { useEffect, useRef } from "react"

interface GradientBlurProps {
  radius?: number
  opacityDecay?: number
  backgroundColor?: string
  color?: [number, number, number]
  colorGenerator?: () => [number, number, number]
}

export function GradientBlur({
  radius = 60,
  opacityDecay = 0.025,
  backgroundColor = "transparent",
  color,
  colorGenerator,
}: GradientBlurProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const prevMouseRef = useRef({ x: 0, y: 0 })
  const circsRef = useRef<
    Array<{
      col: [number, number, number]
      x: number
      y: number
      alpha: number
    }>
  >([])

  const defaultColorGenerator = () => {
    const rgb: [number, number, number] = [
      Math.floor(Math.random() * 130 + 10),
      Math.floor(0.5 * Math.random() * 50),
      Math.floor(0.5 * Math.random() * 255),
    ]
    return rgb
  }

  const getColor = () => color || colorGenerator?.() || defaultColorGenerator()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Отключаем на мобильных устройствах для лучшей производительности
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
    if (isMobile) {
      // На мобильных просто рисуем пустой canvas
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      return
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()

    const draw = () => {
      ctx.globalCompositeOperation = "source-over"
      if (backgroundColor === "transparent") {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      } else {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.globalCompositeOperation = "lighter"

      // Создаем след - новые точки только при движении мыши
      const dx = mouseRef.current.x - prevMouseRef.current.x
      const dy = mouseRef.current.y - prevMouseRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Создаем точки следа через небольшие интервалы при движении
      if (distance > 3) {
        const obj = {
          col: getColor(),
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          alpha: 0.8, // Немного меньше для следа
        }
        circsRef.current.push(obj)
        
        prevMouseRef.current.x = mouseRef.current.x
        prevMouseRef.current.y = mouseRef.current.y
      }

      // Рисуем все точки следа (которые затухают)
      const toRemove: number[] = []
      for (let i = 0; i < circsRef.current.length; i++) {
        const circ = circsRef.current[i]

        // Создаем градиент для каждой точки при отрисовке
        const grdblur = ctx.createRadialGradient(
          circ.x,
          circ.y,
          0,
          circ.x,
          circ.y,
          radius,
        )
        grdblur.addColorStop(0, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.95)`)
        grdblur.addColorStop(0.2, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.7)`)
        grdblur.addColorStop(0.5, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.3)`)
        grdblur.addColorStop(1, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0)`)

        ctx.beginPath()
        ctx.fillStyle = grdblur
        ctx.globalAlpha = circ.alpha
        ctx.arc(circ.x, circ.y, radius, 0, Math.PI * 2)
        ctx.fill()

        circ.alpha -= opacityDecay
        if (circ.alpha <= 0) toRemove.push(i)
      }

      for (let i = toRemove.length - 1; i >= 0; i--) {
        circsRef.current.splice(toRemove[i], 1)
      }

      // Рисуем основное постоянное свечение под курсором (не затухает)
      const mainGlow = ctx.createRadialGradient(
        mouseRef.current.x,
        mouseRef.current.y,
        0,
        mouseRef.current.x,
        mouseRef.current.y,
        radius,
      )
      const mainColor = getColor()
      mainGlow.addColorStop(0, `rgba(${mainColor[0]},${mainColor[1]},${mainColor[2]},0.95)`)
      mainGlow.addColorStop(0.2, `rgba(${mainColor[0]},${mainColor[1]},${mainColor[2]},0.7)`)
      mainGlow.addColorStop(0.5, `rgba(${mainColor[0]},${mainColor[1]},${mainColor[2]},0.3)`)
      mainGlow.addColorStop(1, `rgba(${mainColor[0]},${mainColor[1]},${mainColor[2]},0)`)
      
      ctx.beginPath()
      ctx.fillStyle = mainGlow
      ctx.globalAlpha = 1
      ctx.arc(mouseRef.current.x, mouseRef.current.y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 1
      requestAnimationFrame(draw)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Убираем preventDefault чтобы не блокировать скролл на мобильных
      mouseRef.current.x = e.touches[0].clientX
      mouseRef.current.y = e.touches[0].clientY
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("resize", resizeCanvas)

    draw()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [radius, opacityDecay, backgroundColor, color, colorGenerator])

  return (
    <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ background: "transparent" }} />
  )
}
