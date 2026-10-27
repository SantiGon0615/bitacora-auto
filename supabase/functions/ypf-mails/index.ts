// Edge Function: revisa la casilla de Yahoo por IMAP, busca los mails de YPF ServiClub
// y crea cargas pendientes (sin auto asignado) en la bitácora.
//
// Secrets necesarios (Supabase → Edge Functions → Secrets):
//   YAHOO_USER          la dirección de Yahoo
//   YAHOO_APP_PASSWORD  "contraseña de aplicación" generada en Yahoo (no la contraseña normal)
// La corre pg_cron cada hora. También se puede llamar a mano: ?dias=60 para mirar más atrás.

import { leerMail } from './parser.ts'

const enc = new TextEncoder()
const latin1 = new TextDecoder('latin1')

class Imap {
  private conn!: Deno.TlsConn
  private buf = new Uint8Array(0)
  private n = 0

  async conectar(host: string, puerto = 993) {
    this.conn = await Deno.connectTls({ hostname: host, port: puerto })
    await this.leerLinea() // saludo del servidor
  }

  private async llenar() {
    const chunk = new Uint8Array(64 * 1024)
    const r = await this.conn.read(chunk)
    if (r === null) throw new Error('IMAP: el servidor cerró la conexión')
    const nuevo = new Uint8Array(this.buf.length + r)
    nuevo.set(this.buf)
    nuevo.set(chunk.subarray(0, r), this.buf.length)
    this.buf = nuevo
  }

  private async leerLinea(): Promise<string> {
    while (true) {
      for (let i = 0; i + 1 < this.buf.length; i++) {
        if (this.buf[i] === 13 && this.buf[i + 1] === 10) {
          const linea = latin1.decode(this.buf.subarray(0, i))
          this.buf = this.buf.subarray(i + 2)
          return linea
        }
      }
      await this.llenar()
    }
  }

  private async leerBytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) await this.llenar()
    const out = this.buf.slice(0, n)
    this.buf = this.buf.subarray(n)
    return out
  }

  private async escribir(s: string) {
    const datos = enc.encode(s)
    let escritos = 0
    while (escritos < datos.length) escritos += await this.conn.write(datos.subarray(escritos))
  }

  /** Manda un comando y devuelve las líneas sin tag y los literales {n} recibidos */
  async cmd(comando: string): Promise<{ lineas: string[]; literales: Uint8Array[] }> {
    const tag = `A${++this.n}`
    await this.escribir(`${tag} ${comando}\r\n`)
    const lineas: string[] = []
    const literales: Uint8Array[] = []
    while (true) {
      let linea = await this.leerLinea()
      let m: RegExpMatchArray | null
      while ((m = linea.match(/\{(\d+)\}$/))) {
        literales.push(await this.leerBytes(Number(m[1])))
        linea = linea.slice(0, -m[0].length) + (await this.leerLinea())
      }
      if (linea.startsWith(tag + ' ')) {
        // Nunca incluir el comando en el error: LOGIN lleva la contraseña
        if (!linea.startsWith(tag + ' OK')) throw new Error(`IMAP ${comando.split(' ')[0]} falló: ${linea.slice(tag.length + 1)}`)
        return { lineas, literales }
      }
      lineas.push(linea)
    }
  }

  async cerrar() {
    try {
      await this.cmd('LOGOUT')
    } catch { /* da igual */ }
    try {
      this.conn.close()
    } catch { /* da igual */ }
  }
}

const comillas = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fechaImap = (d: Date) => `${d.getUTCDate()}-${MESES[d.getUTCMonth()]}-${d.getUTCFullYear()}`

async function rpc(nombre: string, args: Record<string, unknown>) {
  const url = Deno.env.get('SUPABASE_URL')!
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const r = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  const texto = await r.text()
  if (!r.ok) throw new Error(`${nombre}: ${r.status} ${texto}`)
  return texto ? JSON.parse(texto) : null // las funciones void responden vacío
}

Deno.serve(async (req) => {
  const usuario = Deno.env.get('YAHOO_USER')
  const clave = Deno.env.get('YAHOO_APP_PASSWORD')
  if (!usuario || !clave) {
    await rpc('bitacora_sync_estado', { p_error: 'Faltan los secrets YAHOO_USER / YAHOO_APP_PASSWORD' })
    return Response.json({ ok: false, error: 'Faltan los secrets de Yahoo' }, { status: 500 })
  }

  const dias = Math.min(Number(new URL(req.url).searchParams.get('dias')) || 14, 365)
  const desde = new Date(Date.now() - dias * 86400000)
  const imap = new Imap()
  const resumen = { revisados: 0, nuevos: 0, cargas: 0 }

  try {
    await imap.conectar('imap.mail.yahoo.com')
    await imap.cmd(`LOGIN ${comillas(usuario)} ${comillas(clave)}`)
    await imap.cmd('SELECT INBOX')
    const { lineas } = await imap.cmd(`UID SEARCH SINCE ${fechaImap(desde)} FROM "serviclub@ypf.com"`)
    const uids = lineas
      .filter((l) => l.startsWith('* SEARCH'))
      .flatMap((l) => l.slice(8).trim().split(/\s+/))
      .filter(Boolean)

    for (const uid of uids) {
      const { literales } = await imap.cmd(`UID FETCH ${uid} (BODY.PEEK[])`)
      if (!literales[0]) continue
      resumen.revisados++
      const { messageId, carga } = leerMail(literales[0])
      if (!carga) continue
      const nuevo = await rpc('bitacora_registrar_mail', {
        p_mail_id: messageId ?? `yahoo-uid-${uid}`,
        p_fecha: carga.fecha,
        p_producto: carga.producto,
        p_tipo: carga.tipo,
      })
      if (nuevo) {
        resumen.nuevos++
        if (carga.tipo) resumen.cargas++
      }
    }
    await rpc('bitacora_sync_estado', { p_error: null })
    return Response.json({ ok: true, ...resumen })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(msg)
    await rpc('bitacora_sync_estado', { p_error: msg }).catch(() => {})
    return Response.json({ ok: false, error: msg, ...resumen }, { status: 500 })
  } finally {
    await imap.cerrar()
  }
})
