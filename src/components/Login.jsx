import { useState } from 'react'
import { supabase } from '../supabase.js'
import { inputCls } from './ui.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState('inicial') // inicial | enviando | enviado | error
  const [error, setError] = useState('')

  async function enviar(e) {
    e.preventDefault()
    setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) {
      setError(error.message)
      setEstado('error')
    } else {
      setEstado('enviado')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <img src={`${import.meta.env.BASE_URL}icono.svg`} alt="" className="mb-6 h-14 w-14" />
        <h1 className="text-3xl font-bold tracking-tight">Bitácora de autos</h1>
        <p className="mt-2 text-slate-500">Cargas de nafta y mantenimiento de la familia.</p>

        {estado === 'enviado' ? (
          <div className="mt-8 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            Te mandamos un link a <b>{email}</b>. Abrilo desde este mismo dispositivo para entrar.
          </div>
        ) : (
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
            <button
              disabled={estado === 'enviando'}
              className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50"
            >
              {estado === 'enviando' ? 'Enviando…' : 'Entrar con link por mail'}
            </button>
            {estado === 'error' && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
