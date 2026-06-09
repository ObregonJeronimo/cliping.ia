// engine.js — wrapper de PREVIEW EN VIVO: monta el nucleo en un <canvas> con DPR + loop + transporte.
// El MP4 lo hace Remotion con el mismo nucleo (engineCore). Misma API que ya usa TimelineStudio.
import { W, H, DURATION, drawFrame, beatAt } from './engineCore'

export function createTimelineEngine(canvas, { onFrame } = {}) {
  const ctx = canvas.getContext('2d')
  const DPR = Math.min(window.devicePixelRatio || 1, 2.5)
  canvas.width = W * DPR
  canvas.height = H * DPR
  const T = DURATION
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  let playhead = 0, playing = true, speed = 1, last = performance.now(), raf = 0

  function render() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); drawFrame(ctx, playhead) }
  function emit() { if (onFrame) onFrame({ playhead, T, playing, label: beatAt(playhead) }) }
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05) * speed
    last = now
    if (playing) { playhead += dt; if (playhead >= T) playhead -= T }
    render(); emit(); raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return {
    toggle() { playing = !playing; last = performance.now(); return playing },
    play() { playing = true; last = performance.now() },
    pause() { playing = false },
    restart() { playhead = 0; last = performance.now() },
    seek(frac) { playhead = clamp(frac, 0, 1) * T; if (!playing) { render(); emit() } },
    setSpeed(s) { speed = s },
    getDuration() { return T },
    destroy() { cancelAnimationFrame(raf) },
  }
}
