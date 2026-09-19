import type { SVGProps } from 'react'

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}

export function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.87c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z" />
    </svg>
  )
}

export function VisaLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 30" aria-hidden {...props}>
      <rect width="48" height="30" rx="4" fill="#fff" />
      <text
        x="24"
        y="20.5"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontStyle="italic"
        fontWeight="900"
        fontSize="15"
        letterSpacing="-0.5"
        fill="#1a1f71"
      >
        VISA
      </text>
    </svg>
  )
}

export function MastercardLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden {...props}>
      <circle cx="14" cy="12" r="11" fill="#eb001b" />
      <circle cx="26" cy="12" r="11" fill="#f79e1b" />
      <path fill="#ff5f00" d="M20 2.8a11 11 0 0 1 0 18.4 11 11 0 0 1 0-18.4z" />
    </svg>
  )
}

export function AmexLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden {...props}>
      <rect width="40" height="24" rx="3" fill="#2e77bc" />
      <text
        x="20"
        y="15.5"
        textAnchor="middle"
        fontFamily="Arial"
        fontWeight="700"
        fontSize="9"
        fill="#fff"
      >
        AMEX
      </text>
    </svg>
  )
}
