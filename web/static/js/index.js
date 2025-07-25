import { fetchConfig } from './helper.js';

function parseVersionString(ver) {
    if (!ver) return {};
    const parts = ver.trim().split('.');
    if (parts.length < 4) return {};
    const version = parts.slice(0, 3).join('.');
    const branchAndBuild = parts[3];

    const m = branchAndBuild.match(/^([a-zA-Z]+)(\d+)$/);
    let branch, build;
    if (m) {
        branch = m[1];
        build = parseInt(m[2], 10);
    } else {
        branch = branchAndBuild.replace(/(\d+)$/, '');
        const buildMatch = branchAndBuild.match(/(\d+)$/);
        build = buildMatch ? parseInt(buildMatch[1], 10) : null;
    }
    return {
        version,
        branch,
        build,
        full: ver.trim(),
    };
}

async function getRemoteBuildCount(owner, repo, branch) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) return null;
        const link = response.headers.get('Link');
        if (!link) return 1; // If only one commit
        const match = link.match(/&page=(\d+)>; rel="last"/);
        if (match) return parseInt(match[1], 10);
        return 1;
    } catch {
        return null;
    }
}

async function mainVersionCheck() {
    const localVerStr = await fetch('/api/version')
        .then((r) => r.text())
        .catch(() => null);
    const local = parseVersionString(localVerStr);
    if (!local.version || !local.branch || local.build === null) {
        document.getElementById('version').textContent = 'Version: ' + (localVerStr || 'unknown');
        return;
    }

    const remoteVersion = await fetch(
        `https://raw.githubusercontent.com/Drazzilb08/daps/${local.branch}/VERSION`
    )
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null);

    const remoteBuild = await getRemoteBuildCount('Drazzilb08', 'daps', local.branch);
    let remoteFull = '';
    let updateAvailable = false;
    if (remoteVersion && remoteBuild !== null) {
        remoteFull = `${remoteVersion.trim()}.${local.branch}${remoteBuild}`;
        if (remoteVersion.trim() === local.version && remoteBuild > local.build) {
            updateAvailable = true;
        } else if (remoteVersion.trim() !== local.version) {
            updateAvailable = true;
        }
    }
    document.getElementById('version').textContent = 'Version: ' + local.full;
    const badge = document.getElementById('update-badge');
    if (updateAvailable) {
        badge.style.display = '';
        badge.title = ''; // Use custom tooltip
        badge.onclick = () => window.open('https://github.com/Drazzilb08/daps/releases', '_blank');
        document.getElementById('tooltip-current-version').innerText = local.full;
        document.getElementById('tooltip-latest-version').innerText = remoteFull;
    } else {
        badge.style.display = 'none';
    }
}

export function setTheme() {
    fetchConfig()
        .then((config) => {
            let theme =
                config && config.main && typeof config.main.theme === 'string'
                    ? config.main.theme.toLowerCase()
                    : 'light';

            function applySystemTheme() {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                try {
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                } catch {}
            }

            if (window._themeMediaListener) {
                window
                    .matchMedia('(prefers-color-scheme: dark)')
                    .removeEventListener('change', window._themeMediaListener);
                window._themeMediaListener = null;
            }

            if (theme === 'auto') {
                applySystemTheme();
                window._themeMediaListener = applySystemTheme;
                window
                    .matchMedia('(prefers-color-scheme: dark)')
                    .addEventListener('change', window._themeMediaListener);
            } else {
                document.documentElement.setAttribute(
                    'data-theme',
                    theme === 'dark' ? 'dark' : 'light'
                );
                try {
                    localStorage.setItem('theme', theme);
                } catch {}
            }
        })
        .catch((err) => {
            console.error('Failed to fetch config:', err);
            document.documentElement.setAttribute('data-theme', 'light');
            try {
                localStorage.setItem('theme', 'light');
            } catch {}
        });
}

function showSplashScreen() {
    const viewFrame = document.getElementById('viewFrame');
    if (!viewFrame) return;
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

    const canvas = document.getElementById('splash-particles');
    if (canvas) animateSplashParticles(canvas);

    const title = document.querySelector('.splash-title');
    if (title) {
        const text = title.textContent;
        title.textContent = '';
        let idx = 0;
        const typer = setInterval(() => {
            title.textContent += text[idx++];
            if (idx === text.length) {
                clearInterval(typer);
                title.classList.add('splash-typing');
            }
        }, 75);
    }

    const icon = document.querySelector('.splash-icon');
    if (icon) {
        icon.classList.add('pulse');
    }
}

function animateSplashParticles(canvas) {
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 1,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
    }));

    function animateParticlesFrame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--splash-particle-color')
            .trim();
        particles.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        });
        requestAnimationFrame(animateParticlesFrame);
    }
    animateParticlesFrame();
}

setTheme();
mainVersionCheck();
showSplashScreen();
