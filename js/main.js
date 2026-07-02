// ============================================================
// MAIN.JS - Lógica Principal do Sistema CECAPE
// ============================================================

// Estado global
let modoAtual = 'VERIFICACAO'; // VERIFICACAO ou FORMULARIO
let registroEncontrado = null;
let linhaEncontrada = null;
let isRequesting = false;

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Sistema CECAPE iniciando...');
  
  // Inicializar autenticação
  await GoogleAuth.initGoogleAuth();
  
  // Verificar se já tem token
  const temToken = await GoogleAuth.verificarTokenExistente();
  
  if (temToken) {
    console.log('✅ Token encontrado, carregando dados...');
    await carregarDadosIniciais();
    mostrarPagina('formulario');
  } else {
    console.log('❌ Sem token, mostrando login...');
    mostrarPagina('verificacao');
  }
});

// ============================================================
// NAVEGAÇÃO ENTRE PÁGINAS
// ============================================================

function mostrarPagina(pagina) {
  const verificacao = document.getElementById('pagina-verificacao');
  const formulario = document.getElementById('pagina-formulario');
  
  if (pagina === 'verificacao') {
    verificacao.style.display = 'block';
    formulario.style.display = 'none';
    modoAtual = 'VERIFICACAO';
  } else {
    verificacao.style.display = 'none';
    formulario.style.display = 'block';
    modoAtual = 'FORMULARIO';
  }
}

function voltarParaVerificacao() {
  limparFormulario();
  registroEncontrado = null;
  linhaEncontrada = null;
  mostrarPagina('verificacao');
}

// ============================================================
// PÁGINA 1: VERIFICAÇÃO
// ============================================================

