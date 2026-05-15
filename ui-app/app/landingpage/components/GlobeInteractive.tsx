"use client"

import { useEffect, useRef, useCallback } from "react"
import createGlobe from "cobe"

interface InteractiveMarker {
  id: string
  location: [number, number]
  name: string
  users: number
}

interface GlobeInteractiveProps {
  markers?: InteractiveMarker[]
  className?: string
  speed?: number
}

const defaultMarkers: InteractiveMarker[] = [
  { id: "hq", location: [40.71, -74.00], name: "New York", users: 1420 },
  { id: "eu", location: [51.50, -0.12], name: "London", users: 892 },
  { id: "asia", location: [35.68, 139.65], name: "Tokyo", users: 2103 },
  { id: "latam", location: [-23.55, -46.63], name: "São Paulo", users: 567 },
  { id: "mena", location: [25.20, 55.27], name: "Dubai", users: 734 },
  { id: "oceania", location: [-33.87, 151.21], name: "Sydney", users: 445 },
]

// Convert lat/lng to 3D unit vector (cobe's coordinate system)
function latLngTo3D(lat: number, lng: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return {
    x: -Math.sin(phi) * Math.cos(theta),
    y: Math.cos(phi),
    z: Math.sin(phi) * Math.sin(theta),
  }
}

// Rotate vector around Y axis by angle (globe rotation)
function rotateY(v: { x: number; y: number; z: number }, angle: number) {
  return {
    x: v.x * Math.cos(angle) + v.z * Math.sin(angle),
    y: v.y,
    z: -v.x * Math.sin(angle) + v.z * Math.cos(angle),
  }
}

// Rotate vector around X axis by angle (globe tilt = theta)
function rotateX(v: { x: number; y: number; z: number }, angle: number) {
  return {
    x: v.x,
    y: v.y * Math.cos(angle) - v.z * Math.sin(angle),
    z: v.y * Math.sin(angle) + v.z * Math.cos(angle),
  }
}

export function GlobeInteractive({
  markers = defaultMarkers,
  className = "",
  speed = 0.003,
}: GlobeInteractiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)

  // Label positions projected to 2D
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let phi = 0
    let isMounted = true

    function updateLabels() {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      if (width === 0) return

      const currentPhi = phi + phiOffsetRef.current + dragOffset.current.phi
      const currentTheta = 0.2 + thetaOffsetRef.current + dragOffset.current.theta

      markers.forEach((m, i) => {
        let v = latLngTo3D(m.location[0], m.location[1])
        v = rotateY(v, currentPhi)
        v = rotateX(v, currentTheta)

        const x = (v.x * 0.5 + 0.5) * width
        const y = (1 - (v.y * 0.5 + 0.5)) * height
        const visible = v.z > 0.1

        const el = labelRefs.current[i]
        if (el) {
          el.style.transform = `translate(calc(-50% + ${x}px), calc(-170% + ${y}px))`
          el.style.opacity = visible ? "1" : "0"
        }
      })
      // No recursive RAF — called directly from animate()
    }

    function init() {
      if (!isMounted) return
      const width = canvas.offsetWidth
      if (width === 0) return
      if (globe) return

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width, height: width,
        phi: 0, theta: 0.2, dark: 0, diffuse: 1.5,
        mapSamples: 16000, mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [79 / 255, 70 / 255, 229 / 255],
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0,
        markers: markers.map((m) => ({ location: m.location, size: 0.08, id: m.id })),
        arcs: [],
        opacity: 0.7,
      })

      function animate() {
        if (!isMounted) return
        if (!isPausedRef.current) phi += speed
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        })
        updateLabels() // synchronized in same RAF frame — single loop
        animationId = requestAnimationFrame(animate)
      }
      animate()
      setTimeout(() => isMounted && canvas && (canvas.style.opacity = "1"))
    }

    let ro: ResizeObserver | null = null
    if (canvas.offsetWidth > 0) {
      init()
    } else {
      ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          if (ro) ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      isMounted = false
      if (ro) ro.disconnect()
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) {
        globe.destroy()
        globe = null
      }
    }
  }, [markers, speed])

  return (
    <div className={`relative select-none ${className}`} style={{ aspectRatio: "1 / 1" }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%", height: "100%", cursor: "grab", opacity: 0,
          transition: "opacity 1.2s ease", borderRadius: "50%", touchAction: "none",
          display: "block",
        }}
      />

      {/* Floating Country Labels */}
      {markers.map((m, i) => (
          <div
            key={m.id}
            ref={(el) => { labelRefs.current[i] = el }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: "translate(-50%, -170%)",
              pointerEvents: "none",
              opacity: 0,
              transition: "opacity 0.3s ease",
            }}
          >
            {/* Dark pill badge */}
            <div
              style={{
                background: "#1a1a2e",
                color: "#fff",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "monospace",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                whiteSpace: "nowrap",
              }}
            >
              {m.name}
            </div>
            {/* Connector dot */}
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#6366f1",
                margin: "2px auto 0",
                boxShadow: "0 0 6px rgba(99,102,241,0.8)",
              }}
            />
          </div>
      ))}
    </div>
  )
}
