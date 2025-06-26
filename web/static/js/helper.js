import { HELP_CONTENT } from './help_content.js';
import { humanize } from './common.js';

export const moduleOrder = [
    'sync_gdrive',
    'poster_renamerr',
    'poster_cleanarr',
    'unmatched_assets',
    'border_replacerr',
    'renameinatorr',
    'upgradinatorr',
    'nohl',
    'labelarr',
    'health_checkarr',
    'jduparr',
    'main',
];

export const NOTIFICATION_LIST = [
    'poster_renamerr',
    'unmatched_assets',
    'renameinatorr',
    'upgradinatorr',
    'nohl',
    'labelarr',
    'health_checkarr',
    'jduparr',
];

export const NOTIFICATION_DEFINITIONS = {
    email: {
        label: 'Email',
        fields: [
            {
                key: 'smtp_server',
                label: 'SMTP Server',
                type: 'text',
                dataType: 'string',
                required: true,
                placeholder: 'smtp.gmail.com',
            },
            {
                key: 'smtp_port',
                label: 'SMTP Port',
                type: 'number',
                dataType: 'int',
                required: true,
                placeholder: '587',
            },
            {
                key: 'username',
                label: 'Username',
                type: 'text',
                dataType: 'string',
                required: true,
                placeholder: 'user@example.com',
            },
            {
                key: 'password',
                label: 'Password',
                type: 'password',
                dataType: 'string',
                required: true,
                placeholder: 'yourpassword or app password on gmail',
            },
            {
                key: 'from',
                label: 'From',
                type: 'email',
                dataType: 'string',
                required: true,
                placeholder: 'noreply@example.com',
            },
            {
                key: 'to',
                label: 'Recipients',
                type: 'textarea',
                dataType: 'list',
                required: true,
                placeholder: 'admin@example.com\nsupport@example.com',
            },
            {
                key: 'use_tls',
                label: 'Use TLS',
                type: 'checkbox',
                dataType: 'bool',
                required: false,
            },
        ],
    },
    discord: {
        label: 'Discord',
        fields: [
            {
                key: 'webhook',
                label: 'Webhook URL',
                type: 'text',
                dataType: 'string',
                required: true,
                placeholder: 'https://discord.com/api/webhooks/...',
            },
        ],
    },
    notifiarr: {
        label: 'Notifiarr',
        fields: [
            {
                key: 'webhook',
                label: 'Webhook URL',
                type: 'text',
                dataType: 'string',
                required: true,
                placeholder: 'https://notifiarr.com/api/...',
            },
            {
                key: 'channel_id',
                label: 'Channel ID',
                type: 'text',
                dataType: 'string',
                required: true,
                placeholder: '123456789012345678',
            },
        ],
    },
};

export const NOTIFICATION_TYPES_PER_MODULE = {
    unmatched_assets: ['email'],
};

export function renderHelp(sectionName) {
    function animateHeight(element, open = true, duration = 350) {
        if (!element) return;
        const startHeight = element.offsetHeight;

        element.style.height = startHeight + 'px';
        element.style.overflow = 'hidden';
        element.style.transition = `height ${duration}ms cubic-bezier(.44,1.13,.73,.98)`;

        const targetHeight = open ? element.scrollHeight : 0;

        void element.offsetHeight;

        element.style.height = targetHeight + 'px';

        function afterTransition() {
            element.style.transition = '';
            element.style.height = open ? '' : '0px';
            element.style.overflow = open ? '' : 'hidden';
            element.removeEventListener('transitionend', afterTransition);
        }

        element.addEventListener('transitionend', afterTransition);
    }
    if (!HELP_CONTENT || !sectionName) return null;

    let entry = HELP_CONTENT[sectionName];

    if (
        !entry &&
        HELP_CONTENT.settings &&
        Array.isArray(HELP_CONTENT.settings) &&
        HELP_CONTENT.settings[0][sectionName]
    ) {
        entry = HELP_CONTENT.settings[0][sectionName];
    }

    if (!entry) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'help';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'help-toggle';
    toggle.setAttribute('aria-label', `Show help for ${humanize(sectionName)}`);
    toggle.innerHTML = `
    <svg class="help-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="2"/>
        <path d="M12 16v-2a3 3 0 1 0-3-3" stroke="currentColor" stroke-width="2" fill="none"/>
        <circle cx="12" cy="18" r="1" fill="currentColor"/>
    </svg>
    <span class="help-label">Show help for ${humanize(sectionName)}?</span>
    `;

    const content = document.createElement('pre');
    content.className = 'help-content';
    content.innerHTML = Array.isArray(entry)
        ? entry
              .map((line) =>
                  Array.isArray(line)
                      ? `<div>${line
                            .map((part) => (typeof part === 'string' ? part : renderHelpLink(part)))
                            .join('')}</div>`
                      : `<div>${typeof line === 'string' ? line : renderHelpLink(line)}</div>`
              )
              .join('')
        : entry;

    let isToggling = false;
    toggle.addEventListener('click', () => {
        if (isToggling) return;
        isToggling = true;
        const isOpen = content.classList.toggle('show');
        if (isOpen) {
            content.style.maxHeight = content.scrollHeight + 'px';

            content.addEventListener('transitionend', function handler(e) {
                if (e.propertyName === 'max-height' && content.classList.contains('show')) {
                    content.style.maxHeight = 'none'; // "auto" sizing from now on
                    content.removeEventListener('transitionend', handler);
                    isToggling = false;
                }
            });
        } else {
            content.style.maxHeight = content.scrollHeight + 'px'; // (in case it was 'none')

            void content.offsetHeight;
            content.style.maxHeight = '0px';
            content.addEventListener('transitionend', function handler(e) {
                if (e.propertyName === 'max-height' && !content.classList.contains('show')) {
                    isToggling = false;
                    content.removeEventListener('transitionend', handler);
                }
            });
        }
    });

    wrapper.appendChild(toggle);
    wrapper.appendChild(content);
    return wrapper;
}

function renderHelpLink(item) {
    if (item && item.type === 'link' && item.url) {
        return `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${
            item.text || item.url
        }</a>`;
    }
    return '';
}

export async function fetchConfig() {
    try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        return await res.json();
    } catch (err) {
        console.error('Error loading config:', err);
        return {};
    }
}
export async function fetchStats(location) {
    if (!location)
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
        };
    try {
        const res = await fetch('/api/poster-search-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                location,
            }),
        });
        if (!res.ok) {
            return {
                error: true,
                file_count: 0,
                size_bytes: 0,
                files: [],
            };
        }
        return await res.json();
    } catch (err) {
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: [],
        };
    }
}
