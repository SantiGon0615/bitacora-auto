import { useState } from 'react'
import { supabase } from '../supabase.js'
import { TIPOS_MANT } from '../config.js'
import { hoyISO, sumarMeses } from '../lib/logica.js'
import { Campo, Chip, Modal, inputCls, numOrNull } from './ui.jsx'

/** Calcula el "próximo" sugerido según el tipo, la fecha y el km */
function sugerirProximo(tipo, fecha, km) {
  const t = TIPOS_MANT[tipo]
  return {
    proximo_km: t.km && km !== '' ? Number(km) + t.km : '',
    proxima_fecha: t.meses && fecha ? sumarMeses(fecha, t.meses) : '',
  }
}

export default function MantForm({ autos, autoInicial, kmSugerido, mant, onCerrar, onGuardado }) {
  const [f, setF] = useState(() => {
    if (mant) {
      return {
        ...mant,
        km: mant.km ?? '',
        costo: mant.costo ?? '',
        proximo_km: mant.proximo_km ?? '',
        proxima_fecha: mant.proxima_fecha ?? '',
        descripcion: mant.descripcion ?? '',
        taller: mant.taller ?? '',
      }
    }
    const base = { auto_id: autoInicial, tipo: 'aceite', fecha: hoyISO(), km: kmSugerido ?? '', costo: '', taller: '', descripcion: '' }
    return { ...base, ...sugerirProximo(base.tipo, base.fecha, base.km) }
  })
  const [proximoTocado, setProximoTocado] = useState(Boolean(mant))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Cambiar tipo/fecha/km recalcula el próximo, salvo que el usuario lo haya editado a mano
  function cambiar(campo, valor) {
    const nuevo = { ...f, [campo]: valor }
    if (!proximoTocado && ['tipo', 'fecha', 'km'].includes(campo)) {
      Object.assign(nuevo, sugerirProximo(nuevo.tipo, nuevo.fecha, nuevo.km))
    }
    setF(nuevo)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    const datos = {
      auto_id: f.auto_id,
      tipo: f.tipo,
      fecha: f.fecha,
      km: numOrNull(f.km),
      costo: numOrNull(f.costo),
      taller: f.taller || null,
      descripcion: f.descripcion || null,
      proximo_km: numOrNull(f.proximo_km),
      proxima_fecha: f.proxima_fecha || null,
    }
    const { error } = mant
      ? await supabase.from('bitacora_mantenimientos').update(datos).eq('id', mant.id)
      : await supabase.from('bitacora_mantenimientos').insert(datos)
    setGuardando(false)
    if (error) return setError(error.message)
    onGuardado()
  }

  async function borrar() {
    if (!confirm('¿Borrar este mantenimiento?')) return
    const { error } = await supabase.from('bitacora_mantenimientos').delete().eq('id', mant.id)
    if (error) return setError(error.message)
    onGuardado()
  }

  return (
    <Modal titulo={mant ? 'Editar mantenimiento' : 'Registrar mantenimiento'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Auto">
          <div className="flex gap-2">
            {autos.map((a) => (
              <Chip key={a.id} activo={f.auto_id === a.id} onClick={() => cambiar('auto_id', a.id)}>
                {a.nombre}
              </Chip>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Qué se hizo">
          <select value={f.tipo} onChange={(e) => cambiar('tipo', e.target.value)} className={inputCls}>
            {Object.entries(TIPOS_MANT).map(([clave, t]) => (
              <option key={clave} value={clave}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Fecha">
            <input type="date" required value={f.fecha} onChange={(e) => cambiar('fecha', e.target.value)} className={inputCls} />
          </Campo>
          <Campo etiqueta="Km">
            <input type="number" inputMode="numeric" value={f.km} onChange={(e) => cambiar('km', e.target.value)} className={inputCls} />
          </Campo>
          <Campo etiqueta="Costo ($)">
            <input type="number" inputMode="decimal" value={f.costo} onChange={(e) => cambiar('costo', e.target.value)} className={inputCls} />
          </Campo>
          <Campo etiqueta="Taller">
            <input value={f.taller} onChange={(e) => cambiar('taller', e.target.value)} className={inputCls} />
          </Campo>
        </div>

        <Campo etiqueta="Detalle">
          <input
            value={f.descripcion}
            onChange={(e) => cambiar('descripcion', e.target.value)}
            className={inputCls}
            placeholder="ej. Aceite 5W-30 sintético, 4 litros"
          />
        </Campo>

        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="mb-3 text-sm font-semibold text-amber-900">Próximo (para el aviso)</p>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="A los km">
              <input
                type="number"
                inputMode="numeric"
                value={f.proximo_km}
                onChange={(e) => {
                  setProximoTocado(true)
                  setF({ ...f, proximo_km: e.target.value })
                }}
                className={inputCls}
              />
            </Campo>
            <Campo etiqueta="O la fecha">
              <input
                type="date"
                value={f.proxima_fecha}
                onChange={(e) => {
                  setProximoTocado(true)
                  setF({ ...f, proxima_fecha: e.target.value })
                }}
                className={inputCls}
              />
            </Campo>
          </div>
          <p className="mt-2 text-xs text-amber-800/70">Lo que llegue primero. Se completa solo según el tipo; cambialo si tu manual dice otra cosa.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          {mant && (
            <button type="button" onClick={borrar} className="rounded-xl px-4 py-3 font-medium text-red-600 hover:bg-red-50">
              Borrar
            </button>
          )}
          <button disabled={guardando} className="flex-1 rounded-xl bg-slate-900 py-3 font-semibold text-white disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
