import React from 'react';

/**
 * MediaSearch - Media search and discovery interface
 * 
 * Search through media collection with filtering and sorting options.
 * Part of the media management workflow.
 * 
 * @returns {JSX.Element} Media search page component
 */
const MediaSearch = () => {
  return (
    <div className="content-layout">
      <div className="page-header">
        <h1>Media Search</h1>
        <p>Search and discover content in your media collection</p>
      </div>
      
      <div className="search-interface">
        <div className="search-controls">
          <div className="search-input-group">
            <input 
              type="search" 
              placeholder="Search movies, TV shows, or collections..." 
              className="search-input"
            />
            <button className="search-button">Search</button>
          </div>
          
          <div className="search-filters">
            <select className="filter-select" defaultValue="all">
              <option value="all">All Types</option>
              <option value="movies">Movies</option>
              <option value="tv">TV Shows</option>
              <option value="collections">Collections</option>
            </select>
            
            <select className="filter-select" defaultValue="all">
              <option value="all">All Years</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2020s">2020-2029</option>
              <option value="2010s">2010-2019</option>
            </select>
            
            <select className="filter-select" defaultValue="title">
              <option value="title">Sort by Title</option>
              <option value="year">Sort by Year</option>
              <option value="rating">Sort by Rating</option>
              <option value="added">Sort by Date Added</option>
            </select>
          </div>
        </div>
        
        <div className="search-results">
          <div className="results-header">
            <span className="results-count">Found 1,247 items</span>
            <div className="view-toggle">
              <button className="view-button view-button--active">Grid</button>
              <button className="view-button">List</button>
            </div>
          </div>
          
          <div className="media-grid">
            <div className="media-card">
              <div className="media-poster">
                <div className="poster-placeholder">📽️</div>
              </div>
              <div className="media-info">
                <h3>The Matrix</h3>
                <p>1999 • Action, Sci-Fi</p>
                <div className="media-stats">
                  <span className="quality">4K</span>
                  <span className="rating">8.7</span>
                </div>
              </div>
            </div>
            
            <div className="media-card">
              <div className="media-poster">
                <div className="poster-placeholder">📺</div>
              </div>
              <div className="media-info">
                <h3>Breaking Bad</h3>
                <p>2008-2013 • TV Series</p>
                <div className="media-stats">
                  <span className="quality">1080p</span>
                  <span className="rating">9.5</span>
                </div>
              </div>
            </div>
            
            <div className="media-card">
              <div className="media-poster">
                <div className="poster-placeholder">📽️</div>
              </div>
              <div className="media-info">
                <h3>Interstellar</h3>
                <p>2014 • Drama, Sci-Fi</p>
                <div className="media-stats">
                  <span className="quality">4K HDR</span>
                  <span className="rating">8.6</span>
                </div>
              </div>
            </div>
            
            <div className="media-card">
              <div className="media-poster">
                <div className="poster-placeholder">📺</div>
              </div>
              <div className="media-info">
                <h3>The Office</h3>
                <p>2005-2013 • TV Series</p>
                <div className="media-stats">
                  <span className="quality">1080p</span>
                  <span className="rating">8.9</span>
                </div>
              </div>
            </div>
            
            <div className="media-card">
              <div className="media-poster">
                <div className="poster-placeholder">📽️</div>
              </div>
              <div className="media-info">
                <h3>Inception</h3>
                <p>2010 • Action, Thriller</p>
                <div className="media-stats">
                  <span className="quality">4K</span>
                  <span className="rating">8.8</span>
                </div>
              </div>
            </div>
            
            <div className="media-card">
              <div className="media-poster">
                <div className="poster-placeholder">📺</div>
              </div>
              <div className="media-info">
                <h3>Stranger Things</h3>
                <p>2016-2022 • TV Series</p>
                <div className="media-stats">
                  <span className="quality">4K HDR</span>
                  <span className="rating">8.7</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pagination">
            <button className="pagination-button" disabled>Previous</button>
            <span className="pagination-info">Page 1 of 52</span>
            <button className="pagination-button">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaSearch;