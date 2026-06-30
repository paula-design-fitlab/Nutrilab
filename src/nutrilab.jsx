import { useState, useEffect } from 'react'
import { supabase, sb } from './supabaseClient'

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '🌿' },
  { id: 'menu', label: 'Menú', icon: '📅' },
  { id: 'recetario', label: 'Recetario', icon: '📖' },
  { id: 'compra', label: 'Compra', icon: '🛒' },
  { id: 'seguimiento', label: 'Seguimiento', icon: '🌙' },
]

const ESTADOS = ['pendiente', 'realizada', 'omitida']
const ESTADO_LABEL = { pendiente: 'Pendiente', realizada: 'Realizada', omitida: 'Omitida' }
const TIPO_COMIDA_LABEL = { desayuno: 'Desayuno', comida: 'Comida', merienda: 'Merienda', cena: 'Cena' }

const SALUDOS = [
  '¡Buenos días, Paula!', '¡Hola, Paula!', '¡Qué tal, Paula!',
  '¡Buenas, Paula!', '¡Hola de nuevo, Paula!', '¡Bienvenida, Paula!',
]
const FRASES_MOTIVADORAS = [
  'Un día más, un paso más cerca de tus objetivos.',
  'Comer bien no es perfección, es constancia.',
  'Hoy también puedes cuidarte sin complicarte.',
  'Pequeñas decisiones, grandes resultados.',
  'La organización de hoy es la tranquilidad de mañana.',
  'Vas por buen camino, sigue así.',
  'Cocinar con cariño también es cuidarte.',
  'Cada comida es una oportunidad, no una obligación.',
]

function diaDelAño() {
  const d = new Date()
  const inicio = new Date(d.getFullYear(), 0, 0)
  const diff = d - inicio
  return Math.floor(diff / 86400000)
}

