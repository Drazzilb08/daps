// ===== Dirty State Tracking =====
window.isDirty = false;
window.skipDirtyCheck = false;
/**
 * Marks the current page as having unsaved changes (dirty state).
 */
window.markDirty = function()
{
    window.isDirty = true;
};
window.addEventListener('beforeunload', function(e)
{
    if (window.isDirty)
    {
        e.preventDefault();
        e.returnValue = '';
    }
});
// ===== Unsaved Changes Modal =====
const unsavedModal = document.createElement('div');
unsavedModal.id = 'unsavedModal';
unsavedModal.innerHTML = `
<style>
</style>
<div class="modal-content">
  <p>You have unsaved changes. What would you like to do?</p>
  <button class="save-btn">Save</button>
  <button class="discard-btn">Discard</button>
  <button class="cancel-btn">Cancel</button>
</div>`;
if (document.body)
{
    document.body.appendChild(unsavedModal);
}
else
{
    document.addEventListener('DOMContentLoaded', () =>
    {
        document.body.appendChild(unsavedModal);
    });
}
// ===== Modal Utilities =====
/**
 * Opens the specified modal dialog.
 *
 * @param {HTMLElement} modal - The modal element to open.
 */
function openModal(modal)
{
    modal.style.display = 'flex';
    requestAnimationFrame(() =>
    {
        modal.classList.add('show');
        document.body.classList.add('modal-open');
    });
}

/**
 * Closes the specified modal dialog.
 *
 * @param {HTMLElement} modal - The modal element to close.
 */
function closeModal(modal)
{
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    setTimeout(() =>
    {
        modal.style.display = 'none';
    }, 250);
}

/**
 * Shows a modal dialog prompting the user about unsaved changes.
 *
 * @returns {Promise<string>} Resolves to the user's choice: 'save', 'discard', or 'cancel'.
 */
function showUnsavedModal()
{
    return new Promise(resolve =>
    {
        unsavedModal.classList.add('show');
        const saveBtn = unsavedModal.querySelector('.save-btn');
        const discardBtn = unsavedModal.querySelector('.discard-btn');
        const cancelBtn = unsavedModal.querySelector('.cancel-btn');

        function cleanup(choice)
        {
            unsavedModal.classList.remove('show');
            resolve(choice);
        }
        saveBtn.addEventListener('click', () => cleanup('save'),
        {
            once: true
        });
        discardBtn.addEventListener('click', () => cleanup('discard'),
        {
            once: true
        });
        cancelBtn.addEventListener('click', () => cleanup('cancel'),
        {
            once: true
        });
    });
}
// Attach showUnsavedModal under DAPS namespace
window.DAPS = window.DAPS ||
{};
window.DAPS.showUnsavedModal = showUnsavedModal;
// ===== Modal Utilities (continued) =====
/**
 * Converts a snake_case string to human-readable format.
 *
 * @param {string} key - The string to humanize.
 * @returns {string} The humanized string.
 */
window.humanize = function(key)
{
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};
// ===== Dirty State Tracking (continued) =====
document.addEventListener('change', function(e)
{
    const target = e.target;
    if (target.id === 'schedule-search' || target.id === 'notifications-search')
    {
        return;
    }
    if (!document.body.classList.contains('logs-open') && target.matches('input, select, textarea'))
    {
        window.markDirty();
    }
});
// ===== Navigation with Unsaved Check =====
document.addEventListener('click', async function(e)
{
    let skip = false;
    if (window.skipDirtyCheck)
    {
        skip = true;
        window.skipDirtyCheck = false;
    }
    let el = e.target;
    while (el && el.nodeType !== 1) el = el.parentNode;
    if (!el) return;
    const anchor = el.closest('a');
    if (!anchor || !anchor.href) return;
    const hrefUrl = new URL(anchor.href, window.location.origin);
    if (hrefUrl.origin !== window.location.origin) return;
    if (anchor.target === '_blank' || anchor.href.startsWith('mailto:') || anchor.href.startsWith('javascript:')) return;
    if (!(/\/fragments\/|\/schedule$|\/instances$|\/logs$|\/settings/.test(anchor.href) || anchor.href.endsWith('/notifications'))) return;
    e.preventDefault();
    let dirty = window.isDirty;
    const iframe = document.getElementById('viewFrame');
    if (iframe && iframe.contentWindow && iframe.contentWindow.isDirty)
    {
        dirty = true;
    }
    let choice = null;
    if (!skip && dirty)
    {
        choice = await window.DAPS.showUnsavedModal();
    }
    if (!dirty || choice === 'save' || skip)
    {
        if (dirty && choice === 'save' && typeof window.saveChanges === 'function')
        {
            await window.saveChanges();
            window.isDirty = false;
            if (iframe && iframe.contentWindow)
            {
                iframe.contentWindow.isDirty = false;
            }
        }
        window.DAPS.navigateTo(anchor);
    }
    else if (choice === 'discard')
    {
        window.isDirty = false;
        if (iframe && iframe.contentWindow)
        {
            iframe.contentWindow.isDirty = false;
        }
        window.DAPS.navigateTo(anchor);
    }
});
// ===== DAPS Namespace =====
window.DAPS = window.DAPS ||
{};
// ===== Fragment Navigation =====
/**
 * Navigates to the specified link within the DAPS single-page app, loading the corresponding fragment.
 *
 * @param {HTMLAnchorElement} link - The link element to navigate to.
 * @returns {Promise<void>} Resolves when navigation and content loading are complete.
 */
