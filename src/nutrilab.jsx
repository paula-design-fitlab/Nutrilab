import { useState, useEffect } from 'react'
import { supabase, sb } from './supabaseClient'

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '🌿' },
  { id: 'menu', label: 'Menú', icon: '📅' },
  { id: 'batch', label: 'Batch', icon: '♻️' },
  { id: 'recetario', label: 'Recetario', icon: '📖' },
  { id: 'compra', label: 'Compra', icon: '🛒' },
  { id: 'seguimiento', label: 'Seguimiento', icon: '⚖️' },
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
  const [contextoIA, setContextoIA] = useState('')

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

        <ContextoSemana onContextoChange={(ctx) => setContextoIA(ctx)} />

        <MenuSemanalGrid
          fechasSemana={fechasSemana}
          diasHorario={diasHorario}
          horarios={horarios}
          semanaInicioStr={semanaInicioStr}
          hoyStr={hoyStr}
          contextoIA={contextoIA}
        />

      </div>
    </>
  )
}

// ─── Contexto IA de la semana ─────────────────────────────────────────────────

function ContextoSemana({ onContextoChange }) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)

  function guardar() {
    onContextoChange(texto)
    setAbierto(false)
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ fontSize: 14 }}>💬 Cuéntame tu semana</strong>
          {texto && !abierto && (
            <p style={{ fontSize: 12, color: 'var(--sage-deep)', margin: '2px 0 0', fontStyle: 'italic' }}>
              Contexto guardado ✓
            </p>
          )}
        </div>
        <button
          onClick={() => setAbierto((v) => !v)}
          style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: 13, color: 'var(--ink-soft)' }}
        >
          {abierto ? 'Cerrar' : texto ? 'Editar' : 'Abrir'}
        </button>
      </div>

      {abierto && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Explícame cómo va a ser tu semana. La IA lo tendrá en cuenta al generar el menú.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 8px' }}>
            Por ejemplo: "Esta semana voy muy justa de tiempo, entreno lunes y jueves, el miércoles como fuera con compañeras de trabajo y el viernes probablemente no tenga ganas de cocinar."
          </p>
          <textarea
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cuéntame lo que necesitas…"
            style={{
              width: '100%', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)',
              padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
              minHeight: 100, resize: 'vertical', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={guardar}
              style={{ flex: 1, background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px', fontWeight: 600, fontSize: 14 }}>
              Guardar contexto
            </button>
            {texto && (
              <button onClick={() => { setTexto(''); onContextoChange('') }}
                style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: '#C77B5E' }}>
                Borrar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Menú semanal: grid de planificación ──────────────────────────────────────

const CAT_POR_TIPO = {
  desayuno: ['desayuno'],
  comida: ['comida', 'cocina de siempre'],
  merienda: ['merienda'],
  cena: ['cena'],
}

const TIEMPO_OPCIONES = [
  { id: 'mucho', label: 'Tengo tiempo para cocinar' },
  { id: 'algo', label: 'Tengo algo de tiempo' },
  { id: 'poco', label: 'Voy justa de tiempo' },
  { id: 'minimo', label: 'Solo quiero cocinar un día' },
]

function ModalPreguntas({ fechasSemana, onConfirmar, onCancelar }) {
  const [tiempo, setTiempo] = useState('algo')
  const [diasGym, setDiasGym] = useState([])
  const [diasEspeciales, setDiasEspeciales] = useState({})

  function toggleGym(fecha) {
    setDiasGym((prev) => prev.includes(fecha) ? prev.filter((f) => f !== fecha) : [...prev, fecha])
  }
  function toggleEspecial(fecha) {
    setDiasEspeciales((prev) => {
      const next = { ...prev }
      if (next[fecha]) delete next[fecha]
      else next[fecha] = 'comida fuera'
      return next
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-end', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ background: 'var(--cream)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '0 0 20px' }}>Antes de generar…</h2>

        <strong style={{ fontSize: 13 }}>¿Cuánto tiempo tienes esta semana?</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0 20px' }}>
          {TIEMPO_OPCIONES.map((op) => (
            <button key={op.id} onClick={() => setTiempo(op.id)} style={{
              textAlign: 'left', border: tiempo === op.id ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
              background: tiempo === op.id ? 'rgba(143,168,137,0.12)' : 'white',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14,
              color: tiempo === op.id ? 'var(--sage-deep)' : 'var(--ink)', fontWeight: tiempo === op.id ? 600 : 400,
            }}>{op.label}</button>
          ))}
        </div>

        <strong style={{ fontSize: 13 }}>¿Qué días entrenas?</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 20px' }}>
          {fechasSemana.map((fecha, i) => (
            <button key={fecha} onClick={() => toggleGym(fecha)} style={{
              border: diasGym.includes(fecha) ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
              background: diasGym.includes(fecha) ? 'var(--sage-deep)' : 'white',
              color: diasGym.includes(fecha) ? 'white' : 'var(--ink)',
              borderRadius: 999, padding: '7px 13px', fontSize: 13, fontWeight: 500,
            }}>{DIAS_SEMANA_LABEL[DIAS_SEMANA[i]].slice(0, 3)} {numeroDia(fecha)}</button>
          ))}
        </div>

        <strong style={{ fontSize: 13 }}>¿Hay algún día especial?</strong>
        <p style={{ color: 'var(--ink-soft)', fontSize: 12.5, margin: '4px 0 10px' }}>Comida fuera, cena fuera, no quiero cocinar…</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {fechasSemana.map((fecha, i) => (
            <button key={fecha} onClick={() => toggleEspecial(fecha)} style={{
              border: diasEspeciales[fecha] ? '1.5px solid var(--peach)' : '1px solid var(--line)',
              background: diasEspeciales[fecha] ? 'var(--peach)' : 'white',
              color: 'var(--ink)', borderRadius: 999, padding: '7px 13px', fontSize: 13, fontWeight: 500,
            }}>{DIAS_SEMANA_LABEL[DIAS_SEMANA[i]].slice(0, 3)} {numeroDia(fecha)}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onConfirmar({ tiempo, diasGym, diasEspeciales })}
            style={{ flex: 1, background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '13px', fontWeight: 700, fontSize: 15 }}>
            ✨ Generar menú
          </button>
          <button onClick={onCancelar}
            style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '13px 16px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function MenuSemanalGrid({ fechasSemana, diasHorario, horarios, semanaInicioStr, hoyStr, contextoIA }) {
  const [menu, setMenu] = useState({})
  const [borrador, setBorrador] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [picker, setPicker] = useState(null)
  const [error, setError] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [mostrandoPreguntas, setMostrandoPreguntas] = useState(false)

  function keyMenu(fecha, tipo) { return `${fecha}_${tipo}` }

  async function cargarMenu() {
    setLoading(true)
    const { data } = await supabase
      .from('nutrilab_menu_semanal')
      .select('*, receta:nutrilab_recetas(id, nombre, calorias)')
      .in('fecha', fechasSemana)
    const map = {}
    ;(data || []).forEach((row) => {
      map[keyMenu(row.fecha, row.tipo_comida)] = {
        id: row.id, receta_id: row.receta_id,
        nombre: row.receta?.nombre || row.nombre_libre || '',
        calorias: row.receta?.calorias || null, estado: row.estado,
      }
    })
    setMenu(map)
    setLoading(false)
  }

  useEffect(() => { cargarMenu() }, [semanaInicioStr])

  function horarioDel(fecha) {
    const hId = diasHorario[fecha]
    return horarios.find((h) => h.id === hId) || null
  }

  function calcularKcalDia(fecha, menuActual) {
    const h = horarioDel(fecha)
    if (!h) return null
    let total = 0, tiene = false
    ;(h.comidas_incluidas || []).forEach((tipo) => {
      const slot = menuActual[keyMenu(fecha, tipo)]
      if (slot?.calorias) { total += slot.calorias; tiene = true }
    })
    return tiene ? total : null
  }

  function detectarAvisos(menuActual) {
    const conteo = {}
    Object.values(menuActual).forEach((slot) => {
      if (slot?.nombre) conteo[slot.nombre] = (conteo[slot.nombre] || 0) + 1
    })
    return Object.entries(conteo)
      .filter(([, n]) => n >= 3)
      .map(([nombre, n]) => `"${nombre}" aparece ${n} veces esta semana. Podrías variar.`)
  }

  async function generarMenuIA(preferencias) {
    setMostrandoPreguntas(false)
    setGenerando(true)
    setError(null)
    setAvisos([])

    const dias = fechasSemana.map((fecha) => {
      const h = horarioDel(fecha)
      if (!h) return null
      return { fecha, tipo_comida: h.comidas_incluidas || [], dia_gym: preferencias.diasGym.includes(fecha), dia_especial: preferencias.diasEspeciales[fecha] || null }
    }).filter(Boolean)

    if (dias.length === 0) {
      setError('Asigna un horario a los días antes de generar el menú.')
      setGenerando(false)
      return
    }

    const { data: recetas } = await supabase
      .from('nutrilab_recetas')
      .select('id, nombre, categoria, subcategoria, calorias, proteina, hidratos, grasas, etiquetas, taper, batch_ingredientes, tiempo_minutos')
      .eq('en_biblioteca', true)

    try {
      const res = await fetch('/.netlify/functions/menu-semanal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dias, recetas, preferencias, contextoIA }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${res.status}`)
      }
      const resultado = await res.json()

      const recetaMap = {}
      ;(recetas || []).forEach((r) => { recetaMap[r.id] = r })

      const nuevoBorrador = {}
      ;(resultado.menu || []).forEach((item) => {
        const receta = recetaMap[item.receta_id]
        nuevoBorrador[keyMenu(item.fecha, item.tipo_comida)] = {
          receta_id: item.receta_id,
          nombre: receta?.nombre || item.nombre || '',
          calorias: receta?.calorias || null,
          estado: 'pendiente',
        }
      })

      setBorrador(nuevoBorrador)
      setAvisos(detectarAvisos(nuevoBorrador))
    } catch (err) {
      setError(`Error: ${err.message}`)
    }
    setGenerando(false)
  }

  async function guardarBorrador() {
    if (!borrador) return
    setGuardando(true)
    await supabase.from('nutrilab_menu_semanal').delete().in('fecha', fechasSemana)
    const filas = Object.entries(borrador).map(([key, slot], i) => {
      const parts = key.split('_')
      const tipo_comida = parts[parts.length - 1]
      const fecha = parts.slice(0, parts.length - 1).join('_')
      return { id: Date.now() + i, fecha, tipo_comida, receta_id: slot.receta_id, estado: 'pendiente' }
    })
    if (filas.length > 0) await supabase.from('nutrilab_menu_semanal').insert(filas)
    setBorrador(null)
    await cargarMenu()
    setGuardando(false)
  }

  async function asignarReceta(fecha, tipo_comida, receta) {
    const key = keyMenu(fecha, tipo_comida)
    if (borrador) {
      setBorrador((prev) => ({ ...prev, [key]: { receta_id: receta.id, nombre: receta.nombre, calorias: receta.calorias, estado: 'pendiente' } }))
    } else {
      const existing = menu[key]
      if (existing) await supabase.from('nutrilab_menu_semanal').delete().eq('id', existing.id)
      await supabase.from('nutrilab_menu_semanal').insert({ id: Date.now(), fecha, tipo_comida, receta_id: receta.id, estado: 'pendiente' })
      await cargarMenu()
    }
    setPicker(null)
  }

  async function quitarReceta(fecha, tipo_comida) {
    const key = keyMenu(fecha, tipo_comida)
    if (borrador) {
      setBorrador((prev) => { const next = { ...prev }; delete next[key]; return next })
    } else {
      const existing = menu[key]
      if (existing) { await supabase.from('nutrilab_menu_semanal').delete().eq('id', existing.id); await cargarMenu() }
    }
  }

  const menuActual = borrador || menu

  if (picker) {
    return (
      <RecetaPicker
        tipo={picker.tipo_comida}
        onSeleccionar={(r) => asignarReceta(picker.fecha, picker.tipo_comida, r)}
        onCerrar={() => setPicker(null)}
      />
    )
  }

  return (
    <>
      {mostrandoPreguntas && (
        <ModalPreguntas fechasSemana={fechasSemana} onConfirmar={generarMenuIA} onCancelar={() => setMostrandoPreguntas(false)} />
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: 15 }}>Planificación</strong>
          <button onClick={() => setMostrandoPreguntas(true)} disabled={generando}
            style={{ background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
            {generando ? 'Generando…' : '✨ Generar menú'}
          </button>
        </div>

        {error && <p style={{ color: '#C77B5E', fontSize: 13, marginBottom: 10 }}>{error}</p>}

        {avisos.length > 0 && (
          <div style={{ background: 'rgba(244,217,198,0.4)', border: '1px solid var(--peach)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 12 }}>
            {avisos.map((a, i) => <p key={i} style={{ margin: 0, fontSize: 13 }}>⚠️ {a}</p>)}
          </div>
        )}

        {borrador && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={guardarBorrador} disabled={guardando}
              style={{ flex: 1, background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px', fontWeight: 700, fontSize: 14 }}>
              {guardando ? 'Guardando…' : '✓ Guardar menú'}
            </button>
            <button onClick={() => setBorrador(null)}
              style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', fontSize: 14, color: 'var(--ink-soft)' }}>
              Descartar
            </button>
          </div>
        )}

        {loading ? <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Cargando…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fechasSemana.map((fecha, i) => {
              const h = horarioDel(fecha)
              const esHoy = fecha === hoyStr
              const kcalDia = calcularKcalDia(fecha, menuActual)
              if (!h) return (
                <div key={fecha} style={{ opacity: 0.4, fontSize: 13, color: 'var(--ink-soft)', paddingLeft: 4 }}>
                  {DIAS_SEMANA_LABEL[DIAS_SEMANA[i]]} {numeroDia(fecha)} — sin horario
                </div>
              )
              return (
                <div key={fecha} className="card" style={{ padding: '14px 16px', border: borrador ? '1px solid var(--peach)' : '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: esHoy ? 'var(--sage-deep)' : 'var(--ink)' }}>
                      {DIAS_SEMANA_LABEL[DIAS_SEMANA[i]]} {numeroDia(fecha)}
                      {esHoy && <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 6 }}>· hoy</span>}
                    </p>
                    {kcalDia && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{kcalDia} kcal</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(h.comidas_incluidas || []).map((tipo) => {
                      const slot = menuActual[keyMenu(fecha, tipo)]
                      return (
                        <div key={tipo} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sage-deep)', textTransform: 'uppercase', width: 62, flexShrink: 0, letterSpacing: '0.03em', paddingTop: 8 }}>
                            {TIPO_COMIDA_LABEL[tipo]}
                          </span>
                          {slot ? (
                            <div style={{ flex: 1, background: 'rgba(143,168,137,0.08)', borderRadius: 'var(--radius-sm)', padding: '7px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.4, flex: 1 }}>{slot.nombre}</p>
                                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                  <button onClick={() => setPicker({ fecha, tipo_comida: tipo })} style={{ background: 'none', border: 'none', color: 'var(--sage-deep)', fontSize: 11, padding: '2px 4px' }}>Cambiar</button>
                                  <button onClick={() => quitarReceta(fecha, tipo)} style={{ background: 'none', border: 'none', color: '#C77B5E', fontSize: 11, padding: '2px 4px' }}>✕</button>
                                </div>
                              </div>
                              {slot.calorias && <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{slot.calorias} kcal</span>}
                            </div>
                          ) : (
                            <button onClick={() => setPicker({ fecha, tipo_comida: tipo })}
                              style={{ flex: 1, background: 'none', border: '1px dashed var(--line)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', color: 'var(--ink-soft)', fontSize: 13, textAlign: 'left' }}>
                              + Añadir
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}


function RecetaPicker({ tipo, onSeleccionar, onCerrar }) {
  const [recetas, setRecetas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const cats = CAT_POR_TIPO[tipo] || [tipo]
      const { data } = await supabase
        .from('nutrilab_recetas')
        .select('id, nombre, categoria, subcategoria, calorias, proteina, tiempo_minutos, taper')
        .in('categoria', cats)
        .eq('en_biblioteca', true)
        .order('nombre')
      setRecetas(data || [])
      setLoading(false)
    }
    cargar()
  }, [tipo])

  const filtradas = recetas.filter((r) =>
    !busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--cream)', zIndex: 200, overflowY: 'auto', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ padding: '20px 20px 100px' }}>
        <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'var(--sage-deep)', fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 16 }}>
          ← Volver
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '0 0 16px' }}>
          Elegir {TIPO_COMIDA_LABEL[tipo]?.toLowerCase()}
        </h2>
        <input
          autoFocus
          type="text"
          placeholder="Buscar…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 14 }}
        />
        {loading ? (
          <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtradas.map((r) => (
              <button
                key={r.id}
                onClick={() => onSeleccionar(r)}
                style={{ textAlign: 'left', background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', width: '100%' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: 'var(--sage-deep)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>{r.subcategoria || r.categoria}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, fontFamily: 'var(--font-display)' }}>{r.nombre}</p>
                  </div>
                  {r.calorias && (
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{r.calorias}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>kcal</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {r.tiempo_minutos && <span style={chipEstilo}>{r.tiempo_minutos} min</span>}
                  {r.taper && <span style={{ ...chipEstilo, color: 'var(--sage-deep)' }}>📦 Táper</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


const CAT_BATCH_LABEL = { proteina: '🥩 Proteína', hidrato: '🌾 Hidratos', verdura: '🥦 Verdura', salsa_base: '🥄 Salsas y bases' }
const CAT_BATCH_ORDER = { proteina: 0, hidrato: 1, verdura: 2, salsa_base: 3 }

function BatchSection({ semanaInicioStr, diaBatch }) {
  const [plan, setPlan] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [planBorrador, setPlanBorrador] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const { data: p } = await supabase.from('nutrilab_batch_plan').select('*').eq('semana_inicio', semanaInicioStr).maybeSingle()
      if (p) {
        setPlan(p)
        const { data: it } = await supabase.from('nutrilab_batch_items').select('*').eq('plan_id', p.id).order('orden_preparacion')
        setItems(it || [])
      } else {
        setPlan(null)
        setItems([])
      }
      setLoading(false)
    }
    cargar()
  }, [semanaInicioStr])

  async function generarPlan() {
    setGenerando(true)
    setError(null)

    const fechaFin = (() => {
      const d = new Date(semanaInicioStr + 'T00:00:00')
      d.setDate(d.getDate() + 6)
      return formatoFecha(d)
    })()

    const { data: menuItems } = await supabase
      .from('nutrilab_menu_semanal')
      .select('tipo_comida, receta:nutrilab_recetas(nombre, ingredientes, batch_ingredientes, categoria)')
      .gte('fecha', semanaInicioStr)
      .lte('fecha', fechaFin)

    const recetasSemana = (menuItems || [])
      .filter((m) => m.receta)
      .map((m) => ({
        tipo_comida: m.tipo_comida,
        nombre: m.receta.nombre,
        ingredientes: m.receta.ingredientes,
        batch_ingredientes: m.receta.batch_ingredientes,
      }))

    if (recetasSemana.length === 0) {
      setError('No hay recetas guardadas en el menú esta semana. Ve a Menú, genera y guarda tu menú primero.')
      setGenerando(false)
      return
    }

    try {
      const res = await fetch('/.netlify/functions/batch-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recetas_semana: recetasSemana, dia_batch: diaBatch || 'domingo' }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${res.status}`)
      }
      const planData = await res.json()

      if (!planData.items || planData.items.length === 0) {
        throw new Error('La IA no devolvió ingredientes. Inténtalo de nuevo.')
      }

      // Normalizar momento: cualquier valor que no sea mitad_semana → 'batch_day'
      const itemsNorm = planData.items.map((it, i) => ({
        id: Date.now() + i + 1,
        plan_id: 0, // placeholder, se asigna al guardar
        nombre: it.nombre || 'Ingrediente',
        categoria: ['proteina','hidrato','verdura','salsa_base'].includes(it.categoria) ? it.categoria : 'otro',
        cantidad_preparar: it.cantidad_preparar || null,
        unidad: it.unidad || '',
        recetas_asociadas: Array.isArray(it.recetas_asociadas) ? it.recetas_asociadas : [],
        duracion_nevera_dias: it.duracion_nevera_dias || null,
        congelable: !!it.congelable,
        metodo_preparacion: it.metodo_preparacion || '',
        orden_preparacion: it.orden_preparacion || i + 1,
        momento: it.momento === 'mitad_semana' ? 'mitad_semana' : 'batch_day',
        observaciones: it.observaciones || null,
      }))

      setPlanBorrador({ notas: planData.notas || '', items: itemsNorm })
    } catch (err) {
      setError(`Error: ${err.message}`)
    }
    setGenerando(false)
  }

  async function guardarPlan() {
    if (!planBorrador) return
    setGuardando(true)

    const planId = Date.now()
    if (plan) {
      await supabase.from('nutrilab_batch_items').delete().eq('plan_id', plan.id)
      await supabase.from('nutrilab_batch_plan').delete().eq('id', plan.id)
    }

    const { error: errPlan } = await supabase.from('nutrilab_batch_plan').insert({
      id: planId,
      semana_inicio: semanaInicioStr,
      dia_preparacion: diaBatch || 'domingo',
      notas: planBorrador.notas,
    })

    if (!errPlan) {
      const filas = planBorrador.items.map((it) => ({ ...it, plan_id: planId }))
      await supabase.from('nutrilab_batch_items').insert(filas)
    }

    setPlan({ id: planId, notas: planBorrador.notas })
    setItems(planBorrador.items.map((it) => ({ ...it, plan_id: planId })))
    setPlanBorrador(null)
    setGuardando(false)
  }

  const itemsActuales = planBorrador?.items || items
  const notasActuales = planBorrador?.notas || plan?.notas
  const itemsBatchDay = itemsActuales.filter((i) => i.momento !== 'mitad_semana').sort((a, b) => a.orden_preparacion - b.orden_preparacion)
  const itemsMitad = itemsActuales.filter((i) => i.momento === 'mitad_semana')

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>Plan de preparación</strong>
        <button
          onClick={generarPlan}
          disabled={generando}
          style={{ background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: 13, fontWeight: 600 }}
        >
          {generando ? 'Generando…' : (plan || planBorrador) ? '↺ Regenerar' : '✨ Generar plan'}
        </button>
      </div>

      {error && <p style={{ color: '#C77B5E', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {loading && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Cargando…</p>}

      {!loading && !plan && !planBorrador && !error && (
        <div className="empty-state">
          <span className="icon">♻️</span>
          <p>Genera tu plan de preparación una vez hayas guardado el menú de la semana.</p>
        </div>
      )}

      {planBorrador && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={guardarPlan} disabled={guardando}
            style={{ flex: 1, background: 'var(--sage-deep)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px', fontWeight: 700, fontSize: 14 }}>
            {guardando ? 'Guardando…' : '✓ Guardar plan'}
          </button>
          <button onClick={() => setPlanBorrador(null)}
            style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '11px 14px', fontSize: 14, color: 'var(--ink-soft)' }}>
            Descartar
          </button>
        </div>
      )}

      {(plan || planBorrador) && itemsActuales.length > 0 && (
        <>
          {notasActuales && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 13, fontStyle: 'italic', marginBottom: 16 }}>{notasActuales}</p>
          )}

          {itemsBatchDay.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--sage-deep)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                Preparar el {DIAS_SEMANA_LABEL[diaBatch] || diaBatch || 'día elegido'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itemsBatchDay.map((it) => <BatchItem key={it.id} item={it} />)}
              </div>
            </div>
          )}

          {itemsMitad.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C77B5E', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                Preparar a mitad de semana
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {itemsMitad.map((it) => <BatchItem key={it.id} item={it} />)}
              </div>
            </div>
          )}

          <div className="card">
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
              Orden recomendado
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {itemsBatchDay.map((it) => (
                <li key={it.id} style={{ fontSize: 14, lineHeight: 1.4 }}>
                  <strong>{it.nombre}</strong>
                  {it.cantidad_preparar && <span style={{ color: 'var(--ink-soft)' }}> — {it.cantidad_preparar} {it.unidad}</span>}
                  {it.metodo_preparacion && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{it.metodo_preparacion}</p>}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  )
}

function BatchItem({ item }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10, lastChild: { borderBottom: 'none' } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{item.nombre}</span>
            {item.cantidad_preparar && (
              <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{item.cantidad_preparar} {item.unidad}</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>
            {CAT_BATCH_LABEL[item.categoria] || item.categoria}
            {item.duracion_nevera_dias && <span> · {item.duracion_nevera_dias}d nevera</span>}
            {item.congelable && <span> · ❄️ congelable</span>}
          </div>
        </div>
        {(item.recetas_asociadas?.length > 0 || item.observaciones) && (
          <button onClick={() => setAbierto((v) => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--sage-deep)', fontSize: 12.5, padding: '0 0 0 8px', flexShrink: 0 }}>
            {abierto ? 'Menos ▲' : 'Más ▼'}
          </button>
        )}
      </div>
      {abierto && (
        <div style={{ marginTop: 8, paddingLeft: 4 }}>
          {item.recetas_asociadas?.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', margin: '0 0 4px' }}>Se usará en:</p>
              <ul style={{ margin: 0, paddingLeft: 14 }}>
                {item.recetas_asociadas.map((r, i) => <li key={i} style={{ fontSize: 13 }}>{r}</li>)}
              </ul>
            </div>
          )}
          {item.observaciones && <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, fontStyle: 'italic' }}>{item.observaciones}</p>}
        </div>
      )}
    </div>
  )
}


// ─── Recetario: constantes y componentes ──────────────────────────────────────

const CATEGORIAS = [
  { id: 'todas', label: 'Todas' },
  { id: 'desayuno', label: 'Desayunos' },
  { id: 'comida', label: 'Comidas' },
  { id: 'cena', label: 'Cenas' },
  { id: 'merienda', label: 'Meriendas' },
  { id: 'cocina de siempre', label: 'Clásicas' },
  { id: 'recetas base', label: 'Bases' },
]

const GRUPO_LABEL = {
  proteina: '🥩 Proteína', hidrato: '🌾 Hidratos', verdura: '🥦 Verdura',
  fruta: '🍎 Fruta', lacteo: '🥛 Lácteo', grasa: '🫒 Grasa',
  salsa: '🥄 Salsa', condimento: '🧂 Condimento', otro: '📦 Otro',
}

const chipEstilo = {
  fontSize: 12, fontWeight: 500, padding: '4px 10px',
  borderRadius: 999, border: '1px solid var(--line)', background: 'white',
  color: 'var(--ink-soft)',
}

function FichaReceta({ receta, onCerrar }) {
  const ingredientesPorGrupo = (receta.ingredientes || []).reduce((acc, ing) => {
    const g = ing.grupo || 'otro'
    if (!acc[g]) acc[g] = []
    acc[g].push(ing)
    return acc
  }, {})

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--cream)', zIndex: 100, overflowY: 'auto', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ padding: '20px 20px 100px' }}>
        <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'var(--sage-deep)', fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 16 }}>
          ← Volver
        </button>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sage-deep)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
          {receta.categoria}{receta.subcategoria ? ` · ${receta.subcategoria}` : ''}
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: '0 0 8px', lineHeight: 1.2 }}>{receta.nombre}</h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '0 0 20px' }}>{receta.descripcion}</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {receta.tiempo_minutos && <span style={chipEstilo}>{receta.tiempo_minutos} min</span>}
          {receta.dificultad && <span style={chipEstilo}>{receta.dificultad}</span>}
          {receta.taper && <span style={{ ...chipEstilo, background: 'rgba(143,168,137,0.15)', color: 'var(--sage-deep)' }}>📦 Táper</span>}
          {receta.batch_ingredientes && <span style={{ ...chipEstilo, background: 'rgba(143,168,137,0.15)', color: 'var(--sage-deep)' }}>♻️ Batch</span>}
        </div>

        {receta.calorias && (
          <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, textAlign: 'center', padding: 14, marginBottom: 14 }}>
            {[
              { label: 'kcal', val: receta.calorias },
              { label: 'prot', val: receta.proteina ? `${receta.proteina}g` : '—' },
              { label: 'carb', val: receta.hidratos ? `${receta.hidratos}g` : '—' },
              { label: 'gras', val: receta.grasas ? `${receta.grasas}g` : '—' },
              { label: 'fibra', val: receta.fibra ? `${receta.fibra}g` : '—' },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ marginBottom: 14 }}>
          <strong>Ingredientes</strong>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(ingredientesPorGrupo).map(([grupo, ings]) => (
              <div key={grupo}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                  {GRUPO_LABEL[grupo] || grupo}
                </p>
                {ings.map((ing, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingBottom: 4 }}>
                    <span>{ing.nombre}</span>
                    <span style={{ color: 'var(--ink-soft)' }}>{ing.cantidad} {ing.unidad}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {(receta.elaboracion || []).length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <strong>Elaboración</strong>
            <ol style={{ margin: '12px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {receta.elaboracion.map((paso, i) => (
                <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>{paso}</li>
              ))}
            </ol>
          </div>
        )}

        {(receta.conservacion || receta.congelacion) && (
          <div className="card" style={{ marginBottom: 14 }}>
            <strong>Conservación</strong>
            {receta.conservacion && <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '8px 0 0' }}>🧊 Nevera: {receta.conservacion}</p>}
            {receta.congelacion && <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '6px 0 0' }}>❄️ Congelador: {receta.congelacion}</p>}
          </div>
        )}

        {(receta.consejos || []).length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <strong>Consejos</strong>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {receta.consejos.map((c, i) => <li key={i} style={{ fontSize: 14 }}>{c}</li>)}
            </ul>
          </div>
        )}

        {(receta.variantes || []).length > 0 && (
          <div className="card">
            <strong>Variantes</strong>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {receta.variantes.map((v, i) => <li key={i} style={{ fontSize: 14 }}>{v}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function ScreenRecetario() {
  const [recetas, setRecetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [catActiva, setCatActiva] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [fichaAbierta, setFichaAbierta] = useState(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const { data } = await supabase.from('nutrilab_recetas').select('*').eq('en_biblioteca', true).order('categoria').order('nombre')
      setRecetas(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const filtradas = recetas.filter((r) => {
    const matchCat = catActiva === 'todas' || r.categoria === catActiva
    const matchBusq = !busqueda || r.nombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchCat && matchBusq
  })

  if (fichaAbierta) {
    return <FichaReceta receta={fichaAbierta} onCerrar={() => setFichaAbierta(null)} />
  }

  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Tu biblioteca</p>
        <h1>Recetario</h1>
      </div>
      <div className="app-content">
        <input type="text" placeholder="Buscar receta…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', background: 'white', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {CATEGORIAS.map((c) => (
            <button key={c.id} onClick={() => setCatActiva(c.id)} style={{
              flexShrink: 0, border: catActiva === c.id ? '1.5px solid var(--sage-deep)' : '1px solid var(--line)',
              background: catActiva === c.id ? 'var(--sage-deep)' : 'white',
              color: catActiva === c.id ? 'white' : 'var(--ink)',
              borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 500,
            }}>{c.label}</button>
          ))}
        </div>
        {loading ? <div className="empty-state"><p>Cargando…</p></div>
          : filtradas.length === 0 ? <div className="empty-state"><span className="icon">🔍</span><p>No hay recetas que coincidan.</p></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtradas.map((r) => (
                <button key={r.id} onClick={() => setFichaAbierta(r)}
                  style={{ textAlign: 'left', background: 'white', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage-deep)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>{r.subcategoria || r.categoria}</p>
                      <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>{r.nombre}</p>
                      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.4 }}>{r.descripcion}</p>
                    </div>
                    {r.calorias && (
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{r.calorias}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>kcal</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {r.tiempo_minutos && <span style={chipEstilo}>{r.tiempo_minutos} min</span>}
                    {r.taper && <span style={{ ...chipEstilo, color: 'var(--sage-deep)' }}>📦 Táper</span>}
                    {r.batch_ingredientes && <span style={{ ...chipEstilo, color: 'var(--sage-deep)' }}>♻️ Batch</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>
    </>
  )
}

function ScreenBatch() {
  const lunes = lunesDeEstaSemana()
  const semanaInicioStr = formatoFecha(lunes)

  const [semanaConfig, setSemanaConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('nutrilab_semana_config')
        .select('*')
        .eq('semana_inicio', semanaInicioStr)
        .maybeSingle()
      setSemanaConfig(data || null)
      setLoading(false)
    }
    cargar()
  }, [semanaInicioStr])

  return (
    <>
      <div className="app-header">
        <p className="eyebrow">{mesLabel(semanaInicioStr)}</p>
        <h1>Batch cooking</h1>
        {!loading && semanaConfig?.dia_batch_cooking && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 4 }}>
            Día elegido: <strong>{DIAS_SEMANA_LABEL[semanaConfig.dia_batch_cooking]}</strong>
          </p>
        )}
      </div>
      <div className="app-content">
        {loading ? (
          <div className="empty-state"><p>Cargando…</p></div>
        ) : (
          <BatchSection semanaInicioStr={semanaInicioStr} diaBatch={semanaConfig?.dia_batch_cooking || 'domingo'} />
        )}
      </div>
    </>
  )
}

const GRUPO_COMPRA_LABEL = {
  proteina: '🥩 Carnes y proteínas',
  hidrato: '🌾 Hidratos',
  verdura: '🥦 Verduras y hortalizas',
  fruta: '🍎 Frutas',
  lacteo: '🥛 Lácteos',
  grasa: '🫒 Aceites y grasas',
  salsa: '🥫 Salsas y conservas',
  condimento: '🧂 Condimentos',
  otro: '📦 Otros',
}
const GRUPO_COMPRA_ORDEN = ['proteina','hidrato','verdura','fruta','lacteo','grasa','salsa','condimento','otro']

function ScreenCompra() {
  const [lista, setLista] = useState([])
  const [despensa, setDespensa] = useState([]) // nombres en minúsculas
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)
  const [mostrarComprados, setMostrarComprados] = useState(false)

  const lunes = lunesDeEstaSemana()
  const semanaInicioStr = formatoFecha(lunes)
  const fechasSemana = DIAS_SEMANA.map((_, i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate() + i); return formatoFecha(d)
  })

  async function cargarTodo() {
    setLoading(true)
    const [{ data: items }, { data: desp }] = await Promise.all([
      supabase.from('nutrilab_lista_compra').select('*').eq('semana_inicio', semanaInicioStr).order('grupo').order('nombre'),
      supabase.from('nutrilab_despensa').select('nombre'),
    ])
    setLista(items || [])
    setDespensa((desp || []).map(d => d.nombre.toLowerCase()))
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [semanaInicioStr])

  async function generarLista() {
    setGenerando(true)
    setError(null)

    const { data: menuItems } = await supabase
      .from('nutrilab_menu_semanal')
      .select('receta:nutrilab_recetas(nombre, ingredientes)')
      .in('fecha', fechasSemana)

    const recetasConIngredientes = (menuItems || []).filter(m => m.receta?.ingredientes?.length > 0)

    if (recetasConIngredientes.length === 0) {
      setError('No hay recetas guardadas en el menú esta semana. Genera y guarda tu menú primero.')
      setGenerando(false)
      return
    }

    // Agrupar ingredientes: clave = nombre normalizado + unidad
    const mapa = {}
    recetasConIngredientes.forEach(({ receta }) => {
      ;(receta.ingredientes || []).forEach(ing => {
        const clave = `${ing.nombre?.toLowerCase().trim()}_${ing.unidad || ''}`
        if (!mapa[clave]) {
          mapa[clave] = {
            nombre: ing.nombre,
            cantidad: typeof ing.cantidad === 'number' ? ing.cantidad : null,
            unidad: ing.unidad || '',
            grupo: ing.grupo || 'otro',
            recetas: [receta.nombre],
          }
        } else {
          if (typeof ing.cantidad === 'number' && mapa[clave].cantidad !== null) {
            mapa[clave].cantidad += ing.cantidad
          }
          if (!mapa[clave].recetas.includes(receta.nombre)) {
            mapa[clave].recetas.push(receta.nombre)
          }
        }
      })
    })

    // Determinar estado inicial: tengo_en_casa si está en despensa
    const desp = despensa
    const nuevosItems = Object.values(mapa).map((ing, i) => ({
      id: Date.now() + i,
      semana_inicio: semanaInicioStr,
      nombre: ing.nombre,
      cantidad: ing.cantidad,
      unidad: ing.unidad,
      grupo: ing.grupo,
      recetas_origen: ing.recetas,
      estado: desp.includes(ing.nombre?.toLowerCase().trim()) ? 'tengo_en_casa' : 'pendiente',
    }))

    // Borrar lista anterior de esta semana e insertar nueva
    await supabase.from('nutrilab_lista_compra').delete().eq('semana_inicio', semanaInicioStr)
    if (nuevosItems.length > 0) {
      await supabase.from('nutrilab_lista_compra').insert(nuevosItems)
    }

    await cargarTodo()
    setGenerando(false)
  }

  async function cambiarEstado(item, nuevoEstado) {
    await supabase.from('nutrilab_lista_compra').update({ estado: nuevoEstado }).eq('id', item.id)
    setLista(prev => prev.map(i => i.id === item.id ? { ...i, estado: nuevoEstado } : i))
  }

  async function toggleDespensa(item) {
    const nombre = item.nombre.toLowerCase().trim()
    const esDespensa = despensa.includes(nombre)
    if (esDespensa) {
      await supabase.from('nutrilab_despensa').delete().eq('nombre', nombre)
      setDespensa(prev => prev.filter(d => d !== nombre))
    } else {
      await supabase.from('nutrilab_despensa').insert({ id: Date.now(), nombre })
      setDespensa(prev => [...prev, nombre])
      // Marcar como tengo_en_casa también en la lista actual
      await cambiarEstado(item, 'tengo_en_casa')
    }
  }

  const pendientes = lista.filter(i => i.estado === 'pendiente')
  const tengoEnCasa = lista.filter(i => i.estado === 'tengo_en_casa')
  const comprados = lista.filter(i => i.estado === 'comprado')

  const pendientesPorGrupo = GRUPO_COMPRA_ORDEN.reduce((acc, g) => {
    const items = pendientes.filter(i => i.grupo === g)
    if (items.length > 0) acc[g] = items
    return acc
  }, {})

  const totalPendientes = pendientes.length
  const totalComprados = comprados.length
  const total = lista.filter(i => i.estado !== 'tengo_en_casa').length

  if (loading) {
    return (
      <>
        <div className="app-header">
          <p className="eyebrow">Esta semana</p>
          <h1>Lista de la compra</h1>
        </div>
        <div className="app-content"><div className="empty-state"><p>Cargando…</p></div></div>
      </>
    )
  }

  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Esta semana</p>
        <h1>Lista de la compra</h1>
      </div>
      <div className="app-content">

        {/* Botón generar + progreso */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            {total > 0 && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                <strong style={{ color: 'var(--sage-deep)' }}>{totalComprados}</strong> de {total} comprados
              </p>
            )}
          </div>
          <button onClick={generarLista} disabled={generando} style={{
            background: 'var(--sage-deep)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: 13, fontWeight: 600,
          }}>
            {generando ? 'Generando…' : lista.length > 0 ? '↺ Regenerar' : '✨ Generar lista'}
          </button>
        </div>

        {error && <p style={{ color: '#C77B5E', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {lista.length === 0 && !error && (
          <div className="empty-state">
            <span className="icon">🛒</span>
            <p>Genera la lista una vez tengas el menú de la semana guardado.</p>
          </div>
        )}

        {/* Barra de progreso */}
        {total > 0 && (
          <div style={{ background: 'var(--line)', borderRadius: 999, height: 6, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ background: 'var(--sage-deep)', height: '100%', width: `${(totalComprados / total) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
        )}

        {/* Items pendientes por grupo */}
        {Object.entries(pendientesPorGrupo).map(([grupo, items]) => (
          <div key={grupo} style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              {GRUPO_COMPRA_LABEL[grupo] || grupo}
            </p>
            <div className="card" style={{ padding: '4px 0' }}>
              {items.map((item, idx) => (
                <ItemCompra
                  key={item.id}
                  item={item}
                  esDespensa={despensa.includes(item.nombre?.toLowerCase().trim())}
                  onComprar={() => cambiarEstado(item, 'comprado')}
                  onDespensa={() => toggleDespensa(item)}
                  separador={idx < items.length - 1}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Ya lo tengo en casa */}
        {tengoEnCasa.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              🏠 Ya lo tengo en casa
            </p>
            <div className="card" style={{ padding: '4px 0' }}>
              {tengoEnCasa.map((item, idx) => (
                <ItemCompra
                  key={item.id}
                  item={item}
                  esDespensa={despensa.includes(item.nombre?.toLowerCase().trim())}
                  atenuado
                  onDeshacer={() => cambiarEstado(item, 'pendiente')}
                  onDespensa={() => toggleDespensa(item)}
                  separador={idx < tengoEnCasa.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Comprados */}
        {comprados.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <button
              onClick={() => setMostrarComprados(v => !v)}
              style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0 8px', cursor: 'pointer' }}
            >
              ✓ Comprados ({comprados.length}) {mostrarComprados ? '▲' : '▼'}
            </button>
            {mostrarComprados && (
              <div className="card" style={{ padding: '4px 0' }}>
                {comprados.map((item, idx) => (
                  <ItemCompra
                    key={item.id}
                    item={item}
                    esDespensa={despensa.includes(item.nombre?.toLowerCase().trim())}
                    atenuado
                    comprado
                    onDeshacer={() => cambiarEstado(item, 'pendiente')}
                    onDespensa={() => toggleDespensa(item)}
                    separador={idx < comprados.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function ItemCompra({ item, esDespensa, atenuado, comprado, onComprar, onDeshacer, onDespensa, separador }) {
  const [detalle, setDetalle] = useState(false)

  return (
    <div style={{ borderBottom: separador ? '1px solid var(--line)' : 'none', padding: '10px 16px', opacity: atenuado ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Checkbox */}
        <button
          onClick={comprado || atenuado ? onDeshacer : onComprar}
          style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            border: comprado ? 'none' : '1.5px solid var(--line)',
            background: comprado ? 'var(--sage-deep)' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {comprado && <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>✓</span>}
        </button>

        {/* Nombre + cantidad */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 14, fontWeight: 500,
            textDecoration: comprado ? 'line-through' : 'none',
            color: comprado ? 'var(--ink-soft)' : 'var(--ink)',
          }}>
            {item.nombre}
          </span>
          {(item.cantidad || item.unidad) && (
            <span style={{ fontSize: 13, color: 'var(--ink-soft)', marginLeft: 6 }}>
              {item.cantidad ? `${Number.isInteger(item.cantidad) ? item.cantidad : item.cantidad.toFixed(0)}` : ''} {item.unidad}
            </span>
          )}
          {esDespensa && <span style={{ fontSize: 10, color: 'var(--sage-deep)', marginLeft: 6, fontWeight: 600 }}>DESPENSA</span>}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {(item.recetas_origen?.length > 0) && (
            <button onClick={() => setDetalle(v => !v)}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--ink-soft)', padding: '2px 4px' }}>
              {detalle ? '▲' : '▼'}
            </button>
          )}
          <button
            onClick={onDespensa}
            title={esDespensa ? 'Quitar de despensa' : 'Añadir a despensa'}
            style={{ background: 'none', border: 'none', fontSize: 14, padding: '2px 4px', opacity: esDespensa ? 1 : 0.4 }}
          >
            🏠
          </button>
        </div>
      </div>

      {detalle && item.recetas_origen?.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '6px 0 0 34px', fontStyle: 'italic' }}>
          {item.recetas_origen.join(', ')}
        </p>
      )}
    </div>
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
  batch: ScreenBatch,
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
