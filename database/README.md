# Scripts do banco de dados (Supabase)

Esses arquivos **não são usados pelo app publicado** — o site só precisa do
`index.html`, `css/`, `js/` e `assets/`. Isso aqui é só o histórico de tudo
que já foi rodado no SQL Editor do Supabase pra montar o banco.

Serve caso você precise, no futuro, recriar o banco do zero (ex: um ambiente
de testes separado, ou uma segunda academia). Nesse caso, rode os arquivos
nesta ordem:

1. `supabase-schema.sql` — tabelas de usuários (profiles) e permissões básicas
2. `supabase-schema-presenca.sql` — presença por GPS
3. `supabase-schema-multi-modalidade.sql` — permite mais de uma modalidade por pessoa
4. `supabase-schema-editar-perfil.sql` — cada um edita o próprio perfil
5. `supabase-schema-comunicados.sql` — mural de avisos
6. `supabase-schema-cronograma.sql` — cronograma semanal

Se o banco já está funcionando (é o seu caso hoje), **não precisa rodar nada
disso de novo**.
