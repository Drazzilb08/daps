import React from 'react';

/**
 * AssetsSearch - Local assets search interface
 * 
 * Search through local poster assets and artwork collection.
 * Part of the poster management workflow.
 * 
 * @returns {JSX.Element} Assets search page component
 */
const AssetsSearch = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Local Assets Search</h1>
        <p>Search and manage your local poster assets and artwork collection</p>
      </div>
      
      <div className="search-interface">
        <div className="search-controls">
          <div className="search-input-group">
            <input 
              type="search" 
              placeholder="Search local assets by name or metadata..." 
              className="search-input"
            />
            <button className="search-button">Search Assets</button>
          </div>
          
          <div className="search-filters">
            <select className="filter-select" defaultValue="all">
              <option value="all">All Asset Types</option>
              <option value="poster">Posters</option>
              <option value="backdrop">Backdrops</option>
              <option value="banner">Banners</option>
              <option value="logo">Logos</option>
              <option value="clearart">Clear Art</option>
              <option value="thumb">Thumbnails</option>
            </select>
            
            <select className="filter-select" defaultValue="all">
              <option value="all">All Folders</option>
              <option value="movies">Movies</option>
              <option value="tv">TV Shows</option>
              <option value="collections">Collections</option>
              <option value="seasonal">Seasonal</option>
            </select>
            
            <select className="filter-select" defaultValue="modified">
              <option value="modified">Sort by Modified</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="resolution">Sort by Resolution</option>
            </select>
          </div>
        </div>
        
        <div className="assets-status">
          <div className="status-info">
            <div className="scan-status">
              <div className="status-indicator status-good">Up to date</div>
              <span>Last scan: 2 minutes ago</span>
            </div>
            
            <div className="assets-stats">
              <span>Total assets: 2,847</span>
              <span>Storage: 1.2 GB</span>
              <span>Formats: 5</span>
            </div>
            
            <div className="scan-actions">
              <button className="scan-button">Rescan Assets</button>
              <button className="organize-button">Auto-organize</button>
            </div>
          </div>
        </div>
        
        <div className="search-results">
          <div className="results-header">
            <span className="results-count">Found 2,847 asset files</span>
            <div className="view-options">
              <div className="view-toggle">
                <button className="view-button view-button--active">Grid</button>
                <button className="view-button">List</button>
                <button className="view-button">Detail</button>
              </div>
              
              <div className="size-slider">
                <label>Thumbnail Size:</label>
                <input type="range" min="100" max="300" defaultValue="150" />
              </div>
            </div>
          </div>
          
          <div className="assets-grid">
            <div className="asset-card">
              <div className="asset-preview">
                <div className="asset-thumbnail">📽️</div>
                <div className="asset-overlay">
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Delete</button>
                </div>
              </div>
              <div className="asset-info">
                <h4>poster.jpg</h4>
                <div className="asset-details">
                  <span className="asset-size">2000x3000</span>
                  <span className="file-size">1.8 MB</span>
                </div>
                <div className="asset-path">/assets/movies/the-matrix/</div>
                <div className="asset-meta">
                  <span className="asset-type">Movie Poster</span>
                  <span className="asset-quality">High Quality</span>
                </div>
              </div>
            </div>
            
            <div className="asset-card">
              <div className="asset-preview">
                <div className="asset-thumbnail">🖼️</div>
                <div className="asset-overlay">
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Delete</button>
                </div>
              </div>
              <div className="asset-info">
                <h4>fanart.jpg</h4>
                <div className="asset-details">
                  <span className="asset-size">1920x1080</span>
                  <span className="file-size">2.4 MB</span>
                </div>
                <div className="asset-path">/assets/movies/inception/</div>
                <div className="asset-meta">
                  <span className="asset-type">Backdrop</span>
                  <span className="asset-quality">HD</span>
                </div>
              </div>
            </div>
            
            <div className="asset-card">
              <div className="asset-preview">
                <div className="asset-thumbnail">📺</div>
                <div className="asset-overlay">
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Delete</button>
                </div>
              </div>
              <div className="asset-info">
                <h4>banner.png</h4>
                <div className="asset-details">
                  <span className="asset-size">1000x185</span>
                  <span className="file-size">456 KB</span>
                </div>
                <div className="asset-path">/assets/tv/breaking-bad/</div>
                <div className="asset-meta">
                  <span className="asset-type">TV Banner</span>
                  <span className="asset-quality">Standard</span>
                </div>
              </div>
            </div>
            
            <div className="asset-card">
              <div className="asset-preview">
                <div className="asset-thumbnail">🎭</div>
                <div className="asset-overlay">
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Delete</button>
                </div>
              </div>
              <div className="asset-info">
                <h4>clearlogo.png</h4>
                <div className="asset-details">
                  <span className="asset-size">800x400</span>
                  <span className="file-size">89 KB</span>
                </div>
                <div className="asset-path">/assets/tv/stranger-things/</div>
                <div className="asset-meta">
                  <span className="asset-type">Clear Logo</span>
                  <span className="asset-quality">Vector</span>
                </div>
              </div>
            </div>
            
            <div className="asset-card">
              <div className="asset-preview">
                <div className="asset-thumbnail">🌟</div>
                <div className="asset-overlay">
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Delete</button>
                </div>
              </div>
              <div className="asset-info">
                <h4>collection-poster.jpg</h4>
                <div className="asset-details">
                  <span className="asset-size">1400x2100</span>
                  <span className="file-size">1.1 MB</span>
                </div>
                <div className="asset-path">/assets/collections/mcu/</div>
                <div className="asset-meta">
                  <span className="asset-type">Collection</span>
                  <span className="asset-quality">High Quality</span>
                </div>
              </div>
            </div>
            
            <div className="asset-card">
              <div className="asset-preview">
                <div className="asset-thumbnail">🎬</div>
                <div className="asset-overlay">
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Delete</button>
                </div>
              </div>
              <div className="asset-info">
                <h4>landscape.webp</h4>
                <div className="asset-details">
                  <span className="asset-size">1280x720</span>
                  <span className="file-size">234 KB</span>
                </div>
                <div className="asset-path">/assets/movies/interstellar/</div>
                <div className="asset-meta">
                  <span className="asset-type">Landscape</span>
                  <span className="asset-quality">Optimized</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pagination">
            <button className="pagination-button" disabled>Previous</button>
            <span className="pagination-info">Page 1 of 475</span>
            <button className="pagination-button">Next</button>
          </div>
        </div>
        
        <div className="bulk-actions">
          <div className="bulk-selection">
            <input type="checkbox" id="select-all" />
            <label htmlFor="select-all">Select All</label>
            <span className="selection-count">0 items selected</span>
          </div>
          
          <div className="bulk-buttons">
            <button className="bulk-button">Move to Folder</button>
            <button className="bulk-button">Rename Batch</button>
            <button className="bulk-button">Export Selected</button>
            <button className="bulk-button bulk-button--danger">Delete Selected</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsSearch;