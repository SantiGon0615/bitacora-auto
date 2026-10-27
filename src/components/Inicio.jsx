import { TIPOS_MANT, TIPOS_NAFTA } from '../config.js'
import { fechaCorta, haceCuanto, kms, pesos } from '../lib/logica.js'
import { BadgeNafta, Tarjeta } from './ui.jsx'

export default function Inicio({ auto, sugerencia, pendientes, autos, kmHoy, consumoProm, gastoMes, proximos, onNuevaCarga, onCompletar, onAsignar, onVerMant }) {
  const toca = sugerencia ? TIPOS_NAFTA[sugerencia.toca] : null

  return (
    <div className="space-y-4">
      {/* Qué nafta toca */}
      <section className={`rounded-3xl p-6 text-white shadow-lg ${sugerencia ? toca.clases : 'bg-slate-800'}`}>
        {sugerencia ? (
          <>
            <p className="text-sm font-medium uppercase tracking-wider opacity-80">Ahora toca</p>
            <p className="mt-1 text-5xl font-black tracking-tight">{toca.nombre}</p>
            <p className="mt-2 opacity-90">
              {sugerencia.motivo}
              {sugerencia.alternativa && ` · también podés ir con ${TIPOS_NAFTA[sugerencia.alternativa].nombre}`}
            </p>
            <div className="mt-5 rounded-2xl bg-white/15 px-4 py-3 text-sm">
              Última carga: <b>{TIPOS_NAFTA[sugerencia.ultima.tipo].nombre}</b>, {haceCuanto(sugerencia.ultima.fecha)}
              {sugerencia.ultima.quien && ` · ${sugerencia.ultima.quien}`}
            </div>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold">Todavía no hay cargas del {auto.nombre}</p>
            <p className="mt-2 opacity-80">Registrá la última que te acuerdes y desde ahí te digo qué toca.</p>
          </>
        )}
        <button
          onClick={() => onNuevaCarga(sugerencia?.toca)}
          className="mt-5 w-full rounded-2xl bg-white py-3.5 text-lg font-bold text-slate-900 shadow"
        >
          + Nueva carga
        </button>
      </section>

      {/* Cargas que llegaron por mail sin auto */}
      {pendientes.length > 0 && (
        <Tarjeta className="border-2 border-amber-300">
          <h3 className="font-semibold">Cargas por asignar</h3>
          <p className="mb-3 text-sm text-slate-500">Llegaron de la App YPF. ¿En qué auto fueron?</p>
          <ul className="space-y-3">
            {pendientes.map((p) => (
              <li key={p.id} className="rounded-2xl bg-slate-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <BadgeNafta tipo={p.tipo} chico />
                  <span className="text-sm text-slate-600">{fechaCorta(p.fecha)}</span>
                  <button onClick={() => onCompletar(p)} className="ml-auto text-sm text-slate-500 underline">
                    completar
                  </button>
                </div>
                <div className="flex gap-2">
                  {autos.map((a) => (
                    <button key={a.id} onClick={() => onAsignar(p, a.id)} className="flex-1 rounded-xl bg-white py-2 text-sm font-semibold shadow-sm">
                      {a.nombre}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {/* Números rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <Dato titulo="Km" valor={kmHoy != null ? kmHoy.toLocaleString('es-AR') : '—'} />
        <Dato titulo="Consumo" valor={consumoProm ? `${consumoProm.toFixed(1)} km/l` : '—'} />
        <Dato titulo="Este mes" valor={gastoMes ? pesos(gastoMes) : '—'} />
      </div>

      {/* Próximo mantenimiento */}
      <Tarjeta>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Mantenimiento</h3>
          <button onClick={onVerMant} className="text-sm text-slate-500 underline">
            ver todo
          </button>
        </div>
        {proximos.length === 0 ? (
          <p className="text-sm text-slate-400">Registrá el último cambio de aceite para que te avise cuándo toca.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {proximos.slice(0, 3).map((m) => (
              <FilaProximo key={m.id} m={m} />
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}

function Dato({ titulo, valor }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className="mt-0.5 truncate font-semibold">{valor}</p>
    </div>
  )
}

const COLOR_ESTADO = {
  vencido: 'bg-red-100 text-red-700',
  pronto: 'bg-amber-100 text-amber-800',
  ok: 'bg-emerald-50 text-emerald-700',
}

export function FilaProximo({ m, onClick }) {
  const partes = []
  if (m.kmFaltan != null) partes.push(m.kmFaltan <= 0 ? `pasado por ${kms(-m.kmFaltan)}` : `faltan ${kms(m.kmFaltan)}`)
  if (m.diasFaltan != null) partes.push(m.diasFaltan <= 0 ? `venció ${fechaCorta(m.proxima_fecha)}` : `antes del ${fechaCorta(m.proxima_fecha)}`)
  if (m.kmFaltan == null && m.proximo_km != null) partes.push(`a los ${kms(m.proximo_km)}`)

  return (
    <li className="flex items-center gap-3 py-2.5" onClick={onClick}>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO[m.estado]}`}>
        {m.estado === 'vencido' ? 'Vencido' : m.estado === 'pronto' ? 'Pronto' : 'OK'}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{TIPOS_MANT[m.tipo]?.nombre ?? m.tipo}</span>
        <span className="block text-xs text-slate-500">{partes.join(' · ')}</span>
      </span>
    </li>
  )
}
