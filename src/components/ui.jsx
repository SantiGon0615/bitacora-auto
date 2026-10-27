import { TIPOS_NAFTA } from '../config.js'

export function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center" onClick={onCerrar}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onCerrar} className="rounded-full px-3 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ etiqueta, children, ayuda }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-400">{ayuda}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-400 focus:bg-white'

export function Chip({ activo, onClick, children, clasesActivo = 'bg-slate-900 text-white' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${activo ? clasesActivo : 'bg-slate-100 text-slate-600'}`}
    >
      {children}
    </button>
  )
}

export function BadgeNafta({ tipo, chico }) {
  const t = TIPOS_NAFTA[tipo] ?? TIPOS_NAFTA.OTRO
  return (
    <span className={`inline-block rounded-full font-semibold ${t.suave} ${chico ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
      {t.nombre}
    </span>
  )
}

export function Tarjeta({ children, className = '' }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-sm ${className}`}>{children}</section>
}

export function Vacio({ children }) {
  return <p className="py-8 text-center text-sm text-slate-400">{children}</p>
}

/** número opcional de un input: '' -> null */
export const numOrNull = (v) => (v === '' || v == null ? null : Number(v))