async function verificarRegistro() {
  if (isRequesting) {
    console.warn('⚠️ Requisição já em andamento...');
    return;
  }

  const tipoVerificacao = document.getElementById('tipo-verificacao').value;
  const valor = document.getElementById('valor-verificacao').value.trim();

  // Validar entrada
  if (!valor) {
    Swal.fire({
      icon: 'warning',
      title: 'Campo vazio',
      text: 'Digite um e-mail ou matrícula para verificar.'
    });
    return;
  }

  // Validar formato
  if (tipoVerificacao === 'email') {
    if (!validarEmail(valor)) {
      Swal.fire({
        icon: 'error',
        title: 'E-mail inválido',
        text: 'Use um e-mail @scseduca.com.br válido.'
      });
      return;
    }
    
    if (valor.toLowerCase().includes('eme.') || 
        valor.toLowerCase().includes('emef.') ||
        valor.toLowerCase().includes('emei.') ||
        valor.toLowerCase().includes('emi.')) {
      Swal.fire({
        icon: 'error',
        title: 'E-mail de escola não permitido',
        text: 'Use seu e-mail pessoal institucional, não o da escola.'
      });
      return;
    }
  } else {
    if (!validarMatricula(valor)) {
      Swal.fire({
        icon: 'error',
        title: 'Matrícula inválida',
        text: 'Digite 5 dígitos (ex: 12345).'
      });
      return;
    }
  }

  // Mostrar loading
  isRequesting = true;
  Swal.fire({
    title: 'Verificando...',
    html: 'Buscando registro na planilha...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    // Buscar na planilha
    const registros = await SheetsService.buscarRegistros();
    
    // Procurar registro
    let encontrado = null;
    
    if (tipoVerificacao === 'email') {
      encontrado = registros.find(r => 
        normalizarEmail(r['E-MAIL']) === normalizarEmail(valor)
      );
    } else {
      const matriculaDigitada = valor.replace('-', '').substring(0, 5);
      encontrado = registros.find(r => {
        const matriculaRegistro = (r['MATRÍCULA'] || '').replace('-', '').substring(0, 5);
        return matriculaRegistro === matriculaDigitada;
      });
    }

    // Fechar loading
    Swal.close();
    isRequesting = false;

    if (encontrado) {
      // Registro encontrado - modo ATUALIZAÇÃO
      console.log('✅ Registro encontrado:', encontrado);
      registroEncontrado = encontrado;
      
      Swal.fire({
        icon: 'info',
        title: 'Registro encontrado!',
        text: `Você pode atualizar os dados de ${encontrado.NOME}.`,
        confirmButtonText: 'Continuar'
      }).then(() => {
        abrirFormularioEdicao(encontrado);
      });
    } else {
      // Registro não encontrado - modo NOVO
      console.log('ℹ️ Registro não encontrado, modo NOVO');
      registroEncontrado = null;
      
      Swal.fire({
        icon: 'success',
        title: 'Novo cadastro',
        text: 'Vamos criar um novo registro.',
        confirmButtonText: 'Continuar'
      }).then(() => {
        abrirFormularioNovo(tipoVerificacao, valor);
      });
    }
  } catch (erro) {
    console.error('❌ Erro ao verificar:', erro);
    Swal.close();
    isRequesting = false;
    
    Swal.fire({
      icon: 'error',
      title: 'Erro na verificação',
      text: erro.message || 'Não foi possível verificar o registro.'
    });
  }
}

// ============================================================
// PÁGINA 2: FORMULÁRIO - MODO NOVO
// ============================================================

function abrirFormularioNovo(tipoVerificacao, valor) {
  console.log('📝 Abrindo formulário NOVO');
  
  // Limpar formulário
  limparFormulario();
  
  // Preencher campo de verificação
  if (tipoVerificacao === 'email') {
    document.getElementById('email').value = valor;
    document.getElementById('email').disabled = false;
  } else {
    document.getElementById('matricula').value = valor;
    document.getElementById('matricula').disabled = false;
  }
  
  // Habilitar campos
  document.getElementById('email').disabled = false;
  document.getElementById('matricula').disabled = false;
  
  // Atualizar título e botão
  document.getElementById('form-titulo').textContent = '➕ Novo Cadastro';
  document.getElementById('btn-salvar').textContent = 'Criar Cadastro';
  document.getElementById('btn-salvar').onclick = () => salvarRegistro('novo');
  
  // Mostrar formulário
  mostrarPagina('formulario');
}

// ============================================================
// PÁGINA 2: FORMULÁRIO - MODO EDIÇÃO
// ============================================================

function abrirFormularioEdicao(registro) {
  console.log('✏️ Abrindo formulário EDIÇÃO');
  
  // Limpar formulário
  limparFormulario();
  
  // Preencher com dados existentes
  document.getElementById('nome').value = registro.NOME || '';
  document.getElementById('email').value = registro['E-MAIL'] || '';
  document.getElementById('matricula').value = registro.MATRÍCULA || '';
  document.getElementById('telefone').value = registro.TELEFONE || '';
  document.getElementById('escola').value = registro.ESCOLA || '';
  document.getElementById('periodo').value = registro['PERÍODO DE TRABALHO'] || '';
  document.getElementById('entrada').value = registro['HORÁRIO DE ENTRADA'] || '';
  document.getElementById('saida-intervalo').value = registro['SAÍDA (INTERVALO)'] || '';
  document.getElementById('volta-intervalo').value = registro['ENTRADA (VOLTA DO INTERVALO)'] || '';
  document.getElementById('saida').value = registro.SAÍDA || '';
  
  // Desabilitar campos de identificação
  document.getElementById('email').disabled = true;
  document.getElementById('matricula').disabled = true;
  
  // Atualizar título e botão
  document.getElementById('form-titulo').textContent = '✏️ Atualizar Cadastro';
  document.getElementById('btn-salvar').textContent = 'Atualizar Cadastro';
  document.getElementById('btn-salvar').onclick = () => salvarRegistro('atualizar');
  
  // Mostrar formulário
  mostrarPagina('formulario');
}

// ============================================================
// SALVAR REGISTRO
// ============================================================

async function salvarRegistro(tipo) {
  console.log(`💾 Salvando registro (${tipo})...`);
  
  // Validar campos
  if (!validarFormulario()) {
    return;
  }

  // Coletar dados
  const dados = {
    NOME: document.getElementById('nome').value.trim(),
    'E-MAIL': document.getElementById('email').value.trim(),
    MATRÍCULA: document.getElementById('matricula').value.trim(),
    TELEFONE: document.getElementById('telefone').value.trim(),
    ESCOLA: document.getElementById('escola').value,
    'PERÍODO DE TRABALHO': document.getElementById('periodo').value,
    'HORÁRIO DE ENTRADA': document.getElementById('entrada').value.trim(),
    'SAÍDA (INTERVALO)': document.getElementById('saida-intervalo').value.trim(),
    'ENTRADA (VOLTA DO INTERVALO)': document.getElementById('volta-intervalo').value.trim(),
    SAÍDA: document.getElementById('saida').value.trim()
  };

  // Confirmar com SweetAlert
  const resultado = await Swal.fire({
    icon: 'question',
    title: tipo === 'novo' ? 'Criar cadastro?' : 'Atualizar cadastro?',
    html: `<strong>${dados.NOME}</strong><br>Matrícula: ${dados.MATRÍCULA}`,
    showCancelButton: true,
    confirmButtonText: tipo === 'novo' ? 'Criar' : 'Atualizar',
    cancelButtonText: 'Cancelar'
  });

  if (!resultado.isConfirmed) {
    console.log('❌ Operação cancelada pelo usuário');
    return;
  }

  // Mostrar loading
  Swal.fire({
    title: 'Salvando...',
    html: 'Enviando dados para a planilha...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    if (tipo === 'novo') {
      // Verificar duplicata antes de criar
      const registros = await SheetsService.buscarRegistros();
      const emailExiste = registros.some(r => 
        normalizarEmail(r['E-MAIL']) === normalizarEmail(dados['E-MAIL'])
      );
      const matriculaExiste = registros.some(r => {
        const matriculaRegistro = (r['MATRÍCULA'] || '').replace('-', '').substring(0, 5);
        const matriculaDigitada = dados.MATRÍCULA.replace('-', '').substring(0, 5);
        return matriculaRegistro === matriculaDigitada;
      });

      if (emailExiste || matriculaExiste) {
        Swal.close();
        Swal.fire({
          icon: 'warning',
          title: 'Registro duplicado',
          text: 'Este e-mail ou matrícula já foi cadastrado. Você será redirecionado para atualizar.',
          confirmButtonText: 'OK'
        }).then(() => {
          const registroExistente = registros.find(r => 
            normalizarEmail(r['E-MAIL']) === normalizarEmail(dados['E-MAIL']) ||
            (r['MATRÍCULA'] || '').replace('-', '').substring(0, 5) === dados.MATRÍCULA.replace('-', '').substring(0, 5)
          );
          abrirFormularioEdicao(registroExistente);
        });
        return;
      }

      // Criar novo
      await SheetsService.adicionarRegistro(dados);
      
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Cadastro criado!',
        text: `${dados.NOME} foi cadastrado com sucesso.`,
        confirmButtonText: 'OK'
      }).then(() => {
        voltarParaVerificacao();
      });
    } else {
      // Atualizar existente
      await SheetsService.atualizarRegistro(registroEncontrado, dados);
      
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Cadastro atualizado!',
        text: `${dados.NOME} foi atualizado com sucesso.`,
        confirmButtonText: 'OK'
      }).then(() => {
        voltarParaVerificacao();
      });
    }
  } catch (erro) {
    console.error('❌ Erro ao salvar:', erro);
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Erro ao salvar',
      text: erro.message || 'Não foi possível salvar o registro.'
    });
  }
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function limparFormulario() {
  document.getElementById('nome').value = '';
  document.getElementById('email').value = '';
  document.getElementById('matricula').value = '';
  document.getElementById('telefone').value = '';
  document.getElementById('escola').value = '';
  document.getElementById('periodo').value = '';
  document.getElementById('entrada').value = '';
  document.getElementById('saida-intervalo').value = '';
  document.getElementById('volta-intervalo').value = '';
  document.getElementById('saida').value = '';
}

