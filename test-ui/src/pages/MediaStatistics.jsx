import React from 'react';

/**
 * Media library statistics and analytics
 * 
 * Shows statistics about media collection including file types,
 * quality distributions, and growth trends.
 * 
 * @returns {JSX.Element} Media statistics page component
 */
const MediaStatistics = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Media Statistics</h1>
        <p>Comprehensive analytics of your media collection</p>
      </div>
      
      <div className="statistics-dashboard">
        <div className="stats-overview">
          <div className="overview-cards">
            <div className="stat-card stat-card--primary">
              <h3>Total Media Files</h3>
              <div className="stat-value">1,247</div>
              <div className="stat-change">+23 this week</div>
            </div>
            
            <div className="stat-card">
              <h3>Total Size</h3>
              <div className="stat-value">8.4 TB</div>
              <div className="stat-change">+180 GB this week</div>
            </div>
            
            <div className="stat-card">
              <h3>Movies</h3>
              <div className="stat-value">892</div>
              <div className="stat-change">+15 this week</div>
            </div>
            
            <div className="stat-card">
              <h3>TV Shows</h3>
              <div className="stat-value">355</div>
              <div className="stat-change">+8 this week</div>
            </div>
          </div>
        </div>
        
        <div className="stats-charts">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Content Distribution</h3>
              <select className="chart-filter">
                <option>By Type</option>
                <option>By Genre</option>
                <option>By Year</option>
              </select>
            </div>
            
            <div className="chart-content">
              <div className="pie-chart-placeholder">
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span>Movies (71.5%)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
                    <span>TV Shows (28.5%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="chart-card">
            <div className="chart-header">
              <h3>Quality Distribution</h3>
              <select className="chart-filter">
                <option>Resolution</option>
                <option>Codec</option>
                <option>Bitrate</option>
              </select>
            </div>
            
            <div className="chart-content">
              <div className="bar-chart-placeholder">
                <div className="quality-bars">
                  <div className="quality-bar">
                    <span className="quality-label">4K</span>
                    <div className="quality-progress">
                      <div className="quality-fill" style={{ width: '35%' }}></div>
                    </div>
                    <span className="quality-count">437 files</span>
                  </div>
                  <div className="quality-bar">
                    <span className="quality-label">1080p</span>
                    <div className="quality-progress">
                      <div className="quality-fill" style={{ width: '45%' }}></div>
                    </div>
                    <span className="quality-count">561 files</span>
                  </div>
                  <div className="quality-bar">
                    <span className="quality-label">720p</span>
                    <div className="quality-progress">
                      <div className="quality-fill" style={{ width: '15%' }}></div>
                    </div>
                    <span className="quality-count">187 files</span>
                  </div>
                  <div className="quality-bar">
                    <span className="quality-label">480p</span>
                    <div className="quality-progress">
                      <div className="quality-fill" style={{ width: '5%' }}></div>
                    </div>
                    <span className="quality-count">62 files</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="stats-details">
          <div className="detail-card">
            <div className="detail-header">
              <h3>Recent Additions</h3>
              <span className="detail-period">Last 30 days</span>
            </div>
            
            <div className="additions-timeline">
              <div className="timeline-item">
                <span className="timeline-date">Dec 9</span>
                <span className="timeline-count">5 items</span>
                <span className="timeline-size">12.3 GB</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-date">Dec 8</span>
                <span className="timeline-count">3 items</span>
                <span className="timeline-size">8.7 GB</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-date">Dec 7</span>
                <span className="timeline-count">7 items</span>
                <span className="timeline-size">18.4 GB</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-date">Dec 6</span>
                <span className="timeline-count">2 items</span>
                <span className="timeline-size">4.2 GB</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-date">Dec 5</span>
                <span className="timeline-count">8 items</span>
                <span className="timeline-size">22.1 GB</span>
              </div>
            </div>
          </div>
          
          <div className="detail-card">
            <div className="detail-header">
              <h3>Top Genres</h3>
              <span className="detail-period">By count</span>
            </div>
            
            <div className="genres-list">
              <div className="genre-item">
                <span className="genre-name">Action</span>
                <div className="genre-bar">
                  <div className="genre-fill" style={{ width: '45%' }}></div>
                </div>
                <span className="genre-count">234</span>
              </div>
              <div className="genre-item">
                <span className="genre-name">Drama</span>
                <div className="genre-bar">
                  <div className="genre-fill" style={{ width: '38%' }}></div>
                </div>
                <span className="genre-count">198</span>
              </div>
              <div className="genre-item">
                <span className="genre-name">Comedy</span>
                <div className="genre-bar">
                  <div className="genre-fill" style={{ width: '32%' }}></div>
                </div>
                <span className="genre-count">167</span>
              </div>
              <div className="genre-item">
                <span className="genre-name">Sci-Fi</span>
                <div className="genre-bar">
                  <div className="genre-fill" style={{ width: '28%' }}></div>
                </div>
                <span className="genre-count">145</span>
              </div>
              <div className="genre-item">
                <span className="genre-name">Thriller</span>
                <div className="genre-bar">
                  <div className="genre-fill" style={{ width: '25%' }}></div>
                </div>
                <span className="genre-count">132</span>
              </div>
            </div>
          </div>
          
          <div className="detail-card">
            <div className="detail-header">
              <h3>Storage Breakdown</h3>
              <span className="detail-period">8.4 TB total</span>
            </div>
            
            <div className="storage-breakdown">
              <div className="storage-item">
                <span className="storage-type">4K Movies</span>
                <span className="storage-size">4.2 TB</span>
                <span className="storage-percent">50%</span>
              </div>
              <div className="storage-item">
                <span className="storage-type">HD Movies</span>
                <span className="storage-size">2.1 TB</span>
                <span className="storage-percent">25%</span>
              </div>
              <div className="storage-item">
                <span className="storage-type">TV Shows</span>
                <span className="storage-size">1.7 TB</span>
                <span className="storage-percent">20%</span>
              </div>
              <div className="storage-item">
                <span className="storage-type">Other</span>
                <span className="storage-size">0.4 TB</span>
                <span className="storage-percent">5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaStatistics;