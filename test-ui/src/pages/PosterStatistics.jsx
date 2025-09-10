import React from 'react';

/**
 * PosterStatistics - Poster collection statistics and analytics
 * 
 * Display comprehensive statistics about poster collection including
 * coverage rates, quality distributions, and source analytics.
 * 
 * @returns {JSX.Element} Poster statistics page component
 */
const PosterStatistics = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Poster Statistics</h1>
        <p>Comprehensive analytics of your poster and artwork collection</p>
      </div>
      
      <div className="statistics-dashboard">
        <div className="stats-overview">
          <div className="overview-cards">
            <div className="stat-card stat-card--primary">
              <h3>Total Posters</h3>
              <div className="stat-value">1,847</div>
              <div className="stat-change">+28 this week</div>
            </div>
            
            <div className="stat-card">
              <h3>Coverage Rate</h3>
              <div className="stat-value">97.2%</div>
              <div className="stat-change">+1.2% this week</div>
            </div>
            
            <div className="stat-card">
              <h3>Total Size</h3>
              <div className="stat-value">1.2 GB</div>
              <div className="stat-change">+45 MB this week</div>
            </div>
            
            <div className="stat-card">
              <h3>Average Quality</h3>
              <div className="stat-value">HD</div>
              <div className="stat-change">89% HD or higher</div>
            </div>
          </div>
        </div>
        
        <div className="stats-charts">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Poster Coverage</h3>
              <select className="chart-filter">
                <option>By Content Type</option>
                <option>By Genre</option>
                <option>By Year</option>
              </select>
            </div>
            
            <div className="chart-content">
              <div className="coverage-chart">
                <div className="coverage-item">
                  <span className="coverage-label">Movies</span>
                  <div className="coverage-bar">
                    <div className="coverage-fill" style={{ width: '98%' }}></div>
                  </div>
                  <span className="coverage-percent">98.2%</span>
                  <span className="coverage-count">876/892</span>
                </div>
                
                <div className="coverage-item">
                  <span className="coverage-label">TV Shows</span>
                  <div className="coverage-bar">
                    <div className="coverage-fill" style={{ width: '94%' }}></div>
                  </div>
                  <span className="coverage-percent">94.6%</span>
                  <span className="coverage-count">336/355</span>
                </div>
                
                <div className="coverage-item">
                  <span className="coverage-label">Collections</span>
                  <div className="coverage-bar">
                    <div className="coverage-fill" style={{ width: '100%' }}></div>
                  </div>
                  <span className="coverage-percent">100%</span>
                  <span className="coverage-count">24/24</span>
                </div>
                
                <div className="coverage-item">
                  <span className="coverage-label">Seasons</span>
                  <div className="coverage-bar">
                    <div className="coverage-fill" style={{ width: '87%' }}></div>
                  </div>
                  <span className="coverage-percent">87.4%</span>
                  <span className="coverage-count">611/699</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="chart-card">
            <div className="chart-header">
              <h3>Quality Distribution</h3>
              <select className="chart-filter">
                <option>By Resolution</option>
                <option>By File Format</option>
                <option>By Source</option>
              </select>
            </div>
            
            <div className="chart-content">
              <div className="quality-distribution">
                <div className="quality-item">
                  <span className="quality-label">4K+ (2160p)</span>
                  <div className="quality-bar">
                    <div className="quality-fill quality-4k" style={{ width: '32%' }}></div>
                  </div>
                  <span className="quality-count">591 posters</span>
                </div>
                
                <div className="quality-item">
                  <span className="quality-label">HD (1080p)</span>
                  <div className="quality-bar">
                    <div className="quality-fill quality-hd" style={{ width: '45%' }}></div>
                  </div>
                  <span className="quality-count">831 posters</span>
                </div>
                
                <div className="quality-item">
                  <span className="quality-label">Standard (720p)</span>
                  <div className="quality-bar">
                    <div className="quality-fill quality-sd" style={{ width: '18%' }}></div>
                  </div>
                  <span className="quality-count">332 posters</span>
                </div>
                
                <div className="quality-item">
                  <span className="quality-label">Low Quality</span>
                  <div className="quality-bar">
                    <div className="quality-fill quality-low" style={{ width: '5%' }}></div>
                  </div>
                  <span className="quality-count">93 posters</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="stats-details">
          <div className="detail-card">
            <div className="detail-header">
              <h3>Source Analytics</h3>
              <span className="detail-period">All time</span>
            </div>
            
            <div className="sources-breakdown">
              <div className="source-item">
                <div className="source-info">
                  <span className="source-name">TheMovieDB</span>
                  <span className="source-type">API</span>
                </div>
                <div className="source-stats">
                  <span className="source-count">1,234 posters</span>
                  <span className="source-percent">66.8%</span>
                </div>
              </div>
              
              <div className="source-item">
                <div className="source-info">
                  <span className="source-name">Google Drive</span>
                  <span className="source-type">Cloud Storage</span>
                </div>
                <div className="source-stats">
                  <span className="source-count">387 posters</span>
                  <span className="source-percent">21.0%</span>
                </div>
              </div>
              
              <div className="source-item">
                <div className="source-info">
                  <span className="source-name">Manual Upload</span>
                  <span className="source-type">User Added</span>
                </div>
                <div className="source-stats">
                  <span className="source-count">156 posters</span>
                  <span className="source-percent">8.4%</span>
                </div>
              </div>
              
              <div className="source-item">
                <div className="source-info">
                  <span className="source-name">Local Assets</span>
                  <span className="source-type">File System</span>
                </div>
                <div className="source-stats">
                  <span className="source-count">70 posters</span>
                  <span className="source-percent">3.8%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="detail-card">
            <div className="detail-header">
              <h3>File Format Analysis</h3>
              <span className="detail-period">Format distribution</span>
            </div>
            
            <div className="formats-breakdown">
              <div className="format-item">
                <div className="format-icon">🖼️</div>
                <div className="format-info">
                  <span className="format-name">JPEG</span>
                  <span className="format-description">Standard compression</span>
                </div>
                <div className="format-stats">
                  <span className="format-count">1,456 files</span>
                  <span className="format-size">892 MB</span>
                </div>
              </div>
              
              <div className="format-item">
                <div className="format-icon">🎨</div>
                <div className="format-info">
                  <span className="format-name">PNG</span>
                  <span className="format-description">Lossless quality</span>
                </div>
                <div className="format-stats">
                  <span className="format-count">312 files</span>
                  <span className="format-size">267 MB</span>
                </div>
              </div>
              
              <div className="format-item">
                <div className="format-icon">⚡</div>
                <div className="format-info">
                  <span className="format-name">WebP</span>
                  <span className="format-description">Modern compression</span>
                </div>
                <div className="format-stats">
                  <span className="format-count">79 files</span>
                  <span className="format-size">34 MB</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="detail-card">
            <div className="detail-header">
              <h3>Recent Activity Trends</h3>
              <span className="detail-period">Last 30 days</span>
            </div>
            
            <div className="activity-trends">
              <div className="trend-item">
                <span className="trend-date">Dec 9</span>
                <div className="trend-bar">
                  <div className="trend-fill trend-high" style={{ width: '75%' }}></div>
                </div>
                <span className="trend-count">12 added</span>
              </div>
              
              <div className="trend-item">
                <span className="trend-date">Dec 8</span>
                <div className="trend-bar">
                  <div className="trend-fill trend-medium" style={{ width: '45%' }}></div>
                </div>
                <span className="trend-count">7 added</span>
              </div>
              
              <div className="trend-item">
                <span className="trend-date">Dec 7</span>
                <div className="trend-bar">
                  <div className="trend-fill trend-high" style={{ width: '80%' }}></div>
                </div>
                <span className="trend-count">13 added</span>
              </div>
              
              <div className="trend-item">
                <span className="trend-date">Dec 6</span>
                <div className="trend-bar">
                  <div className="trend-fill trend-low" style={{ width: '25%' }}></div>
                </div>
                <span className="trend-count">4 added</span>
              </div>
              
              <div className="trend-item">
                <span className="trend-date">Dec 5</span>
                <div className="trend-bar">
                  <div className="trend-fill trend-medium" style={{ width: '55%' }}></div>
                </div>
                <span className="trend-count">9 added</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosterStatistics;