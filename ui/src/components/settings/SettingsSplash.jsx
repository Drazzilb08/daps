// src/components/settings/SettingsSplash.jsx
import React from 'react';
import { SETTINGS_MODULES } from '../../utils/constants/settings_schema';

export default function SettingsSplash({ onSelectModule }) {
    return (
        <div className="settings-splash">
            <h1 className="settings-splash-title">Settings</h1>
            <div className="settings-section-list">
                {SETTINGS_MODULES.map(mod => (
                    <a
                        className="card--settings"
                        href={`/settings?module_name=${mod.key}`}
                        key={mod.key}
                        tabIndex={0}
                        onClick={e => {
                            e.preventDefault();
                            onSelectModule && onSelectModule(mod.key);
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectModule && onSelectModule(mod.key);
                            }
                        }}
                    >
                        <div className="card__section-title">{mod.name}</div>
                        <div className="card__section-desc">{mod.description}</div>
                    </a>
                ))}
            </div>
        </div>
    );
}
