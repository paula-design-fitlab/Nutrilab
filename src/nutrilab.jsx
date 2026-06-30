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
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function mesLabel(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00')
  const mes = MESES[d.getMonth()]
  return mes.charAt(0).toUpperCase() + mes.slice(1)
}

function numeroDia(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00')
  return d.getDate()
}

const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const DIAS_SEMANA_LABEL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }

function ScreenMenu() {
  const [horarios, setHorarios] = useState([])
  const [diasHorario, setDiasHorario] = useState({}) // fecha -> horario_id (guardado)
  const [diasHorarioLocal, setDiasHorarioLocal] = useState({}) // cambios sin guardar
  const [semanaConfig, setSemanaConfig] = useState(null)
  const [diaBatchLocal, setDiaBatchLocal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const lunes = lunesDeEstaSemana()
  const fechasSemana = DIAS_SEMANA.map((_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    return formatoFecha(d)
  })
  const semanaInicioStr = formatoFecha(lunes)
  const hoyStr = formatoFecha(new Date())

  async function cargarTodo() {
    setLoading(true)
    const [{ data: h }, { data: dh }, { data: sc }] = await Promise.all([
      sb.get('nutrilab_horarios').order('id', { ascending: true }),
      supabase.from('nutrilab_dias_horario').select('*').in('fecha', fechasSemana),
      supabase.from('nutrilab_semana_config').select('*').eq('semana_inicio', semanaInicioStr),
    ])
    setHorarios((h || []).slice().sort((a, b) => {
      const orden = { 'Horario de mañana': 0, 'Horario de tarde': 1 }
      return (orden[a.nombre] ?? 99) - (orden[b.nombre] ?? 99)
    }))
    const map = {}
    ;(dh || []).forEach((r) => { map[r.fecha] = r.horario_id })
    setDiasHorario(map)
    setDiasHorarioLocal(map)
    const cfg = (sc && sc[0]) || null
    setSemanaConfig(cfg)
    setDiaBatchLocal(cfg?.dia_batch_cooking || null)
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [])

  function elegirHorarioDia(fecha, horarioId) {
    setDiasHorarioLocal((prev) => ({ ...prev, [fecha]: horarioId }))
    setGuardado(false)
  }

  function elegirDiaBatch(dia) {
    setDiaBatchLocal(dia)
    setGuardado(false)
  }

  async function guardarCambios() {
    setGuardando(true)

    const filas = Object.entries(diasHorarioLocal).map(([fecha, horario_id]) => ({ fecha, horario_id }))
    if (filas.length > 0) {
      await supabase.from('nutrilab_dias_horario').upsert(filas)
    }

    if (diaBatchLocal) {
      if (semanaConfig) {
        await supabase.from('nutrilab_semana_config').update({ dia_batch_cooking: diaBatchLocal }).eq('id', semanaConfig.id)
      } else {
        await supabase.from('nutrilab_semana_config').insert({
          id: Date.now(), semana_inicio: semanaInicioStr, dia_batch_cooking: diaBatchLocal,
        })
      }
    }

    await cargarTodo()
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  const hayCambios = JSON.stringify(diasHorarioLocal) !== JSON.stringify(diasHorario)
    || diaBatchLocal !== (semanaConfig?.dia_batch_cooking || null)

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
        <p className="eyebrow">{mesLabel(fechasSemana[0])}</p>
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
              const activo = diasHorarioLocal[fecha]
              const esHoy = fecha === hoyStr
              return (
                <div key={dia} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{
                    fontSize: 14, fontWeight: esHoy ? 700 : 500, width: 100, flexShrink: 0,
                    color: esHoy ? 'var(--sage-deep)' : 'var(--ink)',
                  }}>
                    {DIAS_SEMANA_LABEL[dia]} {numeroDia(fecha)}
                  </span>
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
                  border: diaBatchLocal === d ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                  background: diaBatchLocal === d ? 'var(--sage-deep)' : 'white',
                  color: diaBatchLocal === d ? 'white' : 'var(--ink)',
                  borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 500,
                }}
              >
                {DIAS_SEMANA_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={guardarCambios}
          disabled={!hayCambios || guardando}
          style={{
            width: '100%',
            background: hayCambios ? 'var(--sage-deep)' : 'var(--line)',
            color: hayCambios ? 'white' : 'var(--ink-soft)',
            border: 'none', borderRadius: 'var(--radius-sm)',
            padding: '13px', fontWeight: 600, fontSize: 15, marginBottom: 14,
          }}
        >
          {guardando ? 'Guardando…' : guardado ? 'Guardado ✓' : 'Guardar cambios'}
        </button>

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
  const [editandoId, setEditandoId] = useState(null)
  const [valorEdicion, setValorEdicion] = useState('')

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
      fecha: formatoFecha(new Date()),
      peso: valor,
    })
    setNuevoPeso('')
    setSaving(false)
    cargarTodo()
  }

  function empezarEdicion(p) {
    setEditandoId(p.id)
    setValorEdicion(String(p.peso))
  }

  async function guardarEdicion(id) {
    const valor = parseFloat(valorEdicion.replace(',', '.'))
    if (!valor || valor <= 0) return
    await supabase.from('nutrilab_peso').update({ peso: valor }).eq('id', id)
    setEditandoId(null)
    cargarTodo()
  }

  async function eliminarPeso(id) {
    await supabase.from('nutrilab_peso').delete().eq('id', id)
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
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--ink-soft)' }}>{p.fecha}</span>

                  {editandoId === p.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={valorEdicion}
                        onChange={(e) => setValorEdicion(e.target.value)}
                        style={{
                          width: 64, border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)',
                          padding: '4px 6px', fontSize: 14, fontFamily: 'inherit',
                        }}
                      />
                      <button
                        onClick={() => guardarEdicion(p.id)}
                        style={{ background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600 }}
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 12 }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{p.peso} kg</span>
                      <button
                        onClick={() => empezarEdicion(p)}
                        style={{ background: 'none', border: 'none', color: 'var(--sage-deep)', fontSize: 13, padding: 0 }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarPeso(p.id)}
                        style={{ background: 'none', border: 'none', color: '#C77B5E', fontSize: 13, padding: 0 }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
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