window.DAPS.navigateTo = async function(link)
{
    const viewFrame = document.getElementById('viewFrame');
    if (!viewFrame) return;
    viewFrame.classList.remove('fade-in');
    viewFrame.classList.add('fade-out');
    viewFrame.classList.remove('splash-mask');
    let url = link.href;
    if (link.href.endsWith('/schedule'))
    {
        url = '/fragments/schedule';
    }
    else if (link.href.endsWith('/instances'))
    {
        url = '/fragments/instances';
    }
    else if (link.href.endsWith('/logs'))
    {
        url = '/fragments/logs';
    }
    else if (link.href.endsWith('/notifications'))
    {
        url = '/fragments/notifications';
    }
    else if (link.href.startsWith('/settings'))
    {
        const idx = link.href.indexOf('?');
        const query = idx !== -1 ? link.href.substring(idx) : '';
        url = '/fragments/settings' + query;
    }
    try
    {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const headLinks = doc.head ? [...doc.head.querySelectorAll('link[rel="stylesheet"]')] : [];
        headLinks.forEach(link =>
        {
            const href = link.getAttribute('href');
            if (href && !document.querySelector(`head link[href="${href}"]`))
            {
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = href;
                document.head.appendChild(newLink);
            }
        });
        let bodyContent = doc.body ? doc.body.innerHTML : html;
        bodyContent = bodyContent.replace(/<script[^>]*>/g, '').replace(/<\/script>/g, '');
        setTimeout(async () =>
        {
            viewFrame.innerHTML = bodyContent;
            document.body.classList.remove('logs-open');
            viewFrame.classList.remove('fade-out');
            viewFrame.classList.add('fade-in');
            if (url.includes('/fragments/schedule') && typeof window.loadSchedule === 'function')
            {
                await window.loadSchedule();
            }
            if (url.includes('/fragments/instances') && typeof window.loadInstances === 'function')
            {
                await window.loadInstances();
            }
            if (url.includes('/fragments/notifications') && typeof window.loadNotifications === 'function')
            {
                await window.loadNotifications();
            }
            if (url.includes('/fragments/settings') && typeof window.loadSettings === 'function')
            {
                const params = new URLSearchParams(url.split('?')[1] || '');
                const moduleName = params.get('module_name');
                await window.loadSettings(moduleName);
            }
            if (typeof window.DAPS.updateSettingsHighlight === 'function')
            {
                window.DAPS.updateSettingsHighlight();
            }
            (() =>
            {
                document.querySelectorAll('.menu a, .dropdown-toggle, .dropdown-menu li a').forEach(el =>
                {
                    el.classList.remove('active');
                });
                if (url.endsWith('/schedule'))
                {
                    document.getElementById('link-schedule')?.classList.add('active');
                    return;
                }
                if (url.includes('/fragments/instances'))
                {
                    document.getElementById('link-instances')?.classList.add('active');
                    return;
                }
                if (url.endsWith('/notifications'))
                {
                    document.getElementById('link-notifications')?.classList.add('active');
                    return;
                }
                if (url.includes('/fragments/logs'))
                {
                    document.getElementById('link-logs')?.classList.add('active');
                    return;
                }
                if (url.includes('/fragments/settings'))
                {
                    const settingsToggle = document.querySelector('.dropdown-toggle');
                    settingsToggle?.classList.add('active');
                    const moduleParam = new URL(url, window.location.origin).searchParams.get('module_name');
                    const moduleLink = document.querySelector(`#settings-dropdown li a[href*="module_name=${moduleParam}"]`);
                    moduleLink?.classList.add('active');
                }
            })();
            if (url.includes('/fragments/logs'))
            {
                if (typeof window.loadLogs === 'function')
                {
                    await window.loadLogs();
                }
            }
        }, 200);
    }
    catch (err)
    {
        console.error(err);
    }
};
// ===== Save Functionality =====
/**
 * Saves the current page's changes, if a saveChanges function is available.
 *
 * @returns {Promise<void>} Resolves when saving is complete.
 */
