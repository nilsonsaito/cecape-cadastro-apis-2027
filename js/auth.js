/**
 * Google Authentication Service
 * Integrates with Google Identity Services (GIS), SweetAlert2, and local CONFIG.
 */

const AuthService = (() => {
    let tokenClient;
    let isInitialized = false;

    // Private methods
    const _saveSession = (tokenResponse) => {
        const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
        localStorage.setItem('google_access_token', tokenResponse.access_token);
        localStorage.setItem('google_token_expiry', expiryTime.toString());
    };

    const _clearSession = () => {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expiry');
    };

    const _isTokenExpired = () => {
        const expiry = localStorage.getItem('google_token_expiry');
        if (!expiry) return true;
        // Buffer of 5 minutes to prevent edge cases
        return Date.now() > (parseInt(expiry) - 300000);
    };

    return {
        /**
         * 1. Initialize Google Auth
         */
        init: (onSuccessCallback, onErrorCallback) => {
            if (typeof google === 'undefined') {
                console.error('Google Identity Services script not loaded.');
                return;
            }

            try {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CONFIG.google.clientId,
                    scope: CONFIG.google.scope,
                    callback: (response) => {
                        if (response.error) {
                            if (onErrorCallback) onErrorCallback(response);
                            Swal.fire('Erro', 'Falha na autenticação: ' + response.error, 'error');
                            return;
                        }
                        
                        _saveSession(response);
                        if (onSuccessCallback) onSuccessCallback(response);
                        Swal.fire('Sucesso', 'Login realizado com sucesso!', 'success');
                    },
                    error_callback: (err) => {
                        console.error('GIS Error:', err);
                        if (onErrorCallback) onErrorCallback(err);
                        Swal.fire('Erro', 'Erro ao inicializar Google Auth', 'error');
                    }
                });
                isInitialized = true;
                console.log('Google Auth Initialized');
            } catch (err) {
                console.error('Initialization failed', err);
            }
        },

        /**
         * 2. Login with Google
         */
        login: () => {
            if (!isInitialized) {
                Swal.fire('Erro', 'Serviço de autenticação não inicializado.', 'error');
                return;
            }
            // prompt: '' allows for silent refresh if already authorized
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        },

        /**
         * 3. Check if user is logged in
         */
        isAuthenticated: () => {
            const token = localStorage.getItem('google_access_token');
            return !!token && !_isTokenExpired();
        },

        /**
         * 4. Get Access Token
         */
        getAccessToken: () => {
            return localStorage.getItem('google_access_token');
        },

        /**
         * 5. Logout
         */
        logout: () => {
            const token = localStorage.getItem('google_access_token');
            if (token) {
                google.accounts.oauth2.revoke(token, () => {
                    console.log('Token revoked');
                });
            }
            _clearSession();
            Swal.fire('Sessão Encerrada', 'Você saiu da sua conta Google.', 'info').then(() => {
                window.location.reload();
            });
        },

        /**
         * 6. Auto-renew token
         * Should be called before API requests if token is near expiry
         */
        refreshTokenIfNeeded: async () => {
            if (_isTokenExpired()) {
                console.log('Token expired or near expiry, refreshing...');
                return new Promise((resolve, reject) => {
                    tokenClient.callback = (response) => {
                        if (response.error) {
                            _clearSession();
                            reject(response.error);
                        } else {
                            _saveSession(response);
                            resolve(response.access_token);
                        }
                    };
                    // prompt: '' tries to get token without showing the popup
                    tokenClient.requestAccessToken({ prompt: '' });
                });
            }
            return localStorage.getItem('google_access_token');
        },

        /**
         * 7 & 8. Error handling and Callbacks are integrated into the methods above
         */
    };
})();

// Example usage:
/*
window.onload = () => {
    AuthService.init(
        (res) => console.log('Logged in!', res),
        (err) => console.error('Auth failed', err)
    );
};
*/
