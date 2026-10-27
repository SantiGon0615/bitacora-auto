# Bitácora de autos

App web para registrar las cargas de nafta y el mantenimiento del Yaris y la EcoSport.
Lo principal: al abrirla te dice **qué nafta toca** según el patrón "1 Infinia y después N Súper".

**Stack:** React 19 + Vite + Tailwind 4 + Supabase (proyecto `PortonPPA`, tablas `bitacora_*`).

## Correrla

```bash
npm install
npm run dev
```

Abrí http://localhost:5173 y entrá con tu mail (te llega un link).

### Una sola vez: permitir el link de login
En Supabase → proyecto **PortonPPA** → *Authentication → URL Configuration → Redirect URLs*
agregá `http://localhost:5173`. Sin esto, el link del mail te manda a otra dirección.

## Sumar a alguien de la familia
Solo pueden entrar los mails cargados en la tabla `bitacora_miembros`. En el SQL Editor:

```sql
insert into public.bitacora_miembros (email, nombre) values ('mail@ejemplo.com', 'Papá');
```

## Estructura

```
src/
  App.jsx               sesión, carga de datos, navegación
  config.js             quiénes cargan, tipos de nafta y de mantenimiento (con intervalos)
  lib/logica.js         qué nafta toca, consumo km/l, vencimientos (funciones puras)
  components/
    Inicio.jsx          cartel "Ahora toca", cargas por asignar, resumen
    Cargas.jsx          historial por mes con km/l
    Mantenimiento.jsx   lo que viene + historial
    CargaForm.jsx       alta/edición de carga
    MantForm.jsx        alta/edición de mantenimiento (calcula el próximo solo)
    Ajustes.jsx         cuántas Súper por Infinia en cada auto
supabase/schema.sql     el esquema (ya aplicado)
```

## Cómo calcula las cosas
- **Qué toca:** cuenta las Súper seguidas desde la última Infinia del auto. Si son menos que el
  ajuste del auto → Súper; si llegaron al número → Infinia.
- **Consumo:** método tanque lleno. Entre dos cargas marcadas "tanque lleno" con km,
  km recorridos ÷ litros cargados en el medio. Si a alguna carga del medio le faltan los litros, ese tramo no se calcula.
- **Mantenimiento:** por cada tipo toma el último registro y avisa *Pronto* (≤ 1.000 km o ≤ 30 días)
  o *Vencido*. El km actual sale del km más alto cargado.

## Pendiente
- Leer los mails de ServiClub (`¡Seguí sumando puntos!`) de la casilla de Yahoo y crear
  cargas pendientes (`auto_id = null`, `origen = 'mail'`, `mail_id` para no duplicar).
  La pantalla de inicio ya muestra esas cargas para asignarlas a un auto con un toque.
- Publicarla (Vercel/Netlify) para usarla desde el celular fuera de casa.
