// Quiénes pueden cargar nafta (aparecen como botones en el formulario).
// Cambialos a gusto.
export const QUIENES = ['Yo', 'Papá', 'Mamá']

export const TIPOS_NAFTA = {
  INFINIA: { nombre: 'Infinia', clases: 'bg-infinia text-white', suave: 'bg-infinia-suave text-infinia' },
  SUPER: { nombre: 'Súper', clases: 'bg-super text-white', suave: 'bg-super-suave text-super' },
  OTRO: { nombre: 'Otro', clases: 'bg-slate-600 text-white', suave: 'bg-slate-200 text-slate-700' },
}

// Tipos de mantenimiento y cada cuánto se repiten por defecto
// (km y meses; null = no se sugiere próximo). Se puede cambiar al cargar.
export const TIPOS_MANT = {
  aceite: { nombre: 'Aceite y filtro de aceite', km: 10000, meses: 12 },
  service: { nombre: 'Service oficial', km: 10000, meses: 12 },
  filtro_aire: { nombre: 'Filtro de aire', km: 20000, meses: 24 },
  filtro_habitaculo: { nombre: 'Filtro de habitáculo', km: 15000, meses: 12 },
  filtro_combustible: { nombre: 'Filtro de combustible', km: 40000, meses: null },
  cubiertas: { nombre: 'Cubiertas / rotación', km: 10000, meses: null },
  frenos: { nombre: 'Frenos', km: null, meses: null },
  bateria: { nombre: 'Batería', km: null, meses: 36 },
  otro: { nombre: 'Otro', km: null, meses: null },
}
