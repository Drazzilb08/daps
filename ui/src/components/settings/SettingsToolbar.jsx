import React from 'react';
import { getIcon } from '../../utils/tools';

export default function SettingsToolbar({ title, onSave, isDirty }) {
    return (
        <div className="settings-toolbar-bar" id="settingsToolBar">
            <span className="settings-page-title" id="settingsPageTitle">
                {title}
            </span>
            <button
                id="saveBtnFixed"
                type="submit"
                form="settingsForm"
                className={'settings-toolbar-btn' + (isDirty ? ' dirty' : ' saved')}
                aria-label="Save"
                title={isDirty ? 'Save changes' : 'All changes saved'}
                onClick={onSave}
                disabled={!isDirty}
            >
                {getIcon('material:save', { style: { marginRight: 7, verticalAlign: 'middle' } })}
                <span className="save-btn-label">Save</span>
            </button>
        </div>
    );
}
