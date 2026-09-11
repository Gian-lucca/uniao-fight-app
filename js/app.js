/* ---------------- DATA ---------------- */
const GRADUACOES = {
  'Boxe': ['Iniciante','Intermediário','Avançado','Competidor'],
  'Muay Thai': ['Grau Branco','Grau Branco Ponta Vermelha','Grau Vermelho','Grau Vermelho Ponta Azul Claro','Grau Azul Claro','Grau Azul Claro Ponta Azul Escuro','Grau Azul Escuro','Grau Azul Escuro Ponta Preta','Grau Preto'],
  'Kickboxing': ['Faixa Branca','Faixa Amarela','Faixa Laranja','Faixa Verde','Faixa Azul','Faixa Marrom','Faixa Preta'],
  'Jiu-Jitsu': ['Faixa Branca','Faixa Azul','Faixa Roxa','Faixa Marrom','Faixa Preta']
};

const state = {
  screen: 'home',
  currentUser: null,
  error: '',
  loading: false,
  modalUserId: null,
  pendentes: [],
  aprovados: [],
  alunosDoProfessor: [],
  modalPessoa: null,
  calAno: new Date().getFullYear(),
  calMes: new Date().getMonth(), // 0-11
  presencas: {},          // { 'YYYY-MM-DD': {endereco, hora} }
  presencaStatus: 'idle',  // idle | buscando | ok | erro
  presencaMsg: '',

  // --- tela de detalhe (admin clicando numa pessoa) ---
  pessoaSelecionada: null,
  pessoaPresencas: {},
  pessoaCalAno: new Date().getFullYear(),
  pessoaCalMes: new Date().getMonth(),
  pessoaEditModalidades: [],
  pessoaEditGraduacoes: {},
  pessoaModoEdicao: false,

  // --- tela "editar meu perfil" ---
  editarPerfilModalidades: [],

  // --- busca e filtros do painel do admin ---
  adminBusca: '',
  adminFiltroUnidade: '',
  adminFiltroModalidade: '',

  // --- comunicados ---
  comunicados: [],           // lista completa (visão do admin)
  comunicadoEditando: null,  // objeto do comunicado em edição, ou null = criando novo
  comunicadosNaoLidos: [],   // fila de comunicados não lidos (aluno/professor)
  comunicadoAtual: null,     // comunicado mostrado no modal agora

  // --- cronograma semanal ---
  cronogramaTodos: [],            // todas as linhas (cache local)
  cronogramaTrilhaAdmin: 'geral', // aba selecionada na tela do admin
  cronogramaEditando: null,       // linha em edição, ou null = criando nova
  cronogramaTrilhaView: 'geral',  // aba selecionada na tela de visualização (aluno/professor)
  diaCronogramaSelecionado: null  // dia da semana (0-6) clicado no calendário do aluno
};

/* ---------------- HELPERS ---------------- */

// Converte o "nome" digitado em um e-mail interno, só para o Supabase Auth
// (o usuário nunca vê nem digita e-mail, só nome + senha, como no app original)
function nomeParaEmail(nome){
  const slug = nome.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug}@uniaofight.app`;
}

function pwChecklist(pw){
  return [
    { ok: pw.length>=8, label:'Mínimo de 8 caracteres' },
    { ok: /[A-Z]/.test(pw), label:'Uma letra maiúscula' },
    { ok: /[a-z]/.test(pw), label:'Uma letra minúscula' },
    { ok: /[0-9]/.test(pw), label:'Um número' },
    { ok: /[^A-Za-z0-9]/.test(pw), label:'Um caractere especial' },
  ];
}
function pwIsStrong(pw){ return pwChecklist(pw).every(r=>r.ok); }

function go(screen){ state.screen = screen; state.error=''; render(); }

function pad2(n){ return String(n).padStart(2,'0'); }
function dataKey(ano, mes, dia){ return `${ano}-${pad2(mes+1)}-${pad2(dia)}`; }

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const DIAS_SEMANA = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const ORDEM_SEMANA = [1,2,3,4,5,6,0]; // segunda a domingo, pra exibição

function buildCalendarGeneric(ano, mes, presencasMap, actionPrev, actionNext, diasClicaveis){
  const hoje = new Date();
  const hojeKey = dataKey(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0=domingo
  const totalDias = new Date(ano, mes+1, 0).getDate();

  const dows = ['D','S','T','Q','Q','S','S'].map(d=>`<div class="cal-dow">${d}</div>`).join('');

  let cells = '';
  for(let i=0;i<primeiroDiaSemana;i++) cells += `<div class="cal-day empty"></div>`;
  for(let dia=1; dia<=totalDias; dia++){
    const key = dataKey(ano, mes, dia);
    const diaSemana = new Date(ano, mes, dia).getDay();
    const presente = !!presencasMap[key];
    const isHoje = key === hojeKey;
    const isSelecionado = diasClicaveis && state.diaCronogramaSelecionado === diaSemana;
    const classes = ['cal-day', presente ? 'presente':'', isHoje ? 'today':'', isSelecionado ? 'selecionado':''].filter(Boolean).join(' ');
    const attrs = diasClicaveis ? `data-action="ver-dia-cronograma" data-id="${diaSemana}"` : '';
    cells += `<div class="${classes}" ${attrs}>${dia}</div>`;
  }

  return `
  <div class="presenca-box">
    <div class="cal-head">
      <button data-action="${actionPrev}">‹</button>
      <h3>${MESES_PT[mes]} ${ano}</h3>
      <button data-action="${actionNext}">›</button>
    </div>
    <div class="cal-grid">${dows}${cells}</div>
    ${diasClicaveis ? '<div class="cal-hint">Toque num dia para ver o cronograma daquele dia da semana</div>' : ''}
  </div>`;
}

function buildCalendarHTML(){
  return buildCalendarGeneric(state.calAno, state.calMes, state.presencas, 'cal-prev', 'cal-next', true);
}

/* ---------------- RENDER ---------------- */
function render(){
  const app = document.getElementById('app');
  app.innerHTML = renderScreen();
  attachHandlers();
}

function renderScreen(){
  switch(state.screen){
    case 'home': return homeView();
    case 'login': return loginView();
    case 'signup': return signupView();
    case 'pending': return pendingView();
    case 'admin': return adminView();
    case 'admin-pessoa': return adminPersonView();
    case 'admin-comunicados': return adminComunicadosView();
    case 'comunicado-form': return comunicadoFormView();
    case 'admin-cronograma': return adminCronogramaView();
    case 'cronograma-form': return cronogramaFormView();
    case 'ver-cronograma': return verCronogramaView();
    case 'student': return studentView();
    case 'teacher': return teacherView();
    case 'editar-perfil': return editarPerfilView();
    default: return homeView();
  }
}

function homeView(){
  return `
  <div class="screen home">
    <div class="corner-tape"></div>
    <div class="home-center">
      <div class="badge-mark"><img src="assets/logo-uniao-fight.png" alt="União Marcelo Marinho Fight"></div>
      <h1 class="team-name">União Fight</h1>
      <div class="team-tag">BOXE · MUAY THAI · KICKBOXING<br>JIU-JITSU</div>
      ${state.error ? `<div class="error-msg" style="text-align:left;">${state.error}</div>` : ''}
      <button class="btn btn-primary" data-action="go-login">Entrar</button>
      <button class="link-btn" data-action="go-signup">Primeiro acesso? Cadastre-se</button>
    </div>
  </div>`;
}

function loginView(){
  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="go-home">←</button>
      <h2>Entrar</h2>
    </div>
    ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}
    <div class="field">
      <label>Nome</label>
      <input id="in-nome" type="text" placeholder="Seu nome de cadastro">
    </div>
    <div class="field">
      <label>Senha</label>
      <input id="in-senha" type="password" placeholder="••••••••">
    </div>
    <button class="btn btn-primary" data-action="do-login" ${state.loading ? 'disabled' : ''}>
      ${state.loading ? 'Entrando...' : 'Entrar'}
    </button>
    <div style="text-align:center; margin-top:16px;">
      <button class="link-btn" data-action="go-signup">Primeiro acesso? Cadastre-se</button>
    </div>
  </div>`;
}

