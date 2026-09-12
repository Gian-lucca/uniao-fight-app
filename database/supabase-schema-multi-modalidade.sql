-- ============================================================
-- União Fight — migração: múltiplas modalidades por pessoa
-- Rode só este arquivo (não repita os anteriores)
-- ============================================================

-- 1) Novas colunas: lista de modalidades + graduação por modalidade
alter table public.profiles add column if not exists modalidades text[] default '{}';
alter table public.profiles add column if not exists graduacoes jsonb default '{}'::jsonb;

-- 2) Migrar quem já tinha uma única modalidade/graduação pro novo formato
update public.profiles
set modalidades = array[modalidade]
where modalidade is not null and (modalidades is null or modalidades = '{}');

update public.profiles
set graduacoes = jsonb_build_object(modalidade, graduacao)
where modalidade is not null and graduacao is not null;

-- 3) Remover as policies antigas que ainda dependem das colunas antigas
--    (precisa ser feito ANTES de remover as colunas, senão o Postgres bloqueia)
drop policy if exists "professor_ve_seus_alunos" on public.profiles;
drop policy if exists "professor_ve_presenca_dos_alunos" on public.presencas;
drop function if exists public.minha_modalidade();

-- 4) Agora sim, remover as colunas antigas (não são mais usadas pelo app)
alter table public.profiles drop column if exists modalidade;
alter table public.profiles drop column if exists graduacao;

-- 5) Função auxiliar: modalidades do usuário logado (substitui minha_modalidade)
create or replace function public.minhas_modalidades()
returns text[]
language sql
security definer
set search_path = public
as $$
  select modalidades from public.profiles where id = auth.uid()
$$;

-- 6) Recriar a policy do professor usando sobreposição de arrays
create policy "professor_ve_seus_alunos"
on public.profiles for select
using (
  public.meu_papel() = 'professor'
  and papel = 'aluno'
  and status = 'aprovado'
  and unidade = public.minha_unidade()
  and modalidades && public.minhas_modalidades()
);

-- 7) Recriar a policy de presença do professor (mesma lógica de sobreposição)
create policy "professor_ve_presenca_dos_alunos"
on public.presencas for select
using (
  public.meu_papel() = 'professor'
  and unidade = public.minha_unidade()
  and modalidade = any(public.minhas_modalidades())
);
