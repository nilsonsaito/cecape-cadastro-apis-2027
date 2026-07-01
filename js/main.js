// Função para buscar dados da planilha
async function buscarDados() {
  const apiKey = 'SUA_CHAVE_API_AQUI';
  const spreadsheetId = 'SEU_ID_PLANILHA_AQUI';
  const range = 'Sheet1!A:J';
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return [];
  }
}

// Função para processar dados
function processarDados(dados) {
  if (!dados || dados.length === 0) return [];
  
  const headers = dados[0];
  return dados.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = row[index] || '';
    });
    return obj;
  });
}

// Função para exibir dados na tabela
function exibirTabela(dados) {
  const tbody = document.querySelector('#tabela-dados tbody');
  tbody.innerHTML = '';
  
  dados.forEach(registro => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${registro.NOME || ''}</td>
      <td>${registro['E-MAIL'] || ''}</td>
      <td>${registro.MATRÍCULA || ''}</td>
      <td>${registro.TELEFONE || ''}</td>
      <td>${registro.ESCOLA || ''}</td>
      <td>${registro['PERÍODO DE TRABALHO'] || ''}</td>
      <td>${registro['HORÁRIO DE ENTRADA'] || ''}</td>
      <td>${registro['SAÍDA (INTERVALO)'] || ''}</td>
      <td>${registro['ENTRADA (VOLTA DO INTERVALO)'] || ''}</td>
      <td>${registro.SAÍDA || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Função principal
async function inicializar() {
  const dados = await buscarDados();
  const processados = processarDados(dados);
  exibirTabela(processados);
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', inicializar);
