'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {exploreHref, useFocus} from '@/lib/focus-store'

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href) || (href === '/concepts' && /^\/(concept|theme)\//.test(pathname)) || (href === '/explore' && pathname.startsWith('/paper/'))

export function NavLinks({items: base}: {items: {href: string; label: string}[]}) {
  const pathname = usePathname()
  // The Explore tab opens on the paper the visitor last asked about.
  const focus = useFocus()
  const items = base.map((i) => (i.href === '/explore' ? {...i, to: exploreHref(focus)} : {...i, to: i.href}))
  return (
    <>
      <nav aria-label="Main" className="hidden gap-5 text-sm md:flex">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.to}
              aria-current={active ? 'page' : undefined}
              className={`border-b-2 pb-0.5 no-underline ${active ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-2'}`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      {/* Mobile bottom bar (DESIGN_SPEC §2.2) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 grid border-t border-line bg-surface md:hidden" style={{gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`}}>
        {items
          .filter((i) => i.href !== '/stories')
          .slice(0, 4)
          .map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 items-center justify-center text-[13px] no-underline ${active ? 'font-semibold text-ink' : 'text-ink-2'}`}
              >
                {item.label}
              </Link>
            )
          })}
      </nav>
    </>
  )
}
