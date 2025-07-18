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
    const saveBtn = document.getElementById('saveBtnFixed') || document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.classList.add('dirty');
        saveBtn.classList.remove('saved');
        saveBtn.disabled = false;
        saveBtn.title = 'Save changes';
    }
}

export function resetDirty() {
    isDirty = false;
    const saveBtn = document.getElementById('saveBtnFixed') || document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.classList.remove('dirty');
        saveBtn.classList.add('saved');
        saveBtn.disabled = true;
        saveBtn.title = 'All changes saved';
    }
}

export function getIsDirty() {
    return isDirty;
}

export function getIcon(type) {
    if (type === 'radarr') {
        return `<img src="/web/static/icons/radarr.svg" alt="Radarr logo" />`;
    }
    if (type === 'sonarr') {
        return `<img src="/web/static/icons/sonarr.svg" alt="Sonarr logo" />`;
    }
    if (type === 'plex') {
        return `<img src="/web/static/icons/plex.svg" alt="Plex logo" />`;
    }
    if (type === 'discord') {
        return `<img src="/web/static/icons/discord.svg" alt="Discord logo" />`;
    }
    if (type === 'notifiarr') {
        return `<img src="/web/static/icons/notifiarr.svg" alt="Notifiarr logo" />`;
    }
    if (type === 'email') {
        return `<i class="material-icons">email</i>`;
    }
    if (type === 'test') {
        return `<i class="material-icons">science</i>`;
    }
    return `<i class="material-icons">notifications</i>`;
}

export function getSpinner() {
    return `<span class="spinner"></span>`;
}
