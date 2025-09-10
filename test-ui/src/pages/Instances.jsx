import React from 'react';

/**
 * Instances - Service instance configuration
 * 
 * Manage service instances and workers for DAPS modules.
 * Moved from main navigation to Settings context.
 * 
 * @returns {JSX.Element} Instances page component
 */
const Instances = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Service Instances</h1>
        <p>Manage service instances and worker configurations</p>
      </div>
      
      <div className="instances-management">
        <div className="instances-overview">
          <div className="overview-stats">
            <div className="stat-card">
              <h3>Active Instances</h3>
              <div className="stat-value">3</div>
            </div>
            
            <div className="stat-card">
              <h3>Worker Threads</h3>
              <div className="stat-value">8</div>
            </div>
            
            <div className="stat-card">
              <h3>Queue Length</h3>
              <div className="stat-value">12</div>
            </div>
          </div>
        </div>
        
        <div className="instances-list">
          <div className="instance-card">
            <div className="instance-header">
              <div className="instance-info">
                <h3>Media Scanner Instance</h3>
                <span className="instance-type">Core Service</span>
              </div>
              
              <div className="instance-status">
                <div className="status-indicator status-good">Running</div>
                <span className="uptime">Uptime: 2d 14h 32m</span>
              </div>
            </div>
            
            <div className="instance-details">
              <div className="instance-config">
                <div className="config-item">
                  <span className="config-label">Worker Threads:</span>
                  <span className="config-value">4</span>
                </div>
                
                <div className="config-item">
                  <span className="config-label">Memory Usage:</span>
                  <span className="config-value">256 MB</span>
                </div>
                
                <div className="config-item">
                  <span className="config-label">CPU Usage:</span>
                  <span className="config-value">12%</span>
                </div>
              </div>
              
              <div className="instance-actions">
                <button className="restart-button">Restart</button>
                <button className="configure-button">Configure</button>
                <button className="logs-button">View Logs</button>
              </div>
            </div>
          </div>
          
          <div className="instance-card">
            <div className="instance-header">
              <div className="instance-info">
                <h3>Poster Manager Instance</h3>
                <span className="instance-type">Core Service</span>
              </div>
              
              <div className="instance-status">
                <div className="status-indicator status-good">Running</div>
                <span className="uptime">Uptime: 1d 8h 45m</span>
              </div>
            </div>
            
            <div className="instance-details">
              <div className="instance-config">
                <div className="config-item">
                  <span className="config-label">Worker Threads:</span>
                  <span className="config-value">2</span>
                </div>
                
                <div className="config-item">
                  <span className="config-label">Memory Usage:</span>
                  <span className="config-value">128 MB</span>
                </div>
                
                <div className="config-item">
                  <span className="config-label">CPU Usage:</span>
                  <span className="config-value">5%</span>
                </div>
              </div>
              
              <div className="instance-actions">
                <button className="restart-button">Restart</button>
                <button className="configure-button">Configure</button>
                <button className="logs-button">View Logs</button>
              </div>
            </div>
          </div>
          
          <div className="instance-card">
            <div className="instance-header">
              <div className="instance-info">
                <h3>Background Worker</h3>
                <span className="instance-type">Worker Pool</span>
              </div>
              
              <div className="instance-status">
                <div className="status-indicator status-good">Running</div>
                <span className="uptime">Uptime: 2d 14h 32m</span>
              </div>
            </div>
            
            <div className="instance-details">
              <div className="instance-config">
                <div className="config-item">
                  <span className="config-label">Worker Threads:</span>
                  <span className="config-value">2</span>
                </div>
                
                <div className="config-item">
                  <span className="config-label">Queue Size:</span>
                  <span className="config-value">12 jobs</span>
                </div>
                
                <div className="config-item">
                  <span className="config-label">Processed Today:</span>
                  <span className="config-value">847 jobs</span>
                </div>
              </div>
              
              <div className="instance-actions">
                <button className="restart-button">Restart</button>
                <button className="configure-button">Configure</button>
                <button className="logs-button">View Logs</button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="instances-controls">
          <button className="primary-button">Add New Instance</button>
          <button className="secondary-button">Import Configuration</button>
          <button className="secondary-button">Export Configuration</button>
        </div>
      </div>
    </div>
  );
};

export default Instances;