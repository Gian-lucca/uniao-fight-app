-- ============================================================
-- União Fight — comunicados (mural de avisos)
-- Rode só este arquivo (não repita os anteriores)
-- ============================================================

-- 1) Tabela de comunicados
create table if not exists public.comunicados (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  corpo text not null,
  imagem_url text,
  unidade text,               -- null = vale para todas as unidades
  criado_por uuid references public.profiles(id),
  criado_em timestamptz default now(),
  ativo boolean default true
);

alter table public.comunicados enable row level security;

-- Qualquer pessoa aprovada vê os comunicados ativos da própria unidade
-- (ou "todas as unidades"). Administrador vê tudo, sempre.
create policy "ver_comunicados"
on public.comunicados for select
using (
  public.meu_papel() = 'administrador'
  or (ativo = true and (unidade is null or unidade = public.minha_unidade()))
);

create policy "admin_cria_comunicados"
on public.comunicados for insert
with check (public.meu_papel() = 'administrador');

create policy "admin_edita_comunicados"
on public.comunicados for update
using (public.meu_papel() = 'administrador');

create policy "admin_apaga_comunicados"
on public.comunicados for delete
using (public.meu_papel() = 'administrador');

-- 2) Controle de leitura (pra não repetir o modal depois que a pessoa já viu)
create table if not exists public.comunicados_lidos (
  comunicado_id uuid references public.comunicados(id) on delete cascade,
  usuario_id uuid references public.profiles(id) on delete cascade,
  lido_em timestamptz default now(),
  primary key (comunicado_id, usuario_id)
);

alter table public.comunicados_lidos enable row level security;

create policy "usuario_ve_proprias_leituras"
on public.comunicados_lidos for select
using (auth.uid() = usuario_id);

create policy "usuario_marca_como_lido"
on public.comunicados_lidos for insert
with check (auth.uid() = usuario_id);

-- 3) Bucket de armazenamento para as imagens dos comunicados (público, só leitura)
insert into storage.buckets (id, name, public)
values ('comunicados', 'comunicados', true)
on conflict (id) do nothing;

create policy "admin_faz_upload_comunicados"
on storage.objects for insert
with check (bucket_id = 'comunicados' and public.meu_papel() = 'administrador');

create policy "admin_apaga_imagens_comunicados"
on storage.objects for delete
using (bucket_id = 'comunicados' and public.meu_papel() = 'administrador');

create policy "qualquer_um_ve_imagens_comunicados"
on storage.objects for select
using (bucket_id = 'comunicados');

-- 4) Ativar o Realtime na tabela, pra quem já está com o app aberto
--    receber o comunicado novo na hora (sem precisar recarregar a página)
alter publication supabase_realtime add table public.comunicados;
