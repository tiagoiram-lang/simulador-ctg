-- Simulador CTG · exame em sala
-- Cole este ficheiro no SQL Editor do projeto Supabase e carregue em «Run».
-- Cria uma única tabela com as respostas de cada formando e regras de acesso (RLS).
--
-- Regra de segurança: com a chave pública só se lê ou escreve numa sessão
-- se o pedido trouxer o código dessa sessão no cabeçalho x-sessao.
-- O código tem 10 caracteres aleatórios e só aparece no QR code projetado.
-- Ninguém consegue listar sessões nem apagar respostas.

-- 1. Tabela -------------------------------------------------------------
create table if not exists public.respostas (
  sessao      text        not null check (sessao ~ '^[a-z0-9]{10}$'),
  peer        text        not null check (peer   ~ '^[a-z0-9]{12}$'),
  nome        text        not null default '' check (char_length(nome) <= 30),
  i           smallint    not null default 0  check (i between 0 and 15),
  ans         jsonb       not null default '[]'::jsonb
              check (jsonb_typeof(ans) = 'array'
                     and jsonb_array_length(ans) <= 15
                     and pg_column_size(ans) < 8000),
  done        boolean     not null default false,
  criado      timestamptz not null default now(),
  atualizado  timestamptz not null default now(),
  primary key (sessao, peer)
);

comment on table public.respostas is
  'Respostas do exame em sala do Simulador CTG (uma linha por formando e sessão).';

-- 2. Hora da última atualização, sempre definida pelo servidor ----------
create or replace function public.respostas_tocar()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado := now();
  if tg_op = 'UPDATE' then
    new.criado := old.criado;
  else
    new.criado := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.respostas_tocar() from public, anon, authenticated;

drop trigger if exists respostas_tocar on public.respostas;
create trigger respostas_tocar
  before insert or update on public.respostas
  for each row execute function public.respostas_tocar();

-- 3. Acesso pela chave pública (papel anon) ------------------------------
alter table public.respostas enable row level security;

revoke all on public.respostas from anon, authenticated;
grant select, insert, update on public.respostas to anon;

drop policy if exists "ler a sessão indicada"       on public.respostas;
drop policy if exists "inserir na sessão indicada"  on public.respostas;
drop policy if exists "atualizar na sessão indicada" on public.respostas;

create policy "ler a sessão indicada"
  on public.respostas for select to anon
  using (sessao = (select current_setting('request.headers', true)::json ->> 'x-sessao'));

create policy "inserir na sessão indicada"
  on public.respostas for insert to anon
  with check (sessao = (select current_setting('request.headers', true)::json ->> 'x-sessao'));

create policy "atualizar na sessão indicada"
  on public.respostas for update to anon
  using      (sessao = (select current_setting('request.headers', true)::json ->> 'x-sessao'))
  with check (sessao = (select current_setting('request.headers', true)::json ->> 'x-sessao'));

-- 4. Limpeza automática (opcional, recomendado) ---------------------------
-- Apaga as respostas com mais de 7 dias, todas as noites às 03:17.
-- Requer a extensão pg_cron (Database → Extensions → pg_cron).
-- Se preferir não usar, apague esta secção antes de correr o ficheiro.
create extension if not exists pg_cron;
select cron.unschedule('ctg-limpar-respostas')
  where exists (select 1 from cron.job where jobname = 'ctg-limpar-respostas');
select cron.schedule(
  'ctg-limpar-respostas',
  '17 3 * * *',
  $$delete from public.respostas where atualizado < now() - interval '7 days'$$
);