function signupView(){
  const modalidadeChecks = Object.keys(GRADUACOES).map(m=>`
    <label class="check-item">
      <input type="checkbox" name="s-modalidade" value="${m}">
      <span>${m}</span>
    </label>`).join('');

  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="go-home">←</button>
      <h2>Cadastro</h2>
    </div>
    ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}
    <div class="field">
      <label>Nome completo</label>
      <input id="s-nome" type="text" placeholder="Seu nome">
    </div>
    <div class="field">
      <label>Data de nascimento</label>
      <input id="s-nasc" type="date">
    </div>
    <div class="field">
      <label>Senha</label>
      <input id="s-senha" type="password" placeholder="Crie uma senha forte">
      <ul class="pw-check" id="pw-list"></ul>
    </div>
    <div class="field">
      <label>Confirmação da senha</label>
      <input id="s-senha2" type="password" placeholder="Repita a senha">
      <div id="pw-match" style="font-size:12px; margin-top:6px;"></div>
    </div>
    <div class="field">
      <label>Unidade</label>
      <select id="s-unidade">
        <option value="">Selecione</option>
        <option value="Anchieta">Anchieta</option>
        <option value="Ricardo">Ricardo</option>
      </select>
    </div>
    <div class="field">
      <label>Modalidade(s)</label>
      <div class="check-list">${modalidadeChecks}</div>
    </div>
    <div class="field">
      <label>Você é</label>
      <select id="s-papel">
        <option value="">Selecione</option>
        <option value="aluno">Aluno</option>
        <option value="professor">Professor</option>
      </select>
    </div>
    <button class="btn btn-primary" data-action="do-signup" ${state.loading ? 'disabled' : ''}>
      ${state.loading ? 'Enviando...' : 'Concluir cadastro'}
    </button>
  </div>`;
}

function pendingView(){
  return `
  <div class="screen">
    <div class="pending-wrap">
      <div class="pending-icon"></div>
      <h2 style="font-size:19px; text-transform:uppercase; margin-bottom:10px;">Cadastro enviado</h2>
      <p style="color:var(--muted); font-size:13.5px; line-height:1.6; max-width:260px;">
        Seu acesso está em análise. Assim que o administrador liberar, você poderá entrar normalmente.
      </p>
      <button class="btn btn-ghost" data-action="go-home" style="margin-top:26px; max-width:200px;">Voltar ao início</button>
    </div>
  </div>`;
}

function aprovadosFiltrados(){
  const termo = state.adminBusca.trim().toLowerCase();
  return state.aprovados.filter(u=>{
    const matchNome = !termo || u.nome.toLowerCase().includes(termo);
    const matchUnidade = !state.adminFiltroUnidade || u.unidade === state.adminFiltroUnidade;
    const matchModalidade = !state.adminFiltroModalidade || (u.modalidades||[]).includes(state.adminFiltroModalidade);
    return matchNome && matchUnidade && matchModalidade;
  });
}

function renderEquipeAprovada(){
  const approved = aprovadosFiltrados();
  const UNIDADES = state.adminFiltroUnidade ? [state.adminFiltroUnidade] : ['Anchieta','Ricardo'];
  const MODALIDADES = state.adminFiltroModalidade ? [state.adminFiltroModalidade] : Object.keys(GRADUACOES);

  const gruposHtml = UNIDADES.map(unidade=>{
    const daUnidade = approved.filter(u=>u.unidade===unidade);
    if(!daUnidade.length) return '';

    const modalidadesHtml = MODALIDADES.map(mod=>{
      const doGrupo = daUnidade.filter(u=>(u.modalidades||[]).includes(mod));
      if(!doGrupo.length) return '';
      const linhas = doGrupo.map(u=>`
        <div class="stud-row clickable" data-action="abrir-pessoa" data-id="${u.id}">
          <div>${u.nome}<div class="sm">${u.papel === 'aluno' ? 'Aluno' : 'Professor'}</div></div>
          <div class="sm">${(u.graduacoes && u.graduacoes[mod]) || '—'}</div>
        </div>`).join('');
      return `
        <div class="modalidade-group">
          <div class="modalidade-label">${mod}</div>
          ${linhas}
        </div>`;
    }).join('');

    if(!modalidadesHtml.trim()) return '';

    return `
      <div class="unidade-group">
        <div class="unidade-label">Unidade ${unidade}</div>
        ${modalidadesHtml}
      </div>`;
  }).join('');

  if(gruposHtml.trim()) return gruposHtml;
  const temFiltro = state.adminBusca.trim() || state.adminFiltroUnidade || state.adminFiltroModalidade;
  return `<div class="empty-note">${temFiltro ? 'Nenhum resultado encontrado.' : 'Ninguém aprovado ainda.'}</div>`;
}

// Atualiza só a lista de "equipe aprovada" (sem redesenhar a tela toda),
// pra não tirar o foco do campo de busca enquanto a pessoa digita
function atualizarEquipeAprovada(){
  const container = document.getElementById('equipe-aprovada-container');
  if(!container) return;
  container.innerHTML = renderEquipeAprovada();
  container.querySelectorAll('[data-action]').forEach(el=>{
    el.addEventListener('click', ()=>{
      handleAction(el.dataset.action, el.dataset.id || null);
    });
  });
}

function adminView(){
  const pend = state.pendentes;

  const pendItems = pend.length ? pend.map(u=>`
    <div class="req-item">
      <div class="rn">${u.nome}</div>
      <div class="rm">${u.papel === 'aluno' ? 'Aluno' : 'Professor'} · ${(u.modalidades||[]).join(', ')} · Unidade ${u.unidade}</div>
      <div class="req-actions">
        <button class="btn-approve" data-action="open-approve" data-id="${u.id}">Aprovar</button>
        <button class="btn-reject" data-action="reject" data-id="${u.id}">Recusar</button>
      </div>
    </div>`).join('') : `<div class="empty-note">Nenhuma solicitação pendente.</div>`;

  return `
  <div class="screen">
    <div class="top-bar">
      <h2>Painel do Admin</h2>
      <button data-action="logout">Sair</button>
    </div>
    <button class="btn btn-ghost" data-action="go-comunicados" style="margin-bottom:10px;">📣 Comunicados</button>
    <button class="btn btn-ghost" data-action="go-cronograma-admin" style="margin-bottom:18px;">🗓️ Cronograma da semana</button>
    <div class="section-label">Solicitações pendentes (${pend.length})</div>
    ${pendItems}

    <div class="section-label">Equipe aprovada</div>
    <div class="admin-filtros">
      <input id="admin-busca" type="text" placeholder="Buscar por nome..." value="${state.adminBusca}">
      <div class="admin-filtros-row">
        <select id="admin-filtro-unidade">
          <option value="">Todas as unidades</option>
          <option value="Anchieta" ${state.adminFiltroUnidade==='Anchieta'?'selected':''}>Anchieta</option>
          <option value="Ricardo" ${state.adminFiltroUnidade==='Ricardo'?'selected':''}>Ricardo</option>
        </select>
        <select id="admin-filtro-modalidade">
          <option value="">Todas as modalidades</option>
          ${Object.keys(GRADUACOES).map(m=>`<option value="${m}" ${state.adminFiltroModalidade===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="equipe-aprovada-container">${renderEquipeAprovada()}</div>
  </div>
  ${modalView()}`;
}

function modalView(){
  if(!state.modalUserId || !state.modalPessoa) return '';
  const u = state.modalPessoa;
  const selects = (u.modalidades || []).map(m=>{
    const opts = (GRADUACOES[m] || []).map(g=>`<option value="${g}">${g}</option>`).join('');
    return `
      <div class="field">
        <label>Graduação · ${m}</label>
        <select class="grad-select" data-modalidade="${m}">${opts}</select>
      </div>`;
  }).join('');

  return `
  <div class="modal-overlay">
    <div class="modal-box">
      <h3>Definir graduação</h3>
      <p>${u.nome} · ${(u.modalidades || []).join(', ')}</p>
      ${selects}
      <div class="modal-actions">
        <button class="btn-reject" data-action="close-modal">Cancelar</button>
        <button class="btn-approve" data-action="confirm-approve" data-id="${u.id}">Confirmar</button>
      </div>
    </div>
  </div>`;
}

function adminComunicadosView(){
  const lista = state.comunicados;
  const itens = lista.length ? lista.map(c=>`
    <div class="comunicado-card">
      ${c.imagem_url ? `<img src="${c.imagem_url}" class="comunicado-thumb">` : ''}
      <div class="comunicado-info">
        <div class="comunicado-titulo">${c.titulo}</div>
        <div class="sm">${c.unidade ? 'Unidade ' + c.unidade : 'Todas as unidades'} · ${new Date(c.criado_em).toLocaleDateString('pt-BR')}</div>
        <div class="comunicado-actions">
          <button class="link-btn" data-action="editar-comunicado" data-id="${c.id}">Editar</button>
          <button class="link-btn" data-action="excluir-comunicado" data-id="${c.id}" style="color:#f2b6bf;">Excluir</button>
        </div>
      </div>
    </div>`).join('') : `<div class="empty-note">Nenhum comunicado publicado ainda.</div>`;

  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="voltar-admin-comunicados">←</button>
      <h2>Comunicados</h2>
    </div>
    <button class="btn btn-primary" data-action="novo-comunicado" style="margin-bottom:20px;">+ Criar comunicado</button>
    ${itens}
  </div>`;
}

function comunicadoFormView(){
  const c = state.comunicadoEditando;
  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="go-comunicados">←</button>
      <h2>${c ? 'Editar comunicado' : 'Novo comunicado'}</h2>
    </div>
    ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}
    <div class="field">
      <label>Título</label>
      <input id="com-titulo" type="text" value="${c ? c.titulo : ''}" placeholder="Ex: Treino cancelado sexta-feira">
    </div>
    <div class="field">
      <label>Comunicado</label>
      <textarea id="com-corpo" rows="5" placeholder="Escreva o comunicado aqui...">${c ? c.corpo : ''}</textarea>
    </div>
    <div class="field">
      <label>Imagem (opcional)</label>
      ${c && c.imagem_url ? `<img src="${c.imagem_url}" class="comunicado-preview-atual">` : ''}
      <input id="com-imagem" type="file" accept="image/*">
    </div>
    <div class="field">
      <label>Enviar para</label>
      <select id="com-unidade">
        <option value="" ${!c || !c.unidade ? 'selected':''}>Todas as unidades</option>
        <option value="Anchieta" ${c && c.unidade==='Anchieta' ? 'selected':''}>Somente Anchieta</option>
        <option value="Ricardo" ${c && c.unidade==='Ricardo' ? 'selected':''}>Somente Ricardo</option>
      </select>
    </div>
    <button class="btn btn-primary" data-action="salvar-comunicado" ${state.loading ? 'disabled' : ''}>
      ${state.loading ? 'Publicando...' : (c ? 'Salvar alterações' : 'Publicar comunicado')}
    </button>
  </div>`;
}

// Modal que aparece pro aluno/professor quando existe comunicado não lido
function comunicadoModalView(){
  const c = state.comunicadoAtual;
  if(!c) return '';
  return `
  <div class="modal-overlay">
    <div class="modal-box comunicado-modal">
      <button class="comunicado-fechar" data-action="fechar-comunicado">×</button>
      ${c.imagem_url ? `<img src="${c.imagem_url}" class="comunicado-modal-img">` : ''}
      <h3>${c.titulo}</h3>
      <p class="comunicado-corpo">${c.corpo}</p>
    </div>
  </div>`;
}

function listaCronogramaHtml(trilha, editavel){
  const linhas = state.cronogramaTodos.filter(c=>c.trilha===trilha);
  if(!linhas.length) return `<div class="empty-note">Nada cadastrado ainda para essa trilha.</div>`;

  return ORDEM_SEMANA.map(dia=>{
    const doDia = linhas.filter(c=>c.dia_semana===dia).sort((a,b)=>(a.horario||'').localeCompare(b.horario||''));
    if(!doDia.length) return '';
    const itens = doDia.map(c=>`
      <div class="cron-item">
        <div class="cron-horario">${c.horario || ''}</div>
        <div class="cron-info">
          <div class="cron-atividade">${c.atividade}</div>
          ${c.observacao ? `<div class="sm">${c.observacao}</div>` : ''}
        </div>
        ${editavel ? `
          <div class="cron-actions">
            <button class="link-btn" data-action="editar-cronograma" data-id="${c.id}">Editar</button>
            <button class="link-btn" data-action="excluir-cronograma" data-id="${c.id}" style="color:#f2b6bf;">Excluir</button>
          </div>` : ''}
      </div>`).join('');
    return `
      <div class="cron-dia-group">
        <div class="cron-dia-label">${DIAS_SEMANA[dia]}</div>
        ${itens}
      </div>`;
  }).join('');
}

function adminCronogramaView(){
  const trilha = state.cronogramaTrilhaAdmin;
  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="voltar-admin-cronograma">←</button>
      <h2>Cronograma</h2>
    </div>
    <div class="trilha-tabs">
      <button class="trilha-tab ${trilha==='geral'?'ativa':''}" data-action="tab-cronograma-admin" data-id="geral">Geral</button>
      <button class="trilha-tab ${trilha==='jiu-jitsu'?'ativa':''}" data-action="tab-cronograma-admin" data-id="jiu-jitsu">Jiu-Jitsu</button>
    </div>
    <button class="btn btn-primary" data-action="novo-cronograma" style="margin:16px 0 20px;">+ Adicionar atividade</button>
    ${listaCronogramaHtml(trilha, true)}
  </div>`;
}

function cronogramaFormView(){
  const c = state.cronogramaEditando;
  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="go-cronograma-admin">←</button>
      <h2>${c ? 'Editar atividade' : 'Nova atividade'}</h2>
    </div>
    ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}
    <div class="field">
      <label>Trilha</label>
      <select id="cron-trilha">
        <option value="geral" ${(!c && state.cronogramaTrilhaAdmin==='geral') || (c && c.trilha==='geral') ? 'selected':''}>Geral (Boxe, Muay Thai, Kickboxing)</option>
        <option value="jiu-jitsu" ${(!c && state.cronogramaTrilhaAdmin==='jiu-jitsu') || (c && c.trilha==='jiu-jitsu') ? 'selected':''}>Jiu-Jitsu</option>
      </select>
    </div>
    <div class="field">
      <label>Dia da semana</label>
      <select id="cron-dia">
        ${DIAS_SEMANA.map((nome,idx)=>`<option value="${idx}" ${c && c.dia_semana===idx ? 'selected':''}>${nome}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label>Horário</label>
      <input id="cron-horario" type="text" placeholder="Ex: 19:00" value="${c ? (c.horario||'') : ''}">
    </div>
    <div class="field">
      <label>Atividade</label>
      <input id="cron-atividade" type="text" placeholder="Ex: Treino técnico" value="${c ? c.atividade : ''}">
    </div>
    <div class="field">
      <label>Observação (opcional)</label>
      <textarea id="cron-obs" rows="3" placeholder="Detalhes extras...">${c ? (c.observacao||'') : ''}</textarea>
    </div>
    <button class="btn btn-primary" data-action="salvar-cronograma" ${state.loading ? 'disabled' : ''}>
      ${state.loading ? 'Salvando...' : 'Salvar'}
    </button>
  </div>`;
}

function verCronogramaView(){
  const u = state.currentUser;
  const trilhas = new Set();
  (u.modalidades||[]).forEach(m=> trilhas.add(m === 'Jiu-Jitsu' ? 'jiu-jitsu' : 'geral'));
  const trilhasDisponiveis = Array.from(trilhas);
  const trilha = trilhasDisponiveis.includes(state.cronogramaTrilhaView) ? state.cronogramaTrilhaView : trilhasDisponiveis[0];

  const tabsHtml = trilhasDisponiveis.length > 1 ? `
    <div class="trilha-tabs">
      <button class="trilha-tab ${trilha==='geral'?'ativa':''}" data-action="tab-cronograma-view" data-id="geral">Geral</button>
      <button class="trilha-tab ${trilha==='jiu-jitsu'?'ativa':''}" data-action="tab-cronograma-view" data-id="jiu-jitsu">Jiu-Jitsu</button>
    </div>` : '';

  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="voltar-ver-cronograma">←</button>
      <h2>Cronograma</h2>
    </div>
    ${tabsHtml}
    <div style="margin-top:16px;">
      ${listaCronogramaHtml(trilha, false)}
    </div>
  </div>`;
}

function adminPersonView(){
  const p = state.pessoaSelecionada;
  if(!p) return `<div class="screen"><div class="empty-note">Pessoa não encontrada.</div></div>`;

  // presença: total + lista recente + calendário navegável
  const registros = Object.values(state.pessoaPresencas).sort((a,b)=> b.data.localeCompare(a.data));
  const listaPresenca = registros.length ? registros.slice(0,15).map(r=>`
    <div class="stud-row">
      <div>${r.data.split('-').reverse().join('/')}<div class="sm">${r.modalidade || ''}</div></div>
      <div class="sm" style="max-width:170px; text-align:right;">${r.endereco || '—'}</div>
    </div>`).join('') : `<div class="empty-note">Nenhuma presença registrada ainda.</div>`;

  const presencaSection = `
    <div class="section-label" style="margin-top:24px;">Presença (${registros.length} no total)</div>
    ${buildCalendarGeneric(state.pessoaCalAno, state.pessoaCalMes, state.pessoaPresencas, 'pessoa-cal-prev', 'pessoa-cal-next')}
    ${listaPresenca}`;

  if(!state.pessoaModoEdicao){
    const gradBadges = (p.modalidades || []).map(m=>`
      <div class="grad-tag">${m.toUpperCase()}: ${(p.graduacoes && p.graduacoes[m]) || 'a definir'}</div>
    `).join('');

    return `
    <div class="screen">
      <div class="back-row">
        <button data-action="voltar-admin">←</button>
        <h2>${p.nome}</h2>
      </div>
      <div class="profile-card">
        <div class="profile-name">${p.nome}</div>
        <div class="profile-meta">
          ${p.papel === 'aluno' ? 'Aluno' : p.papel === 'professor' ? 'Professor' : 'Administrador'} · Unidade ${p.unidade || '—'}<br>
          Modalidades: ${(p.modalidades || []).join(', ') || '—'}
        </div>
        <div class="grad-tags-wrap">${gradBadges}</div>
      </div>
      <button class="btn btn-ghost" data-action="editar-pessoa" style="margin-bottom:6px;">Editar dados</button>
      ${presencaSection}
    </div>`;
  }

  // ---- modo de edição ----
  const modalidadeChecks = Object.keys(GRADUACOES).map(m=>`
    <label class="check-item">
      <input type="checkbox" name="pessoa-modalidade" value="${m}" ${state.pessoaEditModalidades.includes(m) ? 'checked' : ''}>
      <span>${m}</span>
    </label>`).join('');

  const graduacaoSelects = state.pessoaEditModalidades.map(m=>{
    const opts = (GRADUACOES[m] || []).map(g=>{
      const sel = state.pessoaEditGraduacoes[m] === g ? 'selected' : '';
      return `<option value="${g}" ${sel}>${g}</option>`;
    }).join('');
    return `
      <div class="field">
        <label>Graduação · ${m}</label>
        <select class="pessoa-grad-select" data-modalidade="${m}">${opts}</select>
      </div>`;
  }).join('');

  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="cancelar-editar-pessoa">←</button>
      <h2>Editar · ${p.nome}</h2>
    </div>
    ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}

    <div class="field">
      <label>Nome completo</label>
      <input id="pessoa-nome" type="text" value="${p.nome}">
    </div>
    <div class="field">
      <label>Data de nascimento</label>
      <input id="pessoa-nasc" type="date" value="${p.data_nascimento || ''}">
    </div>
    <div class="field">
      <label>Unidade</label>
      <select id="pessoa-unidade">
        <option value="Anchieta" ${p.unidade==='Anchieta'?'selected':''}>Anchieta</option>
        <option value="Ricardo" ${p.unidade==='Ricardo'?'selected':''}>Ricardo</option>
      </select>
    </div>
    <div class="field">
      <label>Modalidade(s)</label>
      <div class="check-list">${modalidadeChecks}</div>
    </div>
    ${graduacaoSelects}
    <div class="field">
      <label>Papel</label>
      <select id="pessoa-papel">
        <option value="aluno" ${p.papel==='aluno'?'selected':''}>Aluno</option>
        <option value="professor" ${p.papel==='professor'?'selected':''}>Professor</option>
        <option value="administrador" ${p.papel==='administrador'?'selected':''}>Administrador</option>
      </select>
    </div>
    <div class="field">
      <label>Status</label>
      <select id="pessoa-status">
        <option value="pendente" ${p.status==='pendente'?'selected':''}>Pendente</option>
        <option value="aprovado" ${p.status==='aprovado'?'selected':''}>Aprovado</option>
        <option value="recusado" ${p.status==='recusado'?'selected':''}>Recusado</option>
      </select>
    </div>
    <div style="display:flex; gap:10px;">
      <button class="btn btn-ghost" data-action="cancelar-editar-pessoa" style="flex:1;">Cancelar</button>
      <button class="btn btn-primary" data-action="salvar-pessoa" data-id="${p.id}" style="flex:1;">Salvar</button>
    </div>
  </div>`;
}

function painelDiaCronograma(){
  if(state.diaCronogramaSelecionado === null) return '';
  const u = state.currentUser;
  const dia = state.diaCronogramaSelecionado;

  const trilhas = new Set();
  (u.modalidades || []).forEach(m => trilhas.add(m === 'Jiu-Jitsu' ? 'jiu-jitsu' : 'geral'));

  const itens = state.cronogramaTodos
    .filter(c => c.dia_semana === dia && trilhas.has(c.trilha))
    .sort((a,b) => (a.horario||'').localeCompare(b.horario||''));

  const corpo = itens.length ? itens.map(c=>`
    <div class="cron-item">
      <div class="cron-horario">${c.horario || ''}</div>
      <div class="cron-info">
        <div class="cron-atividade">${c.atividade}</div>
        ${c.observacao ? `<div class="sm">${c.observacao}</div>` : ''}
        ${trilhas.size > 1 ? `<div class="sm" style="color:var(--yellow);">${c.trilha === 'jiu-jitsu' ? 'Jiu-Jitsu' : 'Geral'}</div>` : ''}
      </div>
    </div>`).join('') : `<div class="empty-note">Nada programado para esse dia.</div>`;

  return `
  <div class="cron-dia-painel">
    <div class="cal-head">
      <h3>${DIAS_SEMANA[dia]}</h3>
      <button data-action="fechar-dia-cronograma">×</button>
    </div>
    ${corpo}
  </div>`;
}

function studentView(){
  const u = state.currentUser;
  const modalidades = u.modalidades || [];

  const gradBadges = modalidades.map(m=>`
    <div class="grad-tag">${m}: ${(u.graduacoes && u.graduacoes[m]) || 'a definir'}</div>
  `).join('');

  let statusHtml = '';
  if(state.presencaStatus === 'buscando'){
    statusHtml = `<div class="presenca-status">Buscando sua localização...</div>`;
  } else if(state.presencaStatus === 'ok'){
    statusHtml = `<div class="presenca-status ok">Presença registrada!<div class="presenca-endereco">${state.presencaMsg}</div></div>`;
  } else if(state.presencaStatus === 'erro'){
    statusHtml = `<div class="presenca-status erro">${state.presencaMsg}</div>`;
  }

  const hoje = new Date();
  const hojeKey = dataKey(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const jaRegistrouHoje = !!state.presencas[hojeKey];

  const seletorModalidade = modalidades.length > 1 ? `
    <div class="field">
      <label>Modalidade de hoje</label>
      <select id="presenca-modalidade">
        ${modalidades.map(m=>`<option value="${m}">${m}</option>`).join('')}
      </select>
    </div>` : '';

  return `
  <div class="screen">
    <div class="top-bar">
      <h2>Meu acesso</h2>
      <button data-action="logout">Sair</button>
    </div>
    <div class="profile-card">
      <button class="profile-edit-btn" data-action="go-editar-perfil" title="Editar perfil">✏️</button>
      <div class="profile-name">${u.nome}</div>
      <div class="profile-meta">
        Aluno · Unidade ${u.unidade}<br>
        Modalidades: ${modalidades.join(', ')}
      </div>
      <div class="grad-tags-wrap">${gradBadges}</div>
    </div>

    ${buildCalendarHTML()}
    ${painelDiaCronograma()}

    ${seletorModalidade}
    <button class="btn-presenca" data-action="registrar-presenca" ${jaRegistrouHoje || state.presencaStatus==='buscando' ? 'disabled' : ''}>
      ${jaRegistrouHoje ? 'Presença já registrada hoje' : 'Registrar presença'}
    </button>
    ${statusHtml}
  </div>
  ${comunicadoModalView()}`;
}

function teacherView(){
  const u = state.currentUser;
  const alunos = state.alunosDoProfessor;
  const alunosItems = alunos.length ? alunos.map(a=>`
    <div class="stud-row">
      <div>${a.nome}<div class="sm">${(a.modalidades||[]).join(', ')}</div></div>
      <div class="sm">${(a.modalidades||[]).map(m=>(a.graduacoes && a.graduacoes[m]) || '—').join(' · ')}</div>
    </div>`).join('') : `<div class="empty-note">Nenhum aluno nesta modalidade/unidade ainda.</div>`;

  return `
  <div class="screen">
    <div class="top-bar">
      <h2>Painel do Professor</h2>
      <button data-action="logout">Sair</button>
    </div>
    <div class="profile-card">
      <button class="profile-edit-btn" data-action="go-editar-perfil" title="Editar perfil">✏️</button>
      <div class="profile-name">${u.nome}</div>
      <div class="profile-meta">Professor · ${(u.modalidades||[]).join(', ')} · Unidade ${u.unidade}</div>
    </div>
    <button class="btn btn-ghost" data-action="go-ver-cronograma" style="margin-bottom:18px;">🗓️ Cronograma da semana</button>
    <div class="section-label">Seus alunos</div>
    ${alunosItems}
  </div>
  ${comunicadoModalView()}`;
}

function editarPerfilView(){
  const u = state.currentUser;
  const modalidadeChecks = Object.keys(GRADUACOES).map(m=>`
    <label class="check-item">
      <input type="checkbox" name="editar-modalidade" value="${m}" ${state.editarPerfilModalidades.includes(m) ? 'checked' : ''}>
      <span>${m}</span>
    </label>`).join('');

  return `
  <div class="screen">
    <div class="back-row">
      <button data-action="voltar-editar-perfil">←</button>
      <h2>Editar perfil</h2>
    </div>
    ${state.error ? `<div class="error-msg">${state.error}</div>` : ''}
    <div class="field">
      <label>Nome completo</label>
      <input id="editar-nome" type="text" value="${u.nome}">
    </div>
    <div class="field">
      <label>Data de nascimento</label>
      <input id="editar-nasc" type="date" value="${u.data_nascimento || ''}">
    </div>
    <div class="field">
      <label>Unidade</label>
      <select id="editar-unidade">
        <option value="Anchieta" ${u.unidade==='Anchieta'?'selected':''}>Anchieta</option>
        <option value="Ricardo" ${u.unidade==='Ricardo'?'selected':''}>Ricardo</option>
      </select>
    </div>
    <div class="field">
      <label>Modalidade(s)</label>
      <div class="check-list">${modalidadeChecks}</div>
    </div>
    <div class="empty-note" style="margin-bottom:16px;">Papel, status e graduação só podem ser alterados pelo administrador.</div>
    <button class="btn btn-primary" data-action="salvar-meu-perfil" ${state.loading ? 'disabled' : ''}>
      ${state.loading ? 'Salvando...' : 'Salvar alterações'}
    </button>
  </div>`;
}

/* ---------------- SUPABASE: consultas ---------------- */

async function carregarPainelAdmin(){
  const { data: pend } = await supabaseClient
    .from('profiles').select('*').eq('status', 'pendente');
  const { data: aprov } = await supabaseClient
    .from('profiles').select('*').eq('status', 'aprovado').neq('papel', 'administrador');

  state.pendentes = pend || [];
  state.aprovados = aprov || [];
  render();
}

async function carregarAlunosDoProfessor(){
  const u = state.currentUser;
  const { data } = await supabaseClient
    .from('profiles').select('*')
    .eq('papel', 'aluno').eq('status', 'aprovado')
    .eq('unidade', u.unidade)
    .overlaps('modalidades', u.modalidades || []);
  state.alunosDoProfessor = data || [];
  render();
}

async function carregarCronograma(){
  const { data } = await supabaseClient.from('cronograma').select('*');
  state.cronogramaTodos = data || [];
  render();
}

async function carregarComunicadosAdmin(){
  const { data } = await supabaseClient
    .from('comunicados').select('*').order('criado_em', { ascending: false });
  state.comunicados = data || [];
  render();
}

async function fazerUploadImagem(file){
  const nomeArquivo = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
  const { error } = await supabaseClient.storage.from('comunicados').upload(nomeArquivo, file);
  if(error) throw error;
  const { data } = supabaseClient.storage.from('comunicados').getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

// Busca comunicados relevantes pra unidade do aluno/professor que ainda não foram lidos
async function carregarComunicadosNaoLidos(){
  const u = state.currentUser;
  const { data: todos } = await supabaseClient
    .from('comunicados').select('*').eq('ativo', true).order('criado_em', { ascending: true });
  const { data: lidos } = await supabaseClient
    .from('comunicados_lidos').select('comunicado_id').eq('usuario_id', u.id);

  const lidosSet = new Set((lidos || []).map(l => l.comunicado_id));
  const relevantes = (todos || []).filter(c => !c.unidade || c.unidade === u.unidade);
  state.comunicadosNaoLidos = relevantes.filter(c => !lidosSet.has(c.id));
  state.comunicadoAtual = state.comunicadosNaoLidos[0] || null;
}

// Fica ouvindo novos comunicados em tempo real (enquanto o app está aberto)
function assinarNovosComunicados(){
  const u = state.currentUser;
  supabaseClient
    .channel('comunicados-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comunicados' }, payload => {
      const c = payload.new;
      if(c.ativo && (!c.unidade || c.unidade === u.unidade)){
        state.comunicadosNaoLidos.push(c);
        if(!state.comunicadoAtual) state.comunicadoAtual = c;
        render();
      }
    })
    .subscribe();
}

async function carregarPresencasDoMes(){
  const u = state.currentUser;
  const ano = state.calAno, mes = state.calMes;
  const inicio = `${ano}-${pad2(mes+1)}-01`;
  const fim = `${ano}-${pad2(mes+1)}-${pad2(new Date(ano, mes+1, 0).getDate())}`;

  const { data } = await supabaseClient
    .from('presencas').select('*')
    .eq('aluno_id', u.id)
    .gte('data', inicio).lte('data', fim);

  const mapa = {};
  (data || []).forEach(p => { mapa[p.data] = p; });
  state.presencas = mapa;
  render();
}

async function abrirPessoa(id){
  const pessoa = state.aprovados.find(u=>u.id===id) || state.pendentes.find(u=>u.id===id);
  if(!pessoa) return;

  state.pessoaSelecionada = pessoa;
  state.pessoaEditModalidades = [...(pessoa.modalidades || [])];
  state.pessoaEditGraduacoes = { ...(pessoa.graduacoes || {}) };
  state.pessoaCalAno = new Date().getFullYear();
  state.pessoaCalMes = new Date().getMonth();
  state.pessoaModoEdicao = false;
  state.error = '';

  const { data } = await supabaseClient
    .from('presencas').select('*').eq('aluno_id', id);
  const mapa = {};
  (data || []).forEach(p => { mapa[p.data] = p; });
  state.pessoaPresencas = mapa;

  go('admin-pessoa');
}

// Reverse geocoding gratuito via OpenStreetMap Nominatim.
// Obs: serviço público com limite de uso; para volumes maiores de alunos,
// considere trocar por uma API paga (Google Geocoding, Mapbox etc).
async function buscarEndereco(lat, lon){
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
  const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
  if(!resp.ok) throw new Error('Não foi possível identificar o endereço.');
  const data = await resp.json();
  return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function obterLocalizacao(){
  return new Promise((resolve, reject)=>{
    if(!navigator.geolocation){ reject(new Error('Seu navegador não suporta localização.')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(new Error('Não foi possível acessar o GPS. Verifique se a permissão de localização está ativada.')),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

async function registrarPresenca(){
  const u = state.currentUser;
  const modalidades = u.modalidades || [];
  const seletor = document.getElementById('presenca-modalidade');
  const modalidadeEscolhida = seletor ? seletor.value : (modalidades[0] || null);

  state.presencaStatus = 'buscando';
  state.presencaMsg = '';
  render();

  try{
    const coords = await obterLocalizacao();
    const endereco = await buscarEndereco(coords.latitude, coords.longitude);
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${pad2(hoje.getMonth()+1)}-${pad2(hoje.getDate())}`;

    const { error } = await supabaseClient.from('presencas').insert({
      aluno_id: u.id,
      data: hojeStr,
      latitude: coords.latitude,
      longitude: coords.longitude,
      endereco,
      unidade: u.unidade,
      modalidade: modalidadeEscolhida
    });

    if(error){
      if(error.code === '23505'){
        state.presencaStatus = 'erro';
        state.presencaMsg = 'Você já registrou presença hoje.';
      } else {
        state.presencaStatus = 'erro';
        state.presencaMsg = 'Erro ao salvar presença: ' + error.message;
      }
      return render();
    }

    state.presencaStatus = 'ok';
    state.presencaMsg = endereco;
    await carregarPresencasDoMes();
  } catch(err){
    state.presencaStatus = 'erro';
    state.presencaMsg = err.message;
    render();
  }
}

