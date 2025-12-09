"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Shield, Zap, AlertTriangle, Radio, Activity } from 'lucide-react'

// Script loader helper
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'))
      return
    }
    
    // Check if already loaded
    if ((window as any).THREE) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

interface TokenAlert {
  id: number
  type: 'danger' | 'safe' | 'warning'
  ticker: string
  position: any // THREE.Vector3
  life: number
  element: HTMLDivElement | null
}

interface Beam {
  mesh: any // THREE.Mesh
  life: number
}

const TokenSniperGlobe = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [isThreeLoaded, setIsThreeLoaded] = useState(false)
  const statsRef = useRef<(HTMLDivElement | null)[]>([])
  const popupContainerRef = useRef<HTMLDivElement>(null)
  
  // Real-time counters
  const [rugCount, setRugCount] = useState(0)
  const [safeCount, setSafeCount] = useState(0)
  const [warnCount, setWarnCount] = useState(0)

  // Stats data
  const satellitesData = [
    { label: "TOKENS SCANNED", value: "12,847", color: "#22c55e", angle: 0, radius: 18, icon: Activity },
    { label: "THREATS BLOCKED", value: "1,293", color: "#ef4444", angle: 1.57, radius: 18, icon: AlertTriangle },
    { label: "VOLUME 24H", value: "$428M", color: "#60a5fa", angle: 3.14, radius: 18, icon: Shield },
    { label: "ACTIVE ALERTS", value: "847", color: "#c084fc", angle: 4.71, radius: 18, icon: Zap }
  ]

  // Load Three.js
  useEffect(() => {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(() => setIsThreeLoaded(true))
      .catch((err) => console.error("Three.js load error", err))
  }, [])

  useEffect(() => {
    if (!isThreeLoaded || !mountRef.current || typeof window === 'undefined') return

    const THREE = (window as any).THREE
    if (!THREE) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000000, 0.02)

    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 12, 35)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mountRef.current.appendChild(renderer.domElement)

    // Lighting - BRIGHTER
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    
    const pointLight = new THREE.PointLight(0x22c55e, 3.5, 120)
    pointLight.position.set(10, 10, 20)
    scene.add(pointLight)

    const pointLight2 = new THREE.PointLight(0x3b82f6, 2.5, 120)
    pointLight2.position.set(-10, -5, 15)
    scene.add(pointLight2)
    
    const pointLight3 = new THREE.PointLight(0xfbbf24, 2, 100)
    pointLight3.position.set(0, 20, 10)
    scene.add(pointLight3)

    // Globe group
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)

    // 1. Main sphere - BRIGHTER
    const sphereGeo = new THREE.IcosahedronGeometry(10, 4)
    const sphereMat = new THREE.MeshPhongMaterial({ 
      color: 0x1a1a2e,
      shininess: 40,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0d4d4d,
      emissiveIntensity: 0.3
    })
    const globe = new THREE.Mesh(sphereGeo, sphereMat)
    globeGroup.add(globe)

    // 2. Wireframe grid - BRIGHTER
    const wireMat = new THREE.MeshBasicMaterial({ 
      color: 0x22c55e, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.4 
    })
    const wireframe = new THREE.Mesh(sphereGeo.clone(), wireMat)
    globeGroup.add(wireframe)

    // 3. Particle nodes (cities/hotspots)
    const particlesGeo = new THREE.BufferGeometry()
    const particleCount = 800
    const positions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      const r = 10.15
      positions[i] = r * Math.sin(phi) * Math.cos(theta)
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i + 2] = r * Math.cos(phi)
    }
    
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particlesMat = new THREE.PointsMaterial({ 
      color: 0x34d399, 
      size: 0.18,
      transparent: true,
      opacity: 1.0
    })
    const particleSystem = new THREE.Points(particlesGeo, particlesMat)
    globeGroup.add(particleSystem)

    // Satellites (3D stats indicators)
    const satellites: any[] = []
    satellitesData.forEach((data, i) => {
      const satGeo = new THREE.OctahedronGeometry(0.6)
      const satMat = new THREE.MeshBasicMaterial({ 
        color: data.color, 
        wireframe: true,
        transparent: true,
        opacity: 0.8
      })
      const sat = new THREE.Mesh(satGeo, satMat)
      
      sat.userData = { 
        angle: data.angle, 
        radius: data.radius, 
        speed: 0.004 + (i * 0.001) 
      }
      scene.add(sat)
      satellites.push(sat)
    })

    // Dynamic beams and alerts
    const beamsGroup = new THREE.Group()
    const arcsGroup = new THREE.Group()
    globeGroup.add(beamsGroup)
    globeGroup.add(arcsGroup)

    const activeBeams: Beam[] = []
    const activePopups: TokenAlert[] = []

    // Helper: random point on sphere
    const getPointOnSphere = () => {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      return new THREE.Vector3(
        10 * Math.sin(phi) * Math.cos(theta),
        10 * Math.sin(phi) * Math.sin(theta),
        10 * Math.cos(phi)
      )
    }

    // Create popup alert
    const createPopup = (position: any, type: 'danger' | 'safe' | 'warning', text: string) => {
      const id = Date.now() + Math.random()
      
      const div = document.createElement('div')
      div.className = `absolute px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border-2 shadow-2xl transition-opacity duration-300 pointer-events-none whitespace-nowrap`
      
      if (type === 'danger') {
        div.className += ' bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(248,113,113,0.8)]'
        div.innerHTML = `<div class="flex items-center gap-2"><span class="w-2 h-2 bg-white rounded-full animate-ping"></span> ${text}</div>`
      } else if (type === 'warning') {
        div.className += ' bg-amber-600 border-amber-400 text-white shadow-[0_0_30px_rgba(251,191,36,0.8)]'
        div.innerHTML = `<div class="flex items-center gap-2"><span class="w-2 h-2 bg-white rounded-full animate-pulse"></span> ${text}</div>`
      } else {
        div.className += ' bg-emerald-600 border-emerald-400 text-white shadow-[0_0_30px_rgba(52,211,153,0.8)]'
        div.innerHTML = `<div class="flex items-center gap-2"><span class="w-2 h-2 bg-white rounded-full"></span> ${text}</div>`
      }

      if (popupContainerRef.current) {
        popupContainerRef.current.appendChild(div)
      }

      activePopups.push({
        id,
        type,
        ticker: text,
        position: position.clone(),
        life: 1.0,
        element: div
      })
    }

    // Animation loop
    let frame = 0
    const animate = () => {
      requestAnimationFrame(animate)
      frame++

      // Rotate globe
      globeGroup.rotation.y += 0.0015
      wireframe.rotation.y += 0.001

      // Animate satellites
      satellites.forEach((sat, index) => {
        sat.userData.angle += sat.userData.speed
        const r = sat.userData.radius
        sat.position.x = Math.cos(sat.userData.angle) * r
        sat.position.z = Math.sin(sat.userData.angle) * r
        sat.position.y = Math.sin(sat.userData.angle * 2) * 2.5
        
        sat.rotation.x += 0.015
        sat.rotation.y += 0.015

        // Project to screen for DOM labels
        if (statsRef.current[index] && mountRef.current) {
          const vector = sat.position.clone()
          vector.project(camera)

          const x = (vector.x * 0.5 + 0.5) * mountRef.current.clientWidth
          const y = (-(vector.y * 0.5) + 0.5) * mountRef.current.clientHeight

          const isBehind = vector.z > 0.9
          
          const el = statsRef.current[index]
          if (el) {
            el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
            el.style.opacity = isBehind ? '0.15' : '1'
            el.style.zIndex = isBehind ? '0' : '10'
          }
        }
      })

      // Spawn random token events - MORE FREQUENT
      if (frame % 45 === 0) {
        const pos = getPointOnSphere()
        const rand = Math.random()
        const isDanger = rand > 0.75
        const isWarning = rand > 0.5 && rand <= 0.75
        
        const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 8)
        beamGeo.translate(0, 2.25, 0)
        beamGeo.rotateX(Math.PI / 2)
        
        const beamColor = isDanger ? 0xff3333 : isWarning ? 0xfbbf24 : 0x34d399
        const beamMat = new THREE.MeshBasicMaterial({ 
          color: beamColor, 
          transparent: true,
          opacity: 0.9 
        })
        const beam = new THREE.Mesh(beamGeo, beamMat)
        beam.position.copy(pos)
        beam.lookAt(new THREE.Vector3(0, 0, 0))
        beamsGroup.add(beam)
        
        activeBeams.push({ mesh: beam, life: 1.0 })

        // Create popup
        const ticker = '$' + Math.random().toString(36).substring(2, 6).toUpperCase()
        const alertType = isDanger ? 'danger' : isWarning ? 'warning' : 'safe'
        const alertText = isDanger ? `RUG: ${ticker}` : isWarning ? `WARN: ${ticker}` : `SAFE: ${ticker}`
        createPopup(pos, alertType, alertText)
        
        // Update counters
        if (isDanger) setRugCount(prev => prev + 1)
        else if (isWarning) setWarnCount(prev => prev + 1)
        else setSafeCount(prev => prev + 1)
      }

      // Update beams
      for (let i = activeBeams.length - 1; i >= 0; i--) {
        const b = activeBeams[i]
        b.life -= 0.015
        b.mesh.material.opacity = b.life
        b.mesh.scale.set(1, 1, 1 + (1 - b.life) * 2)
        
        if (b.life <= 0) {
          beamsGroup.remove(b.mesh)
          b.mesh.geometry.dispose()
          b.mesh.material.dispose()
          activeBeams.splice(i, 1)
        }
      }

      // Update popups
      for (let i = activePopups.length - 1; i >= 0; i--) {
        const p = activePopups[i]
        p.life -= 0.006

        if (!mountRef.current) continue

        const worldPos = p.position.clone().applyMatrix4(globeGroup.matrixWorld)
        worldPos.y += (1 - p.life) * 2.5

        const screenPos = worldPos.clone().project(camera)
        const x = (screenPos.x * 0.5 + 0.5) * mountRef.current.clientWidth
        const y = (-(screenPos.y * 0.5) + 0.5) * mountRef.current.clientHeight

        const distance = camera.position.distanceTo(worldPos)
        const isOccluded = distance > 38

        if (p.element) {
          p.element.style.transform = `translate(${x}px, ${y}px)`
          p.element.style.opacity = isOccluded ? '0.1' : String(p.life)
        }
        
        if (p.life <= 0) {
          if (p.element?.parentNode) {
            p.element.parentNode.removeChild(p.element)
          }
          activePopups.splice(i, 1)
        }
      }

      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
      
      // Cleanup popups
      activePopups.forEach(p => {
        if (p.element?.parentNode) {
          p.element.parentNode.removeChild(p.element)
        }
      })
    }
  }, [isThreeLoaded])

  return (
    <div className="relative w-full h-[700px] bg-black overflow-hidden select-none font-mono rounded-2xl border border-white/5">
      {/* 3D Canvas */}
      <div ref={mountRef} className="absolute inset-0 z-0" />
      
      {/* Dynamic Popups Container */}
      <div ref={popupContainerRef} className="absolute inset-0 z-10 pointer-events-none overflow-hidden" />

      {/* Satellite Stats Labels */}
      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
        {satellitesData.map((stat, i) => (
          <div 
            key={i} 
            ref={el => { statsRef.current[i] = el }}
            className="absolute flex items-center gap-3 transition-transform duration-75 will-change-transform"
          >
            {/* Connector Line */}
            <div className={`w-10 h-[1px] ${
              stat.color === '#ef4444' ? 'bg-red-500' : 
              stat.color === '#c084fc' ? 'bg-purple-500' :
              stat.color === '#60a5fa' ? 'bg-blue-500' :
              'bg-emerald-500'
            }`} />
            
            {/* Stats Card */}
            <div className="border-2 p-4 rounded-lg min-w-[160px] hover:scale-105 transition-all backdrop-blur-md" 
                 style={{ 
                   borderColor: stat.color,
                   backgroundColor: 'rgba(255, 255, 255, 0.15)',
                   boxShadow: `0 0 40px ${stat.color}80, 0 8px 32px rgba(0,0,0,0.4), inset 0 0 30px rgba(255,255,255,0.1)`
                 }}>
              <p className="text-[10px] text-white tracking-widest mb-2 uppercase font-bold" 
                 style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {stat.label}
              </p>
              <p 
                className="text-2xl font-bold text-white tracking-tight" 
                style={{ textShadow: `0 0 30px ${stat.color}, 0 0 60px ${stat.color}, 0 2px 8px rgba(0,0,0,0.9)` }}
              >
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Overlays */}
      {/* Scan Lines */}
      <div className="absolute inset-0 z-30 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_3px] opacity-20" />
      
      {/* Vignette - Lighter */}
      <div className="absolute inset-0 z-30 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)] pointer-events-none" />

      {/* Bottom Status Bar with Live Counters */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center z-40">
        <div className="flex items-center gap-4 bg-black/90 backdrop-blur-xl px-6 py-3 rounded-full border-2 border-emerald-400/40 text-xs text-white font-medium tracking-wider shadow-lg shadow-emerald-500/30">
          <div className="flex items-center gap-2">
            <Radio className="animate-pulse text-emerald-400" size={14} />
            <span className="font-bold">LIVE SCAN</span>
          </div>
          <div className="w-px h-4 bg-white/30" />
          
          {/* RUG Counter */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="text-red-400 font-mono font-bold">{rugCount}</span>
            <span className="text-white/60 text-[10px]">RUGS</span>
          </div>
          
          {/* WARN Counter */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-amber-400 font-mono font-bold">{warnCount}</span>
            <span className="text-white/60 text-[10px]">WARN</span>
          </div>
          
          {/* SAFE Counter */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-emerald-400 font-mono font-bold">{safeCount}</span>
            <span className="text-white/60 text-[10px]">SAFE</span>
          </div>
          
          <div className="w-px h-4 bg-white/30" />
          <div className="font-mono text-white/80">SOLANA</div>
        </div>
      </div>
      
      {/* Top Title */}
      <div className="absolute top-6 left-6 z-40">
        <h3 className="text-3xl font-black text-white/40 tracking-[0.4em] select-none pointer-events-none uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          SNIPER.OS
        </h3>
      </div>
    </div>
  )
}

export default TokenSniperGlobe
