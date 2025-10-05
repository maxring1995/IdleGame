'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import CharacterModel from './CharacterModel'

interface Character3DViewerProps {
  characterId: string
  size?: number
  interactive?: boolean
  autoRotate?: boolean
  showControls?: boolean
}

export default function Character3DViewer({
  characterId,
  size = 128,
  interactive = false,
  autoRotate = true,
  showControls = false,
}: Character3DViewerProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700"
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} fov={45} />

        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />
        <pointLight position={[0, 2, 0]} intensity={0.2} color="#88ccff" />

        {/* Character model */}
        <Suspense fallback={null}>
          <CharacterModel characterId={characterId} />
        </Suspense>

        {/* Ground plane for shadow */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.2} />
        </mesh>

        {/* Camera controls */}
        {(interactive || showControls) && (
          <OrbitControls
            enableZoom={interactive}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={2}
            minDistance={1.5}
            maxDistance={4}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
            target={[0, 0.5, 0]}
          />
        )}

        {/* Auto-rotate for non-interactive views */}
        {!interactive && !showControls && autoRotate && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            autoRotate={true}
            autoRotateSpeed={2}
            target={[0, 0.5, 0]}
          />
        )}
      </Canvas>

      {/* Loading indicator */}
      <div className="absolute top-2 right-2 text-xs text-gray-500">
        3D
      </div>
    </div>
  )
}