function validarFormulario() {
  const nome = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const matricula = document.getElementById('matricula').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const escola = document.getElementById('escola').value;
  const periodo = document.getElementById('periodo').value;
  const entrada = document.getElementById('entrada').value.trim();
  const saidaIntervalo = document.getElementById('saida-intervalo').value.trim();
  const voltaIntervalo = document.getElementById('volta-intervalo').value.trim();
  const saida = document.getElementById('saida').value.trim();

  if (!nome) {
    Swal.fire('Erro', 'Nome é obrigatório', 'error');
    return false;
  }
  if (!email || !validarEmail(email)) {
    Swal.fire('Erro', 'E-mail inválido', 'error');
    return false;
  }
  if (!matricula || !validarMatricula(matricula)) {
    Swal.fire('Erro', 'Matrícula inválida', 'error');
    return false;
  }
  if (!telefone || !validarTelefone(telefone)) {
    Swal.fire('Erro', 'Telefone inválido', 'error');
    return false;
  }
  if (!escola) {
    Swal.fire('Erro', 'Escola é obrigatória', 'error');
    return false;
  }
  if (!periodo) {
    Swal.fire('Erro', 'Período é obrigatório', 'error');
    return false;
  }
  if (!entrada || !validarHorario(entrada)) {
    Swal.fire('Erro', 'Horário de entrada inválido', 'error');
    return false;
  }
  if (!saidaIntervalo || !validarHorario(saidaIntervalo)) {
    Swal.fire('Erro', 'Saída (intervalo) inválida', 'error');
    return false;
  }
  if (!voltaIntervalo || !validarHorario(voltaIntervalo)) {
    Swal.fire('Erro', 'Volta do intervalo inválida', 'error');
    return false;
  }
  if (!saida || !validarHorario(saida))
