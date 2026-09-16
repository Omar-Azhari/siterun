import { extendTailwindMerge } from 'tailwind-merge'

type ClassValue = string | false | null | undefined | 0

// Teach tailwind-merge our custom colour tokens so e.g. `text-muted` and
// `text-sm` are not treated as the same utility.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'navy',
        'brand-blue',
        'charcoal',
        'board',
        'app',
        'card',
        'card-2',
        'input',
        'selected',
        'line',
        'line-input',
        'line-active',
        'primary',
        'primary-hover',
        'fg',
        'muted',
        'subtle',
        'success',
        'warning',
        'danger',
        'info',
      ],
    },
  },
})

/** Joins truthy class names; later Tailwind utilities override earlier conflicting ones. */
export function cn(...classes: ClassValue[]): string {
  return merge(classes.filter(Boolean).join(' '))
}
