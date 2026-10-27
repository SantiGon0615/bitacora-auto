import { calcularConsumos, fechaCorta, ordenarDesc, parseFecha, pesos } from '../lib/logica.js'
import { BadgeNafta, Tarjeta, Vacio } from './ui.jsx'

export default function Cargas({ cargas, onEditar }) {
  if (cargas.length === 0) return <Vacio>No hay cargas registradas para este auto.</Vacio>

  const consumos = calcularConsumos(cargas)
  const porMes = new Map()
  for (const c of ordenarDesc(cargas)) {
    const mes = c.fecha.slice(0, 7)
    if (!porMes.has(mes)) porMes.set(mes, [])
    porMes.get(mes).push(c)
  }

  return (
    <div className="space-y-4">
      {[...porMes.entries()].map(([mes, lista]) => {
        const total = lista.reduce((t, c) => t + Number(c.monto || 0), 0)
        const nombreMes = parseFecha(mes + '-01').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
        return (
          <Tarjeta key={mes} className="p-0">
            <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
              <h3 className="font-semibold capitalize">{nombreMes}</h3>
              {total > 0 && <span className="text-sm text-slate-500">{pesos(total)}</span>}
            </div>
            <ul className="divide-y divide-slate-100">
              {lista.map((c) => (
                <li key={c.id}>
                  <button onClick={() => onEditar(c)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <span className="w-14 text-sm text-slate-500">{fechaCorta(c.fecha)}</span>
                    <BadgeNafta tipo={c.tipo} chico />
                    <span className="flex-1 text-sm text-slate-600">
                      {[c.litros && `${Number(c.litros)} l`, c.km != null && `${c.km.toLocaleString('es-AR')} km`, c.quien]
                        .filter(Boolean)
                        .join(' · ')}
                      {c.origen === 'mail' && <span className="ml-1 text-xs text-slate-400">✉︎</span>}
                    </span>
                    <span className="text-right text-sm">
                      {c.monto != null && <span className="block font-medium">{pesos(Number(c.monto))}</span>}
                      {consumos.has(c.id) && <span className="block text-xs text-emerald-700">{consumos.get(c.id).toFixed(1)} km/l</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )
      })}
    </div>
  )
}