/* ---------------- ACTIONS ---------------- */
function attachHandlers(){
  const app = document.getElementById('app');

  app.querySelectorAll('[data-action]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      const action = el.dataset.action;
      const id = el.dataset.id || null;
      handleAction(action, id);
    });
  });

  const pw = document.getElementById('s-senha');
  const pw2 = document.getElementById('s-senha2');
  if(pw){
    const updatePw = ()=>{
      const list = document.getElementById('pw-list');
      list.innerHTML = pwChecklist(pw.value).map(r=>`<li class="${r.ok?'ok':''}">${r.label}</li>`).join('');
      updateMatch();
    };
    const updateMatch = ()=>{
      const box = document.getElementById('pw-match');
      if(!pw2.value){ box.textContent=''; return; }
      box.textContent = pw2.value === pw.value ? 'Senhas conferem ✓' : 'As senhas não coincidem';
      box.style.color = pw2.value === pw.value ? 'var(--green)' : '#f2b6bf';
    };
    pw.addEventListener('input', updatePw);
    pw2.addEventListener('input', updateMatch);
    updatePw();
  }

  // Na tela de detalhe do admin: ao marcar/desmarcar uma modalidade,
  // guarda as graduações já escolhidas antes de re-renderizar o formulário
  app.querySelectorAll('input[name="pessoa-modalidade"]').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      document.querySelectorAll('.pessoa-grad-select').forEach(sel=>{
        state.pessoaEditGraduacoes[sel.dataset.modalidade] = sel.value;
      });
      state.pessoaEditModalidades = Array.from(
        document.querySelectorAll('input[name="pessoa-modalidade"]:checked')
      ).map(el=>el.value);
      render();
    });
  });

  // Busca e filtros do painel do admin: atualiza só a lista, sem redesenhar
  // a tela toda (senão o campo de busca perde o foco a cada letra digitada)
  const buscaInput = document.getElementById('admin-busca');
  if(buscaInput){
    buscaInput.addEventListener('input', ()=>{
      state.adminBusca = buscaInput.value;
      atualizarEquipeAprovada();
    });
  }
  const filtroUnidade = document.getElementById('admin-filtro-unidade');
  if(filtroUnidade){
    filtroUnidade.addEventListener('change', ()=>{
      state.adminFiltroUnidade = filtroUnidade.value;
      atualizarEquipeAprovada();
    });
  }
  const filtroModalidade = document.getElementById('admin-filtro-modalidade');
  if(filtroModalidade){
    filtroModalidade.addEventListener('change', ()=>{
      state.adminFiltroModalidade = filtroModalidade.value;
      atualizarEquipeAprovada();
    });
  }
}

