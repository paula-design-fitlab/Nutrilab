import { useState, useEffect } from 'react'
import { supabase, sb } from './supabaseClient'

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '🌿' },
  { id: 'menu', label: 'Menú', icon: '📅' },
  { id: 'recetario', label: 'Recetario', icon: '📖' },
  { id: 'compra', label: 'Compra', icon: '🛒' },
  { id: 'seguimiento', label: 'Seguimiento', icon: '🌙' },
]

function ScreenHoy() {
  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Martes, 30 de junio</p>
        <h1>¿Qué toca hoy?</h1>
      </div>
      <div className="app-content">
        <div className="empty-state">
          <span className="icon">🌿</span>
          <p>Todavía no tienes un menú planificado para hoy.<br />En cuanto definamos el menú semanal, aquí verás tus comidas del día.</p>
        </div>
      </div>
    </>
  )
}

function lunesDeEstaSemana() {
  const hoy = new Date()
  const dia = hoy.getDay() // 0=domingo
  const offset = dia === 0 ? -6 : 1 - dia
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + offset)
  lunes.setHours(0, 0, 0, 0)
  return lunes
}

function formatoFecha(d) {
  return d.toISOString().slice(0, 10)
}

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const DIAS_SEMANA_LABEL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }

function ScreenMenu() {
  const [horarios, setHorarios] = useState([])
  const [diasHorario, setDiasHorario] = useState({}) // fecha -> horario_id
  const [semanaConfig, setSemanaConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  const lunes = lunesDeEstaSemana()
  const fechasSemana = DIAS_SEMANA.map((_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return formatoFecha(d)
  })
  const semanaInicioStr = formatoFecha(lunes)

  async function cargarTodo() {
    setLoading(true)
    const [{ data: h }, { data: dh }, { data: sc }] = await Promise.all([
      sb.get('nutrilab_horarios').order('id', { ascending: true }),
      supabase.from('nutrilab_dias_horario').select('*').in('fecha', fechasSemana),
      supabase.from('nutrilab_semana_config').select('*').eq('semana_inicio', semanaInicioStr),
    ])
    setHorarios(h || [])
    const map = {}
    ;(dh || []).forEach((r) => { map[r.fecha] = r.horario_id })
    setDiasHorario(map)
    setSemanaConfig((sc && sc[0]) || null)
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [])

  async function elegirHorarioDia(fecha, horarioId) {
    await supabase.from('nutrilab_dias_horario').upsert({ fecha, horario_id: horarioId })
    setDiasHorario((prev) => ({ ...prev, [fecha]: horarioId }))
  }

  async function elegirDiaBatch(dia) {
    if (semanaConfig) {
      await supabase.from('nutrilab_semana_config').update({ dia_batch_cooking: dia }).eq('id', semanaConfig.id)
    } else {
      await supabase.from('nutrilab_semana_config').insert({
        id: Date.now(), semana_inicio: semanaInicioStr, dia_batch_cooking: dia,
      })
    }
    cargarTodo()
  }

  if (loading) {
    return (
      <>
        <div className="app-header">
          <p className="eyebrow">Esta semana</p>
          <h1>Menú semanal</h1>
        </div>
        <div className="app-content"><div className="empty-state"><p>Cargando…</p></div></div>
      </>
    )
  }

  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Esta semana</p>
        <h1>Menú semanal</h1>
      </div>
      <div className="app-content">

        <div className="card">
          <strong>Horario de cada día</strong>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4, marginBottom: 14 }}>
            Elige qué horario toca cada día de esta semana.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DIAS_SEMANA.map((dia, i) => {
              const fecha = fechasSemana[i]
              const activo = diasHorario[fecha]
              return (
                <div key={dia} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, width: 78, flexShrink: 0 }}>{DIAS_SEMANA_LABEL[dia]}</span>
                  <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    {horarios.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => elegirHorarioDia(fecha, h.id)}
                        style={{
                          flex: 1,
                          border: activo === h.id ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                          background: activo === h.id ? 'var(--sage-deep)' : 'white',
                          color: activo === h.id ? 'white' : 'var(--ink)',
                          borderRadius: 'var(--radius-sm)', padding: '7px 4px', fontSize: 12.5, fontWeight: 500,
                        }}
                      >
                        {h.nombre.replace('Horario de ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <strong>Día de batch cooking</strong>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4, marginBottom: 14 }}>
            ¿Qué día prepararás la comida de esta semana?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DIAS_SEMANA.map((d) => (
              <button
                key={d}
                onClick={() => elegirDiaBatch(d)}
                style={{
                  border: semanaConfig?.dia_batch_cooking === d ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                  background: semanaConfig?.dia_batch_cooking === d ? 'var(--sage-deep)' : 'white',
                  color: semanaConfig?.dia_batch_cooking === d ? 'white' : 'var(--ink)',
                  borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 500,
                }}
              >
                {DIAS_SEMANA_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="empty-state">
          <span className="icon">📅</span>
          <p>La planificación de comidas por receta llegará en cuanto tengas tu recetario listo.</p>
        </div>

      </div>
    </>
  )
}

function ScreenRecetario() {
  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Tu biblioteca</p>
        <h1>Recetario</h1>
      </div>
      <div className="app-content">
        <div className="empty-state">
          <span className="icon">📖</span>
          <p>Tus recetas aparecerán aquí, simples y adaptadas a tu estilo de cocina mediterránea.</p>
        </div>
      </div>
    </>
  )
}

function ScreenCompra() {
  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Generada automáticamente</p>
        <h1>Lista de la compra</h1>
      </div>
      <div className="app-content">
        <div className="empty-state">
          <span className="icon">🛒</span>
          <p>En cuanto planifiques tu menú semanal, la lista de la compra se generará sola, agrupando todos los ingredientes.</p>
        </div>
      </div>
    </>
  )
}

function ScreenSeguimiento() {
  const [pesos, setPesos] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevoPeso, setNuevoPeso] = useState('')
  const [saving, setSaving] = useState(false)

  async function cargarTodo() {
    setLoading(true)
    const { data: p } = await sb.get('nutrilab_peso').order('fecha', { ascending: false })
    setPesos(p || [])
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [])

  async function guardarPeso() {
    const valor = parseFloat(nuevoPeso.replace(',', '.'))
    if (!valor || valor <= 0) return
    setSaving(true)
    await sb.post('nutrilab_peso', {
      id: Date.now(),
      fecha: new Date().toISOString().slice(0, 10),
      peso: valor,
    })
    setNuevoPeso('')
    setSaving(false)
    cargarTodo()
  }

  if (loading) {
    return (
      <>
        <div className="app-header">
          <p className="eyebrow">Tu evolución</p>
          <h1>Seguimiento</h1>
        </div>
        <div className="app-content"><div className="empty-state"><p>Cargando…</p></div></div>
      </>
    )
  }

  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Tu evolución</p>
        <h1>Seguimiento</h1>
      </div>
      <div className="app-content">

        <div className="card">
          <strong>Tu peso</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="kg"
              value={nuevoPeso}
              onChange={(e) => setNuevoPeso(e.target.value)}
              style={{
                flex: 1, border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)',
                padding: '10px 12px', fontSize: 15, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={guardarPeso}
              disabled={saving}
              style={{
                background: 'var(--sage-deep)', color: 'white', border: 'none',
                borderRadius: 'var(--radius-sm)', padding: '0 18px', fontWeight: 600, fontSize: 14,
              }}
            >
              Guardar
            </button>
          </div>

          {pesos.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 14 }}>Aún no has registrado ningún peso.</p>
          ) : (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pesos.slice(0, 10).map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>{p.fecha}</span>
                  <span style={{ fontWeight: 600 }}>{p.peso} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}

const SCREENS = {
  hoy: ScreenHoy,
  menu: ScreenMenu,
  recetario: ScreenRecetario,
  compra: ScreenCompra,
  seguimiento: ScreenSeguimiento,
}

export default function App() {
  const [tab, setTab] = useState('hoy')
  const Screen = SCREENS[tab]

  return (
    <div className="app-shell">
      <Screen />
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
