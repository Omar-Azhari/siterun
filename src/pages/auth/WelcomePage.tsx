import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ButtonLink } from '@/components/ui'
import { img } from '@/data/seed'

/** Board 01 · Splash / Welcome */
export function WelcomePage() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden px-6 pt-[calc(env(safe-area-inset-top)+56px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">
      <img
        src={img('splash-excavator-frame')}
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover object-[70%_center]"
        fetchPriority="high"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#0b1f44_0%,rgba(11,31,68,0.92)_22%,rgba(1,16,32,0.55)_52%,rgba(1,16,32,0.35)_68%,#011020_100%)]"
      />
      <div className="flex flex-col items-center">
        <Logo variant="mark" className="h-14" title="SiteRun" />
        <p className="mt-2 font-display text-[28px] font-extrabold tracking-tight">SiteRun</p>
      </div>
      <h1 className="mt-10 font-display text-[40px] leading-[1.05] font-extrabold tracking-tight">
        Built for the people who build.
      </h1>
      <p className="mt-4 max-w-[17rem] text-[15px] leading-snug text-[#dae4ef]">
        Manage equipment, suppliers and compliance in one place.
      </p>
      <div className="mt-auto pt-10">
        <ButtonLink to="/signup/role" arrow>
          Get Started
        </ButtonLink>
        <p className="mt-4 text-center text-[13px] text-[#dae4ef]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
