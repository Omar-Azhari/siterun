import type { SVGProps } from 'react'

// Custom plant icons drawn on Lucide's 24px grid (stroke, round caps) for
// machines Lucide doesn't cover.

type P = SVGProps<SVGSVGElement> & { strokeWidth?: number }

function Base({ children, strokeWidth = 1.5, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}

export function ExcavatorIcon(props: P) {
  return (
    <Base {...props}>
      <rect x="2" y="17" width="12" height="4" rx="2" />
      <path d="M3 17v-3h4V10h5l1 4h1v3" />
      <path d="M8 10V8" />
      <path d="M13 14l4-9 4 4" />
      <path d="M21 9l-1 5h-3l1-3" />
      <circle cx="5" cy="19" r=".5" />
      <circle cx="11" cy="19" r=".5" />
    </Base>
  )
}

export function CraneIcon(props: P) {
  return (
    <Base {...props}>
      <path d="M4 21V9l5-5" />
      <path d="M7 21V8" />
      <path d="M4 12h3M4 16h3" />
      <path d="M9 4l12 4" />
      <path d="M19 7.4V12" />
      <path d="M17.5 12h3l-1.5 2.5z" />
      <path d="M2 21h8" />
    </Base>
  )
}

export function ScissorLiftIcon(props: P) {
  return (
    <Base {...props}>
      <path d="M4 5h16M5 5V2M19 5V2M5 2h14" />
      <path d="M6 7l12 4M18 7L6 11M6 11l12 4M18 11L6 15" />
      <rect x="3" y="15" width="18" height="3" rx="1" />
      <circle cx="6" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </Base>
  )
}

export function GeneratorIcon(props: P) {
  return (
    <Base {...props}>
      <rect x="2" y="6" width="20" height="13" rx="1.5" />
      <path d="M5 19v2M19 19v2M5 9h4M5 12h4M5 15h4" />
      <path d="M15 8.5l-2 4h3l-2 4" />
    </Base>
  )
}

export function DumperIcon(props: P) {
  return (
    <Base {...props}>
      <path d="M3 10h9l3-4h2" />
      <path d="M12 10l2 5H3v-5" />
      <path d="M15 15h5v-4l-2-2h-3" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </Base>
  )
}
