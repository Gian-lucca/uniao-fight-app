-- ============================================================
-- União Fight — adição: registro de presença com GPS
-- Rode só este arquivo (não repita o supabase-schema.sql inteiro)
-- ============================================================

create table if not exists public.presencas (
  id uuid default gen_random_uuid() primary key,
  aluno_id uuid references public.profiles(id) on delete cascade not null,
  data date not null default current_date,
  hora timestamptz not null default now(),
  latitude numeric,
  longitude numeric,
  endereco text,
  unidade text,
  modalidade text,
  unique (aluno_id, data)
);

alter table public.presencas enable row level security;

-- Aluno registra a própria presença (uma vez por dia, por causa do unique acima)
create policy "aluno_registra_propria_presenca"
on public.presencas for insert
with check (auth.uid() = aluno_id);

-- Aluno vê as próprias presenças
create policy "aluno_ve_propria_presenca"
on public.presencas for select
using (auth.uid() = aluno_id);

-- Professor vê a presença dos alunos da própria unidade + modalidade
create policy "professor_ve_presenca_dos_alunos"
on public.presencas for select
using (
  public.meu_papel() = 'professor'
  and unidade = public.minha_unidade()
  and modalidade = public.minha_modalidade()
);

-- Administrador vê tudo
create policy "admin_ve_toda_presenca"
on public.presencas for select
using (public.meu_papel() = 'administrador');
