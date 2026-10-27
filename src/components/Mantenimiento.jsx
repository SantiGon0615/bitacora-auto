import { TIPOS_MANT } from '../config.js'
import { fechaCorta, kms, pesos } from '../lib/logica.js'
import { FilaProximo } from './Inicio.jsx'
import { Tarjeta, Vacio } from './ui.jsx'

export default function Mantenimiento({ mantenimientos, proximos, kmHoy, onNuevo, onEditar }) {
  const historial = [...mantenimientos].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const totalAnio = historial
    .filter((m) => m.fecha.startsWith(String(new Date().getFullYear())))
    .reduce((t, m) => t + Number(m.costo || 0), 0)

  return (
    <div className="space-y-4">
      <button onClick={onNuevo} className="w-full rounded-2xl bg-slate-900 py-3.5 font-bold text-white shadow">
        + Registrar mantenimiento
      </button>

      <Tarjeta>
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="font-semibold">Lo que viene</h3>
          <span className="text-xs text-slate-400">km actual: {kms(kmHoy)}</span>
        </div>
        {proximos.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">Sin avisos todavía.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {proximos.map((m) => (
              <FilaProximo key={m.id} m={m} />
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta className="p-0">
        <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
          <h3 className="font-semibold">Historial</h3>
          {totalAnio > 0 && <span className="text-sm text-slate-500">este año {pesos(totalAnio)}</span>}
        </div>
        {historial.length === 0 ? (
          <Vacio>Nada registrado.</Vacio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historial.map((m) => (
              <li key={m.id}>
                <button onClick={() => onEditar(m)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50">
                  <span className="w-14 pt-0.5 text-sm text-slate-500">{fechaCorta(m.fecha)}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{TIPOS_MANT[m.tipo]?.nombre ?? m.tipo}</span>
                    <span className="block text-xs text-slate-500">
                      {[m.km != null && kms(m.km), m.taller, m.descripcion].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {m.costo != null && <span className="text-sm font-medium">{pesos(Number(m.costo))}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}
