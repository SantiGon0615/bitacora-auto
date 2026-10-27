import { useState } from 'react'
import { supabase } from '../supabase.js'
import { QUIENES, TIPOS_NAFTA } from '../config.js'
import { hoyISO } from '../lib/logica.js'
import { Campo, Chip, Modal, inputCls, numOrNull } from './ui.jsx'

/**
 * Alta / edición de una carga.
 * carga: null para nueva, o el registro a editar (también sirve para completar una pendiente).
 */
export default function CargaForm({ autos, autoInicial, tipoSugerido, carga, onCerrar, onGuardado }) {
  const [f, setF] = useState(() => ({
    auto_id: carga?.auto_id ?? autoInicial ?? autos[0]?.id,
    fecha: carga?.fecha ?? hoyISO(),
    tipo: carga?.tipo ?? tipoSugerido ?? 'SUPER',
    litros: carga?.litros ?? '',
    monto: carga?.monto ?? '',
    km: carga?.km ?? '',
    tanque_lleno: carga?.tanque_lleno ?? false,
    quien: carga?.quien ?? '',
    notas: carga?.notas ?? '',
  }))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const set = (campo) => (e) => setF({ ...f, [campo]: e?.target ? e.target.value : e })

  const precioLitro = f.litros && f.monto ? Number(f.monto) / Number(f.litros) : null

  async function guardar(e) {
    e.preventDefault()
    if (!f.auto_id) return setError('Elegí el auto')
    setGuardando(true)
    const datos = {
      auto_id: f.auto_id,
      fecha: f.fecha,
      tipo: f.tipo,
      litros: numOrNull(f.litros),
      monto: numOrNull(f.monto),
      km: numOrNull(f.km),
      tanque_lleno: f.tanque_lleno,
      quien: f.quien || null,
      notas: f.notas || null,
    }
    const { error } = carga
      ? await supabase.from('bitacora_cargas').update(datos).eq('id', carga.id)
      : await supabase.from('bitacora_cargas').insert(datos)
    setGuardando(false)
    if (error) return setError(error.message)
    onGuardado()
  }

  async function borrar() {
    if (!confirm('¿Borrar esta carga?')) return
    const { error } = await supabase.from('bitacora_cargas').delete().eq('id', carga.id)
    if (error) return setError(error.message)
    onGuardado()
  }

  return (
    <Modal titulo={carga ? (carga.auto_id ? 'Editar carga' : 'Completar carga del mail') : 'Nueva carga'} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Auto">
          <div className="flex gap-2">
            {autos.map((a) => (
              <Chip key={a.id} activo={f.auto_id === a.id} onClick={() => set('auto_id')(a.id)}>
                {a.nombre}
              </Chip>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Nafta">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TIPOS_NAFTA).map(([clave, t]) => (
              <button
                type="button"
                key={clave}
                onClick={() => set('tipo')(clave)}
                className={`rounded-2xl py-4 text-base font-bold transition ${f.tipo === clave ? t.clases + ' shadow-md' : 'bg-slate-100 text-slate-500'}`}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Fecha">
            <input type="date" value={f.fecha} onChange={set('fecha')} className={inputCls} required />
          </Campo>
          <Campo etiqueta="Km del tablero">
            <input type="number" inputMode="numeric" value={f.km} onChange={set('km')} className={inputCls} placeholder="ej. 23450" />
          </Campo>
          <Campo etiqueta="Litros">
            <input type="number" inputMode="decimal" step="0.01" value={f.litros} onChange={set('litros')} className={inputCls} />
          </Campo>
          <Campo etiqueta="Monto ($)" ayuda={precioLitro ? `$${precioLitro.toFixed(0)} por litro` : null}>
            <input type="number" inputMode="decimal" step="0.01" value={f.monto} onChange={set('monto')} className={inputCls} />
          </Campo>
        </div>

        <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <input
            type="checkbox"
            checked={f.tanque_lleno}
            onChange={(e) => setF({ ...f, tanque_lleno: e.target.checked })}
            className="h-5 w-5 accent-slate-900"
          />
          <span>
            <span className="font-medium">Tanque lleno</span>
            <span className="block text-xs text-slate-400">Con km y litros, sirve para calcular el consumo</span>
          </span>
        </label>

        <Campo etiqueta="¿Quién cargó?">
          <div className="flex flex-wrap gap-2">
            {QUIENES.map((q) => (
              <Chip key={q} activo={f.quien === q} onClick={() => set('quien')(f.quien === q ? '' : q)}>
                {q}
              </Chip>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Notas">
          <input value={f.notas} onChange={set('notas')} className={inputCls} placeholder="Estación, pagado con MP, etc." />
        </Campo>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          {carga && (
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
