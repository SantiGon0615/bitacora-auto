import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import { calcularConsumos, consumoPromedio, gastoDelMes, kmActual, proximosMantenimientos, sugerirNafta } from './lib/logica.js'
import Login, { NuevaPassword } from './components/Login.jsx'
import Inicio from './components/Inicio.jsx'
import Cargas from './components/Cargas.jsx'
import Mantenimiento from './components/Mantenimiento.jsx'
import CargaForm from './components/CargaForm.jsx'
import MantForm from './components/MantForm.jsx'
import Ajustes from './components/Ajustes.jsx'

const PESTANAS = [
  { id: 'inicio', nombre: 'Inicio', icono: '⛽' },
  { id: 'cargas', nombre: 'Cargas', icono: '📋' },
  { id: 'mant', nombre: 'Mantenimiento', icono: '🔧' },
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Cargando />
  if (!session) return <Login />
  if (recuperando) return <NuevaPassword onListo={() => setRecuperando(false)} />
  return <Bitacora session={session} />
}

function Bitacora({ session }) {
  const [autos, setAutos] = useState([])
  const [cargas, setCargas] = useState([])
  const [mants, setMants] = useState([])
  const [estado, setEstado] = useState('cargando') // cargando | listo | sin-permiso | error
  const [autoId, setAutoId] = useState(() => localStorageGet('autoId'))
  const [pestana, setPestana] = useState('inicio')
  const [modal, setModal] = useState(null) // { tipo: 'carga'|'mant'|'ajustes', ...props }

  const recargar = useCallback(async () => {
    const [a, c, m] = await Promise.all([
      supabase.from('bitacora_autos').select('*').order('created_at'),
      supabase.from('bitacora_cargas').select('*').order('fecha', { ascending: false }).limit(1000),
      supabase.from('bitacora_mantenimientos').select('*').order('fecha', { ascending: false }),
    ])
    const error = a.error || c.error || m.error
    if (error) {
      setEstado('error')
      console.error(error)
      return
    }
    // Si RLS no deja ver ningún auto, el mail no está habilitado
    if (a.data.length === 0) {
      setEstado('sin-permiso')
      return
    }
    setAutos(a.data)
    setCargas(c.data)
    setMants(m.data)
    setEstado('listo')
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const auto = autos.find((a) => a.id === autoId) ?? autos[0]
  useEffect(() => {
    if (auto) localStorageSet('autoId', auto.id)
  }, [auto])

  // Datos derivados del auto elegido
  const derivados = useMemo(() => {
    if (!auto) return null
    const cargasAuto = cargas.filter((c) => c.auto_id === auto.id)
    const mantsAuto = mants.filter((m) => m.auto_id === auto.id)
    const kmHoy = kmActual(cargasAuto, mantsAuto)
    return {
      cargasAuto,
      mantsAuto,
      kmHoy,
      sugerencia: sugerirNafta(cargasAuto, auto.supers_por_infinia),
      consumoProm: consumoPromedio(calcularConsumos(cargasAuto)),
      gastoMes: gastoDelMes(cargasAuto),
      proximos: proximosMantenimientos(mantsAuto, kmHoy),
    }
  }, [auto, cargas, mants])

  const pendientes = cargas.filter((c) => !c.auto_id)

  const cerrarYRecargar = () => {
    setModal(null)
    recargar()
  }

  async function asignar(carga, idAuto) {
    const { error } = await supabase.from('bitacora_cargas').update({ auto_id: idAuto }).eq('id', carga.id)
    if (error) alert(error.message)
    recargar()
  }

  if (estado === 'cargando') return <Cargando />
  if (estado === 'sin-permiso') return <SinPermiso email={session.user.email} />
  if (estado === 'error')
    return (
      <Centro>
        <p>No se pudieron cargar los datos.</p>
        <button onClick={recargar} className="mt-4 rounded-xl bg-slate-900 px-5 py-2 text-white">
          Reintentar
        </button>
      </Centro>
    )

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-28">
      {/* Encabezado con selector de auto */}
      <header className="sticky top-0 z-10 bg-slate-100/90 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1 rounded-2xl bg-slate-200 p-1">
            {autos.map((a) => (
              <button
                key={a.id}
                onClick={() => setAutoId(a.id)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${a.id === auto.id ? 'bg-white shadow' : 'text-slate-500'}`}
              >
                {a.nombre}
              </button>
            ))}
          </div>
          <button onClick={() => setModal({ tipo: 'ajustes' })} className="rounded-xl p-2 text-xl text-slate-500" aria-label="Ajustes">
            ⚙︎
          </button>
        </div>
      </header>

      <main className="px-4 pt-2">
        {pestana === 'inicio' && (
          <Inicio
            auto={auto}
            autos={autos}
            {...derivados}
            pendientes={pendientes}
            onNuevaCarga={(tipo) => setModal({ tipo: 'carga', tipoSugerido: tipo })}
            onCompletar={(c) => setModal({ tipo: 'carga', carga: c })}
            onAsignar={asignar}
            onVerMant={() => setPestana('mant')}
          />
        )}
        {pestana === 'cargas' && <Cargas cargas={derivados.cargasAuto} onEditar={(c) => setModal({ tipo: 'carga', carga: c })} />}
        {pestana === 'mant' && (
          <Mantenimiento
            mantenimientos={derivados.mantsAuto}
            proximos={derivados.proximos}
            kmHoy={derivados.kmHoy}
            onNuevo={() => setModal({ tipo: 'mant' })}
            onEditar={(m) => setModal({ tipo: 'mant', mant: m })}
          />
        )}
      </main>

      {/* Navegación inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPestana(p.id)}
              className={`flex flex-1 flex-col items-center py-2.5 text-xs font-medium ${pestana === p.id ? 'text-slate-900' : 'text-slate-400'}`}
            >
              <span className={`text-xl ${pestana === p.id ? '' : 'opacity-50 grayscale'}`}>{p.icono}</span>
              {p.nombre}
            </button>
          ))}
        </div>
      </nav>

      {modal?.tipo === 'carga' && (
        <CargaForm
          autos={autos}
          autoInicial={auto.id}
          tipoSugerido={modal.tipoSugerido}
          carga={modal.carga}
          onCerrar={() => setModal(null)}
          onGuardado={cerrarYRecargar}
        />
      )}
      {modal?.tipo === 'mant' && (
        <MantForm
          autos={autos}
          autoInicial={auto.id}
          kmSugerido={derivados.kmHoy}
          mant={modal.mant}
          onCerrar={() => setModal(null)}
          onGuardado={cerrarYRecargar}
        />
      )}
      {modal?.tipo === 'ajustes' && (
        <Ajustes autos={autos} email={session.user.email} onCerrar={() => setModal(null)} onGuardado={cerrarYRecargar} />
      )}
    </div>
  )
}

function Centro({ children }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">{children}</div>
}

function Cargando() {
  return (
    <Centro>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
    </Centro>
  )
}

function SinPermiso({ email }) {
  return (
    <Centro>
      <p className="text-lg font-semibold">Tu mail no está habilitado</p>
      <p className="mt-2 max-w-xs text-slate-500">
        {email} todavía no está en la lista de la familia. Pedí que lo agreguen a la tabla <code>bitacora_miembros</code>.
      </p>
      <button onClick={() => supabase.auth.signOut()} className="mt-6 text-sm text-slate-500 underline">
        Entrar con otro mail
      </button>
    </Centro>
  )
}

function localStorageGet(clave) {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
function localStorageSet(clave, valor) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    /* sin almacenamiento, no pasa nada */
  }
}
