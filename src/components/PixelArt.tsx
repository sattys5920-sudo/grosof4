export interface PixelArtData {
  pixels: string[]
  palette: Record<string, string>
}

export function PixelArt({ pixels, palette, size = 40 }: PixelArtData & { size?: number }) {
  const grid = pixels.length
  return (
    <svg width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} shapeRendering="crispEdges" style={{ flexShrink: 0 }}>
      {pixels.map((row, y) =>
        row
          .split('')
          .map((ch, x) => {
            const color = palette[ch]
            if (!color) return null
            return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
          }),
      )}
    </svg>
  )
}
