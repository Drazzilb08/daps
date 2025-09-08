import React from 'react';

/**
 * Dashboard Page - Test page for layout demonstration
 * 
 * Provides a sample dashboard interface to test the layout structure.
 * Shows how content scrolls within the layout while header and sidebar remain fixed.
 */
const DashboardPage = () => {
  return (
    <div className="content-layout">
      <div className="page-section">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Welcome to DAPS Media Automation. This dashboard shows an overview of your media processing activities.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2>Media Processing</h2>
          </div>
          <div className="card-body">
            <p>Current processing status and queue information.</p>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-value">42</span>
                <span className="stat-label">Items in Queue</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">1,337</span>
                <span className="stat-label">Processed Today</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="card-body">
            <p>Latest media processing activities and notifications.</p>
            <ul className="activity-list">
              <li>Movie poster updated for "The Matrix" (2 minutes ago)</li>
              <li>TV show "Breaking Bad" processed successfully (5 minutes ago)</li>
              <li>Failed to download poster for "Unknown Movie" (10 minutes ago)</li>
              <li>Batch processing completed: 23 items (1 hour ago)</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>System Status</h2>
          </div>
          <div className="card-body">
            <p>Current system health and performance metrics.</p>
            <div className="status-grid">
              <div className="status-item status-item--healthy">
                <span className="status-indicator"></span>
                <span>Database Connection</span>
              </div>
              <div className="status-item status-item--healthy">
                <span className="status-indicator"></span>
                <span>API Services</span>
              </div>
              <div className="status-item status-item--warning">
                <span className="status-indicator"></span>
                <span>Disk Space</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add lots of content to test scrolling */}
      <div className="page-section">
        <h2>Scrolling Test Content</h2>
        <p>This section contains additional content to demonstrate that the main content area scrolls properly while the header and sidebar remain fixed.</p>
        
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card-body">
              <h3>Content Block {i + 1}</h3>
              <p>
                This is test content block {i + 1}. It demonstrates that the layout properly handles 
                scrolling content while keeping the header and sidebar in a fixed position. 
                The Sonarr-style layout ensures that users can always access navigation 
                and branding elements while browsing through large amounts of content.
              </p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
                nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;