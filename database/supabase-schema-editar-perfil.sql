-- ============================================================
-- União Fight — permitir edição de perfil (próprio e pelo admin)
-- Rode só este arquivo (não repita os anteriores)
-- ============================================================

-- Função que deixa qualquer pessoa logada atualizar APENAS os próprios
-- dados básicos (nome, nascimento, unidade, modalidades) — nunca o papel,
-- o status de aprovação ou a graduação, que continuam exclusivos do admin.
create or replace function public.atualizar_meu_perfil(
  novo_nome text,
  nova_data_nascimento date,
  nova_unidade text,
  novas_modalidades text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set nome = novo_nome,
      data_nascimento = nova_data_nascimento,
      unidade = nova_unidade,
      modalidades = novas_modalidades
  where id = auth.uid();
end;
$$;

grant execute on function public.atualizar_meu_perfil(text, date, text, text[]) to authenticated;

-- O admin já pode editar qualquer perfil (policy admin_atualiza_tudo já existe
-- desde o schema original), então nenhuma mudança extra é necessária pra isso.
