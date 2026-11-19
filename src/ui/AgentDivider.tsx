import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, RefObject } from 'react'

type Drag = { id: number; x: number; width: number; minimum: number; maximum: number; preferred: string }
const preferredProperty = '--agent-preferred-width'

function limits(desktop: HTMLDivElement) {
  const style = getComputedStyle(desktop)
  const sidebar = parseFloat(style.getPropertyValue('--sidebar-width'))
  const center = parseFloat(style.getPropertyValue('--workspace-min-width'))
  const minimum = parseFloat(style.getPropertyValue('--agent-min-width'))
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
  const maximum = Math.max(minimum, Math.floor(desktop.clientWidth - padding - sidebar - center))
  return { minimum, maximum }
}

function clamp(width: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(width)))
}

export function AgentDivider({ desktopRef, preferredWidth, onResize, onCommit }: {
  desktopRef: RefObject<HTMLDivElement | null>
  preferredWidth?: number
  onResize: () => void
  onCommit: (width: number) => void
}) {
  const divider = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const resized = useRef(false)
  const [range, setRange] = useState({ minimum: 240, maximum: 316, width: 316 })

  useEffect(() => {
    const style = desktopRef.current?.style
    if (!style || drag.current || resized.current) return
    if (preferredWidth === undefined) style.removeProperty(preferredProperty)
    else style.setProperty(preferredProperty, preferredWidth + 'px')
  }, [desktopRef, preferredWidth])

  useEffect(() => {
    const desktop = desktopRef.current
    const slot = divider.current?.parentElement
    if (!desktop || !slot) return
    const observer = new ResizeObserver(() => {
      const { minimum, maximum } = limits(desktop)
      const width = clamp(slot.offsetWidth, minimum, maximum)
      setRange(current => current.minimum === minimum && current.maximum === maximum && current.width === width
        ? current : { minimum, maximum, width })
    })
    observer.observe(desktop)
    observer.observe(slot)
    return () => observer.disconnect()
  }, [desktopRef])

  function writeWidth(desktop: HTMLDivElement, width: number) {
    desktop.style.setProperty(preferredProperty, width + 'px')
  }

  function commit(width: number) {
    resized.current = true
    onCommit(width)
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    const desktop = desktopRef.current
    const slot = event.currentTarget.parentElement
    if (!desktop || !slot || drag.current || !event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    onResize()
    drag.current = { id: event.pointerId, x: event.clientX, width: slot.offsetWidth, ...limits(desktop),
      preferred: desktop.style.getPropertyValue(preferredProperty) }
    event.currentTarget.dataset.dragging = 'true'
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const desktop = desktopRef.current
    const active = drag.current
    if (desktop && active?.id === event.pointerId) {
      writeWidth(desktop, clamp(active.width + active.x - event.clientX, active.minimum, active.maximum))
    }
  }

  function finish(event: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const desktop = desktopRef.current
    const active = drag.current
    if (!desktop || active?.id !== event.pointerId) return
    drag.current = null
    delete event.currentTarget.dataset.dragging
    const { minimum, maximum } = limits(desktop)
    const next = cancelled ? active.width : clamp(active.width + active.x - event.clientX, minimum, maximum)
    if (next !== active.width) {
      writeWidth(desktop, next)
      commit(next)
    }
    else if (active.preferred) desktop.style.setProperty(preferredProperty, active.preferred)
    else desktop.style.removeProperty(preferredProperty)
  }

  function resizeByKey(event: KeyboardEvent<HTMLDivElement>) {
    const desktop = desktopRef.current
    const slot = event.currentTarget.parentElement
    if (!desktop || !slot || drag.current) return
    const width = slot.offsetWidth
    const { minimum, maximum } = limits(desktop)
    const widths: Record<string, number> = { ArrowLeft: width + 24, ArrowRight: width - 24, Home: minimum, End: maximum }
    if (!Object.hasOwn(widths, event.key)) return
    event.preventDefault()
    const next = clamp(widths[event.key], minimum, maximum)
    if (next === width) return
    onResize()
    writeWidth(desktop, next)
    commit(next)
  }

  return <div ref={divider} className="agent-divider" role="separator" tabIndex={0}
    aria-label="Resize Agent panel" aria-controls="orbit-agent" aria-orientation="vertical"
    aria-valuemin={range.minimum} aria-valuemax={range.maximum} aria-valuenow={range.width}
    onPointerDown={start} onPointerMove={move}
    onPointerUp={event => finish(event, false)} onPointerCancel={event => finish(event, true)}
    onLostPointerCapture={event => finish(event, true)} onKeyDown={resizeByKey} />
}
