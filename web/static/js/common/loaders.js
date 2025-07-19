// /web/static/js/common/loader.js

const LOADER_VARIANTS = [
    `<div class="loader-matrix">
      <div class="square" id="sq1"></div>
      <div class="square" id="sq2"></div>
      <div class="square" id="sq3"></div>
      <div class="square" id="sq4"></div>
      <div class="square" id="sq5"></div>
      <div class="square" id="sq6"></div>
      <div class="square" id="sq7"></div>
      <div class="square" id="sq8"></div>
      <div class="square" id="sq9"></div>
    </div>`,
    `<div class="loader-dots" style="text-align:center;">
      <div class="dot dot1"></div>
      <div class="dot dot2"></div>
      <div class="dot dot3"></div>
    </div>`,
    `<div class="loader-spinner">
      <div class="spinner-circle"></div>
    </div>`,
    `<div class="loader">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
    </div>`,
    `<div id="page">
        <div id="container">
            <div id="ring"></div>
            <div id="ring"></div>
            <div id="ring"></div>
            <div id="ring"></div>
            <div id="h3">loading</div>
        </div>
    </div>`,
];

let loaderTimers = new WeakMap();

export function showLoaderModal(show = true, minVisible = 2000) {
    const parent = document.querySelector('#viewFrame');
    if (!parent) return;
    let loader = parent.querySelector('.loader-modal');

    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loader-modal';
            loader.innerHTML = LOADER_VARIANTS[Math.floor(Math.random() * LOADER_VARIANTS.length)];
            parent.appendChild(loader);
            parent.style.position = 'relative';
        }
        loader.style.display = 'flex';
        loaderTimers.set(loader, Date.now());
        loader.dataset.minVisible = minVisible;
    } else if (loader) {
        const shownAt = loaderTimers.get(loader) || 0;
        const elapsed = Date.now() - shownAt;
        // <-- Always read the value from dataset
        const datasetMinVisible = Number(loader.dataset.minVisible) || 400;
        const delay = Math.max(0, datasetMinVisible - elapsed);
        setTimeout(() => {
            loader.style.display = 'none';
        }, delay);
    }
}