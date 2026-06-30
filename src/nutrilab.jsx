import { useState } from 'react'

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

function ScreenPerfil() {
  return (
    <>
      <div className="app-header">
        <p className="eyebrow">Seguimiento</p>
        <h1>Perfil</h1>
      </div>
      <div className="app-content">
        <div className="card">
          <strong>Peso y horarios</strong>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6 }}>
            Aquí registrarás tu peso y elegirás tu horario activo (mañana / tarde) y el día de batch cooking.
          </p>
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
