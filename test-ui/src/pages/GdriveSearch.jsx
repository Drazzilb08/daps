import React from 'react';

/**
 * GdriveSearch - Google Drive poster search interface
 * 
 * Search for movie and TV show posters and artwork in Google Drive.
 * Part of the poster management workflow.
 * 
 * @returns {JSX.Element} Google Drive search page component
 */
const GdriveSearch = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Google Drive Poster Search</h1>
        <p>Search for posters and artwork in your Google Drive collection</p>
      </div>
      
      <div className="search-interface">
        <div className="search-controls">
          <div className="search-input-group">
            <input 
              type="search" 
              placeholder="Search for movie or TV show posters..." 
              className="search-input"
            />
            <button className="search-button">Search Drive</button>
          </div>
          
          <div className="search-filters">
            <select className="filter-select" defaultValue="all">
              <option value="all">All Types</option>
              <option value="poster">Movie Posters</option>
              <option value="backdrop">Backdrops</option>
              <option value="banner">TV Banners</option>
              <option value="logo">Logo Assets</option>
            </select>
            
            <select className="filter-select" defaultValue="all">
              <option value="all">All Formats</option>
              <option value="jpg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
            
            <select className="filter-select" defaultValue="any">
              <option value="any">Any Resolution</option>
              <option value="hd">HD (1080p+)</option>
              <option value="4k">4K+</option>
              <option value="large">Large (2000px+)</option>
            </select>
          </div>
        </div>
        
        <div className="drive-status">
          <div className="status-info">
            <div className="connection-status">
              <div className="status-indicator status-good">Connected</div>
              <span>Google Drive API</span>
            </div>
            
            <div className="quota-info">
              <span>Quota: 892/1000 requests</span>
              <span>Reset: 45 minutes</span>
            </div>
          </div>
        </div>
        
        <div className="search-results">
          <div className="results-header">
            <span className="results-count">Found 156 poster files</span>
            <div className="view-toggle">
              <button className="view-button view-button--active">Grid</button>
              <button className="view-button">List</button>
            </div>
          </div>
          
          <div className="poster-grid">
            <div className="poster-card">
              <div className="poster-preview">
                <div className="poster-placeholder">🖼️</div>
                <div className="poster-overlay">
                  <button className="download-button">Download</button>
                  <button className="preview-button">Preview</button>
                </div>
              </div>
              <div className="poster-info">
                <h3>The Matrix - Poster.jpg</h3>
                <div className="poster-details">
                  <span className="poster-size">2000x3000</span>
                  <span className="file-size">1.2 MB</span>
                  <span className="poster-format">JPEG</span>
                </div>
                <div className="poster-path">/Movies/Action/The Matrix/</div>
              </div>
            </div>
            
            <div className="poster-card">
              <div className="poster-preview">
                <div className="poster-placeholder">🖼️</div>
                <div className="poster-overlay">
                  <button className="download-button">Download</button>
                  <button className="preview-button">Preview</button>
                </div>
              </div>
              <div className="poster-info">
                <h3>Inception - Backdrop.jpg</h3>
                <div className="poster-details">
                  <span className="poster-size">3840x2160</span>
                  <span className="file-size">3.8 MB</span>
                  <span className="poster-format">JPEG</span>
                </div>
                <div className="poster-path">/Movies/Sci-Fi/Inception/</div>
              </div>
            </div>
            
            <div className="poster-card">
              <div className="poster-preview">
                <div className="poster-placeholder">🖼️</div>
                <div className="poster-overlay">
                  <button className="download-button">Download</button>
                  <button className="preview-button">Preview</button>
                </div>
              </div>
              <div className="poster-info">
                <h3>Breaking Bad - Banner.png</h3>
                <div className="poster-details">
                  <span className="poster-size">1920x1080</span>
                  <span className="file-size">2.1 MB</span>
                  <span className="poster-format">PNG</span>
                </div>
                <div className="poster-path">/TV Shows/Drama/Breaking Bad/</div>
              </div>
            </div>
            
            <div className="poster-card">
              <div className="poster-preview">
                <div className="poster-placeholder">🖼️</div>
                <div className="poster-overlay">
                  <button className="download-button">Download</button>
                  <button className="preview-button">Preview</button>
                </div>
              </div>
              <div className="poster-info">
                <h3>Stranger Things - Logo.webp</h3>
                <div className="poster-details">
                  <span className="poster-size">1500x800</span>
                  <span className="file-size">156 KB</span>
                  <span className="poster-format">WebP</span>
                </div>
                <div className="poster-path">/TV Shows/Sci-Fi/Stranger Things/</div>
              </div>
            </div>
            
            <div className="poster-card">
              <div className="poster-preview">
                <div className="poster-placeholder">🖼️</div>
                <div className="poster-overlay">
                  <button className="download-button">Download</button>
                  <button className="preview-button">Preview</button>
                </div>
              </div>
              <div className="poster-info">
                <h3>The Office - Collection.jpg</h3>
                <div className="poster-details">
                  <span className="poster-size">1400x2100</span>
                  <span className="file-size">890 KB</span>
                  <span className="poster-format">JPEG</span>
                </div>
                <div className="poster-path">/TV Shows/Comedy/The Office/</div>
              </div>
            </div>
            
            <div className="poster-card">
              <div className="poster-preview">
                <div className="poster-placeholder">🖼️</div>
                <div className="poster-overlay">
                  <button className="download-button">Download</button>
                  <button className="preview-button">Preview</button>
                </div>
              </div>
              <div className="poster-info">
                <h3>Interstellar - IMAX.jpg</h3>
                <div className="poster-details">
                  <span className="poster-size">4096x6144</span>
                  <span className="file-size">8.2 MB</span>
                  <span className="poster-format">JPEG</span>
                </div>
                <div className="poster-path">/Movies/Drama/Interstellar/</div>
              </div>
            </div>
          </div>
          
          <div className="pagination">
            <button className="pagination-button" disabled>Previous</button>
            <span className="pagination-info">Page 1 of 26</span>
            <button className="pagination-button">Next</button>
          </div>
        </div>
        
        <div className="bulk-actions">
          <button className="bulk-button">Download Selected</button>
          <button className="bulk-button">Add to Collection</button>
          <span className="selection-count">3 items selected</span>
        </div>
      </div>
    </div>
  );
};

export default GdriveSearch;