# União Fight — App da Academia

App para a academia União Marcelo Marinho Fight (Boxe, Muay Thai, Kickboxing e
Jiu-Jitsu), com cadastro de alunos e professores, aprovação pelo administrador,
controle de presença por GPS, cronograma semanal e mural de comunicados.

## Como é feito

Front-end simples (HTML, CSS e JavaScript puro, sem build/framework) + banco
de dados no [Supabase](https://supabase.com) (Postgres, autenticação,
armazenamento de imagens e tempo real). Publicado no Netlify.

```
uniao-fight-app/
├── index.html              → estrutura da página
├── css/style.css           → todo o visual (cores, tipografia, layout)
├── js/
│   ├── app.js               → toda a lógica do app (telas, ações, banco)
│   └── supabaseClient.js    → conexão com o Supabase (URL + chave)
├── assets/
│   └── logo-uniao-fight.png
└── database/
    ├── README.md            → ordem dos scripts, caso precise recriar o banco
    └── supabase-schema*.sql → histórico dos scripts já rodados no Supabase
```

## Acessos (papéis)

- **Administrador** — aprova cadastros, define graduação, gerencia unidades e
  modalidades de cada pessoa, publica comunicados e monta o cronograma.
- **Aluno** — acompanha a própria graduação, registra presença (com GPS) e
  consulta o cronograma da semana.
- **Professor** — ao entrar, escolhe entre "Dar aula" (vê seus alunos e o
  cronograma) ou "Treinar" (registra a própria presença, como um aluno).

## Funcionalidades

- Cadastro com nome, data de nascimento, senha forte, unidade (Anchieta ou
  Ricardo) e uma ou mais modalidades (Boxe, Muay Thai, Kickboxing, Jiu-Jitsu)
- Login simplificado (só nome + senha — o e-mail interno é gerado
  automaticamente, o usuário nunca lida com isso)
- Todo cadastro nasce "pendente" até o administrador aprovar e definir a
  graduação de cada modalidade escolhida
- Painel do admin com busca por nome e filtros por unidade/modalidade,
  agrupando a equipe por Unidade → Modalidade
- Ficha detalhada de cada pessoa (dados, graduações, histórico de presença),
  editável pelo admin
- Cada pessoa também pode editar o próprio perfil (nome, nascimento, unidade,
  modalidades — papel, status e graduação continuam exclusivos do admin)
- Presença via GPS: o app pega a localização do celular, converte num
  endereço legível e marca no calendário do mês
- Cronograma semanal em duas trilhas — "Geral" (Boxe, Muay Thai, Kickboxing) e
  "Jiu-Jitsu", com atividades por dia da semana, visível clicando nos dias do
  calendário (sábado e domingo ficam bloqueados, a academia fica fechada)
- Mural de comunicados (título, texto, imagem opcional, direcionado a uma
  unidade específica ou a todas), aparece em modal para quem ainda não
  fechou aquele comunicado; novo comunicado chega em tempo real pra quem já
  está com o app aberto

## Configuração (resumo)

1. Criar um projeto gratuito em supabase.com
2. Rodar os scripts da pasta `database/` no SQL Editor, na ordem descrita no
   `database/README.md`
3. Colar a URL e a chave `anon public` do projeto em `js/supabaseClient.js`
4. Publicar a pasta inteira no Netlify (ou arrastar em app.netlify.com/drop)

## Importante

Sempre que uma funcionalidade nova for adicionada, **este README deve ser
atualizado** junto com o código, para continuar refletindo o estado real do
app.
