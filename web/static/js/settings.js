import { fetchConfig } from './helper.js';
import { renderPosterRenamerrSettings } from './settings/modules/poster_renamerr.js';
import { renderLabelarrSettings } from './settings/modules/labelarr.js';
import { renderReplacerrSettings } from './settings/modules/border_replacerr.js';
import { renderUpgradinatorrSettings } from './settings/modules/upgradinatorr.js';
import { renderGdriveSettings } from './settings/modules/sync_gdrive.js';
import { renderNohlSettings } from './settings/modules/nohl.js';
import { renderJduparrSettings } from './settings/modules/jduparr.js';
import { renderHealthCheckarrSettings } from './settings/modules/health_checkarr.js';
import { renderPosterCleanarrSettings } from './settings/modules/poster_cleanarr.js';
import { renderRenameinatorrSettings } from './settings/modules/renameinatorr.js';
import { renderUnmatchedAssetsSettings } from './settings/modules/unmatched_assets.js';
import { buildSettingsPayload } from './payload.js';
import { renderMain } from './settings/modules/main.js';
import { DAPS } from './common.js';
import { setTheme } from './index.js';
const { bindSaveButton, markDirty } = DAPS;

const MODULE_RENDERERS = {
    poster_renamerr: renderPosterRenamerrSettings,
    labelarr: renderLabelarrSettings,
    border_replacerr: renderReplacerrSettings,
    upgradinatorr: renderUpgradinatorrSettings,
    sync_gdrive: renderGdriveSettings,
    nohl: renderNohlSettings,
    jduparr: renderJduparrSettings,
    health_checkarr: renderHealthCheckarrSettings,
    poster_cleanarr: renderPosterCleanarrSettings,
    renameinatorr: renderRenameinatorrSettings,
    unmatched_assets: renderUnmatchedAssetsSettings,
    main: renderMain,
};

export async function loadSettings(moduleName) {
    window.currentModuleName = moduleName;
    const formFields = document.getElementById('form-fields');
    formFields.innerHTML = '';
    const rootConfig = await fetchConfig();
    const moduleConfig = rootConfig[moduleName] || {};
    const renderer = MODULE_RENDERERS[moduleName];
    if (renderer) {
        renderer(formFields, moduleConfig, rootConfig);
    }
    DAPS.isDirty = false;
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('change', () => {
            markDirty();
        });

        settingsForm.addEventListener('click', (e) => {
            if (
                e.target.classList.contains('remove-btn') ||
                e.target.classList.contains('add-btn') ||
                e.target.classList.contains('edit-btn')
            ) {
                markDirty();
            }
        });
    }
    const saveBtn = document.getElementById('saveBtn');
    bindSaveButton(
        saveBtn,
        () => Promise.resolve(buildSettingsPayload(window.currentModuleName)),
        window.currentModuleName,

        () => {
            if (window.currentModuleName === 'main') setTheme();
        }
    );
    if (settingsForm) {
        const allCards = settingsForm.querySelectorAll('.card');
        allCards.forEach((card, i) => {
            card.classList.remove('show-card');
            setTimeout(() => {
                card.classList.add('show-card');

                const fields = card.querySelectorAll('.field');
                fields.forEach((field, j) => {
                    field.classList.remove('show-field');
                    setTimeout(() => field.classList.add('show-field'), 40 * j);
                });
            }, 40 * i);
        });

        const wrapperFields = settingsForm.querySelectorAll('.settings-wrapper > .field');
        wrapperFields.forEach((field, i) => {
            field.classList.remove('show-field');
            setTimeout(() => field.classList.add('show-field'), 40 * i);
        });
    }
}