async function handleAction(action, id){
  if(action==='go-home') return go('home');
  if(action==='go-login') return go('login');
  if(action==='go-signup') return go('signup');

  if(action==='logout'){
    await supabaseClient.auth.signOut();
    state.currentUser = null;
    return go('home');
  }

  if(action==='do-login'){
    const nome = document.getElementById('in-nome').value.trim();
    const senha = document.getElementById('in-senha').value;
    if(!nome || !senha){ state.error='Preencha nome e senha.'; return render(); }

    state.loading = true; render();
    const email = nomeParaEmail(nome);
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    state.loading = false;

    if(error){ state.error='Nome ou senha incorretos.'; return render(); }

    const { data: perfil, error: perfilError } = await supabaseClient
      .from('profiles').select('*').eq('id', data.user.id).single();

    if(perfilError || !perfil){ state.error='Não foi possível carregar seu perfil.'; return render(); }

    if(perfil.status !== 'aprovado'){
      await supabaseClient.auth.signOut();
      state.error = perfil.status === 'pendente'
        ? 'Seu cadastro ainda está em análise pelo administrador.'
        : 'Seu cadastro não foi aprovado. Fale com a equipe.';
      return render();
    }

    state.currentUser = perfil;
    if(perfil.papel==='administrador'){ await carregarPainelAdmin(); return go('admin'); }
    if(perfil.papel==='professor'){
      await carregarAlunosDoProfessor();
      await carregarComunicadosNaoLidos();
      assinarNovosComunicados();
      return go('teacher');
    }
    await carregarPresencasDoMes();
    await carregarComunicadosNaoLidos();
    await carregarCronograma();
    assinarNovosComunicados();
    return go('student');
  }

  if(action==='do-signup'){
    const nome = document.getElementById('s-nome').value.trim();
    const nasc = document.getElementById('s-nasc').value;
    const senha = document.getElementById('s-senha').value;
    const senha2 = document.getElementById('s-senha2').value;
    const unidade = document.getElementById('s-unidade').value;
    const modalidades = Array.from(document.querySelectorAll('input[name="s-modalidade"]:checked')).map(el=>el.value);
    const papel = document.getElementById('s-papel').value;

    if(!nome || !nasc || !unidade || modalidades.length===0 || !papel){ state.error='Preencha todos os campos e selecione ao menos uma modalidade.'; return render(); }
    if(!pwIsStrong(senha)){ state.error='A senha ainda não atende aos requisitos de senha forte.'; return render(); }
    if(senha !== senha2){ state.error='As senhas não coincidem.'; return render(); }

    state.loading = true; render();
    const email = nomeParaEmail(nome);
    const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
    state.loading = false;

    if(error){
      state.error = error.message.includes('already registered')
        ? 'Já existe um cadastro com esse nome.'
        : 'Não foi possível concluir o cadastro. ' + error.message;
      return render();
    }

    const { error: perfilError } = await supabaseClient.from('profiles').insert({
      id: data.user.id,
      nome, data_nascimento: nasc, unidade, modalidades, papel,
      status: 'pendente'
    });

    if(perfilError){ state.error='Erro ao salvar seu perfil: ' + perfilError.message; return render(); }
    return go('pending');
  }

  if(action==='open-approve'){
    state.modalUserId = id;
    state.modalPessoa = state.pendentes.find(u=>u.id===id) || null;
    return render();
  }
  if(action==='close-modal'){ state.modalUserId=null; state.modalPessoa=null; return render(); }

  if(action==='confirm-approve'){
    const graduacoes = {};
    document.querySelectorAll('.grad-select').forEach(sel=>{
      graduacoes[sel.dataset.modalidade] = sel.value;
    });
    await supabaseClient.from('profiles').update({ status:'aprovado', graduacoes }).eq('id', id);
    state.modalUserId = null; state.modalPessoa = null;
    return carregarPainelAdmin();
  }

  if(action==='reject'){
    await supabaseClient.from('profiles').update({ status:'recusado' }).eq('id', id);
    return carregarPainelAdmin();
  }

  if(action==='cal-prev'){
    state.calMes -= 1;
    if(state.calMes < 0){ state.calMes = 11; state.calAno -= 1; }
    return carregarPresencasDoMes();
  }

  if(action==='cal-next'){
    state.calMes += 1;
    if(state.calMes > 11){ state.calMes = 0; state.calAno += 1; }
    return carregarPresencasDoMes();
  }

  if(action==='registrar-presenca'){
    return registrarPresenca();
  }

  if(action==='ver-dia-cronograma'){
    const dia = parseInt(id, 10);
    state.diaCronogramaSelecionado = state.diaCronogramaSelecionado === dia ? null : dia;
    return render();
  }

  if(action==='fechar-dia-cronograma'){
    state.diaCronogramaSelecionado = null;
    return render();
  }

  if(action==='abrir-pessoa'){
    return abrirPessoa(id);
  }

  if(action==='voltar-admin'){
    state.pessoaSelecionada = null;
    await carregarPainelAdmin();
    return go('admin');
  }

  if(action==='pessoa-cal-prev'){
    state.pessoaCalMes -= 1;
    if(state.pessoaCalMes < 0){ state.pessoaCalMes = 11; state.pessoaCalAno -= 1; }
    return render();
  }

  if(action==='pessoa-cal-next'){
    state.pessoaCalMes += 1;
    if(state.pessoaCalMes > 11){ state.pessoaCalMes = 0; state.pessoaCalAno += 1; }
    return render();
  }

  if(action==='editar-pessoa'){
    state.pessoaModoEdicao = true;
    return render();
  }

  if(action==='cancelar-editar-pessoa'){
    const p = state.pessoaSelecionada;
    state.pessoaEditModalidades = [...(p.modalidades || [])];
    state.pessoaEditGraduacoes = { ...(p.graduacoes || {}) };
    state.pessoaModoEdicao = false;
    state.error = '';
    return render();
  }

  if(action==='salvar-pessoa'){
    const nome = document.getElementById('pessoa-nome').value.trim();
    const nasc = document.getElementById('pessoa-nasc').value;
    const unidade = document.getElementById('pessoa-unidade').value;
    const papel = document.getElementById('pessoa-papel').value;
    const status = document.getElementById('pessoa-status').value;
    const modalidades = Array.from(document.querySelectorAll('input[name="pessoa-modalidade"]:checked')).map(el=>el.value);
    const graduacoes = {};
    document.querySelectorAll('.pessoa-grad-select').forEach(sel=>{
      graduacoes[sel.dataset.modalidade] = sel.value;
    });

    if(!nome || !unidade || modalidades.length===0){ state.error='Preencha nome, unidade e ao menos uma modalidade.'; return render(); }

    const { data: atualizado, error } = await supabaseClient.from('profiles').update({
      nome, data_nascimento: nasc || null, unidade, modalidades, papel, status, graduacoes
    }).eq('id', id).select().single();

    if(error){ state.error = 'Erro ao salvar: ' + error.message; return render(); }

    state.pessoaSelecionada = atualizado;
    state.pessoaEditModalidades = [...(atualizado.modalidades || [])];
    state.pessoaEditGraduacoes = { ...(atualizado.graduacoes || {}) };
    state.pessoaModoEdicao = false;
    state.error = '';
    return render();
  }

  if(action==='go-editar-perfil'){
    state.editarPerfilModalidades = [...(state.currentUser.modalidades || [])];
    return go('editar-perfil');
  }

  if(action==='voltar-editar-perfil'){
    return go(state.currentUser.papel === 'professor' ? 'teacher' : 'student');
  }

  if(action==='salvar-meu-perfil'){
    const nome = document.getElementById('editar-nome').value.trim();
    const nasc = document.getElementById('editar-nasc').value;
    const unidade = document.getElementById('editar-unidade').value;
    const modalidades = Array.from(document.querySelectorAll('input[name="editar-modalidade"]:checked')).map(el=>el.value);

    if(!nome || !unidade || modalidades.length===0){ state.error='Preencha nome, unidade e ao menos uma modalidade.'; return render(); }

    state.loading = true; render();
    const { error } = await supabaseClient.rpc('atualizar_meu_perfil', {
      novo_nome: nome,
      nova_data_nascimento: nasc || null,
      nova_unidade: unidade,
      novas_modalidades: modalidades
    });
    state.loading = false;

    if(error){ state.error = 'Erro ao salvar: ' + error.message; return render(); }

    const { data: perfilAtualizado } = await supabaseClient
      .from('profiles').select('*').eq('id', state.currentUser.id).single();
    state.currentUser = perfilAtualizado;

    return go(state.currentUser.papel === 'professor' ? 'teacher' : 'student');
  }

  if(action==='go-comunicados'){
    await carregarComunicadosAdmin();
    return go('admin-comunicados');
  }

  if(action==='voltar-admin-comunicados'){
    return go('admin');
  }

  if(action==='novo-comunicado'){
    state.comunicadoEditando = null;
    state.error = '';
    return go('comunicado-form');
  }

  if(action==='editar-comunicado'){
    state.comunicadoEditando = state.comunicados.find(c=>c.id===id) || null;
    state.error = '';
    return go('comunicado-form');
  }

  if(action==='excluir-comunicado'){
    await supabaseClient.from('comunicados').delete().eq('id', id);
    return carregarComunicadosAdmin();
  }

  if(action==='salvar-comunicado'){
    const titulo = document.getElementById('com-titulo').value.trim();
    const corpo = document.getElementById('com-corpo').value.trim();
    const unidade = document.getElementById('com-unidade').value || null;
    const fileInput = document.getElementById('com-imagem');

    if(!titulo || !corpo){ state.error = 'Preencha o título e o comunicado.'; return render(); }

    state.loading = true; render();

    let imagem_url = state.comunicadoEditando ? state.comunicadoEditando.imagem_url : null;
    if(fileInput.files[0]){
      try{
        imagem_url = await fazerUploadImagem(fileInput.files[0]);
      } catch(err){
        state.loading = false;
        state.error = 'Erro ao enviar a imagem: ' + err.message;
        return render();
      }
    }

    let error;
    if(state.comunicadoEditando){
      ({ error } = await supabaseClient.from('comunicados')
        .update({ titulo, corpo, unidade, imagem_url })
        .eq('id', state.comunicadoEditando.id));
    } else {
      ({ error } = await supabaseClient.from('comunicados')
        .insert({ titulo, corpo, unidade, imagem_url, criado_por: state.currentUser.id }));
    }

    state.loading = false;
    if(error){ state.error = 'Erro ao publicar: ' + error.message; return render(); }

    state.comunicadoEditando = null;
    await carregarComunicadosAdmin();
    return go('admin-comunicados');
  }

  if(action==='fechar-comunicado'){
    const c = state.comunicadoAtual;
    if(c){
      await supabaseClient.from('comunicados_lidos').insert({ comunicado_id: c.id, usuario_id: state.currentUser.id });
      state.comunicadosNaoLidos = state.comunicadosNaoLidos.filter(x=>x.id!==c.id);
      state.comunicadoAtual = state.comunicadosNaoLidos[0] || null;
    }
    return render();
  }

  if(action==='go-cronograma-admin'){
    await carregarCronograma();
    return go('admin-cronograma');
  }

  if(action==='voltar-admin-cronograma'){
    return go('admin');
  }

  if(action==='tab-cronograma-admin'){
    state.cronogramaTrilhaAdmin = id;
    return render();
  }

  if(action==='novo-cronograma'){
    state.cronogramaEditando = null;
    state.error = '';
    return go('cronograma-form');
  }

  if(action==='editar-cronograma'){
    state.cronogramaEditando = state.cronogramaTodos.find(c=>c.id===id) || null;
    state.error = '';
    return go('cronograma-form');
  }

  if(action==='excluir-cronograma'){
    await supabaseClient.from('cronograma').delete().eq('id', id);
    return carregarCronograma();
  }

  if(action==='salvar-cronograma'){
    const trilha = document.getElementById('cron-trilha').value;
    const dia_semana = parseInt(document.getElementById('cron-dia').value, 10);
    const horario = document.getElementById('cron-horario').value.trim();
    const atividade = document.getElementById('cron-atividade').value.trim();
    const observacao = document.getElementById('cron-obs').value.trim();

    if(!atividade){ state.error = 'Preencha ao menos a atividade.'; return render(); }

    state.loading = true; render();

    let error;
    if(state.cronogramaEditando){
      ({ error } = await supabaseClient.from('cronograma')
        .update({ trilha, dia_semana, horario, atividade, observacao })
        .eq('id', state.cronogramaEditando.id));
    } else {
      ({ error } = await supabaseClient.from('cronograma')
        .insert({ trilha, dia_semana, horario, atividade, observacao }));
    }

    state.loading = false;
    if(error){ state.error = 'Erro ao salvar: ' + error.message; return render(); }

    state.cronogramaTrilhaAdmin = trilha;
    state.cronogramaEditando = null;
    await carregarCronograma();
    return go('admin-cronograma');
  }

  if(action==='go-ver-cronograma'){
    await carregarCronograma();
    return go('ver-cronograma');
  }

  if(action==='voltar-ver-cronograma'){
    return go(state.currentUser.papel === 'professor' ? 'teacher' : 'student');
  }

  if(action==='tab-cronograma-view'){
    state.cronogramaTrilhaView = id;
    return render();
  }
}

