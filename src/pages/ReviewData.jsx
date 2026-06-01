import { useState } from 'react'
import styles from './ReviewData.module.css'

// Campos cortos en grilla, campos largos en full width
const FIELDS_ROW1 = [
  { key: 'siteName',    label: 'Nombre del sitio',   type: 'text' },
  { key: 'cta',         label: 'CTA principal',       type: 'text' },
]
const FIELDS_ROW2 = [
  { key: 'audience',    label: 'Audiencia',           type: 'text' },
  { key: 'emotion',     label: 'Emoción',             type: 'text' },
]
const FIELDS_FULL = [
  { key: 'headline',    label: 'Titular principal',   type: 'text' },
  { key: 'subheadline', label: 'Subtítulo',           type: 'text' },
  { key: 'problem',     label: 'Problema que resuelve', type: 'textarea' },
  { key: 'value_prop',  label: 'Propuesta de valor',  type: 'textarea' },
]

function Field({ label, value, onChange, type = 'text' }) {
  if (type === 'color') return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.colorRow}>
        <input type="color" value={value || '#6366f1'} onChange={e => onChange(e.target.value)} className={styles.colorPicker} />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={styles.colorText} />
      </div>
    </div>
  )
  if (type === 'textarea') return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} className={styles.textarea} rows={2} />
    </div>
  )
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={styles.input} />
    </div>
  )
}

function ListField({ label, items, onChange, placeholder = '' }) {
  function update(idx, val) { const n = [...items]; n[idx] = val; onChange(n) }
  function remove(idx) { onChange(items.filter((_, i) => i !== idx)) }
  function add() { onChange([...items, '']) }
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.listItems}>
        {items.map((item, idx) => (
          <div key={idx} className={styles.listRow}>
            <input
              type="text"
              value={typeof item === 'string' ? item : item?.title || item?.label || JSON.stringify(item)}
              onChange={e => update(idx, e.target.value)}
              className={styles.listInput}
              placeholder={placeholder}
            />
            <button onClick={() => remove(idx)} className={styles.removeBtn}>✕</button>
          </div>
        ))}
        <button onClick={add} className={styles.addBtn}>+ Agregar</button>
      </div>
    </div>
  )
}

export default function ReviewData({ pageData, onConfirm, onBack }) {
  const [data, setData] = useState({ ...pageData })
  function set(key, val) { setData(d => ({ ...d, [key]: val })) }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.stepBadge}>Paso 2 de 3</div>
        <h2 className={styles.title}>Revisá los datos extraídos</h2>
        <p className={styles.sub}>Todo lo que editás acá se usa exactamente para generar el video.</p>
      </div>

      <div className={styles.sections}>
        {/* Fila 1: siteName + cta */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Información general</div>
          <div className={styles.fieldsGrid}>
            {FIELDS_ROW1.map(f => data[f.key] !== undefined
              ? <Field key={f.key} label={f.label} value={data[f.key]} type={f.type} onChange={v => set(f.key, v)} />
              : null
            )}
          </div>
          <div className={styles.fieldsGrid} style={{ marginTop: 10 }}>
            {FIELDS_ROW2.map(f => data[f.key] !== undefined
              ? <Field key={f.key} label={f.label} value={data[f.key]} type={f.type} onChange={v => set(f.key, v)} />
              : null
            )}
          </div>
          {FIELDS_FULL.map(f => data[f.key] !== undefined
            ? <Field key={f.key} label={f.label} value={data[f.key]} type={f.type} onChange={v => set(f.key, v)} />
            : null
          )}
          {/* Color */}
          {data.primaryColor && (
            <Field label="Color primario" value={data.primaryColor} type="color" onChange={v => set('primaryColor', v)} />
          )}
        </div>

        {/* Beneficios + Números en dos columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Beneficios</div>
            <ListField
              label=""
              items={data.benefits || []}
              onChange={v => set('benefits', v)}
              placeholder="Ej: Envíos gratis"
            />
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Números / Stats</div>
            <ListField
              label=""
              items={data.numbers || []}
              onChange={v => set('numbers', v)}
              placeholder="Ej: +600 Productos"
            />
          </div>
        </div>

        {/* Features */}
        {(data.features || []).length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Features</div>
            <ListField
              label=""
              items={data.features}
              onChange={v => set('features', v)}
            />
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.backBtn} onClick={onBack}>← Volver</button>
        <button className={styles.confirmBtn} onClick={() => onConfirm(data)}>
          Confirmar y generar →
        </button>
      </div>
    </div>
  )
}
