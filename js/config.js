/**
 * CECAPE - Arquivo de Configuração Central
 * Contém todos os IDs, URLs e constantes do sistema.
 * Pode ser importado em outros arquivos via ES Modules.
 */

const CONFIG = {
  // ============================================================
  // 1. CONFIGURAÇÕES DE AUTENTICAÇÃO GOOGLE
  // ============================================================
  google: {
    clientId: '367248828417-n4l55p0dloon7uf71erubrmfouegq16u.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly',
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    apiKey: '', // Preencher com a API Key do projeto Google Cloud
    redirectUri: window.location.origin + window.location.pathname,
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  },

  // ============================================================
  // 2. IDs DAS PLANILHAS (SPREADSHEETS)
  // ============================================================
  spreadsheets: {
    REGISTROS: '1B6xRr_WDCTkWEfsaeiEPdgDILuDwaQd1oZQEsQdF6GA',
    ESCOLAS: '1VBbvfrZPQZ96e7hzpUnFG_GPfjA3I-mLKI-RgoP8OlA',
  },

  // ============================================================
  // 3. NOMES EXATOS DAS COLUNAS
  // ============================================================
  columns: {
    REGISTROS: {
      DATA: 'DATA',
      HORA: 'HORA',
      NOME: 'NOME',
      CPF: 'CPF',
      TELEFONE: 'TELEFONE',
      EMAIL: 'EMAIL',
      ESCOLA: 'ESCOLA',
      TURMA: 'TURMA',
      TIPO_REGISTRO: 'TIPO DE REGISTRO',
      DESCRICAO: 'DESCRIÇÃO',
      STATUS: 'STATUS',
      RESPONSÁVEL: 'RESPONSÁVEL',
      OBSERVACOES: 'OBSERVAÇÕES',
    },
    ESCOLAS: {
      ID: 'ID',
      NOME: 'NOME',
      ENDEREÇO: 'ENDEREÇO',
      BAIRRO: 'BAIRRO',
      CIDADE: 'CIDADE',
      ESTADO: 'ESTADO',
      CEP: 'CEP',
      TELEFONE: 'TELEFONE',
      EMAIL: 'EMAIL',
      DIRETOR: 'DIRETOR',
      TURMAS: 'TURMAS',
      ALUNOS: 'ALUNOS',
      STATUS: 'STATUS',
    },
  },

  // ============================================================
  // 4. URLs DE API
  // ============================================================
  api: {
    sheetsBase: 'https://sheets.googleapis.com/v4/spreadsheets',
    driveBase: 'https://www.googleapis.com/drive/v3',
    oauthBase: 'https://oauth2.googleapis.com',
    userInfo: 'https://www.googleapis.com/oauth2/v3/userinfo',
    // Monta a URL completa para leitura/escrita de uma planilha
    spreadsheetUrl: function (spreadsheetId) {
      return `${this.sheetsBase}/${spreadsheetId}`;
    },
    valuesUrl: function (spreadsheetId, range) {
      return `${this.sheetsBase}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    },
    batchUpdateUrl: function (spreadsheetId) {
      return `${this.sheetsBase}/${spreadsheetId}/values:batchUpdate`;
    },
  },

  // ============================================================
  // 5. CONSTANTES DO SISTEMA
  // ============================================================
  system: {
    NOME: 'CECAPE',
    VERSAO: '1.0.0',
    AMBIENTE: 'producao',
    TIMEZONE: 'America/Sao_Paulo',
    LOCALE: 'pt-BR',
    MOEDA: 'BRL',
    TIMEOUT_API: 30000, // 30 segundos
    TENTATIVAS_API: 3,
    ITENS_POR_PAGINA: 50,
    ABAS: {
      REGISTROS: 'REGISTROS',
      ESCOLAS: 'ESCOLAS',
    },
    STATUS_REGISTRO: {
      PENDENTE: 'PENDENTE',
      EM_ANDAMENTO: 'EM ANDAMENTO',
      CONCLUIDO: 'CONCLUÍDO',
      CANCELADO: 'CANCELADO',
    },
    TIPOS_REGISTRO: {
      ENTRADA: 'ENTRADA',
      SAIDA: 'SAÍDA',
      ATUALIZACAO: 'ATUALIZAÇÃO',
      CONSULTA: 'CONSULTA',
    },
  },
};

export default CONFIG;
