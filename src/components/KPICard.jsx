import { useEffect, useRef, useState } from 'react'

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function useAnimatedValue(target, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef(null)
  const startRef = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplay(target)
      return
    }
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    fromRef.current = display
    startRef.current = null

    function step(ts) {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutExpo(progress)
      setDisplay(fromRef.current + (target - fromRef.current) * eased)
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target])

  return display
}

export default function KPICard({ title, value, format, color, delay = 0 }) {
  const animated = useAnimatedValue(value)
  const isNegative = value < 0

  const colorMap = {
    blue: 'text-accent-blue',
    green: isNegative ? 'text-accent-red' : 'text-accent-green',
    red: 'text-accent-red',
    white: 'text-txt-primary',
  }

  const borderMap = {
    blue: 'border-accent-blue/20',
    green: isNegative ? 'border-accent-red/20' : 'border-accent-green/20',
    red: 'border-accent-red/20',
    white: 'border-elevated',
  }

  const displayValue =
    typeof format === 'function' ? format(animated) : animated.toLocaleString('es-CL')

  return (
    <div
      className={`bg-surface border ${borderMap[color]} rounded-xl p-5 glow-blue transition-all duration-200 animate-fade-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-txt-secondary text-xs font-medium uppercase tracking-wider mb-2">
        {title}
      </p>
      <p className={`${colorMap[color]} text-2xl font-bold tabular-nums leading-tight`}>
        {displayValue}
      </p>
    </div>
  )
}
