import React from 'react';

/**
 * Schedule - Job scheduling configuration
 * 
 * Configure automated job scheduling for DAPS modules.
 * Moved from main navigation to Settings context.
 * 
 * @returns {JSX.Element} Schedule page component
 */
const Schedule = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Schedule Configuration</h1>
        <p>Configure automated job scheduling for DAPS modules</p>
      </div>
      
      <div className="schedule-management">
        <div className="schedule-controls">
          <div className="control-group">
            <button className="primary-button">Add New Schedule</button>
            <button className="secondary-button">Import Schedule</button>
          </div>
          
          <div className="schedule-status">
            <div className="status-indicator status-good">Scheduler Active</div>
            <p>Next job in 2 hours 15 minutes</p>
          </div>
        </div>
        
        <div className="schedule-list">
          <div className="schedule-card">
            <div className="schedule-header">
              <h3>Media Scanner</h3>
              <div className="schedule-actions">
                <button className="edit-button">Edit</button>
                <button className="toggle-button">Disable</button>
              </div>
            </div>
            
            <div className="schedule-details">
              <div className="schedule-timing">
                <span className="schedule-frequency">Daily at 3:00 AM</span>
                <span className="schedule-timezone">UTC</span>
              </div>
              
              <div className="schedule-options">
                <span className="option">Scan new files</span>
                <span className="option">Update metadata</span>
                <span className="option">Generate thumbnails</span>
              </div>
              
              <div className="schedule-status-info">
                <span className="last-run">Last run: 2024-12-09 03:00:00</span>
                <span className="next-run">Next run: 2024-12-10 03:00:00</span>
              </div>
            </div>
          </div>
          
          <div className="schedule-card">
            <div className="schedule-header">
              <h3>Poster Manager</h3>
              <div className="schedule-actions">
                <button className="edit-button">Edit</button>
                <button className="toggle-button">Disable</button>
              </div>
            </div>
            
            <div className="schedule-details">
              <div className="schedule-timing">
                <span className="schedule-frequency">Weekly on Sunday at 2:00 AM</span>
                <span className="schedule-timezone">UTC</span>
              </div>
              
              <div className="schedule-options">
                <span className="option">Find missing posters</span>
                <span className="option">Update existing artwork</span>
              </div>
              
              <div className="schedule-status-info">
                <span className="last-run">Last run: 2024-12-08 02:00:00</span>
                <span className="next-run">Next run: 2024-12-15 02:00:00</span>
              </div>
            </div>
          </div>
          
          <div className="schedule-card schedule-card--disabled">
            <div className="schedule-header">
              <h3>Quality Control</h3>
              <div className="schedule-actions">
                <button className="edit-button">Edit</button>
                <button className="toggle-button">Enable</button>
              </div>
            </div>
            
            <div className="schedule-details">
              <div className="schedule-timing">
                <span className="schedule-frequency">Manual execution only</span>
              </div>
              
              <div className="schedule-options">
                <span className="option">Validate file integrity</span>
                <span className="option">Check naming conventions</span>
              </div>
              
              <div className="schedule-status-info">
                <span className="status-disabled">Scheduling disabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;