// Funciones puras: no tocan la base ni React, así se pueden probar fácil.

// ---------- Fechas ----------

/** 'YYYY-MM-DD' -> Date local (sin corrimiento de zona horaria) */
export function parseFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date -> 'YYYY-MM-DD' en hora local */
export function aISO(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function hoyISO() {
  return aISO(new Date())
}

export function sumarMeses(iso, meses) {
  const f = parseFecha(iso)
  f.setMonth(f.getMonth() + meses)
  return aISO(f)
}

export function diasEntre(desdeISO, hastaISO) {
  return Math.round((parseFecha(hastaISO) - parseFecha(desdeISO)) / 86400000)
}

export function haceCuanto(iso, hoy = hoyISO()) {
  const d = diasEntre(iso, hoy)
  if (d <= 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  const meses = Math.floor(d / 30)
  return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`
}

export function fechaCorta(iso) {
  return parseFecha(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// ---------- Formato ----------

export const pesos = (n) =>
  n == null ? '—' : n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export const kms = (n) => (n == null ? '—' : `${Math.round(n).toLocaleString('es-AR')} km`)

// ---------- Cargas ----------

/** Orden: más nueva primero (por fecha y, dentro del día, por hora de carga en la app) */
export function ordenarDesc(lista) {
  return [...lista].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  )
}

/**
 * Qué nafta toca, según el patrón "1 Infinia y después N Súper".
 * cargas: cargas de UN auto (cualquier orden).
 */
export function sugerirNafta(cargas, supersPorInfinia = 2) {
  const naftas = ordenarDesc(cargas).filter((c) => c.tipo === 'INFINIA' || c.tipo === 'SUPER')
  if (naftas.length === 0) return null

  const ultima = naftas[0]
  let supers = 0
  for (const c of naftas) {
    if (c.tipo !== 'SUPER') break
    supers++
  }

  if (ultima.tipo === 'INFINIA') {
    return { ultima, toca: 'SUPER', supers: 0, motivo: 'La última fue Infinia' }
  }
  if (supers < supersPorInfinia) {
    return {
      ultima,
      toca: 'SUPER',
      alternativa: 'INFINIA',
      supers,
      motivo: `Van ${supers} de ${supersPorInfinia} Súper desde la última Infinia`,
    }
  }
  return { ultima, toca: 'INFINIA', supers, motivo: `Ya van ${supers} Súper seguidas` }
}

/**
 * Consumo km/l por el método de tanque lleno:
 * entre dos cargas "tanque lleno" con km, consumo = km recorridos / litros cargados
 * después del primer lleno (incluido el segundo). Si en el medio falta algún dato
 * de litros, ese tramo no se calcula.
 * Devuelve un Map idCarga -> km/l (asignado a la carga que cierra el tramo).
 */
export function calcularConsumos(cargas) {
  const asc = ordenarDesc(cargas).reverse()
  const resultado = new Map()
  let base = null
  let litros = 0
  let valido = true

  for (const c of asc) {
    if (base) {
      if (c.litros) litros += Number(c.litros)
      else valido = false
    }
    if (c.tanque_lleno && c.km != null) {
      if (base && valido && litros > 0 && c.km > base.km) {
        resultado.set(c.id, (c.km - base.km) / litros)
      }
      base = c
      litros = 0
      valido = true
    }
  }
  return resultado
}

export function consumoPromedio(consumos, ultimos = 3) {
  const vals = [...consumos.values()].slice(-ultimos)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function gastoDelMes(cargas, hoy = hoyISO()) {
  const mes = hoy.slice(0, 7)
  return cargas.filter((c) => c.fecha.startsWith(mes)).reduce((t, c) => t + Number(c.monto || 0), 0)
}

/** El km más alto conocido del auto (de cargas o mantenimientos) */
export function kmActual(cargas, mantenimientos) {
  let max = null
  for (const r of [...cargas, ...mantenimientos]) {
    if (r.km != null && (max == null || r.km > max)) max = r.km
  }
  return max
}

// ---------- Mantenimiento ----------

/**
 * Para cada tipo de mantenimiento, toma el último registro que tenga "próximo"
 * y calcula cuánto falta. estado: 'vencido' | 'pronto' | 'ok'
 */
export function proximosMantenimientos(mantenimientos, kmHoy, hoy = hoyISO()) {
  const ultimos = new Map()
  const desc = [...mantenimientos].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || (b.km ?? 0) - (a.km ?? 0),
  )
  for (const m of desc) {
    if (!ultimos.has(m.tipo)) ultimos.set(m.tipo, m)
  }

  const lista = []
  for (const m of ultimos.values()) {
    if (m.proximo_km == null && m.proxima_fecha == null) continue
    const kmFaltan = m.proximo_km != null && kmHoy != null ? m.proximo_km - kmHoy : null
    const diasFaltan = m.proxima_fecha ? diasEntre(hoy, m.proxima_fecha) : null

    let estado = 'ok'
    if ((kmFaltan != null && kmFaltan <= 0) || (diasFaltan != null && diasFaltan <= 0)) estado = 'vencido'
    else if ((kmFaltan != null && kmFaltan <= 1000) || (diasFaltan != null && diasFaltan <= 30)) estado = 'pronto'

    lista.push({ ...m, kmFaltan, diasFaltan, estado })
  }

  const peso = { vencido: 0, pronto: 1, ok: 2 }
  return lista.sort((a, b) => peso[a.estado] - peso[b.estado] || (a.kmFaltan ?? 1e9) - (b.kmFaltan ?? 1e9))
}
