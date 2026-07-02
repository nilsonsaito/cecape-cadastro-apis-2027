/* ============================================================================
 * sheetsService.js
 * Módulo responsável pelas operações com Google Sheets API.
 * Depende de: CONFIG.js (global CONFIG) e auth.js (global AuthService).
 * Dependências externas: SweetAlert2 (Swal).
 * ============================================================================ */

const SheetsService = (function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * Configurações internas
   * -------------------------------------------------------------------------- */
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1000;
  const LOG_PREFIX = '[SheetsService]';

  /* --------------------------------------------------------------------------
   * Utilitários de log
   * -------------------------------------------------------------------------- */
  function log(level, message, data) {
    const timestamp = new Date().toISOString();
    const payload = data !== undefined ? data : null;
    const entry = { timestamp, level, message, data: payload };

    // Log no console com estilo
    const style =
      level === 'error'
        ? 'color:#d32f2f;font-weight:bold;'
        : level === 'warn'
        ? 'color:#f57c00;font-weight:bold;'
        : 'color:#1976d2;font-weight:bold;';

    if (payload) {
      console.log(`%c${LOG_PREFIX} ${level.toUpperCase()}: ${message}`, style, payload);
    } else {
      console.log(`%c${LOG_PREFIX} ${level.toUpperCase()}: ${message}`, style);
    }

    // Mantém histórico em memória (opcional para auditoria)
    if (!SheetsService._logHistory) SheetsService._logHistory = [];
    SheetsService._logHistory.push(entry);
  }

  /* --------------------------------------------------------------------------
   * Helpers de feedback (SweetAlert2)
   * -------------------------------------------------------------------------- */
  function toast(icon, title) {
    if (typeof Swal === 'undefined') {
      log('warn', 'SweetAlert2 não disponível para exibir toast.', { icon, title });
      return;
    }
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: icon,
      title: title,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true
    });
  }

  function alertError(title, text) {
    if (typeof Swal === 'undefined') {
      log('error', title + ' - ' + text);
      return;
    }
    Swal.fire({ icon: 'error', title: title, text: text, confirmButtonColor: '#d32f2f' });
  }

  /* --------------------------------------------------------------------------
   * Helper de sleep para retry
   * -------------------------------------------------------------------------- */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* --------------------------------------------------------------------------
   * Validação de dependências globais
   * -------------------------------------------------------------------------- */
  function validateDependencies() {
    if (typeof CONFIG === 'undefined') {
      throw new Error('CONFIG global não definido. Verifique a importação de CONFIG.js.');
    }
    if (typeof AuthService === 'undefined') {
      throw new Error('AuthService global não definido. Verifique a importação de auth.js.');
    }
    if (!CONFIG.spreadsheets || !CONFIG.spreadsheets.REGISTROS || !CONFIG.spreadsheets.ESCOLAS) {
      throw new Error('CONFIG.spreadsheets.REGISTROS e CONFIG.spreadsheets.ESCOLAS são obrigatórios.');
    }
    if (!CONFIG.columns) {
      throw new Error('CONFIG.columns não definido.');
    }
    if (!CONFIG.api || typeof CONFIG.api.valuesUrl !== 'function') {
      throw new Error('CONFIG.api.valuesUrl() não definido.');
    }
    if (!CONFIG.system || !CONFIG.system.TIMEOUT_API) {
      throw new Error('CONFIG.system.TIMEOUT_API não definido.');
    }
  }

  /* --------------------------------------------------------------------------
   * Monta headers de autenticação
   * -------------------------------------------------------------------------- */
  async function buildHeaders(contentType) {
    const token = await AuthService.getAccessToken();
    const headers = {
      Authorization: 'Bearer ' + token
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  /* --------------------------------------------------------------------------
   * Requisição com timeout e retry
   * -------------------------------------------------------------------------- */
  async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.system.TIMEOUT_API);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function requestWithRetry(method, url, body) {
    validateDependencies();

    let lastError = null;

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        log('info', `Requisição ${method} ${url} (tentativa ${attempt}/${RETRY_ATTEMPTS})`);

        const headers = await buildHeaders(method === 'GET' ? null : 'application/json');
        const options = { method: method, headers: headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetchWithTimeout(url, options);

        if (response.status === 401) {
          log('warn', 'Token expirado/inválido. Tentando renovar...');
          if (AuthService.refreshToken && typeof AuthService.refreshToken === 'function') {
            await AuthService.refreshToken();
          }
          throw new Error('Token expirado. Renovando e tentando novamente.');
        }

        if (response.status === 403) {
          throw new Error('Acesso negado (403). Verifique permissões da planilha.');
        }

        if (response.status === 429) {
          log('warn', 'Rate limit atingido. Aguardando antes de tentar novamente...');
          await sleep(RETRY_DELAY_MS * attempt * 2);
          throw new Error('Rate limit (429).');
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        log('info', 'Requisição concluída com sucesso.', { status: response.status });
        return data;
      } catch (error) {
        lastError = error;
        log('error', `Tentativa ${attempt} falhou: ${error.message}`, { error: error.message });

        if (attempt < RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    log('error', `Falha definitiva após ${RETRY_ATTEMPTS} tentativas.`, { url: url, method: method });
    throw lastError || new Error('Erro desconhecido na requisição.');
  }

  /* --------------------------------------------------------------------------
   * Converte matriz de valores (rows) em array de objetos usando CONFIG.columns
   * -------------------------------------------------------------------------- */
  function rowsToObjects(values, columnsMap) {
    if (!values || values.length === 0) return [];

    const headerRow = values[0];
    const rows = values.slice(1);

    // Mapeia índice da coluna na planilha -> chave canônica do CONFIG.columns
    const indexToKey = {};
    headerRow.forEach((headerName, index) => {
      const trimmed = String(headerName).trim();
      for (const key in columnsMap) {
        if (columnsMap[key] === trimmed) {
          indexToKey[index] = key;
          break;
        }
      }
    });

    return rows.map((row, rowIndex) => {
      const obj = { _rowNumber: rowIndex + 2 }; // +2: header + 1-based
      headerRow.forEach((_, index) => {
        const key = indexToKey[index];
        if (key) {
          obj[key] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
        }
      });
      return obj;
    });
  }

  /* --------------------------------------------------------------------------
   * Converte objeto de registro em array de valores seguindo ordem das colunas
   * -------------------------------------------------------------------------- */
  function objectToRow(recordObj, columnsMap) {
    const orderedKeys = Object.keys(columnsMap);
    return orderedKeys.map((key) => (recordObj[key] !== undefined && recordObj[key] !== null ? recordObj[key] : ''));
  }

  /* --------------------------------------------------------------------------
   * 1. GET - Buscar todos os dados de uma planilha
   * -------------------------------------------------------------------------- */
  async function getSheetData(spreadsheetKey) {
    try {
      validateDependencies();

      const spreadsheetId = CONFIG.spreadsheets[spreadsheetKey];
      if (!spreadsheetId) {
        throw new Error(`Spreadsheet key inválido: ${spreadsheetKey}`);
      }

      const columnsMap = CONFIG.columns[spreadsheetKey] || CONFIG.columns;
      const range = 'A:Z';
      const url = CONFIG.api.valuesUrl(spreadsheetId, range);

      log('info', `Buscando dados da planilha: ${spreadsheetKey}`, { url: url });

      const data = await requestWithRetry('GET', url);
      const objects = rowsToObjects(data.values, columnsMap);

      log('info', `${objects.length} registros encontrados em ${spreadsheetKey}.`);
      return objects;
    } catch (error) {
      log('error', `Erro ao buscar dados de ${spreadsheetKey}: ${error.message}`);
      alertError('Erro ao buscar dados', error.message);
      throw error;
    }
  }

  /* --------------------------------------------------------------------------
   * 2. APPEND - Adicionar novo registro
   * -------------------------------------------------------------------------- */
  async function appendRecord(spreadsheetKey, recordObj) {
    try {
      validateDependencies();

      const spreadsheetId = CONFIG.spreadsheets[spreadsheetKey];
      if (!spreadsheetId) {
        throw new Error(`Spreadsheet key inválido: ${spreadsheetKey}`);
      }

      const columnsMap = CONFIG.columns[spreadsheetKey] || CONFIG.columns;
      const range = 'A:Z';
      const url =
        CONFIG.api.valuesUrl(spreadsheetId, range) +
        '?valueInputOption=RAW&insertDataOption=INSERT_ROWS';

      const rowValues = objectToRow(recordObj, columnsMap);
      const body = { values: [rowValues] };

      log('info', `Adicionando registro em ${spreadsheetKey}.`, { record: recordObj });

      const data = await requestWithRetry('POST', url, body);
      toast('success', 'Registro adicionado com sucesso!');
      log('info', 'Registro adicionado.', { updates: data.updates });
      return data;
    } catch (error) {
      log('error', `Erro ao adicionar registro em ${spreadsheetKey}: ${error.message}`);
      alertError('Erro ao adicionar registro', error.message);
      throw error;
    }
  }

  /* --------------------------------------------------------------------------
   * 3. UPDATE - Atualizar registro existente (por número da linha)
   * -------------------------------------------------------------------------- */
  async function updateRecord(spreadsheetKey, rowNumber, recordObj) {
    try {
      validateDependencies();

      const spreadsheetId = CONFIG.spreadsheets[spreadsheetKey];
      if (!spreadsheetId) {
        throw new Error(`Spreadsheet key inválido: ${spreadsheetKey}`);
      }

      if (!rowNumber || rowNumber < 2) {
        throw new Error('Número da linha inválido para atualização. Deve ser >= 2.');
      }

      const columnsMap = CONFIG.columns[spreadsheetKey] || CONFIG.columns;
      const orderedKeys = Object.keys(columnsMap);
      const lastCol = String.fromCharCode(64 + orderedKeys.length); // A, B, C...
      const range = `A${rowNumber}:${lastCol}${rowNumber}`;
      const url = CONFIG.api.valuesUrl(spreadsheetId, range) + '?valueInputOption=RAW';

      const rowValues = objectToRow(recordObj, columnsMap);
      const body = { values: [rowValues] };

      log('info', `Atualizando linha ${rowNumber} em ${spreadsheetKey}.`, { record: recordObj });

      const data = await requestWithRetry('PUT', url, body);
      toast('success', 'Registro atualizado com sucesso!');
      log('info', 'Registro atualizado.', { updatedCells: data.updatedCells });
      return data;
    } catch (error) {
      log('error', `Erro ao atualizar registro em ${spreadsheetKey}: ${error.message}`);
      alertError('Erro ao atualizar registro', error.message);
      throw error;
    }
  }

  /* --------------------------------------------------------------------------
   * 4. DELETE - Deletar registro (limpa valores da linha)
   * -------------------------------------------------------------------------- */
  async function deleteRecord(spreadsheetKey, rowNumber) {
    try {
      validateDependencies();

      const spreadsheetId = CONFIG.spreadsheets[spreadsheetKey];
      if (!spreadsheetId) {
        throw new Error(`Spreadsheet key inválido: ${spreadsheetKey}`);
      }

      if (!rowNumber || rowNumber < 2) {
        throw new Error('Número da linha inválido para exclusão. Deve ser >= 2.');
      }

      const columnsMap = CONFIG.columns[spreadsheetKey] || CONFIG.columns;
      const orderedKeys = Object.keys(columnsMap);
      const lastCol = String.fromCharCode(64 + orderedKeys.length);
      const range = `A${rowNumber}:${lastCol}${rowNumber}`;
      const url = CONFIG.api.valuesUrl(spreadsheetId, range);

      // Limpa os valores da linha (Google Sheets API não remove a linha física via values endpoint)
      const body = { values: [orderedKeys.map(() => '')] };

      log('info', `Removendo valores da linha ${rowNumber} em ${spreadsheetKey}.`);

      const data = await requestWithRetry('PUT', url, body);
      toast('success', 'Registro removido com sucesso!');
      log('info', 'Registro removido (valores limpos).', { updatedCells: data.updatedCells });
      return data;
    } catch (error) {
      log('error', `Erro ao remover registro em ${spreadsheetKey}: ${error.message}`);
      alertError('Erro ao remover registro', error.message);
      throw error;
    }
  }

  /* --------------------------------------------------------------------------
   * 5. Buscar por e-mail ou matrícula
   * -------------------------------------------------------------------------- */
  async function findByEmailOrMatricula(spreadsheetKey, searchTerm) {
    try {
      validateDependencies();

      const columnsMap = CONFIG.columns[spreadsheetKey] || CONFIG.columns;
      const records = await getSheetData(spreadsheetKey);
      const term = String(searchTerm || '').trim().toLowerCase();

      if (!term) return null;

      const emailKey = columnsMap.EMAIL || 'EMAIL';
      const matriculaKey = columnsMap.MATRICULA || 'MATRICULA';

      const found = records.find((record) => {
        const email = String(record[emailKey] || '').toLowerCase();
        const matricula = String(record[matriculaKey] || '').toLowerCase();
        return email === term || matricula === term;
      });

      if (found) {
        log('info', `Registro encontrado por e-mail/matrícula: ${searchTerm}`, found);
      } else {
        log('info', `Nenhum registro encontrado para: ${searchTerm}`);
      }

      return found || null;
    } catch (error) {
      log('error', `Erro ao buscar por e-mail/matrícula: ${error.message}`);
      throw error;
    }
  }

  /* --------------------------------------------------------------------------
   * 6. Validar duplicatas (e-mail ou matrícula)
   * -------------------------------------------------------------------------- */
  async function checkDuplicate(spreadsheetKey, recordObj, excludeRowNumber) {
    try {
      validateDependencies();

      const columnsMap = CONFIG.columns[spreadsheetKey] || CONFIG.columns;
      const records = await getSheetData(spreadsheetKey);

      const emailKey = columnsMap.EMAIL || 'EMAIL';
      const matriculaKey = columnsMap.MATRICULA || 'MATRICULA';

      const email = String(recordObj[emailKey] || '').trim().toLowerCase();
      const matricula = String(recordObj[matriculaKey] || '').trim().toLowerCase();

      const duplicate = records.find((record) => {
        if (excludeRowNumber && record._rowNumber === excludeRowNumber) return false;

        const recEmail = String(record[emailKey] || '').trim().toLowerCase();
        const recMatricula = String(record[matriculaKey] || '').trim().toLowerCase();

        return (email && recEmail === email) || (matricula && recMatricula === matricula);
      });

      if (duplicate) {
        log('warn', 'Duplicata detectada.', { existing: duplicate, newRecord: recordObj });
      }

      return duplicate || null;
    } catch (error) {
      log('error', `Erro ao validar duplicatas: ${error.message}`);
      throw error;
    }
  }

  /* --------------------------------------------------------------------------
   * Atalhos para planilhas específicas (REGISTROS e ESCOLAS)
   * -------------------------------------------------------------------------- */
  async function getRegistros() {
    return getSheetData('REGISTROS');
  }

  async function getEscolas() {
    return getSheetData('ESCOLAS');
  }

  async function appendRegistro(recordObj) {
    return appendRecord('REGISTROS', recordObj);
  }

  async function appendEscola(recordObj) {
    return appendRecord('ESCOLAS', recordObj);
  }

  async function updateRegistro(rowNumber, recordObj) {
    return updateRecord('REGISTROS', rowNumber, recordObj);
  }

  async function updateEscola(rowNumber, recordObj) {
    return updateRecord('ESCOLAS', rowNumber, recordObj);
  }

  async function deleteRegistro(rowNumber) {
    return deleteRecord('REGISTROS', rowNumber);
  }

  async function deleteEscola(rowNumber) {
    return deleteRecord('ESCOLAS', rowNumber);
  }

  async function findRegistroByEmailOrMatricula(searchTerm) {
    return findByEmailOrMatricula('REGISTROS', searchTerm);
  }

  async function checkDuplicateRegistro(recordObj, excludeRowNumber) {
    return checkDuplicate('REGISTROS', recordObj, excludeRowNumber);
  }

  /* --------------------------------------------------------------------------
   * API pública
   * -------------------------------------------------------------------------- */
  return {
    // Operações genéricas
    getSheetData: getSheetData,
    appendRecord: appendRecord,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    findByEmailOrMatricula: findByEmailOrMatricula,
    checkDuplicate: checkDuplicate,

    // Atalhos REGISTROS
    getRegistros: getRegistros,
    appendRegistro: appendRegistro,
    updateRegistro: updateRegistro,
    deleteRegistro: deleteRegistro,
    findRegistroByEmailOrMatricula: findRegistroByEmailOrMatricula,
    checkDuplicateRegistro: checkDuplicateRegistro,

    // Atalhos ESCOLAS
    getEscolas: getEscolas,
    appendEscola: appendEscola,
    updateEscola: updateEscola,
    deleteEscola: deleteEscola,

    // Utilitários
    getLogHistory: function () {
      return SheetsService._logHistory || [];
    },
    clearLogHistory: function () {
      SheetsService._logHistory = [];
    }
  };
})();

// Exporta para uso em módulos (Node/CommonJS) mantendo compatibilidade com browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SheetsService;
}
