// Aplicar estilos dinamicamente
function aplicarEstilos() {
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      padding: 30px;
    }
    
    h1 {
      color: #333;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .filtros {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    input, select {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      font-size: 14px;
    }
    
    button {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    }
    
    button:hover {
      background: #764ba2;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th {
      background: #667eea;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: bold;
    }
    
    td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }
    
    tr:hover {
      background: #f5f5f5;
    }
  `;
  document.head.appendChild(style);
}

// Executar ao carregar
document.addEventListener('DOMContentLoaded', aplicarEstilos);
