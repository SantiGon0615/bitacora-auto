import { useState } from 'react'
import { supabase } from '../supabase.js'
import { inputCls } from './ui.jsx'

// Login sin contraseña: llega un mail con un link y un código.
// El código sirve en el ícono de la pantalla de inicio del iPhone,
// que no comparte la sesión con Safari (el link abriría Safari).
export default function Login() {
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState('inicial') // inicial | enviando | enviado | verificando
  const [error, setError] = useState('')

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) {
      setError(error.message)
      setEstado('inicial')
    } else {
      setEstado('enviado')
    }
  }

  async function verificar(e) {
    e.preventDefault()
    setError('')
    setEstado('verificando')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codigo.trim(),
      type: 'email',
    })
    if (error) {
      setError('El código no es válido o ya venció. Pedí uno nuevo si hace falta.')
      setEstado('enviado')
    }
    // Si sale bien, App detecta la sesión y entra solo.
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <img src={`${import.meta.env.BASE_URL}icono.svg`} alt="" className="mb-6 h-14 w-14" />
        <h1 className="text-3xl font-bold tracking-tight">Bitácora de autos</h1>
        <p className="mt-2 text-slate-500">Cargas de nafta y mantenimiento de la familia.</p>

        {estado === 'enviado' || estado === 'verificando' ? (
          <form onSubmit={verificar} className="mt-8 space-y-3">
            <p className="text-sm text-slate-600">
              Te mandamos un mail a <b>{email}</b>. Escribí acá el código que dice el mail
              (o tocá el link si estás en el navegador).
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={`${inputCls} text-center text-2xl tracking-[0.4em]`}
            />
            <button
              disabled={estado === 'verificando' || codigo.length < 6}
              className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50"
            >
              {estado === 'verificando' ? 'Verificando…' : 'Entrar'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => {
                setCodigo('')
                setError('')
                setEstado('inicial')
              }}
              className="w-full text-sm text-slate-500 underline"
            >
              Usar otro mail o pedir otro código
            </button>
          </form>
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
              {estado === 'enviando' ? 'Enviando…' : 'Mandarme el código'}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
