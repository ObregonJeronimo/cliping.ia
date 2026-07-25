import { NOMBRES, PLACAS, contarEdits, validateEdits, COLOR_TOKENS, DUR_MIN, DUR_MAX, SIZE_MIN, SIZE_MAX } from '../../director/index.js'
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

export default function Inspector({ sb, sbBase, tl, selected, edits, onEdit, onReorder, onDur, look, onLook, onReset }) {
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
