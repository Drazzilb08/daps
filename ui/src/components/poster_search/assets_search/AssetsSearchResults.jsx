// src/components/poster_search/assets_search/AssetsSearchResults.jsx

import React from 'react';
import { fetchPosterPreviewUrl } from '../../../utils/api';
import LazyImage from '../../common/LazyImage';

function highlight(str, term) {
    if (!term) return str;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(regex, `<span class="highlight">$1</span>`);
}

export default function AssetsSearchResults({
    errorMsg,
    files = [],
    searchTerm,
    currentSort,
    currentView,
    openPosterModal,
    hoverPreviewImgRef,
}) {
    if (errorMsg) {
        return <div className="poster-search-error">{errorMsg}</div>;
    }
    if (!files.length) {
        return <div className="poster-search-empty">No matching posters found.</div>;
    }

    // Sort files flat (NO grouping)
    let sortedFiles = [...files];
    if (currentSort === 'alpha') {
        sortedFiles.sort((a, b) => a.file.localeCompare(b.file));
    } else if (currentSort === 'alpha-desc') {
        sortedFiles.sort((a, b) => b.file.localeCompare(a.file));
    } else if (currentSort === 'date') {
        sortedFiles.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.added_at || 0);
            const dateB = new Date(b.updated_at || b.added_at || 0);
            return dateB - dateA;
        });
    }

    // --- LIST VIEW ---
    if (currentView === 'list') {
        return (
            <div className="poster-search-results" id="poster-search-results">
                {sortedFiles.map(obj => (
                    <div
                        className="poster-list-item"
                        data-location={encodeURIComponent(obj.location || '')}
                        data-file={encodeURIComponent(obj.file)}
                        tabIndex={0}
                        title={obj.file}
                        key={[
                            obj.asset_type || 'asset',
                            obj.id ?? '',
                            obj.location ?? '',
                            obj.file ?? '',
                        ].join('|')}
                        onClick={() => openPosterModal(obj)}
                        onMouseOver={() => {
                            const img = hoverPreviewImgRef?.current;
                            if (img && obj.location && obj.file) {
                                let url = fetchPosterPreviewUrl(
                                    obj.location,
                                    obj.relativeFile || obj.file
                                );
                                url += url.includes('?') ? '&thumb=1' : '?thumb=1';
                                img.src = url;
                                img.style.display = 'block';
                            }
                        }}
                        onMouseOut={() => {
                            const img = hoverPreviewImgRef?.current;
                            if (img) {
                                img.style.display = 'none';
                                img.src = '';
                            }
                        }}
                        onMouseMove={e => {
                            const img = hoverPreviewImgRef?.current;
                            if (img && img.style.display === 'block') {
                                const imgWidth = img.naturalWidth
                                    ? Math.min(img.naturalWidth, 200)
                                    : 200;
                                const imgHeight = img.naturalHeight
                                    ? Math.min(img.naturalHeight, 200)
                                    : 200;
                                const vpWidth = window.innerWidth;
                                const vpHeight = window.innerHeight;
                                let left = e.pageX + 14;
                                let top = e.pageY + 14;
                                if (left + imgWidth > vpWidth - 10)
                                    left = Math.max(10, vpWidth - imgWidth - 10);
                                if (top + imgHeight > vpHeight - 10)
                                    top = Math.max(10, vpHeight - imgHeight - 10);
                                img.style.left = left + 'px';
                                img.style.top = top + 'px';
                            }
                        }}
                    >
                        <span
                            className="poster-file-label"
                            dangerouslySetInnerHTML={{
                                __html: highlight(obj.file, searchTerm),
                            }}
                        />
                        {obj.asset_type && (
                            <div className="poster-asset-meta">
                                {obj.asset_type === 'movie' && obj.year && (
                                    <span className="meta-movie">
                                        {obj.title} ({obj.year})
                                    </span>
                                )}
                                {obj.asset_type === 'show' && (
                                    <span className="meta-show">
                                        {obj.title}
                                        {obj.season_number != null
                                            ? ` — Season ${obj.season_number}`
                                            : ''}
                                    </span>
                                )}
                                {obj.asset_type === 'collection' && (
                                    <span className="meta-collection">
                                        {obj.title} (Collection)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // --- GRID VIEW ---
    return (
        <div className="poster-search-results" id="poster-search-results">
            <div className="poster-grid">
                {sortedFiles.map(obj => {
                    let thumbUrl = '';
                    if (obj.location && obj.file) {
                        thumbUrl = fetchPosterPreviewUrl(
                            obj.location,
                            obj.relativeFile || obj.file
                        );
                        thumbUrl += thumbUrl.includes('?') ? '&thumb=1' : '?thumb=1';
                    }
                    return (
                        <div
                            className="poster-grid-item"
                            data-location={encodeURIComponent(obj.location || '')}
                            data-file={encodeURIComponent(obj.file)}
                            tabIndex={0}
                            title={obj.file}
                            key={[
                                obj.asset_type || 'asset',
                                obj.id ?? '',
                                obj.location ?? '',
                                obj.file ?? '',
                            ].join('|')}
                            onClick={() => openPosterModal(obj)}
                        >
                            {thumbUrl && (
                                <LazyImage
                                    src={thumbUrl}
                                    alt={obj.file}
                                    className="poster-thumb-img"
                                    threshold={0.1}
                                    rootMargin="100px"
                                />
                            )}
                            <span
                                className="poster-file-label"
                                dangerouslySetInnerHTML={{
                                    __html: highlight(obj.file, searchTerm),
                                }}
                            />
                            {obj.asset_type && (
                                <div className="poster-asset-meta">
                                    {obj.asset_type === 'movie' && obj.year && (
                                        <span className="meta-movie">
                                            {obj.title} ({obj.year})
                                        </span>
                                    )}
                                    {obj.asset_type === 'show' && (
                                        <span className="meta-show">
                                            {obj.title}
                                            {obj.season_number != null
                                                ? ` — Season ${obj.season_number}`
                                                : ''}
                                        </span>
                                    )}
                                    {obj.asset_type === 'collection' && (
                                        <span className="meta-collection">
                                            {obj.title} (Collection)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}