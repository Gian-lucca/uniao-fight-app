-- ============================================================
-- União Fight — planos e pagamento (protótipo visual)
-- Rode só este arquivo (não repita os anteriores)
-- ============================================================

-- 1) Planos (valores editáveis pelo administrador)
create table if not exists public.planos (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  preco numeric(10,2) not null,
  descricao text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

alter table public.planos enable row level security;

drop policy if exists "ver_planos" on public.planos;
create policy "ver_planos"
on public.planos for select
using (auth.uid() is not null);

drop policy if exists "admin_gerencia_planos" on public.planos;
create policy "admin_gerencia_planos"
on public.planos for all
using (public.meu_papel() = 'administrador')
with check (public.meu_papel() = 'administrador');

-- Cria os 3 planos iniciais, sem duplicar se o script rodar de novo
insert into public.planos (nome, preco, descricao)
select * from (values
  ('Plano 2 aulas na semana', 50.00, '2 aulas por semana'),
  ('Plano 3 aulas na semana', 100.00, '3 aulas por semana'),
  ('Plano Dupla modalidade', 150.00, 'Acesso a duas modalidades')
) as v(nome, preco, descricao)
where not exists (select 1 from public.planos p where p.nome = v.nome);

-- 2) Dados de pagamento no perfil de cada pessoa
alter table public.profiles add column if not exists plano_id uuid references public.planos(id);
alter table public.profiles add column if not exists status_pagamento text
  check (status_pagamento in ('pendente_pagamento','pago','liberacao_mestre'))
  default 'pendente_pagamento';
alter table public.profiles add column if not exists metodo_pagamento text;
alter table public.profiles add column if not exists dia_vencimento int check (dia_vencimento between 1 and 31);

-- 3) Função pra pessoa registrar o próprio pagamento (ou pedir liberação do mestre)
--    logo depois do cadastro, sem poder mexer em papel/status/graduação
create or replace function public.registrar_pagamento_proprio(
  p_plano_id uuid,
  p_status_pagamento text,
  p_metodo_pagamento text,
  p_dia_vencimento int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set plano_id = p_plano_id,
      status_pagamento = p_status_pagamento,
      metodo_pagamento = p_metodo_pagamento,
      dia_vencimento = p_dia_vencimento
  where id = auth.uid();
end;
$$;

grant execute on function public.registrar_pagamento_proprio(uuid, text, text, int) to authenticated;
