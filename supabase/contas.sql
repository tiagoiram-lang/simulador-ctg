-- Simulador CTG · contas, turmas e progresso
-- Correr no SQL Editor depois de schema.sql. Pode correr-se mais de uma vez.
--
-- Modelo de acesso (RLS):
--   cada pessoa lê e escreve apenas os seus registos;
--   o formador de uma turma lê os registos e o nome dos membros dessa turma;
--   para entrar numa turma é preciso saber o código (enviado no cabeçalho x-turma).
-- As funções auxiliares ficam no esquema «privado», que não é exposto pela API.

-- 1. Tabelas ---------------------------------------------------------------
create table if not exists public.perfis (
  id      uuid primary key references auth.users (id) on delete cascade,
  nome    text not null check (char_length(nome) between 1 and 60),
  criado  timestamptz not null default now()
);

create table if not exists public.turmas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null check (char_length(nome) between 1 and 80),
  codigo    text not null unique check (codigo ~ '^[a-z0-9]{8}$'),
  formador  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  criado    timestamptz not null default now()
);
create index if not exists turmas_formador_idx on public.turmas (formador);

create table if not exists public.membros (
  turma    uuid not null references public.turmas (id) on delete cascade,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entrou   timestamptz not null default now(),
  primary key (turma, user_id)
);
create index if not exists membros_user_idx on public.membros (user_id);

-- um registo por resposta: tipo = treino | exame | caso | desafio
create table if not exists public.registos (
  id       bigint generated always as identity primary key,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo     text not null check (tipo in ('treino','exame','caso','desafio')),
  t        bigint not null,                       -- instante da resposta no dispositivo (ms)
  dados    jsonb not null check (pg_column_size(dados) < 4000),
  criado   timestamptz not null default now(),
  unique (user_id, tipo, t)
);
create index if not exists registos_user_idx on public.registos (user_id, tipo, t);

-- 2. Funções auxiliares (fora da API) ------------------------------------
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create or replace function privado.e_membro(p_turma uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.membros m where m.turma = p_turma and m.user_id = (select auth.uid())) $$;

create or replace function privado.e_formador_de(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.membros m join public.turmas t on t.id = m.turma
                     where m.user_id = p_user and t.formador = (select auth.uid())) $$;

create or replace function privado.codigo_pedido()
returns text language sql stable set search_path = ''
as $$ select nullif(current_setting('request.headers', true)::json ->> 'x-turma', '') $$;

revoke all on function privado.e_membro(uuid), privado.e_formador_de(uuid), privado.codigo_pedido() from public, anon;
grant execute on function privado.e_membro(uuid), privado.e_formador_de(uuid), privado.codigo_pedido() to authenticated;

-- 3. Permissões e RLS ------------------------------------------------------
alter table public.perfis   enable row level security;
alter table public.turmas   enable row level security;
alter table public.membros  enable row level security;
alter table public.registos enable row level security;

revoke all on public.perfis, public.turmas, public.membros, public.registos from anon, authenticated;
grant select, insert, update on public.perfis to authenticated;
grant select, insert, update, delete on public.turmas to authenticated;
grant select, insert, delete on public.membros to authenticated;
grant select, insert, delete on public.registos to authenticated;

-- perfis
drop policy if exists "perfil: ler" on public.perfis;
drop policy if exists "perfil: criar" on public.perfis;
drop policy if exists "perfil: alterar" on public.perfis;
create policy "perfil: ler" on public.perfis for select to authenticated
  using (id = (select auth.uid()) or privado.e_formador_de(id));
create policy "perfil: criar" on public.perfis for insert to authenticated
  with check (id = (select auth.uid()));
create policy "perfil: alterar" on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- turmas
drop policy if exists "turma: ler" on public.turmas;
drop policy if exists "turma: criar" on public.turmas;
drop policy if exists "turma: alterar" on public.turmas;
drop policy if exists "turma: apagar" on public.turmas;
create policy "turma: ler" on public.turmas for select to authenticated
  using (formador = (select auth.uid()) or privado.e_membro(id) or codigo = (select privado.codigo_pedido()));
create policy "turma: criar" on public.turmas for insert to authenticated
  with check (formador = (select auth.uid()));
create policy "turma: alterar" on public.turmas for update to authenticated
  using (formador = (select auth.uid())) with check (formador = (select auth.uid()));
create policy "turma: apagar" on public.turmas for delete to authenticated
  using (formador = (select auth.uid()));

-- membros
drop policy if exists "membro: ler" on public.membros;
drop policy if exists "membro: entrar" on public.membros;
drop policy if exists "membro: sair" on public.membros;
create policy "membro: ler" on public.membros for select to authenticated
  using (user_id = (select auth.uid())
         or turma in (select t.id from public.turmas t where t.formador = (select auth.uid())));
create policy "membro: entrar" on public.membros for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.turmas t where t.id = turma and t.codigo = (select privado.codigo_pedido())));
create policy "membro: sair" on public.membros for delete to authenticated
  using (user_id = (select auth.uid())
         or turma in (select t.id from public.turmas t where t.formador = (select auth.uid())));

-- registos
drop policy if exists "registo: ler" on public.registos;
drop policy if exists "registo: criar" on public.registos;
drop policy if exists "registo: apagar" on public.registos;
create policy "registo: ler" on public.registos for select to authenticated
  using (user_id = (select auth.uid()) or privado.e_formador_de(user_id));
create policy "registo: criar" on public.registos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "registo: apagar" on public.registos for delete to authenticated
  using (user_id = (select auth.uid()));
