import { CONFIG } from './CONFIG.js';
import * as auth from './auth.js';

/**
 * Faz uma requisição autenticada à Google Sheets API
 */
async function apiRequest(spreadsheetId, range, method = 'GET', body = null) {
  const token = await auth.getToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const params = method === 'GET' ? '' : '?valueInputOption=RAW' + (method === 'POST' ? '&insertDataOption=INSERT_ROWS' : '');
  const fullUrl = url + params;

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(fullUrl, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ${response.status}: ${errorText}`);
  }
  return response.json();
}

/**
 * Obtém dados brutos (matriz de valores) de uma planilha
 */
async function getRawData(spreadsheetId, sheetName = '') {
  const range = sheetName ? `'${sheetName}'!A:Z` : 'A:Z';
  const data = await apiRequest(spreadsheetId, range);
  return data.values || [];
}

/**
 * Converte matriz de valores em array de objetos usando mapeamento de colunas
 */
function valuesToObjects(values, columnMap) {
  if (!values || values.length === 0) return [];
  const headers = values[0];
  const rows = values.slice(1);
  const colIndexMap = {};
  headers.forEach((h, idx) => {
    const key = Object.keys(columnMap).find(k => columnMap[k] === h.trim());
    if (key) colIndexMap[idx] = key;
  });
  return rows.map(row => {
    const obj = {};
    Object.entries(colIndexMap).forEach(([colIdx, key]) => {
      obj[key] = (row[colIdx] || '').toString().trim();
    });
    return obj;
  });
}

/**
 * Converte objeto em array de valores na ordem das colunas
 */
function objectToRow(recordObj, columnMap) {
  const orderedKeys = Object.keys(columnMap);
  return orderedKeys.map(key => (recordObj[key] !== undefined ? recordObj[key] : ''));
}

/**
 * Busca todos os registros da planilha REGISTROS
 */
export async function buscarRegistros() {
  const values = await getRawData(CONFIG.spreadsheets.REGISTROS);
  return valuesToObjects(values, CONFIG.columns.REGISTROS);
}

/**
 * Busca todas as escolas da planilha ESCOLAS
 */
export async function buscarEscolas() {
  const values = await getRawData(CONFIG.spreadsheets.ESCOLAS);
  return valuesToObjects(values, CONFIG.columns.ESCOLAS);
}

/**
 * Busca registro por e-mail (case insensitive)
 */
export async function buscarPorEmail(email) {
  const registros = await buscarRegistros();
  const target = (email || '').toLowerCase().trim();
  return registros.find(r => (r.email || '').toLowerCase().trim() === target) || null;
}

/**
 * Busca registro por matrícula (compara os 5 primeiros dígitos)
 */
export async function buscarPorMatricula(matricula) {
  const registros = await buscarRegistros();
  const targetDigits = (matricula || '').replace(/\D/g, '').slice(0, 5);
  return registros.find(r => {
    const regDigits = (r.matricula || '').replace(/\D/g, '').slice(0, 5);
    return regDigits === targetDigits;
  }) || null;
}

/**
 * Adiciona um novo registro na planilha REGISTROS
 */
export async function adicionarRegistro(dados) {
  const spreadsheetId = CONFIG.spreadsheets.REGISTROS;
  const columnMap = CONFIG.columns.REGISTROS;
  const values = [objectToRow(dados, columnMap)];
  const range = 'A:Z';
  return apiRequest(spreadsheetId, range, 'POST', { values });
}

/**
 * Atualiza um registro existente na linha especificada (1‑based)
 */
export async function atualizarRegistro(linha, dados) {
  const spreadsheetId = CONFIG.spreadsheets.REGISTROS;
  const columnMap = CONFIG.columns.REGISTROS;
  const colCount = Object.keys(columnMap).length;
  const lastCol = String.fromCharCode(64 + colCount); // A, B, C...
  const range = `A${linha}:${lastCol}${linha}`;
  const values = [objectToRow(dados, columnMap)];
  return apiRequest(spreadsheetId, range, 'PUT', { values });
}
