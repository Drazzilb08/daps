// --- Utilities ---

let isDirty = false;

export function humanize(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function showToast(message, type = 'info', timeout = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 300);
    });
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 500);
    }, timeout);
}

export function markDirty() {
    isDirty = true;
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.disabled = false;
}

export function resetDirty() {
    isDirty = false;
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.disabled = true;
}

export function getIsDirty() {
    return isDirty;
}

export function setupPasswordToggles(scope = document) {
    scope.querySelectorAll('.toggle-password').forEach(btn => {
        btn.onclick = () => {
            const inputId = btn.getAttribute('data-input');
            const input = scope.querySelector(`#${inputId}`);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                input.classList.remove('masked-input');
                btn.innerHTML = '<i class="material-icons">visibility_off</i>';
            } else {
                input.type = 'password';
                input.classList.add('masked-input');
                btn.innerHTML = '<i class="material-icons">visibility</i>';
            }
        };
        // On initial load, ensure eye icon matches input type
        const inputId = btn.getAttribute('data-input');
        const input = scope.querySelector(`#${inputId}`);
        if (input && input.type === 'password') {
            btn.innerHTML = '<i class="material-icons">visibility</i>';
        } else {
            btn.innerHTML = '<i class="material-icons">visibility_off</i>';
        }
    });
}

export function getIcon(type)
{
    if (type === 'radarr') {
            return `<img src="/web/static/icons/radarr.svg" alt="Radarr logo" />`;
    }
    if (type === 'sonarr') {
        return `<img src="/web/static/icons/sonarr.svg" alt="Sonarr logo" />`;
    }
    if (type === 'plex') {
        return `<img src="/web/static/icons/plex.svg" alt="Plex logo" />`;
    }
}