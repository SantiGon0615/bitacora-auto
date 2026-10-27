import { useState } from 'react'
import { supabase } from '../supabase.js'
import { Campo, Modal, inputCls } from './ui.jsx'

export default function Ajustes({ autos, email, onCerrar, onGuardado }) {
  const [valores, setValores] = useState(() => Object.fromEntries(autos.map((a) => [a.id, a.supers_por_infinia])))
  const [error, setError] = useState('')

  async function guardar() {
    for (const a of autos) {
      if (valores[a.id] !== a.supers_por_infinia) {
        const { error } = await supabase.from('bitacora_autos').update({ supers_por_infinia: Number(valores[a.id]) }).eq('id', a.id)
        if (error) return setError(error.message)
      }
    }
    onGuardado()
  }

  return (
    <Modal titulo="Ajustes" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">¿Cuántas Súper se cargan después de cada Infinia?</p>
        {autos.map((a) => (
          <Campo key={a.id} etiqueta={a.nombre}>
            <select
              value={valores[a.id]}
              onChange={(e) => setValores({ ...valores, [a.id]: Number(e.target.value) })}
              className={inputCls}
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? 'Siempre Infinia' : `${n} Súper y después Infinia`}
                </option>
              ))}
            </select>
          </Campo>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={guardar} className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white">
          Guardar
        </button>
        <div className="border-t border-slate-100 pt-4 text-sm text-slate-500">
          Entraste como {email}.{' '}
          <button onClick={() => supabase.auth.signOut()} className="font-medium text-red-600 underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    </Modal>
  )
}
