// Lectura de los mails de YPF ServiClub ("¡Seguí sumando puntos!").
// Sin dependencias: se prueba fuera de Supabase.

export type Tipo = 'INFINIA' | 'SUPER' | 'OTRO'

export interface CargaMail {
  fecha: string // YYYY-MM-DD
  producto: string // tal cual el mail, ej. "INFINIA"
  tipo: Tipo | null // null = no es nafta (ej. FULL = tienda)
}

const latin1 = new TextDecoder('latin1')

/** string con un char por byte -> bytes */
function aBytes(s: string): Uint8Array {
  const b = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff
  return b
}

function decodificarQP(s: string): Uint8Array {
  const limpio = s.replace(/=\r?\n/g, '')
  const out: number[] = []
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(limpio.slice(i + 1, i + 3))) {
      out.push(parseInt(limpio.slice(i + 1, i + 3), 16))
      i += 2
    } else out.push(limpio.charCodeAt(i) & 0xff)
  }
  return new Uint8Array(out)
}

function decodificarBase64(s: string): Uint8Array {
  return aBytes(atob(s.replace(/\s+/g, '')))
}

function separarHeaders(raw: string): { headers: Map<string, string>; cuerpo: string } {
  const corte = raw.search(/\r?\n\r?\n/)
  const cab = corte >= 0 ? raw.slice(0, corte) : raw
  const cuerpo = corte >= 0 ? raw.slice(corte).replace(/^\r?\n\r?\n/, '') : ''
  const headers = new Map<string, string>()
  for (const linea of cab.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const i = linea.indexOf(':')
    if (i > 0) headers.set(linea.slice(0, i).trim().toLowerCase(), linea.slice(i + 1).trim())
  }
  return { headers, cuerpo }
}

function parametro(valor: string, nombre: string): string | null {
  const m = valor.match(new RegExp(`${nombre}\\s*=\\s*"?([^";]+)"?`, 'i'))
  return m ? m[1] : null
}

/** Devuelve todo el texto de un mensaje MIME (raw con un char por byte) */
function textoDe(raw: string, prof = 0): string {
  const { headers, cuerpo } = separarHeaders(raw)
  const ct = headers.get('content-type') ?? 'text/plain'
  if (/^multipart\//i.test(ct) && prof < 5) {
    const borde = parametro(ct, 'boundary')
    if (!borde) return ''
    return cuerpo
      .split('--' + borde)
      .slice(1)
      .filter((p) => !p.startsWith('--'))
      .map((p) => textoDe(p.replace(/^\r?\n/, ''), prof + 1))
      .join('\n')
  }
  if (!/^text\//i.test(ct)) return ''
  const cte = (headers.get('content-transfer-encoding') ?? '').toLowerCase()
  const bytes = cte === 'quoted-printable' ? decodificarQP(cuerpo) : cte === 'base64' ? decodificarBase64(cuerpo) : aBytes(cuerpo)
  let charset = (parametro(ct, 'charset') ?? 'utf-8').toLowerCase()
  if (charset === 'us-ascii') charset = 'utf-8'
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

const ENTIDADES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó',
  uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', iexcl: '¡',
}

export function textoPlano(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES[n] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

export function tipoDeProducto(producto: string): Tipo | null {
  const p = producto.toUpperCase()
  if (/DIESEL|GASOIL|GNC/.test(p)) return 'OTRO'
  if (/INFINIA/.test(p)) return 'INFINIA'
  if (/S[UÚ]PER/.test(p)) return 'SUPER'
  return null
}

/** Busca fecha y producto en el texto del mail */
export function extraerCarga(texto: string): CargaMail | null {
  const f = texto.match(/realizada el (\d{1,2})\/(\d{1,2})\/(\d{4})/i)
  const p = texto.match(/compra de\s+(.+?)\s*(?:Tu saldo|$)/i)
  if (!f || !p) return null
  const fecha = `${f[3]}-${f[2].padStart(2, '0')}-${f[1].padStart(2, '0')}`
  // "INFINIA, ." o "FULL, INFINIA, ." -> lista de productos
  const productos = p[1].split(/[,.]/).map((x) => x.trim()).filter(Boolean)
  const nafta = productos.find((x) => tipoDeProducto(x)) ?? productos[0] ?? ''
  return { fecha, producto: nafta, tipo: tipoDeProducto(nafta) }
}

/** raw: mensaje completo como bytes */
export function leerMail(bytes: Uint8Array): { messageId: string | null; momento: string | null; carga: CargaMail | null } {
  const raw = latin1.decode(bytes)
  const { headers } = separarHeaders(raw)
  const texto = textoPlano(textoDe(raw))
  // Hora en que YPF mandó el mail (minutos después de la compra): sirve para saber en qué auto estabas
  const fechaHeader = headers.get('date')
  const d = fechaHeader ? new Date(fechaHeader) : null
  const momento = d && !isNaN(d.getTime()) ? d.toISOString() : null
  return { messageId: headers.get('message-id') ?? null, momento, carga: extraerCarga(texto) }
}
