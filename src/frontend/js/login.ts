export function getLoginJs(): string {
  return `// login.js - Login + Initial setup logic

const THEME_KEY = 'vps-status-theme';
const LIGHT_THEME = 'light';
const DARK_THEME = 'dark';

const authState = {
    setupRequired: false
};

function initializeTheme() {
    const themeToggler = document.getElementById('themeToggler');
    if (!themeToggler) return;

    const storedTheme = localStorage.getItem(THEME_KEY) || LIGHT_THEME;
    applyTheme(storedTheme);

    themeToggler.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    const themeTogglerIcon = document.querySelector('#themeToggler i');
    if (!themeTogglerIcon) return;

    if (theme === DARK_THEME) {
        themeTogglerIcon.classList.remove('bi-moon-stars-fill');
        themeTogglerIcon.classList.add('bi-sun-fill');
    } else {
        themeTogglerIcon.classList.remove('bi-sun-fill');
        themeTogglerIcon.classList.add('bi-moon-stars-fill');
    }
}

function setInlineAlert(message, type = 'danger') {
    const loginAlert = document.getElementById('loginAlert');
    if (!loginAlert) return;

    loginAlert.className = 'alert alert-' + type;
    loginAlert.textContent = message;
    loginAlert.classList.remove('d-none');
}

function clearInlineAlert() {
    const loginAlert = document.getElementById('loginAlert');
    if (!loginAlert) return;
    loginAlert.classList.add('d-none');
    loginAlert.textContent = '';
}

function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const typeClassMap = {
        success: 'text-bg-success',
        danger: 'text-bg-danger',
        warning: 'text-bg-warning',
        info: 'text-bg-info'
    };

    const toast = document.createElement('div');
    toast.className = 'toast align-items-center border-0 show ' + (typeClassMap[type] || 'text-bg-secondary');
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
        '<div class="d-flex">' +
            '<div class="toast-body">' + message + '</div>' +
            '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>' +
        '</div>';

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3200);
}

function updateAuthModeUI(setupRequired) {
    authState.setupRequired = setupRequired;

    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const chip = document.getElementById('authModeChip');
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const confirmPassword = document.getElementById('confirmPassword');
    const submitButton = document.getElementById('submitButton');
    const credentialsInfo = document.getElementById('defaultCredentialsInfo');
    const passwordInput = document.getElementById('password');

    if (!title || !subtitle || !chip || !confirmGroup || !submitButton || !credentialsInfo || !passwordInput) return;

    if (setupRequired) {
        title.textContent = 'Initial Admin Setup';
        subtitle.textContent = 'No admin account found. Create the first administrator account.';
        chip.innerHTML = '<i class="bi bi-person-plus"></i>initial-setup';
        confirmGroup.classList.remove('d-none');
        if (confirmPassword) confirmPassword.required = true;
        submitButton.textContent = 'Create Admin';
        passwordInput.setAttribute('autocomplete', 'new-password');
        credentialsInfo.textContent = 'First-time setup mode: create your own admin username and password.';
    } else {
        title.textContent = 'Control Panel Login';
        subtitle.textContent = 'Use admin credentials to access server and website management.';
        chip.innerHTML = '<i class="bi bi-shield-lock"></i>admin-auth';
        confirmGroup.classList.add('d-none');
        if (confirmPassword) {
            confirmPassword.required = false;
            confirmPassword.value = '';
        }
        submitButton.textContent = 'Sign In';
        passwordInput.setAttribute('autocomplete', 'current-password');
        credentialsInfo.textContent = 'Use your configured admin account to sign in.';
    }
}

async function fetchSetupRequired() {
    try {
        const response = await fetch('/api/auth/setup-required', { method: 'GET' });
        if (!response.ok) return false;
        const data = await response.json();
        return !!data.setupRequired;
    } catch {
        return false;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: getAuthHeaders(),
        ...options
    };

    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.message || ('Request failed (' + response.status + ')');
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return await response.json();
}

async function checkLoginStatus() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const data = await apiRequest('/api/auth/status');
        if (data.setupRequired) {
            localStorage.removeItem('auth_token');
            updateAuthModeUI(true);
            return;
        }

        if (data.authenticated) {
            window.location.href = 'admin.html';
        }
    } catch {
        localStorage.removeItem('auth_token');
    }
}

async function setupAdmin(username, password, confirmPassword) {
    if (!username || !password || !confirmPassword) {
        setInlineAlert('Please fill in all fields.');
        return;
    }

    if (password !== confirmPassword) {
        setInlineAlert('Passwords do not match.');
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitButton');
    const originalBtnText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';

    try {
        const response = await fetch('/api/auth/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                confirm_password: confirmPassword
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 409) {
                updateAuthModeUI(false);
                setInlineAlert('Admin is already initialized. Please log in.', 'warning');
                showToast('info', 'Setup was already completed. Switched to login mode.');
                return;
            }

            throw new Error(errorData.message || ('Setup failed (' + response.status + ')'));
        }

        const data = await response.json();
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
        }

        showToast('success', 'Admin account created successfully. Redirecting...');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 400);
    } catch (error) {
        setInlineAlert(error.message || 'Setup failed. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText || 'Create Admin';
    }
}

async function login(username, password) {
    if (!username || !password) {
        setInlineAlert('Please enter username and password.');
        return;
    }

    const submitBtn = document.getElementById('submitButton');
    const originalBtnText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 428) {
                updateAuthModeUI(true);
                setInlineAlert('No admin account exists yet. Please complete initial setup.', 'warning');
                return;
            }

            throw new Error(errorData.message || ('Login failed (' + response.status + ')'));
        }

        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        window.location.href = 'admin.html';
    } catch (error) {
        setInlineAlert(error.message || 'Login request failed. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText || 'Sign In';
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    initializeTheme();

    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    clearInlineAlert();

    const setupRequired = await fetchSetupRequired();
    updateAuthModeUI(setupRequired);

    if (!setupRequired) {
        await checkLoginStatus();
    } else {
        localStorage.removeItem('auth_token');
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearInlineAlert();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';

        if (authState.setupRequired) {
            await setupAdmin(username, password, confirmPassword);
        } else {
            await login(username, password);
        }
    });
});
`;
}
