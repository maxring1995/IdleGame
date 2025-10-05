'use client'

import { useState, useEffect, useRef } from 'react'
import type { CharacterMapProgress } from '@/lib/supabase'
import { generateMapData, getTilesInRadius, revealTiles, addPointOfInterest } from '@/lib/mapProgress'

interface InteractiveMapProps {
  characterId: string
  zoneId: string
  mapProgress: CharacterMapProgress
  onTileClick?: (x: number, y: number) => void
  showControls?: boolean
}

interface HexTile {
  x: number
  y: number
  explored: boolean
  terrain?: string
  landmark?: string
  selected?: boolean
}

export default function InteractiveMap({
  characterId,
  zoneId,
  mapProgress,
  onTileClick,
  showControls = true
}: InteractiveMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mapData, setMapData] = useState(() => generateMapData(mapProgress))
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null)
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)

  const hexSize = 30
  const hexWidth = hexSize * 2
  const hexHeight = hexSize * Math.sqrt(3)

  useEffect(() => {
    setMapData(generateMapData(mapProgress))
  }, [mapProgress])

  useEffect(() => {
    drawMap()
  }, [mapData, selectedTile, hoveredTile, zoom, offset, showGrid, showLabels])

  // Convert hex coordinates to pixel position (flat-top hexagons)
  function hexToPixel(q: number, r: number) {
    const x = hexSize * (3/2 * q)
    const y = hexSize * (Math.sqrt(3) * (r + q/2))
    return { x, y }
  }

  // Convert pixel position to hex coordinates (flat-top hexagons)
  function pixelToHex(x: number, y: number) {
    const q = (2/3) * x / hexSize
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / hexSize
    return axialRound(q, r)
  }

  // Round to nearest hex
  function axialRound(q: number, r: number) {
    const s = -q - r
    let rq = Math.round(q)
    let rr = Math.round(r)
    let rs = Math.round(s)

    const q_diff = Math.abs(rq - q)
    const r_diff = Math.abs(rr - r)
    const s_diff = Math.abs(rs - s)

    if (q_diff > r_diff && q_diff > s_diff) {
      rq = -rr - rs
    } else if (r_diff > s_diff) {
      rr = -rq - rs
    }

    return { q: rq, r: rr }
  }

  // Get terrain color
  function getTerrainColor(terrain?: string, explored: boolean = true): string {
    if (!explored) return '#1a1a2e'

    switch (terrain) {
      case 'grass': return '#4ade80'
      case 'forest': return '#16a34a'
      case 'mountain': return '#6b7280'
      case 'water': return '#3b82f6'
      case 'desert': return '#fbbf24'
      case 'snow': return '#e5e7eb'
      default: return '#22c55e'
    }
  }

  // Draw hexagon
  function drawHexagon(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    fillColor: string,
    strokeColor?: string
  ) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i
      const x = centerX + size * Math.cos(angle)
      const y = centerY + size * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()

    ctx.fillStyle = fillColor
    ctx.fill()

    if (strokeColor) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  // Draw the map
  function drawMap() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context state
    ctx.save()

    // Apply zoom and offset
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    // Center the map
    ctx.translate(canvas.width / 2, canvas.height / 2)

    // Draw tiles
    for (let r = 0; r < mapData.height; r++) {
      for (let q = 0; q < mapData.width; q++) {
        const tile = mapData.tiles[r]?.[q]
        if (!tile) continue

        const pos = hexToPixel(q, r)
        const centerX = pos.x - (mapData.width * hexSize) / 2
        const centerY = pos.y - (mapData.height * hexSize) / 2

        // Determine colors
        let fillColor = getTerrainColor(tile.terrain, tile.explored)
        let strokeColor = showGrid ? '#374151' : undefined

        // Fog of war
        if (!tile.explored) {
          fillColor = '#111827'
          strokeColor = showGrid ? '#1f2937' : undefined
        }

        // Highlight selected/hovered tiles
        if (selectedTile && selectedTile.x === q && selectedTile.y === r) {
          strokeColor = '#fbbf24'
          ctx.lineWidth = 3
        } else if (hoveredTile && hoveredTile.x === q && hoveredTile.y === r) {
          strokeColor = '#60a5fa'
          ctx.lineWidth = 2
        }

        // Draw hex
        drawHexagon(ctx, centerX, centerY, hexSize - 1, fillColor, strokeColor)

        // Draw landmarks
        if (tile.explored && tile.landmark && showLabels) {
          ctx.fillStyle = '#ffffff'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('📍', centerX, centerY)
        }

        // Draw coordinates (debug)
        if (showLabels && tile.explored) {
          ctx.fillStyle = '#ffffff88'
          ctx.font = '8px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(`${q},${r}`, centerX, centerY + 10)
        }
      }
    }

    // Draw player position
    if (mapProgress.last_position) {
      const pos = hexToPixel(mapProgress.last_position.x, mapProgress.last_position.y)
      const centerX = pos.x - (mapData.width * hexSize) / 2
      const centerY = pos.y - (mapData.height * hexSize) / 2

      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('👤', centerX, centerY + 5)
    }

    // Restore context state
    ctx.restore()
  }

  // Handle mouse events
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()

    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Transform mouse coordinates to map space
    const mapX = (mouseX - canvas.width / 2 - offset.x) / zoom + (mapData.width * hexSize) / 2
    const mapY = (mouseY - canvas.height / 2 - offset.y) / zoom + (mapData.height * hexSize) / 2

    // Convert to hex coordinates
    const hex = pixelToHex(mapX, mapY)

    // Check if valid tile
    if (hex.r >= 0 && hex.r < mapData.height && hex.q >= 0 && hex.q < mapData.width) {
      setHoveredTile({ x: hex.q, y: hex.r })
    } else {
      setHoveredTile(null)
    }

    // Handle dragging
    if (isDragging) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      setOffset({ x: dragOffset.x + dx, y: dragOffset.y + dy })
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setDragOffset(offset)
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  function handleMouseLeave() {
    setHoveredTile(null)
    setIsDragging(false)
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (hoveredTile) {
      setSelectedTile(hoveredTile)
      onTileClick?.(hoveredTile.x, hoveredTile.y)
    }
  }

  // Zoom controls
  function zoomIn() {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }

  function zoomOut() {
    setZoom(prev => Math.max(prev / 1.2, 0.5))
  }

  function resetView() {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  // Calculate exploration percentage
  const explorationPercent = Math.round((mapData.exploredCount / mapData.totalTiles) * 100)

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="panel p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-gray-500">Exploration Progress</div>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-amber-400">{explorationPercent}%</div>
              <div className="text-sm text-gray-400">
                {mapData.exploredCount} / {mapData.totalTiles} tiles
              </div>
            </div>
          </div>

          {showControls && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  showGrid ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  showLabels ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Labels
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
            style={{ width: `${explorationPercent}%` }}
          />
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative panel p-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={`w-full bg-gray-900 rounded-lg ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ imageRendering: 'pixelated' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />

        {/* Zoom Controls */}
        {showControls && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={zoomIn}
              className="btn btn-secondary w-10 h-10 p-0 text-xl"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={zoomOut}
              className="btn btn-secondary w-10 h-10 p-0 text-xl"
              title="Zoom Out"
            >
              −
            </button>
            <button
              onClick={resetView}
              className="btn btn-secondary w-10 h-10 p-0 text-sm"
              title="Reset View"
            >
              ⟲
            </button>
          </div>
        )}

        {/* Tile Info */}
        {hoveredTile && (
          <div className="absolute top-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-sm">
            <div className="text-white font-semibold mb-1">
              Tile ({hoveredTile.x}, {hoveredTile.y})
            </div>
            {mapData.tiles[hoveredTile.y]?.[hoveredTile.x]?.explored ? (
              <>
                <div className="text-gray-400">
                  Terrain: {mapData.tiles[hoveredTile.y][hoveredTile.x].terrain}
                </div>
                {mapData.tiles[hoveredTile.y][hoveredTile.x].landmark && (
                  <div className="text-amber-400">
                    📍 {mapData.tiles[hoveredTile.y][hoveredTile.x].landmark}
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 italic">Unexplored</div>
            )}
          </div>
        )}

        {/* Legend */}
        {showControls && (
          <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-xs">
            <div className="text-white font-semibold mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-400">Grass</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-700 rounded"></div>
                <span className="text-gray-400">Forest</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span className="text-gray-400">Mountain</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gray-400">Water</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}