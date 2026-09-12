-- ============================================================
-- União Fight — cronograma semanal
-- Rode só este arquivo (não repita os anteriores)
-- ============================================================

create table if not exists public.cronograma (
  id uuid default gen_random_uuid() primary key,
  trilha text not null check (trilha in ('geral','jiu-jitsu')),  -- 'geral' cobre Boxe, Muay Thai e Kickboxing
  dia_semana int not null check (dia_semana between 0 and 6),    -- 0=domingo ... 6=sábado
  horario text,
  atividade text not null,
  observacao text,
  criado_em timestamptz default now()
);

alter table public.cronograma enable row level security;

-- Qualquer pessoa logada e aprovada pode ver o cronograma
create policy "usuarios_veem_cronograma"
on public.cronograma for select
using (auth.uid() is not null);

-- Só o administrador cria, edita e apaga
create policy "admin_insere_cronograma"
on public.cronograma for insert
with check (public.meu_papel() = 'administrador');

create policy "admin_atualiza_cronograma"
on public.cronograma for update
using (public.meu_papel() = 'administrador');

create policy "admin_apaga_cronograma"
on public.cronograma for delete
using (public.meu_papel() = 'administrador');