function ScreenHoy() {
  const [horarioHoy, setHorarioHoy] = useState(null)
  const [comidasHoy, setComidasHoy] = useState([])
  const [loading, setLoading] = useState(true)
  const [formAbiertoTipo, setFormAbiertoTipo] = useState(null) // tipo_comida para el que está abierto el form de "añadir"
  const [editandoFila, setEditandoFila] = useState(null) // fila completa en edición

  const hoyStr = formatoFecha(new Date())
  const hoyLabelFecha = (() => {
    const d = new Date()
    const diaSemana = DIAS_SEMANA_LABEL[DIAS_SEMANA[(d.getDay() + 6) % 7]]
    return `${diaSemana}, ${d.getDate()} de ${mesLabel(hoyStr).toLowerCase()}`
  })()

  const indiceDia = diaDelAño()
  const saludo = SALUDOS[indiceDia % SALUDOS.length]
  const frase = FRASES_MOTIVADORAS[indiceDia % FRASES_MOTIVADORAS.length]

  async function cargarTodo() {
    setLoading(true)
    const { data: dh } = await supabase.from('nutrilab_dias_horario').select('*, nutrilab_horarios(*)').eq('fecha', hoyStr).maybeSingle()
    setHorarioHoy(dh?.nutrilab_horarios || null)
    const { data: cm } = await supabase.from('nutrilab_menu_semanal').select('*, receta:nutrilab_recetas(*)').eq('fecha', hoyStr)
    setComidasHoy(cm || [])
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [])

  function filaDe(tipo) {
    return comidasHoy.find((c) => c.tipo_comida === tipo) || null
  }

  async function guardarNuevaComida(tipo, datosReceta) {
    const recetaId = Date.now()
    await sb.post('nutrilab_recetas', { id: recetaId, tipo_comida: tipo, ...datosReceta })
    await sb.post('nutrilab_menu_semanal', {
      id: recetaId + 1,
      fecha: hoyStr,
      tipo_comida: tipo,
      receta_id: recetaId,
      estado: 'pendiente',
    })
    setFormAbiertoTipo(null)
    cargarTodo()
  }

  async function guardarEdicionReceta(fila, datosReceta) {
    if (fila.receta_id) {
      await supabase.from('nutrilab_recetas').update(datosReceta).eq('id', fila.receta_id)
    }
    setEditandoFila(null)
    cargarTodo()
  }

  async function cambiarEstado(fila, nuevoEstado) {
    await supabase.from('nutrilab_menu_semanal').update({ estado: nuevoEstado }).eq('id', fila.id)
    cargarTodo()
  }

  async function eliminarComida(fila) {
    await supabase.from('nutrilab_menu_semanal').delete().eq('id', fila.id)
    cargarTodo()
  }

  if (loading) {
    return (
      <>
        <div className="app-header">
          <p className="eyebrow">{hoyLabelFecha}</p>
          <h1>{saludo}</h1>
        </div>
        <div className="app-content"><div className="empty-state"><p>Cargando…</p></div></div>
      </>
    )
  }

  return (
    <>
      <div className="app-header">
        <p className="eyebrow">{hoyLabelFecha}</p>
        <h1>{saludo}</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6, fontStyle: 'italic' }}>{frase}</p>
      </div>
      <div className="app-content">

        {!horarioHoy ? (
          <div className="empty-state">
            <span className="icon">🌿</span>
            <p>Todavía no has asignado un horario a hoy.<br />Ve a la pestaña Menú y elige si hoy toca horario de mañana o de tarde.</p>
          </div>
        ) : (
          (horarioHoy.comidas_incluidas || []).map((tipo) => {
            const fila = filaDe(tipo)
            return (
              <div key={tipo} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14, color: 'var(--sage-deep)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {TIPO_COMIDA_LABEL[tipo]}
                  </strong>
                  {fila && fila.estado !== 'pendiente' && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                      background: fila.estado === 'realizada' ? 'rgba(143,168,137,0.18)' : 'rgba(199,123,94,0.15)',
                      color: fila.estado === 'realizada' ? 'var(--sage-deep)' : '#C77B5E',
                    }}>
                      {ESTADO_LABEL[fila.estado]}
                    </span>
                  )}
                </div>

                {!fila ? (
                  formAbiertoTipo === tipo ? (
                    <RecetaForm
                      onCancel={() => setFormAbiertoTipo(null)}
                      onGuardar={(datos) => guardarNuevaComida(tipo, datos)}
                    />
                  ) : (
                    <button
                      onClick={() => setFormAbiertoTipo(tipo)}
                      style={{ marginTop: 12, background: 'none', border: '1px dashed var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px', width: '100%', color: 'var(--ink-soft)', fontSize: 14 }}
                    >
                      + Añadir comida
                    </button>
                  )
                ) : editandoFila?.id === fila.id ? (
                  <RecetaForm
                    inicial={fila.receta || {}}
                    onCancel={() => setEditandoFila(null)}
                    onGuardar={(datos) => guardarEdicionReceta(fila, datos)}
                  />
                ) : (
                  <>
                    <p style={{ fontSize: 16, fontFamily: 'var(--font-display)', margin: '10px 0 14px' }}>
                      {fila.receta?.nombre || fila.nombre_libre || 'Comida'}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ESTADOS.map((e) => (
                        <button
                          key={e}
                          onClick={() => cambiarEstado(fila, e)}
                          style={{
                            border: fila.estado === e ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
                            background: fila.estado === e ? 'var(--sage-deep)' : 'white',
                            color: fila.estado === e ? 'white' : 'var(--ink)',
                            borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 500,
                          }}
                        >
                          {ESTADO_LABEL[e]}
                        </button>
                      ))}
                      {fila.receta && (
                        <button onClick={() => setEditandoFila(fila)} style={{ background: 'none', border: 'none', color: 'var(--sage-deep)', fontSize: 12.5, padding: '6px 4px' }}>Editar</button>
                      )}
                      <button onClick={() => eliminarComida(fila)} style={{ background: 'none', border: 'none', color: '#C77B5E', fontSize: 12.5, padding: '6px 4px' }}>Eliminar</button>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function campoEstilo() {
  return { width: '100%', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', marginTop: 4 }
}

function RecetaForm({ inicial = {}, onGuardar, onCancel }) {
  const [nombre, setNombre] = useState(inicial.nombre || '')
  const [tiempo, setTiempo] = useState(inicial.tiempo_preparacion || '')
  const [ingredientes, setIngredientes] = useState((inicial.ingredientes || []).join('\n'))
  const [elaboracion, setElaboracion] = useState(inicial.elaboracion || '')
  const [proteina, setProteina] = useState(inicial.proteina || '')
  const [carbohidratos, setCarbohidratos] = useState(inicial.carbohidratos || '')
  const [grasas, setGrasas] = useState(inicial.grasas || '')
  const [kcal, setKcal] = useState(inicial.kcal || '')
  const [aptaTapper, setAptaTapper] = useState(inicial.apta_tapper || false)
  const [preparableAntelacion, setPreparableAntelacion] = useState(inicial.preparable_antelacion || false)
  const [guardarBiblioteca, setGuardarBiblioteca] = useState(inicial.en_biblioteca ?? false)

  function num(v) { return v === '' ? null : parseFloat(String(v).replace(',', '.')) }

  function submit() {
    if (!nombre.trim()) return
    onGuardar({
      nombre: nombre.trim(),
      descripcion: '',
      ingredientes: ingredientes.split('\n').map((i) => i.trim()).filter(Boolean),
      elaboracion: elaboracion.trim(),
      tiempo_preparacion: num(tiempo),
      proteina: num(proteina),
      carbohidratos: num(carbohidratos),
      grasas: num(grasas),
      kcal: num(kcal),
      apta_tapper: aptaTapper,
      preparable_antelacion: preparableAntelacion,
      etiquetas: [],
      en_biblioteca: guardarBiblioteca,
    })
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Nombre</label>
        <input autoFocus type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} style={campoEstilo()} placeholder="Ej. Tortilla de calabacín" />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Tiempo (min)</label>
          <input type="number" value={tiempo} onChange={(e) => setTiempo(e.target.value)} style={campoEstilo()} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Kcal aprox.</label>
          <input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} style={campoEstilo()} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Proteína (g)</label>
          <input type="number" value={proteina} onChange={(e) => setProteina(e.target.value)} style={campoEstilo()} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Carbos (g)</label>
          <input type="number" value={carbohidratos} onChange={(e) => setCarbohidratos(e.target.value)} style={campoEstilo()} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Grasas (g)</label>
          <input type="number" value={grasas} onChange={(e) => setGrasas(e.target.value)} style={campoEstilo()} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Ingredientes (uno por línea)</label>
        <textarea value={ingredientes} onChange={(e) => setIngredientes(e.target.value)} style={{ ...campoEstilo(), minHeight: 64, resize: 'vertical' }} />
      </div>

      <div>
        <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Elaboración</label>
        <textarea value={elaboracion} onChange={(e) => setElaboracion(e.target.value)} style={{ ...campoEstilo(), minHeight: 64, resize: 'vertical' }} />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
        <input type="checkbox" checked={aptaTapper} onChange={(e) => setAptaTapper(e.target.checked)} />
        Apta para táper
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
        <input type="checkbox" checked={preparableAntelacion} onChange={(e) => setPreparableAntelacion(e.target.checked)} />
        Se puede preparar con antelación
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>
        <input type="checkbox" checked={guardarBiblioteca} onChange={(e) => setGuardarBiblioteca(e.target.checked)} />
        Guardar en mi recetario
      </label>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={submit} style={{ flex: 1, background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px', fontWeight: 600, fontSize: 14 }}>
          Guardar
        </button>
        <button onClick={onCancel} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontSize: 14, color: 'var(--ink-soft)' }}>
          Cancelar
        </button>
      </div>
    </div>
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
