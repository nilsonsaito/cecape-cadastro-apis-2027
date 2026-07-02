import { CONFIG } from './CONFIG.js';
import * as Auth from './auth.js';
import * as Sheets from './sheetsService.js';

/* ============================================================
   ELEMENTS
   ============================================================ */
const pageVerify = document.getElementById('pageVerify');
const pageForm = document.getElementById('pageForm');
const btnSignIn = document.getElementById('btnSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const btnVerify = document.getElementById('btnVerify');
const verifyInput = document.getElementById('verifyInput');
const verifyError = document.getElementById('verifyError');
const btnBack = document.getElementById('btnBack');
const cadForm = document.getElementById('cadForm');
const btnSave = document.getElementById('btnSave');
const modeBanner = document.getElementById('modeBanner');
const modeBadge = document.getElementById('modeBadge');

// Campos do formulário
const fldNome = document.getElementById('fldNome');
const fldMatricula = document.getElementById('fldMatricula');
const fldEmail = document.getElementById('fldEmail');
const fldTelefone = document.getElementById('fldTelefone');
const fldEscola = document.getElementById('fldEscola');
const fldFuncao = document.getElementById('fldFuncao');
const fldObs = document.getElementById('fldObs');
const fldRowIndex = document.getElementById('fldRowIndex');

/* ============================================================
   STATE
   ============================================================ */
let currentMode = 'new'; // 'new' or 'update'
let currentRecord = null;
let escolasCache = [];

/* ============================================================
   VALIDATION REGEX & BLOCKED DOMAINS
   ============================================================ */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MATRICULA_REGEX = /^[A-Za-z0-9]{3,20}$/;
const PHONE_REGEX = /^\(\d{2}\)\s\d{5}-\d{4}$/;

const BLOCKED_DOMAINS = [
  'escola.gov.br',
  'educacao.gov.br',
  'seed.pr.gov.br',
  'escolas.pr.gov.br',
  'pm.pr.gov.br',
  '.gov.br'
];

/* ============================================================
   HELPERS
   ============================================================ */
function isSchoolEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return BLOCKED_DOMAINS.some(d => domain.endsWith(d));
}

function showError(field, errEl, msg) {
  if (field) field.classList.add('invalid');
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.add('show');
  }
}

function clearError(field, errEl) {
  if (field) field.classList.remove('invalid');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.remove('show');
  }
}

function clearAllErrors() {
  const errorFields = ['errNome','errMatricula','errEmail','errTelefone','errEscola','errFuncao'];
  errorFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  });
  [fldNome, fldMatricula, fldEmail, fldTelefone, fldEscola, fldFuncao].forEach(el => el?.classList.remove('invalid'));
}

function validateForm() {
  clearAllErrors();
  let valid = true;

  const nome = fldNome.value.trim();
  const matricula = fldMatricula.value.trim();
  const email = fldEmail.value.trim();
  const telefone = fldTelefone.value.trim();
  const escola = fldEscola.value;
  const funcao = fldFuncao.value;

  if (nome.length < 3) {
    showError(fldNome, document.getElementById('errNome'), 'Mínimo 3 caracteres.');
    valid = false;
  }
  if (!MATRICULA_REGEX.test(matricula)) {
    showError(fldMatricula, document.getElementById('errMatricula'), 'Matrícula inválida (3 a 20 alfanuméricos).');
    valid = false;
  }
  if (!EMAIL_REGEX.test(email)) {
    showError(fldEmail, document.getElementById('errEmail'), 'E-mail inválido.');
    valid = false;
  } else if (isSchoolEmail(email)) {
    showError(fldEmail, document.getElementById('errEmail'), 'E-mails de escola não são permitidos.');
    valid = false;
  }
  if (!PHONE_REGEX.test(telefone)) {
    showError(fldTelefone, document.getElementById('errTelefone'), 'Telefone inválido (formato: (99) 99999-9999).');
    valid = false;
  }
  if (!escola) {
    showError(fldEscola, document.getElementById('errEscola'), 'Selecione a escola.');
    valid = false;
  }
  if (!funcao) {
    showError(fldFuncao, document.getElementById('errFuncao'), 'Selecione a função.');
    valid = false;
  }
  return valid;
}

/* ============================================================
   INPUT MASKS
   ============================================================ */
