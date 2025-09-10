import { Link } from 'react-router-dom';
import { SETTINGS_MODULES } from '../utils/constants/settings_schema';

/**
 * Settings - Module selection and configuration splash page
 * 
 * Provides access to all DAPS module configurations and system settings.
 * 
 * @returns {JSX.Element} Settings page component
 */
const Settings = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Settings & Configuration</h1>
        <p>Configure DAPS modules and system settings</p>
      </div>
      
      <div className="settings-overview">
        <div className="settings-section">
          <div className="section-header">
            <h2>DAPS Modules</h2>
            <p>Configure individual DAPS modules and their settings</p>
          </div>
          
          <div className="settings-grid">
            {SETTINGS_MODULES.map((module) => (
              <div key={module.key} className="setting-card">
                <div className="setting-card-content">
                  <h3>{module.name}</h3>
                  <p>{module.description}</p>
                </div>
                
                <div className="setting-card-actions">
                  <Link to={`/settings/${module.key}`} className="configure-button">
                    Configure
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="settings-section">
          <div className="section-header">
            <h2>System Configuration</h2>
            <p>Administrative functions moved to Settings context</p>
          </div>
          
          <div className="settings-grid">
            <div className="setting-card">
              <div className="setting-card-content">
                <h3>Schedule</h3>
                <p>Configure automated job scheduling and task management</p>
              </div>
              <div className="setting-card-actions">
                <Link to="/settings/schedule" className="configure-button">
                  Configure
                </Link>
              </div>
            </div>
            
            <div className="setting-card">
              <div className="setting-card-content">
                <h3>Instances</h3>
                <p>Manage service instances and worker connections</p>
              </div>
              <div className="setting-card-actions">
                <Link to="/settings/instances" className="configure-button">
                  Configure
                </Link>
              </div>
            </div>
            
            <div className="setting-card">
              <div className="setting-card-content">
                <h3>Notifications</h3>
                <p>Configure notification providers and alert settings</p>
              </div>
              <div className="setting-card-actions">
                <Link to="/settings/notifications" className="configure-button">
                  Configure
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;