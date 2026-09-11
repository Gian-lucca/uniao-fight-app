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
  modalPessoa: null
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
    case 'student': return studentView();
    case 'teacher': return teacherView();
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
  const modalidadeOptions = Object.keys(GRADUACOES).map(m=>`<option value="${m}">${m}</option>`).join('');
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
      <label>Modalidade</label>
      <select id="s-modalidade">
        <option value="">Selecione</option>
        ${modalidadeOptions}
      </select>
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

function adminView(){
  const pend = state.pendentes;
  const approved = state.aprovados;

  const pendItems = pend.length ? pend.map(u=>`
    <div class="req-item">
      <div class="rn">${u.nome}</div>
      <div class="rm">${u.papel === 'aluno' ? 'Aluno' : 'Professor'} · ${u.modalidade} · Unidade ${u.unidade}</div>
      <div class="req-actions">
        <button class="btn-approve" data-action="open-approve" data-id="${u.id}">Aprovar</button>
        <button class="btn-reject" data-action="reject" data-id="${u.id}">Recusar</button>
      </div>
    </div>`).join('') : `<div class="empty-note">Nenhuma solicitação pendente.</div>`;

  const approvedItems = approved.length ? approved.map(u=>`
    <div class="stud-row">
      <div>${u.nome}<div class="sm">${u.papel === 'aluno' ? 'Aluno' : 'Professor'} · ${u.modalidade} · ${u.unidade}</div></div>
      <div class="sm">${u.graduacao || '—'}</div>
    </div>`).join('') : `<div class="empty-note">Ninguém aprovado ainda.</div>`;

  return `
  <div class="screen">
    <div class="top-bar">
      <h2>Painel do Admin</h2>
      <button data-action="logout">Sair</button>
    </div>
    <div class="section-label">Solicitações pendentes (${pend.length})</div>
    ${pendItems}
    <div class="section-label">Equipe aprovada</div>
    ${approvedItems}
  </div>
  ${modalView()}`;
}

function modalView(){
  if(!state.modalUserId || !state.modalPessoa) return '';
  const u = state.modalPessoa;
  const opts = (GRADUACOES[u.modalidade] || []).map(g=>`<option value="${g}">${g}</option>`).join('');
  return `
  <div class="modal-overlay">
    <div class="modal-box">
      <h3>Definir graduação</h3>
      <p>${u.nome} · ${u.modalidade}</p>
      <div class="field">
        <label>Graduação</label>
        <select id="grad-select">${opts}</select>
      </div>
      <div class="modal-actions">
        <button class="btn-reject" data-action="close-modal">Cancelar</button>
        <button class="btn-approve" data-action="confirm-approve" data-id="${u.id}">Confirmar</button>
      </div>
    </div>
  </div>`;
}

function studentView(){
  const u = state.currentUser;
  return `
  <div class="screen">
    <div class="top-bar">
      <h2>Meu acesso</h2>
      <button data-action="logout">Sair</button>
    </div>
    <div class="profile-card">
      <div class="profile-name">${u.nome}</div>
      <div class="profile-meta">
        Aluno · Unidade ${u.unidade}<br>
        Modalidade: ${u.modalidade}
      </div>
      <div class="grad-tag">${u.graduacao || 'Graduação a definir'}</div>
    </div>
    <div class="empty-note">Em breve: treinos, avisos da equipe e histórico de graduação aparecerão aqui.</div>
  </div>`;
}

function teacherView(){
  const u = state.currentUser;
  const alunos = state.alunosDoProfessor;
  const alunosItems = alunos.length ? alunos.map(a=>`
    <div class="stud-row">
      <div>${a.nome}</div>
      <div class="sm">${a.graduacao || '—'}</div>
    </div>`).join('') : `<div class="empty-note">Nenhum aluno nesta modalidade/unidade ainda.</div>`;

  return `
  <div class="screen">
    <div class="top-bar">
      <h2>Painel do Professor</h2>
      <button data-action="logout">Sair</button>
    </div>
    <div class="profile-card">
      <div class="profile-name">${u.nome}</div>
      <div class="profile-meta">Professor · ${u.modalidade} · Unidade ${u.unidade}</div>
    </div>
    <div class="section-label">Seus alunos</div>
    ${alunosItems}
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
    .eq('unidade', u.unidade).eq('modalidade', u.modalidade);
  state.alunosDoProfessor = data || [];
  render();
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
    if(perfil.papel==='professor'){ await carregarAlunosDoProfessor(); return go('teacher'); }
    return go('student');
  }

  if(action==='do-signup'){
    const nome = document.getElementById('s-nome').value.trim();
    const nasc = document.getElementById('s-nasc').value;
    const senha = document.getElementById('s-senha').value;
    const senha2 = document.getElementById('s-senha2').value;
    const unidade = document.getElementById('s-unidade').value;
    const modalidade = document.getElementById('s-modalidade').value;
    const papel = document.getElementById('s-papel').value;

    if(!nome || !nasc || !unidade || !modalidade || !papel){ state.error='Preencha todos os campos.'; return render(); }
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
      nome, data_nascimento: nasc, unidade, modalidade, papel,
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
    const grad = document.getElementById('grad-select').value;
    await supabaseClient.from('profiles').update({ status:'aprovado', graduacao: grad }).eq('id', id);
    state.modalUserId = null; state.modalPessoa = null;
    return carregarPainelAdmin();
  }

  if(action==='reject'){
    await supabaseClient.from('profiles').update({ status:'recusado' }).eq('id', id);
    return carregarPainelAdmin();
  }
}

/* ---------------- BOOT ---------------- */
// Se já existir uma sessão salva no navegador, tenta reconectar direto no painel certo
(async function boot(){
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(!session){ render(); return; }

  const { data: perfil } = await supabaseClient
    .from('profiles').select('*').eq('id', session.user.id).single();

  if(!perfil || perfil.status !== 'aprovado'){ render(); return; }

  state.currentUser = perfil;
  if(perfil.papel==='administrador'){ await carregarPainelAdmin(); state.screen='admin'; }
  else if(perfil.papel==='professor'){ await carregarAlunosDoProfessor(); state.screen='teacher'; }
  else { state.screen='student'; }
  render();
})();
