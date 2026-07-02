// ============================================================
// STYLES.JS - Estilos do Sistema CECAPE
// ============================================================

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
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 1.8em;
      margin-bottom: 10px;
    }

    .header p {
      opacity: 0.9;
      font-size: 0.95em;
    }

    .content {
      padding: 30px;
    }

    .pagina {
      display: none;
    }

    .pagina.ativa {
      display: block;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
      font-size: 0.95em;
    }

    input, select {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 1em;
      transition: border-color 0.3s;
      font-family: inherit;
    }

    input:focus, select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    input:disabled {
      background: #f5f5f5;
      color: #999;
      cursor: not-allowed;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .row .form-group {
      margin-bottom: 0;
    }

    .hint {
      font-size: 0.8em;
      color: #888;
      margin-top: 4px;
      font-weight: normal;
    }

    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
      border: 2px solid #ddd;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    .btn-group .btn {
      flex: 1;
      margin-top: 0;
    }

    .status {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: none;
      font-size: 0.95em;
    }

    .status.show {
      display: block;
    }

    .status.info {
      background: #e7f3fe;
      color: #1e3c72;
      border-left: 4px solid #667eea;
    }

    .status.success {
      background: #e7f9e7;
      color: #1e7a1e;
      border-left: 4px solid #27ae60;
    }

    .status.error {
      background: #fdecea;
      color: #c0392b;
      border-left: 4px solid #e74c3c;
    }

    .status.warning {
      background: #fff8e1;
      color: #b8860b;
      border-left: 4px solid #f1c40f;
    }

    .user-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0f4ff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .user-info span {
      font-weight: 600;
      color: #667eea;
    }

    .btn-logout {
      background: none;
      border: none;
      color: #e74c3c;
      cursor: pointer;
      font-weight: 600;
      padding: 0;
      margin: 0;
    }

    .btn-logout:hover {
      text-decoration: underline;
    }

    .form-titulo {
      font-size: 1.5em;
      font-weight: 600;
      color: #333;
      margin-bottom: 20px;
      text-align: center;
    }

    .spinner {
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }

      .header {
        padding: 20px;
      }

      .header h1 {
        font-size: 1.4em;
      }

      .content {
        padding: 20px;
      }

      .row {
        grid-template-columns: 1fr;
      }

      .btn {
        padding: 12px;
        font-size: 0.95em;
      }
    }
  `;
  document.head.appendChild(style);
}

// Executar ao carregar
document.addEventListener('DOMContentLoaded', aplicarEstilos);
