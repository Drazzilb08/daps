// src/components/fields/image/PosterField.jsx

import React, { useRef, useState } from 'react';
import { getIcon, humanize, getSpinner } from '../../../utils/tools';
import { useToast } from '../../providers/ToastProvider';
import { deleteCollectionCacheById, deleteMediaCacheById, uploadMediaById, uploadCollectionById } from '../../../utils/api';
import TooltipFactory from '../../../components/Tooltip';

// Helper to get file name only (no dirs)
function getFileName(path) {
    if (!path) return '';
    return path.split(/[\\/]/).pop();
}

// Helper to join paths, always using /
function joinPaths(a, b) {
    if (!a && !b) return '';
    if (!a) return b;
    if (!b) return a;
    return a.replace(/[\\/]+$/, '') + '/' + b.replace(/^[\\/]+/, '');
}

export default function PosterField({ field, entry = {} }) {
    const obj = { ...field, ...entry };
    const isAsset = !!obj.asset_type;

    // IDs
    const tmdbId =
        obj.tmdb_id ||
        (obj.file && /\{tmdb-(\d+)\}/i.test(obj.file)
            ? obj.file.match(/\{tmdb-(\d+)\}/i)[1]
            : null);
    const tvdbId =
        obj.tvdb_id ||
        (obj.file && /\{tvdb-(\d+)\}/i.test(obj.file)
            ? obj.file.match(/\{tvdb-(\d+)\}/i)[1]
            : null);
    const imdbId =
        obj.imdb_id ||
        (obj.file && /\{imdb-tt(\d+)\}/i.test(obj.file)
            ? 'tt' + obj.file.match(/\{imdb-tt(\d+)\}/i)[1]
            : null);

    // Meta
    const type = obj.asset_type;
    const showTitle = obj.title || '';
    const year = obj.year || '';
    const dbId = obj.id;
    const season = obj.season_number != null ? obj.season_number : null;
    const instanceName = obj.instance_name;
    const originalFile = obj.original_file || obj.file;
    const owner = originalFile ? originalFile.split(/[\\/]/).slice(-2, -1)[0] || '' : '';
    const sourceName = instanceName ? humanize(instanceName) : '';
    const imgSrc = obj.previewUrl || obj.value || '';
    const [uploading, setUploading] = useState(false);

    // --- File path and file name logic ---
    let filePathToCopy = '';
    let fileNameToCopy = getFileName(obj.file || obj.caption || '');

    if (isAsset) {
        filePathToCopy = obj.file || '';
    } else {
        filePathToCopy = joinPaths(obj.location, obj.file);
    }

    // --- Copy feedback state ---
    const [copyNameIcon, setCopyNameIcon] = useState('mi:content_copy');
    const [copyPathIcon, setCopyPathIcon] = useState('mi:folder_open');
    const toast = useToast();

    // --- Tooltip Refs and State ---
    const copyNameRef = useRef();
    const copyPathRef = useRef();
    const uploadRef = useRef();
    const deleteRef = useRef();

    const [showCopyNameTip, setShowCopyNameTip] = useState(false);
    const [showCopyPathTip, setShowCopyPathTip] = useState(false);
    const [showUploadTip, setShowUploadTip] = useState(false);
    const [showDeleteTip, setShowDeleteTip] = useState(false);

    function handleCopy(text, which) {
        navigator.clipboard.writeText(text).then(
            () => {
                if (which === 'name') setCopyNameIcon('mi:check');
                if (which === 'path') setCopyPathIcon('mi:check');
                toast('Copied!', 'success');
                setTimeout(() => {
                    if (which === 'name') setCopyNameIcon('mi:content_copy');
                    if (which === 'path') setCopyPathIcon('mi:folder_open');
                }, 1200);
            },
            () => {
                if (which === 'name') setCopyNameIcon('mi:close');
                if (which === 'path') setCopyPathIcon('mi:close');
                toast('Failed to copy!', 'error');
                setTimeout(() => {
                    if (which === 'name') setCopyNameIcon('mi:content_copy');
                    if (which === 'path') setCopyPathIcon('mi:folder_open');
                }, 1200);
            }
        );
    }

    function renderMetaLine() {
        return (
            <div className="modal-poster-meta">
                {type && (
                    <span className={`meta-type meta-type-${type}`}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}{' '}
                    </span>
                )}
                {showTitle && <span className="meta-title">{showTitle}</span>}
                {year && <span className="meta-year"> ({year})</span>}
                {(dbId || season !== null) && (
                    <>
                        {dbId && (
                            <span className="meta-dapsid" style={{ marginLeft: 8 }}>
                                <b>ID:</b> {dbId}
                            </span>
                        )}
                        {season !== null && (
                            <span className="meta-season" style={{ marginLeft: 12 }}>
                                <b>Season:</b> {season}
                            </span>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="modal-poster-preview">
            <img className="modal-poster-img" src={imgSrc} alt={showTitle || 'Poster Preview'} />

            {renderMetaLine()}

            <div className="modal-poster-info">
                {owner && (
                    <span className="meta-owner">
                        <b>Owner:</b> {owner}
                    </span>
                )}
                {sourceName && (
                    <span className="meta-source" style={{ marginLeft: 12 }}>
                        <b>Source:</b> {sourceName}
                    </span>
                )}
            </div>

            <div className="modal-poster-action-row">
                {imdbId && (
                    <span className="id-link-wrap">
                        <a
                            href={`https://www.imdb.com/title/${imdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="id-link"
                        >
                            {getIcon('imdb')}
                            <span className="id-label">{imdbId}</span>
                        </a>
                    </span>
                )}
                {tmdbId && (
                    <span className="id-link-wrap">
                        <a
                            href={`https://www.themoviedb.org/${type === 'show' ? 'tv' : 'movie'}/${tmdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="id-link"
                        >
                            {getIcon('tmdb')}
                            <span className="id-label">{tmdbId}</span>
                        </a>
                    </span>
                )}
                {tvdbId && (
                    <span className="id-link-wrap">
                        <a
                            href={`https://thetvdb.com/?tab=series&id=${tvdbId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="id-link"
                        >
                            {getIcon('tvdb')}
                            <span className="id-label">{tvdbId}</span>
                        </a>
                    </span>
                )}

                {/* --- ACTION BUTTONS WITH PORTAL TOOLTIP --- */}
                <div className="modal-button-controls">
                    {/* Copy Name */}
                    <button
                        type="button"
                        className="btn--icon"
                        ref={copyNameRef}
                        aria-label="Copy file name"
                        tabIndex={0}
                        onClick={() => handleCopy(fileNameToCopy, 'name')}
                        onMouseEnter={() => setShowCopyNameTip(true)}
                        onMouseLeave={() => setShowCopyNameTip(false)}
                        onFocus={() => setShowCopyNameTip(true)}
                        onBlur={() => setShowCopyNameTip(false)}
                    >
                        {getIcon(copyNameIcon)}
                    </button>
                    <TooltipFactory
                        anchor={copyNameRef.current}
                        text="Copy file name"
                        show={showCopyNameTip}
                    />

                    {/* Copy Path */}
                    <button
                        type="button"
                        className="btn--icon"
                        ref={copyPathRef}
                        aria-label="Copy full file path"
                        tabIndex={0}
                        onClick={() => handleCopy(filePathToCopy, 'path')}
                        onMouseEnter={() => setShowCopyPathTip(true)}
                        onMouseLeave={() => setShowCopyPathTip(false)}
                        onFocus={() => setShowCopyPathTip(true)}
                        onBlur={() => setShowCopyPathTip(false)}
                    >
                        {getIcon(copyPathIcon)}
                    </button>
                    <TooltipFactory
                        anchor={copyPathRef.current}
                        text="Copy full file path"
                        show={showCopyPathTip}
                    />

                    {/* Upload – only for asset */}
                    {isAsset && (
                        <>
                            <button
                                type="button"
                                className="btn--icon"
                                ref={uploadRef}
                                aria-label="Upload poster"
                                disabled={uploading}
                                onClick={async () => {
                                setUploading(true);
                                try {
                                    let result;
                                    if (obj.asset_type === 'collection') {
                                        result = await uploadCollectionById(obj.id);
                                    } else {
                                        result = await uploadMediaById(obj.id);
                                    }
                                    if (result.success) {
                                        toast('Upload succeeded!', 'success');
                                    } else {
                                        toast('Upload failed!', 'error');
                                    }
                                } catch {
                                    toast('Upload failed!', 'error');
                                } finally {
                                    setUploading(false);
                                }
                            }}
                                onMouseEnter={() => setShowUploadTip(true)}
                                onMouseLeave={() => setShowUploadTip(false)}
                                onFocus={() => setShowUploadTip(true)}
                                onBlur={() => setShowUploadTip(false)}
                            >
                                {uploading ? getSpinner() : getIcon('mi:upload')}
                            </button>

                            <TooltipFactory
                                anchor={uploadRef.current}
                                text="Upload to Plex"
                                show={showUploadTip}
                            />

                            {/* Delete */}
                            <button
                                type="button"
                                className="btn--icon"
                                ref={deleteRef}
                                aria-label="Delete poster"
                                style={{ color: 'var(--error)' }}
                                onClick={async () => {
                                    if (
                                        !window.confirm(
                                            'Are you sure you want to delete this item?'
                                        )
                                    )
                                        return;
                                    try {
                                        if (obj.asset_type === 'collection') {
                                            await deleteCollectionCacheById(obj.id);
                                        } else {
                                            await deleteMediaCacheById(obj.id);
                                        }
                                        toast('Deleted!', 'success');
                                        if (typeof obj.onDeleted === 'function') obj.onDeleted();
                                    } catch {
                                        toast('Delete failed!', 'error');
                                    }
                                }}
                                onMouseEnter={() => setShowDeleteTip(true)}
                                onMouseLeave={() => setShowDeleteTip(false)}
                                onFocus={() => setShowDeleteTip(true)}
                                onBlur={() => setShowDeleteTip(false)}
                            >
                                {getIcon('mi:delete')}
                            </button>
                            <TooltipFactory
                                anchor={deleteRef.current}
                                text="Delete item in Database"
                                show={showDeleteTip}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