function applyPhoneMask(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  if (value.length > 0) {
    value = value.replace(/^(\d{2})(\d)/, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
  }
  e.target.value = value;
}

function applyMatriculaRestriction(e) {
  let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
  if (value.length > 20) value = value.slice(0, 20);
  e.target.value = value.toUpperCase();
}

/* ============================================================
   AUTH UI
   ============================================================ */
function updateAuthUI(signedIn) {
  if (signedIn) {
    statusDot.classList.add('ok');
    statusText.textContent = 'Autenticado';
    btnSignIn.classList.add('hidden');
    btnSignOut.classList.remove('hidden');
  } else {
    statusDot.classList.remove('ok');
    statusText.textContent = 'Não autenticado';
    btnSignIn.classList.remove('hidden');
    btnSignOut.classList.add('hidden');
  }
}

/* ============================================================
   ESCOLAS DROPDOWN
   ============================================================ */
async function loadEscolas() {
  try {
    const escolas = await Sheets.getEscolas();
    escolasCache = escolas || [];
    fldEscola.innerHTML = '<option value="">Selecione...</option>';
    escolasCache.forEach(esc => {
      const nome = esc.NOME || '';
      if (nome) {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        fldEscola.appendChild(opt);
      }
    });
  } catch (e) {
    console.error('Erro ao carregar escolas:', e);
    Swal.fire({ icon: 'warning', title: 'Aviso', text: 'Não foi possível carregar escolas.' });
  }
}

/* ============================================================
   PAGE NAVIGATION
   ============================================================ */
function showPage(page) {
  if (page === 'verify') {
    pageVerify.classList.remove('hidden');
    pageForm.classList.add('hidden');
  } else {
    pageVerify.classList.add('hidden');
    pageForm.classList.remove('hidden');
  }
}

/* ============================================================
   VERIFY RECORD (PAGE 1)
   ============================================================ */
async function verificarRegistro() {
  verifyError.classList.remove('show');
  const value = verifyInput.value.trim();

  if (!value) {
    verifyError.textContent = 'Informe e-mail ou matrícula.';
    verifyError.classList.add('show');
    return;
  }

  const isEmail = value.includes('@');
  if (isEmail) {
    if (!EMAIL_REGEX.test(value)) {
      verifyError.textContent = 'E-mail inválido.';
      verifyError.classList.add('show');
      return;
    }
    if (isSchoolEmail(value)) {
      verifyError.textContent = 'E-mails de escola não são permitidos.';
      verifyError.classList.add('show');
      Swal.fire({ icon: 'warning', title: 'Aviso', text: 'Use seu e-mail pessoal.' });
      return;
    }
  } else {
    if (!MATRICULA_REGEX.test(value)) {
      verifyError.textContent = 'Matrícula inválida (3 a 20 alfanuméricos).';
      verifyError.classList.add('show');
      return;
    }
  }

  if (!Auth.isSignedIn()) {
    Swal.fire({ icon: 'info', title: 'Login necessário', text: 'Clique em "Entrar com Google" para continuar.' });
    return;
  }

  btnVerify.disabled = true;
  btnVerify.innerHTML = '<span class="loader"></span> Verificando...';

  try {
    const registros = await Sheets.getRegistros();
    const found = registros.find(r => {
      const emailReg = (r.EMAIL || '').toLowerCase();
      const matReg = (r.MATRICULA || '').toLowerCase();
      return emailReg === value.toLowerCase() || matReg === value.toLowerCase();
    });

    if (found) {
      currentMode = 'update';
      currentRecord = found;
      await openForm('update', found);
    } else {
      currentMode = 'new';
      currentRecord = null;
      await openForm('new', null, value);
    }
  } catch (err) {
    console.error('Erro na verificação:', err);
    Swal.fire({ icon: 'error', title: 'Erro', text: 'Falha ao consultar registros.' });
  } finally {
    btnVerify.disabled = false;
    btnVerify.innerText = 'Verificar';
  }
}

/* ============================================================
   OPEN FORM (PAGE 2)
   ============================================================ */
async function openForm(mode, record, prefillValue = '') {
  clearAllErrors();
  cadForm.reset();

  if (mode === 'update') {
    document.getElementById('formTitle').textContent = 'Atualizar Cadastro';
    document.getElementById('formSubtitle').textContent = 'Atualize os dados abaixo.';
    modeBanner.className = 'mode-banner update';
    modeBadge.className = 'badge badge-update';
    modeBadge.textContent = 'ATUALIZAÇÃO';

    fldRowIndex.value = record._rowNumber || '';
    fldNome.value = record.NOME || '';
    fldMatricula.value = record.MATRICULA || '';
    fldEmail.value = record.EMAIL || '';
    fldTelefone.value = record.TELEFONE || '';
    fldEscola.value = record.ESCOLA || '';
    fldFuncao.value = record.FUNCAO || '';
    fldObs.value = record.OBS || '';
  } else {
    document.getElementById('formTitle').textContent = 'Novo Cadastro';
    document.getElementById('formSubtitle').textContent = 'Preencha os campos abaixo.';
    modeBanner.className = 'mode-banner new';
    modeBadge.className = 'badge badge-new';
    modeBadge.textContent = 'NOVO CADASTRO';

    fldRowIndex.value = '';
    if (prefillValue.includes('@')) {
      fldEmail.value = prefillValue;
    } else if (prefillValue) {
      fldMatricula.value = prefillValue;
    }
  }

  showPage('form');
}

/* ============================================================
   SALVAR REGISTRO (FORM SUBMIT)
   ============================================================ */
async function salvarRegistro(e) {
  e.preventDefault();

  if (!validateForm()) {
    Swal.fire({ icon: 'error', title: 'Formulário inválido', text: 'Corrija os campos destacados.' });
    return;
  }

  if (!Auth.isSignedIn()) {
    Swal.fire({ icon: 'info', title: 'Autenticação necessária', text: 'Faça login para salvar.' });
    return;
  }

  const payload = {
    NOME: fldNome.value.trim(),
    MATRICULA: fldMatricula.value.trim(),
    EMAIL: fldEmail.value.trim(),
    TELEFONE: fldTelefone.value.trim(),
    ESCOLA: fldEscola.value,
    FUNCAO: fldFuncao.value,
    OBS: fldObs.value.trim(),
    ATUALIZADO_EM: new Date().toISOString()
  };

  const confirmText = currentMode === 'update'
    ? 'Deseja atualizar este cadastro?'
    : 'Deseja criar este novo cadastro?';

  const confirmRes = await Swal.fire({
    icon: 'question',
    title: 'Confirmação',
    text: confirmText,
    showCancelButton: true,
    confirmButtonText: 'Sim, salvar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#16a34a'
  });

  if (!confirmRes.isConfirmed) return;

  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="loader"></span> Salvando...';

  try {
    if (currentMode === 'update') {
      const rowNumber = parseInt(fldRowIndex.value, 10);
      await Sheets.updateRegistro(rowNumber, payload);
    } else {
      // Verificar duplicata antes de criar (opcional, sheetsService já faz? Decidimos verificar aqui mesmo)
      const duplicata = await Sheets.checkDuplicateRegistro({ EMAIL: payload.EMAIL, MATRICULA: payload.MATRICULA });
      if (duplicata) {
        Swal.fire({
          icon: 'warning',
          title: 'Registro existente',
          text: 'Este e-mail ou matrícula já está cadastrado.',
          confirmButtonText: 'Ir para edição'
        }).then(() => {
          currentMode = 'update';
          currentRecord = duplicata;
          openForm('update', duplicata);
        });
        btnSave.disabled = false;
        btnSave.innerText = 'Salvar';
        return;
      }
      await Sheets.appendRegistro(payload);
    }

    await Swal.fire({
      icon: 'success',
      title: 'Sucesso!',
      text: currentMode === 'update' ? 'Cadastro atualizado!' : 'Cadastro realizado!',
      timer: 2000,
      showConfirmButton: false
    });

    cadForm.reset();
    currentRecord = null;
    showPage('verify');
    verifyInput.value = '';
  } catch (err) {
    console.error('Erro ao salvar:', err);
    Swal.fire({ icon: 'error', title: 'Erro ao salvar', text: err.message });
  } finally {
    btnSave.disabled = false;
    btnSave.innerText = 'Salvar';
  }
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
async function init() {
  try {
    await Auth.initAuth(CONFIG);
    const signed = Auth.isSignedIn();
    updateAuthUI(signed);
    if (signed) {
      await loadEscolas();
    }
    // Exibe a página de verificação como padrão
    showPage('verify');
  } catch (e) {
    console.error('Falha na inicialização:', e);
  }

  // Bind mask events
  fldTelefone.addEventListener('input', applyPhoneMask);
  fldMatricula.addEventListener('input', applyMatriculaRestriction);

  // Limpar erros ao digitar nos campos
  const fields = [fldNome, fldMatricula, fldEmail, fldTelefone, fldEscola, fldFuncao];
  fields.forEach(field => {
    if (!field) return;
    field.addEventListener('input', () => {
      const errId = 'err' + field.id.replace('fld', '');
      clearError(field, document.getElementById(errId));
    });
  });

  verifyInput.addEventListener('input', () => {
    verifyError.classList.remove('show');
    verifyError.textContent = '';
  });

  // Botão voltar
  btnBack.addEventListener('click', () => {
    cadForm.reset();
    clearAllErrors();
    currentRecord = null;
    showPage('verify');
  });

  // Login / Logout
  btnSignIn.addEventListener('click', async () => {
    try {
      await Auth.signIn();
      updateAuthUI(true);
      await loadEscolas();
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Falha na autenticação', text: e.message });
    }
  });

  btnSignOut.addEventListener('click', async () => {
    try {
      await Auth.signOut();
      updateAuthUI(false);
    } catch (e) {
      console.error('Erro ao sair:', e);
    }
  });

  // Verificar registro
  btnVerify.addEventListener('click', verificarRegistro);

  // Salvar formulário
  cadForm.addEventListener('submit', salvarRegistro);
}

// Aguarda DOM pronto e inicia
document.addEventListener('DOMContentLoaded', init);
