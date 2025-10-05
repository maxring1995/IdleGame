'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleSystemProps {
  position: [number, number, number]
  color: string
  count?: number
  size?: number
  spread?: number
  speed?: number
}

export default function ParticleSystem({
  position,
  color,
  count = 30,
  size = 0.02,
  spread = 0.3,
  speed = 0.5
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)

  // Generate particle positions
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread
    }

    return positions
  }, [count, spread])

  // Animate particles
  useFrame((state) => {
    if (!pointsRef.current) return

    const time = state.clock.getElapsedTime()
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Circular floating motion
      const angle = time * speed + i * 0.2
      const radius = spread * 0.5

      positions[i3] = Math.sin(angle) * radius
      positions[i3 + 1] = Math.sin(time * speed * 0.5 + i * 0.1) * spread * 0.8
      positions[i3 + 2] = Math.cos(angle) * radius
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true

    // Rotate the entire particle system
    pointsRef.current.rotation.y = time * 0.3
  })

  return (
    <points ref={pointsRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
