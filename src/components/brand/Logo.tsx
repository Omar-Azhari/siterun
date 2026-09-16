import {
  LOCKUP_HEIGHT,
  LOCKUP_MARK_SCALE,
  LOCKUP_WIDTH,
  MARK_BAR,
  MARK_CHEVRON,
  MARK_TOP,
  MARK_VIEWBOX,
  WORDMARK_PATH,
} from './logoPaths.generated'

type Tone = 'light' | 'dark'

interface LogoProps {
  /** `dark` = for dark backgrounds (white strokes and wordmark). */
  tone?: Tone
  variant?: 'mark' | 'horizontal'
  className?: string
  title?: string
}

const NAVY = '#0B1F44'
const BLUE = '#006CFF'

export function Logo({
  tone = 'dark',
  variant = 'horizontal',
  className,
  title = 'SiteRun',
}: LogoProps) {
  const ink = tone === 'dark' ? '#FFFFFF' : NAVY
  const mark = (
    <>
      <path fill={BLUE} d={MARK_TOP} />
      <path fill={ink} d={MARK_CHEVRON} />
      <path fill={ink} d={MARK_BAR} />
    </>
  )

  if (variant === 'mark') {
    return (
      <svg viewBox={MARK_VIEWBOX} className={className} role="img" aria-label={title}>
        {mark}
      </svg>
    )
  }

  const [mx, my] = MARK_VIEWBOX.split(' ').map(Number)
  return (
    <svg
      viewBox={`0 0 ${LOCKUP_WIDTH} ${LOCKUP_HEIGHT}`}
      className={className}
      role="img"
      aria-label={title}
    >
      <g transform={`scale(${LOCKUP_MARK_SCALE}) translate(${-(mx ?? 0)} ${-(my ?? 0)})`}>{mark}</g>
      <path fill={ink} d={WORDMARK_PATH} />
    </svg>
  )
}
