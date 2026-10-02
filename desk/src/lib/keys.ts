import {useEffect, useRef} from 'react'

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

/** Single-key shortcuts that stay quiet while the curator types in a field. */
export function useKeys(map: Record<string, (e: KeyboardEvent) => void>, enabled = true) {
  const ref = useRef(map)
  useEffect(() => {
    ref.current = map
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.altKey) return
      const key = `${e.metaKey || e.ctrlKey ? 'mod+' : ''}${e.key.length === 1 ? e.key.toLowerCase() : e.key}`
      const fn = ref.current[key]
      if (fn) {
        e.preventDefault()
        fn(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
