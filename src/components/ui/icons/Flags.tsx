import type { SVGProps } from 'react'

const star = (cx: number, cy: number, r: number, points = 7) => {
  const inner = r * 0.45
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? inner : r
    const a = (Math.PI * i) / points - Math.PI / 2
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function UnionJack() {
  return (
    <g>
      <rect width="30" height="15" fill="#012169" />
      <path d="M0 0L30 15M30 0L0 15" stroke="#fff" strokeWidth="3" />
      <path d="M0 0L30 15M30 0L0 15" stroke="#C8102E" strokeWidth="1.2" />
      <path d="M15 0V15M0 7.5H30" stroke="#fff" strokeWidth="5" />
      <path d="M15 0V15M0 7.5H30" stroke="#C8102E" strokeWidth="3" />
    </g>
  )
}

export function FlagAU(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 30" aria-hidden {...props}>
      <rect width="60" height="30" fill="#012169" />
      <UnionJack />
      <polygon fill="#fff" points={star(15, 22.5, 4)} />
      <polygon fill="#fff" points={star(45, 25, 2.2)} />
      <polygon fill="#fff" points={star(38, 13, 2.2)} />
      <polygon fill="#fff" points={star(45, 5.5, 2.2)} />
      <polygon fill="#fff" points={star(51.5, 11.5, 2.2)} />
      <polygon fill="#fff" points={star(48, 16.5, 1.2, 5)} />
    </svg>
  )
}

export function FlagNZ(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 30" aria-hidden {...props}>
      <rect width="60" height="30" fill="#012169" />
      <UnionJack />
      {[
        [45, 25, 2.4],
        [38, 13, 2.2],
        [45, 5.5, 2],
        [51.5, 11.5, 2.2],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <polygon fill="#fff" points={star(x ?? 0, y ?? 0, (r ?? 0) + 0.5, 5)} />
          <polygon fill="#C8102E" points={star(x ?? 0, y ?? 0, r ?? 0, 5)} />
        </g>
      ))}
    </svg>
  )
}
