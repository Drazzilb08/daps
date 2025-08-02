// src/components/poster_search/PosterSearchResults.jsx

import React from 'react';
import { fetchPosterPreviewUrl } from '../../utils/api';
import { humanize } from '../../utils/tools';

function highlight(str, term) {
    if (!term) return str;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(regex, `<span class="highlight">$1</span>`);
}

function groupFilesByOwner(files, ownerKey = 'name') {
    const groups = {};
    files.forEach(fileObj => {
        const owner = fileObj[ownerKey] || 'Unknown';
        if (!groups[owner]) groups[owner] = [];
        groups[owner].push(fileObj);
    });
    return groups;
}

// New: Group assets by source_dir (owner/folder)
function groupFilesBySourceDir(files) {
    const groups = {};
    files.forEach(obj => {
        const dir = obj.source_dir || 'Assets';
        if (!groups[dir]) groups[dir] = [];
        groups[dir].push(obj);
    });
    return groups;
}

export default function PosterSearchResults({
    errorMsg,
    files = [],
    searchTerm,
    currentSort,
    currentView,
    priorityOrder,
    openPosterModal,
    hoverPreviewImgRef,
}) {
    // Error or prompt states
    if (errorMsg) {
        return <div className="poster-search-error">{errorMsg}</div>;
    }
    if (!searchTerm || !searchTerm.trim()) {
        return (
            <div className="poster-search-empty">
                Type a search term and press <b>Enter</b> or click <b>Search</b>.
            </div>
        );
    }
    if (!files.length) {
        return <div className="poster-search-empty">No matching posters found.</div>;
    }

    // Group logic, shared for grid and list
    let groupOrder = [];
    let groups = {};

    // gdrive/custom: group by 'location' (full path), so priorityOrder keys match groupOrder
    if (files.length && files[0].location && !files[0].asset_type) {
        groups = groupFilesByOwner(files, 'location');
        groupOrder = Object.keys(groups);
        if (currentSort === 'priority-asc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? 9999;
                const pb = priorityOrder[b] ?? 9999;
                return pa - pb;
            });
        } else if (currentSort === 'priority-desc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? -1;
                const pb = priorityOrder[b] ?? -1;
                return pb - pa;
            });
        } else if (currentSort === 'alpha') {
            groupOrder = groupOrder.sort((a, b) => a.localeCompare(b));
        } else if (currentSort === 'alpha-desc') {
            groupOrder = groupOrder.sort((a, b) => b.localeCompare(a));
        }
    }
    // assets: group by source_dir and sort groups by priority, posters A->Z inside each group
    else if (files.length && files[0].asset_type) {
        groups = groupFilesBySourceDir(files);
        groupOrder = Object.keys(groups);
        if (currentSort === 'priority-asc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? 9999;
                const pb = priorityOrder[b] ?? 9999;
                return pa - pb; // Lower number = higher priority
            });
        } else if (currentSort === 'priority-desc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? -1;
                const pb = priorityOrder[b] ?? -1;
                return pb - pa; // Higher number = higher priority
            });
        } else {
            groupOrder = groupOrder.sort(); // fallback A->Z
        }
    }
    // fallback for other files: all in one group
    else {
        groups = { Assets: files };
        groupOrder = ['Assets'];
    }

    // --- LIST VIEW ---
    if (currentView === 'list') {
        return (
            <div className="poster-search-results" id="poster-search-results">
                {groupOrder.map(owner => (
                    <React.Fragment key={owner}>
                        {owner !== 'Assets' && (
                            <div className="poster-owner-label">
                                {humanize(groups[owner][0]?.name || owner)}
                            </div>
                        )}
                        {groups[owner]
                            .sort((a, b) => a.file.localeCompare(b.file))
                            .map(obj => (
                                <div
                                    className="poster-list-item"
                                    data-location={encodeURIComponent(obj.location || '')}
                                    data-file={encodeURIComponent(obj.file)}
                                    tabIndex={0}
                                    title={obj.file}
                                    key={obj.id || obj.location + obj.file}
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
                                    {/* Optionally show asset details for assets */}
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
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // --- GRID VIEW ---
    return (
        <div className="poster-search-results" id="poster-search-results">
            {groupOrder.map(owner => {
                // Sort within group alphabetically
                const groupFiles = groups[owner].sort((a, b) => a.file.localeCompare(b.file));
                return (
                    <div className="poster-owner-group" key={owner}>
                        {owner !== 'Assets' && (
                            <div className="poster-owner-label">
                                {humanize(groups[owner][0]?.name || owner)}
                            </div>
                        )}
                        <div className="poster-grid">
                            {groupFiles.map(obj => {
                                let thumbUrl = '';
                                if (obj.folder || obj.location || obj.file) {
                                    const folder = obj.folder || obj.location;
                                    const file = obj.renamed_file || obj.original_file || obj.file;
                                    thumbUrl = fetchPosterPreviewUrl(folder, file);
                                    thumbUrl += thumbUrl.includes('?') ? '&thumb=1' : '?thumb=1';
                                }
                                return (
                                    <div
                                        className="poster-grid-item"
                                        data-owner={owner}
                                        data-location={encodeURIComponent(
                                            obj.folder || obj.location || ''
                                        )}
                                        data-file={encodeURIComponent(
                                            obj.renamed_file || obj.original_file || obj.file
                                        )}
                                        tabIndex={0}
                                        title={obj.file}
                                        key={
                                            obj.id ||
                                            (obj.folder || obj.location || '') +
                                                (obj.renamed_file || obj.original_file || obj.file)
                                        }
                                        onClick={() => openPosterModal(obj)}
                                    >
                                        <img
                                            className="poster-thumb-img"
                                            src={thumbUrl}
                                            alt="thumb"
                                            loading="lazy"
                                        />
                                        <span
                                            className="poster-file-label"
                                            dangerouslySetInnerHTML={{
                                                __html: highlight(obj.file, searchTerm),
                                            }}
                                        />
                                        {/* Optionally show asset details for assets */}
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
            })}
        </div>
    );
}
