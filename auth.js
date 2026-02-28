// SAGE Egypt - Authentication Module
// Supports both direct User login and Service Account (Vercel API)

var tokenClient;

function showLoading(text) {
    document.getElementById('loadingOverlay').classList.remove('hidden');
    document.getElementById('loadingText').textContent = text || 'جاري التحميل...';
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

/**
 * Automate EE initialization using a Token from our Vercel API
 */
async function autoLogin() {
    showLoading('جاري تهيئة الدخول... (Service Account)');
    try {
        const response = await fetch('/api/token');
        const data = await response.json();

        if (data.error) {
            console.warn('API Token fetch failed:', data.error);
            hideLoading();
            // Fallback to manual login if needed
            return;
        }

        console.log('✅ Got Service Account token, initializing EE...');

        ee.data.setAuthToken(
            null,
            'Bearer',
            data.token,
            3600,
            [],
            function () {
                ee.initialize(
                    null,
                    null,
                    function () {
                        hideLoading();
                        onAuthSuccess();
                    },
                    function (err) {
                        hideLoading();
                        console.error('EE init error:', err);
                        alert('خطأ في تهيئة Earth Engine:\n' + err);
                    },
                    null,
                    data.project_id || CONFIG.PROJECT_ID
                );
            },
            false
        );
    } catch (e) {
        console.error('Auto login error:', e);
        hideLoading();
    }
}

function initAuthClient() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.CLIENT_ID,
            scope: CONFIG.SCOPES.join(' '),
            callback: function (response) {
                if (response.error) {
                    hideLoading();
                    console.error('Auth error:', response);
                    return;
                }

                showLoading('جاري تهيئة Earth Engine...');
                ee.data.setAuthToken(null, 'Bearer', response.access_token, 3600, [], null, false);
                ee.initialize(null, null, () => { hideLoading(); onAuthSuccess(); }, (err) => { alert(err); }, null, CONFIG.PROJECT_ID);
            }
        });
    } catch (e) {
        console.warn('GIS Client init skipped (might be using AutoLogin)');
    }
}

function startAuth() {
    showLoading('جاري تسجيل الدخول...');
    // Attempt Auto-Login first
    autoLogin();
}

function onAuthSuccess() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    initMap();
    showWelcome();
}

// Check for auto-login on startup
window.addEventListener('load', function () {
    // Try to auto-login immediately
    setTimeout(autoLogin, 1000);
});
