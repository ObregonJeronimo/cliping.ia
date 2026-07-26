import { NOMBRES, PLACAS, contarEdits, validateEdits, COLOR_TOKENS, DUR_MIN, DUR_MAX, SIZE_MIN, SIZE_MAX, EASES, PROPS, tracksDe, keysDeTrack } from '../../director/index.js'
import { corto } from './timelineDraw.js'
import styles from './Inspector.module.css'

// INSPECTOR (editor E1) — el panel que convierte al Director en un editor y no en un generador.
// No muta el storyboard: emite ENTRADAS del overlay de ediciones (core/edits.js), que se aplican
// sobre el storyboard base. Por eso "Restablecer" alcanza para volver al video original, y por eso
// las ediciones se pueden guardar en la galeria (son un objeto plano de 4 campos).
//
// El id de capa del timeline es `escena:capa`, que es EXACTAMENTE la clave del overlay -> lo que se
// selecciona en la timeline se edita aca sin ninguna tabla de traduccion en el medio.

// los rangos y los tokens NO se hardcodean: salen del contrato del overlay (core/edits.js), asi el
// slider no puede pedir un valor que applyEdits despues clampea a otra cosa.
const NOMBRE_TOKEN = { ink: 'tinta', dim: 'tinta suave', accent: 'acento', accentTxt: 'acento legible', accent2: 'acento 2', onAccent: 'sobre acento', bg0: 'fondo', bg1: 'fondo 2' }
// los 9 props del timeline en castellano: 'sweep' o 'reveal' no le dicen nada a nadie que no haya
// leido el compilador, y el panel de curvas es justamente para el que no lo leyo.
const NOMBRE_PROP = { x: 'posicion X', y: 'posicion Y', w: 'ancho', h: 'alto', scale: 'escala', rot: 'rotacion', alpha: 'opacidad', reveal: 'aparicion', sweep: 'barrido' }
// paso del input de VALOR: x/y/w/h son fracciones del lienzo (0.01 es ~4px de ancho, se ve); escala,
// opacidad y radianes necesitan un paso mas grueso o hacen falta veinte clicks para notar el cambio.
const PASO_PROP = { x: 0.01, y: 0.01, w: 0.01, h: 0.01, scale: 0.05, rot: 0.05, alpha: 0.05, reveal: 0.05, sweep: 0.05 }
// el input vacio NO es un cero: sin este filtro, borrar el campo para escribir otro numero mandaba un
// t=0 que clampeaba el keyframe contra el inicio de la capa antes de terminar de tipear.
const num = (e) => { const v = e.target.value; if (v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null }

export default function Inspector({ sb, sbBase, tl, selected, edits, onEdit, onReorder, onDur, look, onLook, onReset, selKey, onSelKey, onCurva }) {
  // DOS storyboards a proposito: `sb` (ya editado) manda en lo que se LISTA — orden y duracion de las
  // escenas — y `sbBase` (el que genero el motor) manda en lo que se EDITA. Resolver la capa contra el
  // editado tenia dos bugs: ocultar una capa la sacaba del storyboard, asi que su propio checkbox
  // desaparecia y no habia forma de volver a mostrarla; y validateEdits reportaba "capa inexistente"
  // por cada capa ocultada a proposito.
  const base = sbBase || sb
  const corte = String(selected || '').indexOf(':')
  const sceneId = corte > 0 ? selected.slice(0, corte) : ''
  const layerId = corte > 0 ? selected.slice(corte + 1) : ''
  const esc = base.scenes.find(s => s.id === sceneId)
  const capa = esc && esc.layers.find(l => l.id === layerId)
  // la misma capa DESPUES de aplicar el overlay: de ahi salen los avisos que produce la edicion
  // (p. ej. `recortado`, que lo marca applyEdits cuando el texto nuevo no entraba en la caja).
  const escViva = sb.scenes.find(s => s.id === sceneId)
  const capaViva = escViva && escViva.layers.find(l => l.id === layerId)
  const key = `${sceneId}:${layerId}`
  const ed = (edits.capas && edits.capas[key]) || {}
  const tlCapa = selected ? tl.layers.find(l => l.id === selected) : null
  const nEdits = contarEdits(edits)
  // el motor IGNORA la edicion invalida en vez de romper el render; sin este aviso el usuario mueve un
  // control y no pasa nada, sin saber por que (p. ej. ocultar la ultima capa util de una escena).
  const avisos = validateEdits(edits, base).errors.slice(0, 3)
  const orden = sb.scenes.map(s => s.id)
  const mover = (i, d) => {
    const j = i + d
    if (j < 0 || j >= orden.length) return
    const next = orden.slice()
    const tmp = next[i]; next[i] = next[j]; next[j] = tmp
    onReorder(next)
  }

  // --- E2: KEYFRAMES. La curva se lee SIEMPRE de la timeline ya editada, nunca del overlay: lo que
  // el usuario guardo puede estar fuera de rango y applyEditsTimeline lo clampea. Mostrando el overlay
  // el input diria 3 y el video se moveria a 1. La timeline es la que dibuja, asi que es la verdad.
  const F = Math.round(1000 / ((tl && tl.fps) || 30)) / 1000     // un frame, redondeado a ms como el motor
  const keysEd = edits.keys || {}
  const curva = selKey ? keysDeTrack(tl, selKey.layer, selKey.prop) : null
  // el selKey puede quedar colgado (se borro un keyframe, o el motor recompilo con menos keys): sin
  // este chequeo el panel leia undefined.t y tiraba la pagina entera.
  const kf = curva && selKey.i >= 0 && selKey.i < curva.length ? curva[selKey.i] : null
  const capaSel = kf ? tl.layers.find(l => l.id === selKey.layer) : null
  const conKey = (mut) => onCurva(selKey.layer, selKey.prop, curva.map((k, j) => (j === selKey.i ? mut(k) : k)))
  // MISMO clampeo que el arrastre de la timeline (Timeline.jsx::moverKey): entre sus vecinos con un
  // frame de margen y dentro de la vida de su capa. Si las dos vias clampearan distinto, escribir el
  // tiempo a mano y arrastrarlo darian resultados distintos para el mismo keyframe.
  const moverKf = (t) => {
    const i = selKey.i, life = capaSel ? capaSel.life : [0, tl.dur]
    const lo = Math.max(life[0], i > 0 ? curva[i - 1].t + F : life[0])
    const hi = Math.min(life[1], i < curva.length - 1 ? curva[i + 1].t - F : life[1])
    if (hi < lo) return
    conKey(k => ({ ...k, t: Math.round(Math.min(hi, Math.max(lo, t)) * 1000) / 1000 }))
  }
  // el valor NO se clampea aca: los rangos por prop son del motor (sanearKeys) y duplicarlos en la UI
  // es garantizar que un dia digan cosas distintas. Se manda crudo y el input muestra lo que quedo.
  const valorKf = (v) => conKey(k => ({ ...k, v }))
  const easeKf = (e) => conKey(k => (e ? { t: k.t, v: k.v, ease: e } : { t: k.t, v: k.v }))
  const borrarKf = () => { onCurva(selKey.layer, selKey.prop, curva.filter((_, j) => j !== selKey.i)); onSelKey(null) }
  const resetCurva = () => { onCurva(selKey.layer, selKey.prop, null); onSelKey(null) }

  // curvas de la capa seleccionada. `tl.layers` y no el storyboard: la placa y los flashes del montaje
  // no son capas de escena pero se animan igual, y son de las que mas se quiere retocar.
  const tracks = tlCapa ? tracksDe(tl, selected) : []
  const quietos = tlCapa ? PROPS.filter(p => !tracks.some(t => t.prop === p)) : []
  // "+ animar": keysDeTrack devuelve una curva PLANA en los extremos de la vida de la capa, o sea que
  // guardarla no cambia un pixel. Es a proposito: el usuario primero declara "esto se mueve" y despues
  // decide como, sin que el video pegue un salto al tocar el boton.
  const animar = (p) => {
    const k = keysDeTrack(tl, selected, p)
    if (!k || k.length < 2) return
    onCurva(selected, p, k)
    onSelKey({ layer: selected, prop: p, i: 0 })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.ttl}>Inspector</span>
        <span className={styles.count} title="ediciones activas sobre el video generado">{nEdits} {nEdits === 1 ? 'edicion' : 'ediciones'}</span>
        <button className={styles.reset} onClick={onReset} disabled={!nEdits} title="Vuelve al video que genero el motor">Restablecer</button>
      </div>

      {avisos.length > 0 && (
        <div className={styles.avisos}>
          {avisos.map((a, i) => <div key={i} className={styles.aviso} title={a.code}>{a.path}: {a.msg}</div>)}
        </div>
      )}

      {/* --- KEYFRAME (E2): va ARRIBA DE TODO porque aparece por una accion directa del usuario
           (agarro un rombo en la timeline) y tiene que estar donde ya esta mirando. --- */}
      {kf && (
        <div className={styles.sec}>
          <h3 className={styles.h3}>Keyframe</h3>
          <div className={styles.meta}>
            <span className={styles.kind}>{NOMBRE_PROP[selKey.prop] || selKey.prop}</span>
            <span className={styles.mid} title={selKey.layer}>{corto(selKey.layer)}</span>
            <span className={styles.val}>{selKey.i + 1}/{curva.length}</span>
          </div>

          <div className={styles.fila}>
            <label className={styles.lbl}>Tiempo</label>
            <input type="number" className={styles.num} step={F} value={kf.t}
              onChange={e => { const n = num(e); if (n != null) moverKf(n) }} />
            <span className={styles.val}>s</span>
          </div>
          <div className={styles.fila}>
            <label className={styles.lbl}>Valor</label>
            <input type="number" className={styles.num} step={PASO_PROP[selKey.prop] || 0.01} value={kf.v}
              onChange={e => { const n = num(e); if (n != null) valorKf(n) }} />
          </div>

          <label className={styles.lbl}>Ease</label>
          <select className={styles.input} value={kf.ease || ''} disabled={selKey.i === 0} onChange={e => easeKf(e.target.value)}>
            <option value="">(el del motor)</option>
            {EASES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          {selKey.i === 0 && <p className={styles.hint}>El ease es el de ENTRADA a cada keyframe, asi que el primero de la curva no usa ninguno.</p>}

          <div className={styles.btns}>
            <button className={styles.btn2} onClick={borrarKf} disabled={curva.length <= 2} title="Una curva necesita al menos 2 keyframes">Borrar keyframe</button>
            <button className={styles.btn2} onClick={resetCurva} title="La capa vuelve a moverse como la animo el motor">Restablecer curva</button>
          </div>
        </div>
      )}

      {/* --- CAPA SELECCIONADA --- */}
      <div className={styles.sec}>
        <h3 className={styles.h3}>Capa</h3>
        {!selected && <p className={styles.hint}>Toca una fila de la timeline para editar esa capa.</p>}
        {selected && !capa && <p className={styles.hint}>{tlCapa ? `Capa "${tlCapa.kind}" del montaje (fondo o flash): no se edita.` : 'Esa capa ya no existe en el storyboard.'}</p>}
        {capa && (
          <>
            <div className={styles.meta}>
              <span className={styles.kind}>{capa.kind}</span>
              <span className={styles.mid}>{layerId}</span>
              {!capaViva && <span className={styles.off}>oculta</span>}
            </div>

            {(capa.kind === 'text' || capa.kind === 'badge') && (
              <>
                <label className={styles.lbl}>Texto</label>
                <textarea className={styles.area} rows={3} value={ed.text != null ? ed.text : (capa.text || '')}
                  onChange={e => onEdit(key, { text: e.target.value })}
                  placeholder="(vacio = la capa se oculta)" />
                {capaViva && capaViva.recortado && <p className={styles.hint}>El texto se recorto para que entre en su caja.</p>}
                <label className={styles.lbl}>Color</label>
                {/* bg0/bg1 quedan fuera de la lista: son tokens de FONDO. Pintar un texto con el color
                    de su propia placa da APCA 0, o sea texto invisible. applyEdits igual lo rescata si
                    llega por otro lado, pero ofrecerlo en el menu es invitar a un cuadro en blanco. */}
                <select className={styles.input} value={ed.color || capa.color || 'ink'} onChange={e => onEdit(key, { color: e.target.value })}>
                  {COLOR_TOKENS.filter(t => t !== 'bg0' && t !== 'bg1').map(t => <option key={t} value={t}>{NOMBRE_TOKEN[t] || t}</option>)}
                </select>
                {capaViva && capaViva.colorAjustado && <p className={styles.hint}>Ese color no se leia sobre el fondo: se ajusto lo minimo para que se lea.</p>}
                <label className={styles.lbl}>Tamano <span className={styles.val}>{(ed.size || 1).toFixed(2)}x</span></label>
                <input type="range" className={styles.range} min={SIZE_MIN} max={SIZE_MAX} step={0.05}
                  value={ed.size || 1} onChange={e => onEdit(key, { size: Number(e.target.value) })} />
              </>
            )}

            {capa.kind === 'heroObj' && (
              <>
                <label className={styles.lbl}>Objeto</label>
                <select className={styles.input} value={ed.obj || capa.obj} onChange={e => onEdit(key, { obj: e.target.value })}>
                  {NOMBRES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </>
            )}

            <label className={styles.check}>
              <input type="checkbox" checked={!!ed.oculta} onChange={e => onEdit(key, { oculta: e.target.checked })} /> Ocultar capa
            </label>
          </>
        )}
      </div>

      {/* --- CURVAS de la capa: que se mueve hoy, y que se puede empezar a mover. Sin esta lista, un
           prop que el motor dejo quieto no tiene ni un rombo que agarrar y era inanimable. --- */}
      {tlCapa && (
        <div className={styles.sec}>
          <h3 className={styles.h3}>Curvas</h3>
          {tracks.map(t => {
            const on = selKey && selKey.layer === selected && selKey.prop === t.prop
            return (
              <button key={t.prop} className={`${styles.trk} ${on ? styles.trkOn : ''}`} onClick={() => onSelKey({ layer: selected, prop: t.prop, i: 0 })} title="Selecciona su primer keyframe">
                <span className={styles.trkNom}>{NOMBRE_PROP[t.prop] || t.prop}</span>
                {keysEd[selected + '|' + t.prop] && <span className={styles.trkEd} title="curva tuya, ya no la del motor">◆</span>}
                <span className={styles.val}>{t.keys.length} keys</span>
              </button>
            )
          })}
          {quietos.length > 0 && (
            <div className={styles.adds}>
              {quietos.map(p => (
                <button key={p} className={styles.add} onClick={() => animar(p)} title="Crea una curva plana en la vida de la capa: no cambia nada hasta que muevas un valor">+ {NOMBRE_PROP[p] || p}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- ESCENAS: duracion y orden --- */}
      <div className={styles.sec}>
        <h3 className={styles.h3}>Escenas</h3>
        {sb.scenes.map((sc, i) => (
          <div key={sc.id} className={styles.esc}>
            <div className={styles.escTop}>
              <span className={styles.escNom} title={sc.id}>{sc.escena}</span>
              <span className={styles.val}>{sc.dur.toFixed(1)}s</span>
              <button className={styles.mini} onClick={() => mover(i, -1)} disabled={i === 0} title="Subir">↑</button>
              <button className={styles.mini} onClick={() => mover(i, 1)} disabled={i === sb.scenes.length - 1} title="Bajar">↓</button>
            </div>
            <input type="range" className={styles.range} min={DUR_MIN} max={DUR_MAX} step={0.1}
              value={Math.max(DUR_MIN, Math.min(DUR_MAX, sc.dur))} onChange={e => onDur(sc.id, Number(e.target.value))} />
          </div>
        ))}
      </div>

      {/* --- LOOK: lo unico global. Cambiar el acento re-tiñe todo el video de forma consistente. --- */}
      <div className={styles.sec}>
        <h3 className={styles.h3}>Look</h3>
        <div className={styles.fila}>
          <label className={styles.lbl}>Acento</label>
          <input type="color" className={styles.color} value={(edits.look && edits.look.accent) || look.accent}
            onChange={e => onLook({ accent: e.target.value })} />
        </div>
        <label className={styles.lbl}>Placa</label>
        <select className={styles.input} value={(edits.look && edits.look.placa) || look.placa} onChange={e => onLook({ placa: e.target.value })}>
          {PLACAS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  )
}
