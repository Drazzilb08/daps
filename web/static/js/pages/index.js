function showSplashScreen() {
    const viewFrame = document.getElementById('viewFrame');
    if (!viewFrame) return;
    viewFrame.innerHTML = `

        <canvas id="splash-particles" style="display:none;"></canvas>
        <div class="splash-card">
          <div class="splash-icon" style="text-align: center;">🚀</div>
          <h1 class="splash-title" style="text-align: center;">Welcome to DAPS</h1>
          <p style="text-align: center;">Select one of the options on the side to get started.</p>
        </div>

    `;
    viewFrame.classList.add('splash-mask', 'fade-in');
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

export function initIndex() {
    showSplashScreen();
}