window.DAPS.saveCurrentPage = async function()
{
    if (typeof window.saveChanges === 'function')
    {
        await window.saveChanges();
        window.isDirty = false;
    }
    else
    {
        console.warn('No saveChanges() function available for this page.');
    }
};
// ===== Initialization (DOMContentLoaded) =====
/**
 * DOMContentLoaded callback to initialize navigation and splash UI.
 */
document.addEventListener('DOMContentLoaded', () =>
{
    document.querySelectorAll('nav .menu a').forEach(link =>
    {
        link.addEventListener('keydown', (e) =>
        {
            if (e.key === 'Enter' || e.key === ' ')
            {
                e.preventDefault();
                link.click();
            }
        });
    });
    if (window.DAPS && typeof window.DAPS.manageDropdown === 'function')
    {
        window.DAPS.manageDropdown();
    }
    (async function populateSettingsDropdown()
    {
        const res = await fetch("/api/config");
        const config = await res.json();
        const dropdown = document.getElementById("settings-dropdown");
        if (!dropdown) return;
        dropdown.innerHTML = '';
        (window.moduleOrder || Object.keys(config))
        .filter(key => config.hasOwnProperty(key) && !['schedule', 'instances', 'notifications', 'discord'].includes(key))
            .forEach(module =>
            {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `/fragments/settings?module_name=${module}`;
                a.textContent = window.humanize ? window.humanize(module) : module;
                li.appendChild(a);
                dropdown.appendChild(li);
            });
    })();
    const viewFrame = document.getElementById('viewFrame');
    if (viewFrame && viewFrame.innerHTML.trim() === '')
    {
        viewFrame.innerHTML = `
  <div class="splash-container">
    <canvas id="splash-particles" style="display:none;"></canvas>
    <div class="splash-card">
      <div class="splash-icon">🚀</div>
      <h1 class="splash-title">Welcome to DAPS</h1>
      <p>Select one of the options above to get started.</p>
    </div>
  </div>
`;
        viewFrame.classList.add('splash-mask', 'fade-in');
        const enableParticles = true;
        const enableTyping = true;
        const enablePulse = true;
        if (enableParticles)
        {
            const canvas = document.getElementById('splash-particles');
            canvas.style.display = 'block';
            const ctx = canvas.getContext('2d');

            function resizeCanvas()
            {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            const particles = Array.from(
            {
                length: 60
            }, () => (
            {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2 + 1,
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5
            }));

            function animateParticles()
            {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                particles.forEach(p =>
                {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                    p.x += p.dx;
                    p.y += p.dy;
                    if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
                });
                requestAnimationFrame(animateParticles);
            }
            animateParticles();
        }
        if (enableTyping)
        {
            const title = document.querySelector('.splash-title');
            const text = title.textContent;
            title.textContent = '';
            let idx = 0;
            const typer = setInterval(() =>
            {
                title.textContent += text[idx++];
                if (idx === text.length)
                {
                    clearInterval(typer);
                    title.classList.add('splash-typing');
                }
            }, 75);
        }
        if (enablePulse)
        {
            const icon = document.querySelector('.splash-icon');
            icon.classList.add('pulse');
        }
    }
});
// ===== Toast Notifications =====
/**
 * Displays a toast notification message.
 *
 * @param {string} message - The message to display.
 * @param {string} [type="info"] - The type of toast ('info', 'success', 'error', etc.).
 * @param {number} [timeout=3000] - Duration in milliseconds to show the toast.
 */
window.showToast = function(message, type = "info", timeout = 3000)
{
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.addEventListener('click', () =>
    {
        toast.classList.remove('show');
        setTimeout(() =>
        {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 300);
    });
    container.appendChild(toast);
    setTimeout(() =>
    {
        toast.classList.add('show');
    }, 100);
    setTimeout(() =>
    {
        toast.classList.remove('show');
        setTimeout(() =>
        {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 500);
    }, timeout);
};