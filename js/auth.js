let tokenClient = null;
let accessToken = null;
let tokenExpiry = null;
let signedIn = false;

const STORAGE_KEY = 'google_auth_token';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function saveToken(token, expiresIn) {
  accessToken = token;
  tokenExpiry = Date.now() + expiresIn * 1000;
  signedIn = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    token: token,
    expiry: tokenExpiry
  }));
}

function clearToken() {
  accessToken = null;
  tokenExpiry = null;
  signedIn = false;
  localStorage.removeItem(STORAGE_KEY);
}

function tokenIsValid() {
  return accessToken && Date.now() < tokenExpiry;
}

function loadTokenFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);
    if (data.token && data.expiry && Date.now() < data.expiry) {
      accessToken = data.token;
      tokenExpiry = data.expiry;
      signedIn = true;
      return true;
    }
    // Token expirado – vamos limpar e tentar refresh silencioso mais tarde
    clearToken();
    return false;
  } catch (_) {
    clearToken();
    return false;
  }
}

/**
 * Envolve a chamada requestAccessToken em uma Promise.
 * O callback será sobrescrito temporariamente.
 */
function requestAccessToken(options = {}) {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      return reject(new Error('TokenClient não inicializado. Chame init() primeiro.'));
    }

    // Guarda o callback original e substitui
    const originalCallback = tokenClient.callback;
    tokenClient.callback = (response) => {
      // Restaura o callback original (caso seja necessário)
      tokenClient.callback = originalCallback;

      if (response.error !== undefined) {
        reject(response);
      } else {
        saveToken(response.access_token, response.expires_in);
        resolve(response);
      }
    };

    // Dispara a requisição
    tokenClient.requestAccessToken(options);
  });
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Inicializa o módulo de autenticação.
 * @param {object} config - Objeto com ao menos clientId e opcionalmente scope.
 */
export async function init(config) {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    throw new Error('A biblioteca Google Identity Services não está disponível. Inclua https://accounts.google.com/gsi/client no HTML.');
  }

  if (!config || !config.clientId) {
    throw new Error('Configuração inválida: clientId é obrigatório.');
  }

  const clientId = config.clientId;
  const scope = config.scope || DEFAULT_SCOPE;

  // Inicializa o TokenClient (implicit flow)
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: scope,
    callback: (response) => {
      // callback default vazio – será sobrescrito em cada requisição
      if (response.error) {
        console.error('[auth] Erro na autenticação:', response.error);
      }
    }
  });

  // Tenta restaurar token existente
  if (loadTokenFromStorage()) {
    console.log('[auth] Token recuperado do localStorage.');
    // Verifica se ainda é válido (possível que tenha expirado entre a verificação e agora)
    if (!tokenIsValid()) {
      // Tenta renovar silenciosamente
      try {
        await requestAccessToken({ prompt: '' });
        console.log('[auth] Token renovado silenciosamente.');
      } catch (err) {
        console.warn('[auth] Renovação silenciosa falhou. Usuário deverá autenticar-se manualmente.');
        clearToken();
      }
    }
  } else {
    // Nenhum token salvo – tenta obter um silenciosamente (sem popup)
    try {
      await requestAccessToken({ prompt: '' });
      console.log('[auth] Token obtido silenciosamente (usuário já consentiu anteriormente).');
    } catch (err) {
      console.info('[auth] Nenhum token obtido silenciosamente. Status: não autenticado.');
      clearToken();
    }
  }
}

/**
 * Inicia o fluxo de login visível (popup).
 * Força o popup de consentimento/configuração.
 */
export async function login() {
  try {
    // prompt omitido ou null → mostrar popup quando necessário
    await requestAccessToken({});
    console.log('[auth] Login realizado com sucesso.');
    return true;
  } catch (err) {
    console.error('[auth] Falha no login:', err);
    clearToken();
    throw err;
  }
}

/**
 * Retorna true se o usuário está autenticado com um token válido.
 */
export function isAuthenticated() {
  return tokenIsValid();
}

/**
 * Retorna o token de acesso atual.
 * Se o token estiver expirado, tenta renová-lo silenciosamente.
 * @returns {string} accessToken
 * @throws Se não for possível obter um token válido.
 */
export async function getToken() {
  if (tokenIsValid()) {
    return accessToken;
  }

  // Token expirado ou ausente – tenta refresh silencioso
  try {
    await requestAccessToken({ prompt: '' });
    console.log('[auth] Token renovado silenciosamente.');
    return accessToken;
  } catch (err) {
    console.error('[auth] Falha ao renovar token silenciosamente.');
    clearToken();
    throw new Error('Não foi possível obter um token válido. Faça login novamente.');
  }
}

/**
 * Realiza o logout: revoga o token e limpa o estado.
 */
export async function logout() {
  if (accessToken && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
    // Revoga o token no Google (assíncrono, não bloqueante)
    google.accounts.oauth2.revoke(accessToken, () => {
      console.log('[auth] Token revogado.');
    });
  }

  clearToken();
  console.log('[auth] Logout efetuado.');
}

/**
 * Tenta renovar o token silenciosamente.
 * Útil quando o token está próximo de expirar.
 * @returns {string} novo token
 * @throws Se a renovação falhar.
 */
export async function refreshToken() {
  try {
    await requestAccessToken({ prompt: '' });
    console.log('[auth] Token renovado silenciosamente.');
    return accessToken;
  } catch (err) {
    console.error('[auth] Falha ao renovar token silenciosamente.');
    clearToken();
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Aliases para compatibilidade com código existente (opcionais)
// -----------------------------------------------------------------------------

export const initAuth = init;
export const signIn = login;
export const signOut = logout;
export const isSignedIn = isAuthenticated;
