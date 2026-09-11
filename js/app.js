/* ---------------- DATA ---------------- */
const GRADUACOES = {
  'Boxe': ['Iniciante','Intermediário','Avançado','Competidor'],
  'Muay Thai': ['Grau Branco','Grau Branco Ponta Vermelha','Grau Vermelho','Grau Vermelho Ponta Azul Claro','Grau Azul Claro','Grau Azul Claro Ponta Azul Escuro','Grau Azul Escuro','Grau Azul Escuro Ponta Preta','Grau Preto'],
  'Kickboxing': ['Faixa Branca','Faixa Amarela','Faixa Laranja','Faixa Verde','Faixa Azul','Faixa Marrom','Faixa Preta'],
  'Jiu-Jitsu': ['Faixa Branca','Faixa Azul','Faixa Roxa','Faixa Marrom','Faixa Preta']
};

let nextId = 2;
const state = {
  screen: 'home',
  currentUser: null,
  error: '',
  modalUserId: null,
  users: [
    { id:1, nome:'Admin', senha:'admin123', papel:'administrador', status:'aprovado', unidade:null, modalidade:null, graduacao:null }
  ]
};

/* ---------------- HELPERS ---------------- */
function pwChecklist(pw){
  const rules = [
    { ok: pw.length>=8, label:'Mínimo de 8 caracteres' },
    { ok: /[A-Z]/.test(pw), label:'Uma letra maiúscula' },
    { ok: /[a-z]/.test(pw), label:'Uma letra minúscula' },
    { ok: /[0-9]/.test(pw), label:'Um número' },
    { ok: /[^A-Za-z0-9]/.test(pw), label:'Um caractere especial' },
  ];
  return rules;
}
function pwIsStrong(pw){ return pwChecklist(pw).every(r=>r.ok); }

function pendingUsers(){ return state.users.filter(u=>u.status==='pendente'); }

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
    <button class="btn btn-primary" data-action="do-login" style="margin-top:6px;">Entrar</button>
    <div style="text-align:center; margin-top:16px;">
      <button class="link-btn" data-action="go-signup">Primeiro acesso? Cadastre-se</button>
    </div>
    <div style="margin-top:auto; padding-top:24px; font-size:11px; color:var(--muted);">
      Teste como administrador: nome <b>Admin</b>, senha <b>admin123</b>.
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
    <button class="btn btn-primary" data-action="do-signup" style="margin-top:6px;">Concluir cadastro</button>
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
  const pend = pendingUsers();
  const approved = state.users.filter(u=>u.status==='aprovado' && u.papel!=='administrador');

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
  if(!state.modalUserId) return '';
  const u = state.users.find(x=>x.id===state.modalUserId);
  if(!u) return '';
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
  const alunos = state.users.filter(a=>a.papel==='aluno' && a.status==='aprovado' && a.unidade===u.unidade && a.modalidade===u.modalidade);
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

/* ---------------- ACTIONS ---------------- */
function attachHandlers(){
  const app = document.getElementById('app');

  app.querySelectorAll('[data-action]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      const action = el.dataset.action;
      const id = el.dataset.id ? Number(el.dataset.id) : null;
      handleAction(action, id);
    });
  });

  // live password strength + match, only inside signup
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

function handleAction(action, id){
  if(action==='go-home') return go('home');
  if(action==='go-login') return go('login');
  if(action==='go-signup') return go('signup');
  if(action==='logout'){ state.currentUser=null; return go('home'); }

  if(action==='do-login'){
    const nome = document.getElementById('in-nome').value.trim();
    const senha = document.getElementById('in-senha').value;
    const user = state.users.find(u=>u.nome.toLowerCase()===nome.toLowerCase() && u.senha===senha);
    if(!user){ state.error='Nome ou senha incorretos.'; return render(); }
    if(user.status==='pendente'){ state.error='Seu cadastro ainda está em análise pelo administrador.'; return render(); }
    state.currentUser = user;
    if(user.papel==='administrador') return go('admin');
    if(user.papel==='professor') return go('teacher');
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
    if(state.users.some(u=>u.nome.toLowerCase()===nome.toLowerCase())){ state.error='Já existe um cadastro com esse nome.'; return render(); }

    state.users.push({
      id: nextId++, nome, dataNascimento: nasc, senha, unidade, modalidade, papel,
      status:'pendente', graduacao:null
    });
    return go('pending');
  }

  if(action==='open-approve'){ state.modalUserId=id; return render(); }
  if(action==='close-modal'){ state.modalUserId=null; return render(); }

  if(action==='confirm-approve'){
    const u = state.users.find(x=>x.id===id);
    const grad = document.getElementById('grad-select').value;
    u.status='aprovado';
    u.graduacao=grad;
    state.modalUserId=null;
    return render();
  }

  if(action==='reject'){
    state.users = state.users.filter(u=>u.id!==id);
    return render();
  }
}

render();
