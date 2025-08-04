// src/pages/GdriveSearch.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { fetchConfig, fetchPosters } from '../utils/api';
import { getSpinner } from '../utils/tools';
import GdriveSearchControls from '../components/poster_search/gdrive_search/GdriveSearchControls';
import GdriveSearchResults from '../components/poster_search/gdrive_search/GdriveSearchResults';
import PosterSearchModalTrigger from '../components/poster_search/PosterSearchModalTrigger';
import usePosterSearchHoverPreview from '../components/poster_search/PosterSearchHoverPreview';
import { useToast } from '../components/providers/ToastProvider';
import '../css/poster_search.css';

function isImageFile(filename) {
    return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

export default function GdriveSearch() {
    const [, setConfig] = useState({});
    const [, setGdriveLocations] = useState([]);
    const [customLocations, setCustomLocations] = useState([]);
    const [gdriveFiles, setGdriveFiles] = useState([]);
    const [customFiles, setCustomFiles] = useState([]);
    const [priorityOrder, setPriorityOrder] = useState({});
    const [currentSource, setCurrentSource] = useState('gdrive');
    const [currentSort, setCurrentSort] = useState('priority-asc');
    const [currentView, setCurrentView] = useState('grid');
    const [errorMsg, setErrorMsg] = useState(null);

    // Search state
    const [pendingSearchTerm, setPendingSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // Owner filter
    const [selectedGDriveOwner, setSelectedGDriveOwner] = useState('');

    // Modal
    const [modalInfo, setModalInfo] = useState(null);

    // Hover preview
    const hoverPreviewImgRef = usePosterSearchHoverPreview();
    const toast = useToast();

    // Reset all state on source change
    useEffect(() => {
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchResults([]);
        setSelectedGDriveOwner('');
    }, [currentSource]);

    // --- Load config, GDrive, Custom file lists on mount ---
    useEffect(() => {
        let cancelled = false;
        setErrorMsg(null);

        (async () => {
            let cfg = await fetchConfig();
            if (cancelled) return;
            setConfig(cfg);

            // GDrive Locations & Files
            let gdriveLocs =
                (cfg.sync_gdrive?.gdrive_list || []).map(g => ({
                    name: g.name,
                    location: g.location,
                })) || [];
            setGdriveLocations(gdriveLocs);

            // Custom Locations
            const gdriveLocSet = new Set(gdriveLocs.map(g => g.location));
            const sourceDirs = cfg.poster_renamerr?.source_dirs || [];
            const customLocs = sourceDirs.filter(dir => !gdriveLocSet.has(dir));
            setCustomLocations(customLocs);

            // Fetch files for GDrive/Custom
            let _gdriveFiles = [];
            let _customFiles = [];
            let errorSources = [];
            for (const { name, location } of gdriveLocs) {
                const stats = await fetchPosters(location);
                if (stats.error || !Array.isArray(stats.files)) {
                    errorSources.push('GDrive');
                    continue;
                }
                stats.files.forEach(f => _gdriveFiles.push({ file: f, name, location }));
            }
            setGdriveFiles(_gdriveFiles);

            for (const dir of customLocs) {
                const stats = await fetchPosters(dir);
                if (stats.error || !Array.isArray(stats.files)) {
                    errorSources.push('Custom');
                    continue;
                }
                _customFiles.push(
                    ...stats.files.map(f => ({
                        file: f,
                        name: dir.split('/').pop() + ' (Custom)',
                        location: dir,
                    }))
                );
            }
            setCustomFiles(_customFiles);

            // Priority order
            const dirs = cfg.poster_renamerr?.source_dirs || [];
            const order = {};
            dirs.forEach((dir, idx) => {
                order[dir] = dirs.length - idx - 1;
            });
            setPriorityOrder(order);

            // Show error if none
            if (!_gdriveFiles.length && !_customFiles.length) {
                setErrorMsg(
                    <div>
                        <b>No GDrive or Custom poster sources found or could not be loaded.</b>
                        <br />
                        Please check your{' '}
                        <a href="/pages/settings?module_name=poster_renamerr">
                            Poster Renamerr settings
                        </a>{' '}
                        or <a href="/pages/settings?module_name=gdrive">GDrive settings</a>
                    </div>
                );
            }
        })();
    }, []);

    // --- SEARCH HANDLER ---
    const handleSearch = useCallback(
        overrideTerm => {
            function getAllFiles() {
                if (currentSource === 'gdrive') return gdriveFiles;
                if (currentSource === 'custom') return customFiles;
                return [];
            }

            setIsSearching(true);
            setTimeout(() => {
                let allFiles = getAllFiles();
                let filtered = allFiles.filter(obj => obj.file && isImageFile(obj.file));

                // GDrive owner filter
                if (currentSource === 'gdrive' && selectedGDriveOwner) {
                    filtered = filtered.filter(obj => obj.name === selectedGDriveOwner);
                }

                // Search term
                const term = overrideTerm !== undefined ? overrideTerm : pendingSearchTerm;
                if (term && term.trim()) {
                    const lc = term.trim().toLowerCase();
                    filtered = filtered.filter(obj => obj.file.toLowerCase().includes(lc));
                }

                setSearchTerm(term || '');
                setSearchResults(filtered);
                setIsSearching(false);
            }, 0);
        },
        [currentSource, gdriveFiles, customFiles, pendingSearchTerm, selectedGDriveOwner]
    );

    // --- GDrive Owners List (deduped, sorted) ---
    const gdriveOwners = Array.from(new Set(gdriveFiles.map(f => f.name).filter(Boolean))).sort();

    // --- Filter/SORT change: immediately update results IF there is an active search term or last search was performed ---
    useEffect(() => {
        if (searchTerm) {
            handleSearch(searchTerm);
        }
    }, [selectedGDriveOwner, currentSort, handleSearch, searchTerm]);

    // Only run search when user hits Enter/search button in controls
    const handlePendingSearch = () => {
        handleSearch();
    };

    // Clear search bar AND results
    const handleClearSearch = () => {
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchResults([]);
    };

    // Open modal handler
    const handleOpenModal = obj => {
        setModalInfo(obj);
    };

    // Close modal handler
    const handleCloseModal = () => setModalInfo(null);

    return (
        <div className="poster-search-root">
            <div className="poster-search-card">
                <div className="poster-search-content">
                    <GdriveSearchControls
                        currentSource={currentSource}
                        setCurrentSource={setCurrentSource}
                        currentSort={currentSort}
                        setCurrentSort={setCurrentSort}
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                        pendingSearchTerm={pendingSearchTerm}
                        setPendingSearchTerm={setPendingSearchTerm}
                        onSearch={handlePendingSearch}
                        onClearSearch={handleClearSearch}
                        customLocations={customLocations}
                        isSearching={isSearching}
                        gdriveOwners={gdriveOwners}
                        selectedGDriveOwner={selectedGDriveOwner}
                        setSelectedGDriveOwner={setSelectedGDriveOwner}
                        showGDriveOwnerFilter={currentSource === 'gdrive'}
                    />
                    {isSearching ? (
                        <div style={{ textAlign: 'center', margin: 32 }}>{getSpinner()}</div>
                    ) : (
                        <GdriveSearchResults
                            errorMsg={errorMsg}
                            files={searchResults}
                            searchTerm={searchTerm}
                            currentSort={currentSort}
                            currentView={currentView}
                            priorityOrder={priorityOrder}
                            openPosterModal={handleOpenModal}
                            hoverPreviewImgRef={hoverPreviewImgRef}
                            showToast={toast}
                        />
                    )}
                </div>
            </div>
            {modalInfo && (
                <PosterSearchModalTrigger
                    obj={modalInfo}
                    onClose={handleCloseModal}
                    onDeleted={handleCloseModal}
                />
            )}
        </div>
    );
}
