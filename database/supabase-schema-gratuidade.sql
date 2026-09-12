-- ============================================================
-- União Fight — regime de gratuidade (para professores)
-- Rode só este arquivo (não repita os anteriores)
-- ============================================================

-- 1) Adicionar 'gratuidade' como valor válido de status_pagamento
--    (busca o nome real da constraint, pra não depender de um nome fixo)
do $$
declare
  nome_constraint text;
begin
  select con.conname into nome_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
  where rel.relname = 'profiles' and att.attname = 'status_pagamento' and con.contype = 'c'
  limit 1;

  if nome_constraint is not null then
    execute format('alter table public.profiles drop constraint %I', nome_constraint);
  end if;
end $$;

alter table public.profiles add constraint profiles_status_pagamento_check
  check (status_pagamento in ('pendente_pagamento','pago','liberacao_mestre','gratuidade'));

-- 2) Professores que já existem no banco ficam isentos por padrão
--    (o administrador pode trocar pra "mensalidade" a qualquer momento pela ficha da pessoa)
update public.profiles
set status_pagamento = 'gratuidade'
where papel = 'professor' and status_pagamento = 'pendente_pagamento';
