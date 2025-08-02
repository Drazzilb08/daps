// src/pages/Settings.jsx

import { useParams, useNavigate } from 'react-router-dom';
import { SETTINGS_SCHEMA } from '../utils/constants/settings_schema';
import SettingsSplash from '../components/settings/SettingsSplash';
import SettingsForm from '../components/settings/SettingsForm';
import '../css/settings.css';

export default function Settings() {
    let { moduleName } = useParams();
    const navigate = useNavigate();

    if (!moduleName) {
        return <SettingsSplash onSelectModule={key => navigate(`/settings/${key}`)} />;
    }

    // Map alias 'ui' to 'user_interface'
    const normalizedModuleName = moduleName === 'ui' ? 'user_interface' : moduleName;

    // Validate that normalizedModuleName exists in SETTINGS_SCHEMA keys
    const validKeys = SETTINGS_SCHEMA.map(s => s.key);
    if (!validKeys.includes(normalizedModuleName)) {
        return <div>Unknown settings module.</div>;
    }

    return <SettingsForm moduleName={normalizedModuleName} onBack={() => navigate('/settings')} />;
}
