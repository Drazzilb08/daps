import React from 'react';

/**
 * Notifications - Notification provider configuration
 * 
 * Configure notification providers and settings for DAPS alerts.
 * Moved from main navigation to Settings context.
 * 
 * @returns {JSX.Element} Notifications page component
 */
const Notifications = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Notification Configuration</h1>
        <p>Configure notification providers and alert settings</p>
      </div>
      
      <div className="notifications-management">
        <div className="notifications-overview">
          <div className="overview-stats">
            <div className="stat-card">
              <h3>Active Providers</h3>
              <div className="stat-value">2</div>
            </div>
            
            <div className="stat-card">
              <h3>Notifications Sent</h3>
              <div className="stat-value">24</div>
              <span className="stat-period">This week</span>
            </div>
            
            <div className="stat-card">
              <h3>Alert Rules</h3>
              <div className="stat-value">6</div>
            </div>
          </div>
        </div>
        
        <div className="providers-section">
          <div className="section-header">
            <h2>Notification Providers</h2>
            <button className="add-provider-button">Add Provider</button>
          </div>
          
          <div className="providers-list">
            <div className="provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <h3>Discord Webhook</h3>
                  <span className="provider-type">Chat Service</span>
                </div>
                
                <div className="provider-status">
                  <div className="status-indicator status-good">Active</div>
                  <span className="last-used">Last used: 2 hours ago</span>
                </div>
              </div>
              
              <div className="provider-details">
                <div className="provider-config">
                  <div className="config-item">
                    <span className="config-label">Webhook URL:</span>
                    <span className="config-value">https://discord.com/api/webhooks/***</span>
                  </div>
                  
                  <div className="config-item">
                    <span className="config-label">Channel:</span>
                    <span className="config-value">#daps-alerts</span>
                  </div>
                  
                  <div className="config-item">
                    <span className="config-label">Notification Types:</span>
                    <span className="config-value">Errors, Completions, Warnings</span>
                  </div>
                </div>
                
                <div className="provider-actions">
                  <button className="test-button">Test Connection</button>
                  <button className="edit-button">Edit</button>
                  <button className="disable-button">Disable</button>
                </div>
              </div>
            </div>
            
            <div className="provider-card">
              <div className="provider-header">
                <div className="provider-info">
                  <h3>Email SMTP</h3>
                  <span className="provider-type">Email Service</span>
                </div>
                
                <div className="provider-status">
                  <div className="status-indicator status-good">Active</div>
                  <span className="last-used">Last used: 1 day ago</span>
                </div>
              </div>
              
              <div className="provider-details">
                <div className="provider-config">
                  <div className="config-item">
                    <span className="config-label">SMTP Server:</span>
                    <span className="config-value">smtp.gmail.com:587</span>
                  </div>
                  
                  <div className="config-item">
                    <span className="config-label">From Address:</span>
                    <span className="config-value">daps@example.com</span>
                  </div>
                  
                  <div className="config-item">
                    <span className="config-label">Notification Types:</span>
                    <span className="config-value">Critical Errors, Daily Reports</span>
                  </div>
                </div>
                
                <div className="provider-actions">
                  <button className="test-button">Test Connection</button>
                  <button className="edit-button">Edit</button>
                  <button className="disable-button">Disable</button>
                </div>
              </div>
            </div>
            
            <div className="provider-card provider-card--disabled">
              <div className="provider-header">
                <div className="provider-info">
                  <h3>Slack Integration</h3>
                  <span className="provider-type">Chat Service</span>
                </div>
                
                <div className="provider-status">
                  <div className="status-indicator status-disabled">Disabled</div>
                  <span className="last-used">Never used</span>
                </div>
              </div>
              
              <div className="provider-details">
                <div className="provider-config">
                  <div className="config-item">
                    <span className="config-label">Status:</span>
                    <span className="config-value">Not configured</span>
                  </div>
                </div>
                
                <div className="provider-actions">
                  <button className="configure-button">Configure</button>
                  <button className="delete-button">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="alert-rules-section">
          <div className="section-header">
            <h2>Alert Rules</h2>
            <button className="add-rule-button">Add Rule</button>
          </div>
          
          <div className="rules-list">
            <div className="rule-card">
              <h3>Critical System Errors</h3>
              <p>Send immediate notifications for system crashes and critical errors</p>
              <div className="rule-details">
                <span className="rule-triggers">Triggers: Error, Fatal</span>
                <span className="rule-providers">Providers: Discord, Email</span>
              </div>
            </div>
            
            <div className="rule-card">
              <h3>Job Completion Reports</h3>
              <p>Daily summary of completed jobs and processing statistics</p>
              <div className="rule-details">
                <span className="rule-triggers">Triggers: Daily at 6:00 AM</span>
                <span className="rule-providers">Providers: Email</span>
              </div>
            </div>
            
            <div className="rule-card">
              <h3>Module Warnings</h3>
              <p>Notifications for non-critical warnings and issues</p>
              <div className="rule-details">
                <span className="rule-triggers">Triggers: Warning</span>
                <span className="rule-providers">Providers: Discord</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;