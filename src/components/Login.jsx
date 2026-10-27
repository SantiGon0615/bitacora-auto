import { useState } from 'react'
import { supabase } from '../supabase.js'
import { inputCls } from './ui.jsx'

// Login con mail y contraseña: funciona también en el ícono de la pantalla de inicio
// del iPhone (que no comparte sesión con Safari, así que los links del mail no sirven ahí).
const urlApp = () => window.location.origin + window.location.pathname

export default function Login() {
  const [modo, setModo] = useState('entrar') // entrar | crear | recuperar
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  function cambiarModo(m) {
    setModo(m)
    setError('')
    setAviso('')
  }

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    setCargando(true)
    const mail = email.trim()

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
      if (error) setError('Mail o contraseña incorrectos. Si nunca creaste contraseña, tocá "Crear o recuperar contraseña".')
    } else if (modo === 'crear') {
      const { data, error } = await supabase.auth.signUp({ email: mail, password, options: { emailRedirectTo: urlApp() } })
      if (error) setError(error.message)
      else if (!data.session) {
        // Ya existía la cuenta, o hay que confirmar el mail
        setAviso('Si es tu primera vez, te llegó un mail para confirmar la cuenta: abrilo y después entrá acá. Si ya tenías cuenta, usá "Crear o recuperar contraseña".')
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: urlApp() })
      if (error) setError(error.message)
      else setAviso('Te mandamos un mail. Abrí el link (se abre en Safari), elegí tu contraseña y después ya podés entrar desde el ícono.')
    }
    setCargando(false)
  }

  const textoBoton = { entrar: 'Entrar', crear: 'Crear cuenta', recuperar: 'Mandarme el mail' }[modo]

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <img src={`${import.meta.env.BASE_URL}icono.svg`} alt="" className="mb-6 h-14 w-14" />
        <h1 className="text-3xl font-bold tracking-tight">Bitácora de autos</h1>
        <p className="mt-2 text-slate-500">
          {modo === 'recuperar' ? 'Te mandamos un link para elegir una contraseña nueva.' : 'Cargas de nafta y mantenimiento de la familia.'}
        </p>

        <form onSubmit={enviar} className="mt-8 space-y-3">
          <input
            type="email"
            required
            placeholder="tu@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
          {modo !== 'recuperar' && (
            <input
              type="password"
              required
              minLength={6}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
            />
          )}
          <button disabled={cargando} className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50">
            {cargando ? 'Un momento…' : textoBoton}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {aviso && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}
        </form>

        <div className="mt-6 space-y-2 text-center text-sm">
          {modo !== 'entrar' && (
            <button onClick={() => cambiarModo('entrar')} className="block w-full text-slate-500 underline">
              Ya tengo contraseña, entrar
            </button>
          )}
          {modo !== 'recuperar' && (
            <button onClick={() => cambiarModo('recuperar')} className="block w-full text-slate-500 underline">
              Crear o recuperar contraseña
            </button>
          )}
          {modo !== 'crear' && (
            <button onClick={() => cambiarModo('crear')} className="block w-full text-slate-400 underline">
              Cuenta nueva
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Se muestra cuando se abre el link de "recuperar contraseña" del mail */
export function NuevaPassword({ onListo }) {
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e) {
    e.preventDefault()
    setCargando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setCargando(false)
    if (error) return setError(error.message)
    onListo()
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={guardar} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Elegí tu contraseña</h1>
        <p className="text-sm text-slate-500">Con esta contraseña vas a entrar desde el ícono del celu.</p>
        <input
          type="password"
          required
          minLength={6}
          placeholder="Contraseña nueva (mínimo 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          autoComplete="new-password"
        />
        <button disabled={cargando} className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50">
          {cargando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