/* ---------------- BOOT ---------------- */
// Se já existir uma sessão salva no navegador, tenta reconectar direto no painel certo.
// Envolvido em try/catch para nunca deixar a tela em branco, mesmo se a conexão falhar.
(async function boot(){
  try{
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if(sessionError) throw sessionError;
    if(!session){ render(); return; }

    const { data: perfil, error: perfilError } = await supabaseClient
      .from('profiles').select('*').eq('id', session.user.id).single();
    if(perfilError) throw perfilError;

    if(!perfil || perfil.status !== 'aprovado'){ render(); return; }

    state.currentUser = perfil;
    if(perfil.papel==='administrador'){ await carregarPainelAdmin(); state.screen='admin'; }
    else if(perfil.papel==='professor'){
      await carregarAlunosDoProfessor();
      await carregarComunicadosNaoLidos();
      assinarNovosComunicados();
      state.screen='teacher';
    }
    else {
      await carregarPresencasDoMes();
      await carregarComunicadosNaoLidos();
      await carregarCronograma();
      assinarNovosComunicados();
      state.screen='student';
    }
    render();
  } catch(err){
    console.error('Erro ao iniciar o app:', err);
    state.error = 'Não foi possível conectar ao servidor. Verifique a URL e a chave em supabaseClient.js.';
    state.screen = 'home';
    render();
  }
})();
