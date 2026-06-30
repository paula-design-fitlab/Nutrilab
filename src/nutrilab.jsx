import { useState, useEffect } from 'react'
import { supabase, sb } from './supabaseClient'

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '🌿' },
  { id: 'menu', label: 'Menú', icon: '📅' },
  { id: 'recetario', label: 'Recetario', icon: '📖' },
  { id: 'compra', label: 'Compra', icon: '🛒' },
  { id: 'perfil', label: 'Perfil', icon: '🌙' },
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

function ScreenMenu() {
  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Esta semana</p>
        <h1>Menú semanal</h1>
      </div>
      <div className="app-content">
        <div className="empty-state">
          <span className="icon">📅</span>
          <p>Aquí planificarás desayunos, comidas, meriendas y cenas de la semana, sustituyendo recetas en segundos.</p>
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

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const DIAS_LABEL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }

function ScreenPerfil() {
  const [horarios, setHorarios] = useState([])
  const [config, setConfig] = useState(null)
  const [pesos, setPesos] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevoPeso, setNuevoPeso] = useState('')
  const [saving, setSaving] = useState(false)

  async function cargarTodo() {
    setLoading(true)
    const [{ data: h }, { data: c }, { data: p }] = await Promise.all([
      sb.get('nutrilab_horarios').order('id', { ascending: true }),
      sb.get('nutrilab_config'),
      sb.get('nutrilab_peso').order('fecha', { ascending: false }),
    ])
    setHorarios(h || [])
    setConfig((c && c[0]) || null)
    setPesos(p || [])
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [])

  async function activarHorario(id) {
    await supabase.from('nutrilab_horarios').update({ activo: false }).neq('id', 0)
    await supabase.from('nutrilab_horarios').update({ activo: true }).eq('id', id)
    await supabase.from('nutrilab_config').update({ horario_activo_id: id }).eq('id', config.id)
    cargarTodo()
  }

  async function cambiarDiaBatch(dia) {
    await supabase.from('nutrilab_config').update({ dia_batch_cooking: dia }).eq('id', config.id)
    cargarTodo()
  }

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
          <p className="eyebrow">Seguimiento</p>
          <h1>Perfil</h1>
        </div>
        <div className="app-content"><div className="empty-state"><p>Cargando…</p></div></div>
      </>
    )
  }

  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Seguimiento</p>
        <h1>Perfil</h1>
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
              {pesos.slice(0, 6).map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>{p.fecha}</span>
                  <span style={{ fontWeight: 600 }}>{p.peso} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <strong>Horario activo</strong>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4, marginBottom: 14 }}>
            Elige qué comidas forman tu día ahora mismo.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {horarios.map((h) => (
              <button
                key={h.id}
                onClick={() => activarHorario(h.id)}
                style={{
                  textAlign: 'left',
                  border: h.activo ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                  background: h.activo ? 'rgba(143,168,137,0.10)' : 'white',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{h.nombre}</div>
                <div style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 2 }}>
                  {(h.comidas_incluidas || []).join(' · ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <strong>Día de batch cooking</strong>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4, marginBottom: 14 }}>
            Qué día sueles preparar la comida de la semana.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DIAS.map((d) => (
              <button
                key={d}
                onClick={() => cambiarDiaBatch(d)}
                style={{
                  border: config?.dia_batch_cooking === d ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                  background: config?.dia_batch_cooking === d ? 'var(--sage-deep)' : 'white',
                  color: config?.dia_batch_cooking === d ? 'white' : 'var(--ink)',
                  borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 500,
                }}
              >
                {DIAS_LABEL[d]}
              </button>
            ))}
          </div>
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
  perfil: ScreenPerfil,
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
