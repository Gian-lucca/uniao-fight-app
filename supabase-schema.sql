-- ============================================================
-- União Fight — schema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1) Tabela de perfis (estende a tabela interna auth.users do Supabase)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  data_nascimento date,
  unidade text check (unidade in ('Anchieta','Ricardo')),
  modalidade text check (modalidade in ('Boxe','Muay Thai','Kickboxing','Jiu-Jitsu')),
  papel text not null check (papel in ('administrador','aluno','professor')),
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  graduacao text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 2) Função auxiliar: descobre o papel do usuário logado
--    (security definer evita recursão infinita nas policies abaixo)
create or replace function public.meu_papel()
returns text
language sql
security definer
set search_path = public
as $$
  select papel from public.profiles where id = auth.uid()
$$;

create or replace function public.minha_unidade()
returns text
language sql
security definer
set search_path = public
as $$
  select unidade from public.profiles where id = auth.uid()
$$;

create or replace function public.minha_modalidade()
returns text
language sql
security definer
set search_path = public
as $$
  select modalidade from public.profiles where id = auth.uid()
$$;

-- 3) Policies de leitura (SELECT)

-- Qualquer usuário autenticado pode ver o próprio perfil
create policy "ver_proprio_perfil"
on public.profiles for select
using (auth.uid() = id);

-- Administrador vê todos os perfis
create policy "admin_ve_tudo"
on public.profiles for select
using (public.meu_papel() = 'administrador');

-- Professor vê os alunos aprovados da própria unidade + modalidade
create policy "professor_ve_seus_alunos"
on public.profiles for select
using (
  public.meu_papel() = 'professor'
  and papel = 'aluno'
  and status = 'aprovado'
  and unidade = public.minha_unidade()
  and modalidade = public.minha_modalidade()
);

-- 4) Policies de escrita (INSERT / UPDATE / DELETE)

-- Qualquer pessoa recém-cadastrada pode criar o próprio perfil (status sempre nasce 'pendente')
create policy "criar_proprio_perfil"
on public.profiles for insert
with check (auth.uid() = id and status = 'pendente');

-- Só o administrador pode alterar status/graduação de qualquer perfil
create policy "admin_atualiza_tudo"
on public.profiles for update
using (public.meu_papel() = 'administrador');

-- Só o administrador pode remover (recusar) cadastros
create policy "admin_remove"
on public.profiles for delete
using (public.meu_papel() = 'administrador');

-- ============================================================
-- 5) Bootstrap do primeiro administrador
-- ============================================================
-- Depois de rodar este script:
--   1. Cadastre-se normalmente pelo app (como aluno ou professor, tanto faz).
--   2. Volte aqui no SQL Editor e rode o comando abaixo, trocando o nome:
--
--   update public.profiles
--   set papel = 'administrador', status = 'aprovado'
--   where nome = 'Seu Nome Aqui';
--
-- A partir daí você já consegue logar como administrador e aprovar os próximos cadastros
-- direto pelo próprio app.
