// Fase 2: el usuario revisa y edita los datos extraídos del sitio
import { useState } from 'react'
import styles from './ReviewData.module.css'

const SECTION_LABELS = {
  siteName:     { label: 'Nombre del sitio', type: 'text' },
  headline:     { label: 'Titular principal', type: 'text' },
  subheadline:  { label: 'Subtítulo', type: 'text' },
  problem:      { label: 'Problema que resuelve', type: 'textarea' },
  audience:     { label: 'Audiencia objetivo', type: 'text' },
  cta:          { label: 'CTA principal', type: 'text' },
  emotion:      { label: 'Emoción objetivo', type: 'text' },
  value_prop:   { label: 'Propuesta de valor', type: 'textarea' },
  primaryColor: { label: 'Color primario', type: 'color' },
}

function Field({ label, value, onChange, type = 'text' }) {
  if (type === 'color') return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.colorRow}>
        <input type="color" value={value || '#6366f1'} onChange={e => onChange(e.target.value)} className={styles.colorPicker} />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className={styles.colorText} placeholder="#000000" />
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

function ListField({ label, items, onChange }) {
  function update(idx, val) {
    const next = [...items]
    next[idx] = val
    onChange(next)
  }
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
        <p className={styles.sub}>Editá cualquier campo antes de continuar. Estos datos se usan para generar el video.</p>
      </div>

      <div className={styles.sections}>
        {/* Sección principal */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Información general</div>
          {Object.entries(SECTION_LABELS).map(([key, cfg]) => (
            data[key] !== undefined && data[key] !== null
              ? <Field key={key} label={cfg.label} value={data[key]} type={cfg.type} onChange={val => set(key, val)} />
              : null
          ))}
        </div>

        {/* Beneficios */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Beneficios</div>
          <ListField
            label="Lista de beneficios"
            items={data.benefits || []}
            onChange={val => set('benefits', val)}
          />
        </div>

        {/* Features */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Features</div>
          <ListField
            label="Características del producto"
            items={data.features || []}
            onChange={val => set('features', val)}
          />
        </div>

        {/* Números */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Números y estadísticas</div>
          <ListField
            label="Datos numéricos reales del sitio"
            items={data.numbers || []}
            onChange={val => set('numbers', val)}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.backBtn} onClick={onBack}>← Volver</button>
        <button className={styles.confirmBtn} onClick={() => onConfirm(data)}>
          Confirmar datos →
        </button>
      </div>
    </div>
  )
}
