// src/components/poster_search/gdrive_search/GdriveSearchResults.jsx

import React from 'react';
import { fetchPosterPreviewUrl } from '../../../utils/api';
import { humanize } from '../../../utils/tools';
import LazyImage from '../../common/LazyImage';

function highlight(str, term) {
    if (!term) return str;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(regex, `<span class="highlight">$1</span>`);
}

function groupFilesByLocation(files) {
    const groups = {};
    files.forEach(fileObj => {
        const location = fileObj.location || 'Unknown';
        if (!groups[location]) groups[location] = [];
        groups[location].push(fileObj);
    });
    return groups;
}

export default function GdriveSearchResults({
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

    // Group logic
    let groupOrder = [];
    let groups = groupFilesByLocation(files);
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

    // --- LIST VIEW ---
    if (currentView === 'list') {
        return (
            <div className="poster-search-results" id="poster-search-results">
                {groupOrder.map(location => (
                    <React.Fragment key={location}>
                        <div className="poster-owner-label">
                            {humanize(groups[location][0]?.name || location)}
                        </div>
                        {groups[location]
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
            {groupOrder.map(location => {
                const groupFiles = groups[location].sort((a, b) => a.file.localeCompare(b.file));
                return (
                    <div className="poster-owner-group" key={location}>
                        <div className="poster-owner-label">
                            {humanize(groups[location][0]?.name || location)}
                        </div>
                        <div className="poster-grid">
                            {groupFiles.map(obj => {
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
                                        data-owner={location}
                                        data-location={encodeURIComponent(obj.location || '')}
                                        data-file={encodeURIComponent(obj.file)}
                                        tabIndex={0}
                                        title={obj.file}
                                        key={obj.id || obj.location + obj.file}
                                        onClick={() => openPosterModal(obj)}
                                    >
                                        <LazyImage
                                            src={thumbUrl}
                                            alt={obj.file}
                                            className="poster-thumb-img"
                                            threshold={0.1}
                                            rootMargin="100px"
                                        />
                                        <span
                                            className="poster-file-label"
                                            dangerouslySetInnerHTML={{
                                                __html: highlight(obj.file, searchTerm),
                                            }}
                                        />
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