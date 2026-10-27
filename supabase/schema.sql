-- Esquema de la bitácora (ya aplicado en el proyecto Supabase "PortonPPA").
-- Queda acá como referencia; no hace falta correrlo de nuevo.

create table public.bitacora_miembros (
  email text primary key,
  nombre text not null,
  created_at timestamptz not null default now()
);

create or replace function public.bitacora_es_miembro()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bitacora_miembros m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.bitacora_es_miembro() from public, anon;
grant execute on function public.bitacora_es_miembro() to authenticated;

create table public.bitacora_autos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  modelo text,
  anio int,
  supers_por_infinia int not null default 2 check (supers_por_infinia between 0 and 5),
  created_at timestamptz not null default now()
);

-- auto_id null = carga pendiente de asignar (por ejemplo, la que viene de un mail de YPF)
create table public.bitacora_cargas (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid references public.bitacora_autos(id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null check (tipo in ('INFINIA','SUPER','OTRO')),
  litros numeric(6,2) check (litros > 0),
  monto numeric(12,2) check (monto >= 0),
  km int check (km >= 0),
  tanque_lleno boolean not null default false,
  quien text,
  origen text not null default 'manual' check (origen in ('manual','mail')),
  mail_id text unique,
  notas text,
  created_at timestamptz not null default now()
);

create table public.bitacora_mantenimientos (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid not null references public.bitacora_autos(id) on delete cascade,
  fecha date not null default current_date,
  km int check (km >= 0),
  tipo text not null check (tipo in ('aceite','filtro_aire','filtro_combustible','filtro_habitaculo','service','cubiertas','frenos','bateria','otro')),
  descripcion text,
  costo numeric(12,2) check (costo >= 0),
  taller text,
  proximo_km int check (proximo_km >= 0),
  proxima_fecha date,
  created_at timestamptz not null default now()
);

-- RLS: solo los mails cargados en bitacora_miembros ven y editan datos
alter table public.bitacora_miembros enable row level security;
alter table public.bitacora_autos enable row level security;
alter table public.bitacora_cargas enable row level security;
alter table public.bitacora_mantenimientos enable row level security;

create policy "miembros ven miembros" on public.bitacora_miembros
  for select to authenticated using ((select public.bitacora_es_miembro()));
create policy "miembros gestionan autos" on public.bitacora_autos
  for all to authenticated using ((select public.bitacora_es_miembro())) with check ((select public.bitacora_es_miembro()));
create policy "miembros gestionan cargas" on public.bitacora_cargas
  for all to authenticated using ((select public.bitacora_es_miembro())) with check ((select public.bitacora_es_miembro()));
create policy "miembros gestionan mantenimientos" on public.bitacora_mantenimientos
  for all to authenticated using ((select public.bitacora_es_miembro())) with check ((select public.bitacora_es_miembro()));

-- Para sumar a alguien de la familia:
-- insert into public.bitacora_miembros (email, nombre) values ('mail@ejemplo.com', 'Papá');
