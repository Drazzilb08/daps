// src/pages/PosterSearch.jsx

import React, { useEffect, useState, useCallback } from 'react';

import { fetchConfig, fetchMediaCache, fetchCollectionCache, fetchPosters } from '../utils/api';
import { getSpinner } from '../utils/tools';
import { showLoader } from '../components/loaders';
import PosterSearchControls from '../components/poster_search/PosterSearchControls';
import PosterSearchResults from '../components/poster_search/PosterSearchResults';
import PosterSearchModalTrigger from '../components/poster_search/PosterSearchModalTrigger';
import usePosterSearchHoverPreview from '../components/poster_search/PosterSearchHoverPreview';
import { useToast } from '../components/providers/ToastProvider';
import '../css/poster_search.css';

function isImageFile(filename) {
    return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

export default function PosterSearch() {
    const [, setConfig] = useState({});
    const [, setGdriveLocations] = useState([]);
    const [customLocations, setCustomLocations] = useState([]);
    const [gdriveFiles, setGdriveFiles] = useState([]);
    const [customFiles, setCustomFiles] = useState([]);
    const [assetsDir, setAssetsDir] = useState('');
    const [, setAssetsFiles] = useState([]);
    const [priorityOrder, setPriorityOrder] = useState({});
    const [currentSource, setCurrentSource] = useState('gdrive');
    const [currentSort, setCurrentSort] = useState('priority-asc');
    const [currentView, setCurrentView] = useState('grid');
    const [errorMsg, setErrorMsg] = useState(null);

    // SEARCH STATE
    const [pendingSearchTerm, setPendingSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // SEARCH RESULTS
    const [searchResults, setSearchResults] = useState([]);

    // Cache state for assets DB items
    const [mediaCache, setMediaCache] = useState([]);
    const [collectionCache, setCollectionCache] = useState([]);
    const [assetCacheLoaded, setAssetCacheLoaded] = useState(false);

    // Asset search filter state (selected only for UI, not for auto-searching)
    const [assetTypeFilter, setAssetTypeFilter] = useState('all');
    // GDrive owner filter state
    const [selectedGDriveOwner, setSelectedGDriveOwner] = useState('');

    // Modal state (holds poster info)
    const [modalInfo, setModalInfo] = useState(null);

    // For hover preview image
    const hoverPreviewImgRef = usePosterSearchHoverPreview();

    // --- Use Toast ---
    const toast = useToast();

    // Reset all relevant state on source change
    useEffect(() => {
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchResults([]);
        setAssetTypeFilter('all');
        setSelectedGDriveOwner('');
        if (currentSource !== 'assets') setAssetCacheLoaded(false);
    }, [currentSource]);

    // --- Load config, GDrive, Custom, Asset file lists on mount ---
    useEffect(() => {
        let cancelled = false;
        const dismissLoader = showLoader(1200);
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
            setAssetsDir(cfg.poster_renamerr?.destination_dir || '');

            // Fetch files for GDrive/Custom/Assets
            let _gdriveFiles = [];
            let _customFiles = [];
            let _assetsFiles = [];
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

            if (cfg.poster_renamerr?.destination_dir) {
                const stats = await fetchPosters(cfg.poster_renamerr.destination_dir);
                if (stats.error || !Array.isArray(stats.files)) {
                    errorSources.push('Assets');
                } else {
                    _assetsFiles = stats.files;
                }
                setAssetsFiles(_assetsFiles);
            }

            // Priority order
            const dirs = cfg.poster_renamerr?.source_dirs || [];
            const order = {};
            dirs.forEach((dir, idx) => {
                order[dir] = dirs.length - idx - 1;
            });
            setPriorityOrder(order);

            // Show error if none
            if (!_gdriveFiles.length && !_customFiles.length && !_assetsFiles.length) {
                setErrorMsg(
                    <div>
                        <b>No poster sources found or could not be loaded.</b>
                        <br />
                        Please check your{' '}
                        <a href="/pages/settings?module_name=poster_renamerr">
                            Poster Renamerr settings
                        </a>{' '}
                        or <a href="/pages/settings?module_name=gdrive">GDrive settings</a>
                    </div>
                );
            }

            if (!cancelled) {
                dismissLoader();
            }
        })();

        return () => {
            cancelled = true;
            dismissLoader.cancel && dismissLoader.cancel();
        };
    }, []);

    // --- Load asset cache from DB when assets tab is first used or forced to reload ---
    useEffect(() => {
        if (currentSource !== 'assets' || assetCacheLoaded) return;
        setIsSearching(true);
        Promise.all([fetchMediaCache(), fetchCollectionCache()])
            .then(([media, collections]) => {
                setMediaCache(media.filter(item => item.matched));
                setCollectionCache(collections.filter(item => item.matched));
                setAssetCacheLoaded(true);
            })
            .catch(() => {
                setMediaCache([]);
                setCollectionCache([]);
            })
            .finally(() => setIsSearching(false));
    }, [currentSource, assetCacheLoaded]);

    // --- SEARCH HANDLER ---
    const handleSearch = useCallback(
        overrideTerm => {
            function getAllFiles() {
                if (currentSource === 'gdrive') return gdriveFiles;
                if (currentSource === 'custom') return customFiles;
                if (currentSource === 'assets') {
                    const sourceDirs = window.dapsConfig?.poster_renamerr?.source_dirs || [];
                    const files = [
                        ...collectionCache.map(c => {
                            const absFile = c.renamed_file || c.original_file;
                            return {
                                ...c,
                                file: absFile,
                                location: assetsDir,
                                relativeFile: absFile
                                    ? absFile
                                          .replace(assetsDir + '/', '')
                                          .replace(assetsDir + '\\', '')
                                    : '',
                                source_dir: '',
                            };
                        }),
                        ...mediaCache.map(m => {
                            const absFile = m.renamed_file || m.original_file;
                            let srcDir = '';
                            for (const dir of sourceDirs) {
                                if (
                                    (m.original_file || '').startsWith(dir + '/') ||
                                    (m.original_file || '').startsWith(dir + '\\')
                                ) {
                                    srcDir = dir;
                                    break;
                                }
                            }
                            return {
                                ...m,
                                file: absFile,
                                location: assetsDir,
                                relativeFile: absFile
                                    ? absFile
                                          .replace(assetsDir + '/', '')
                                          .replace(assetsDir + '\\', '')
                                    : '',
                                source_dir: srcDir,
                            };
                        }),
                    ];
                    return files;
                }
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

                // Asset filter only for assets
                const assetTypeMap = {
                    collections: 'collection',
                    movies: 'movie',
                    shows: 'show',
                };
                if (currentSource === 'assets' && assetTypeFilter && assetTypeFilter !== 'all') {
                    const filterValue = assetTypeMap[assetTypeFilter];
                    filtered = filtered.filter(obj => obj.asset_type === filterValue);
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
        [
            assetTypeFilter,
            assetsDir,
            collectionCache,
            currentSource,
            customFiles,
            gdriveFiles,
            mediaCache,
            pendingSearchTerm,
            selectedGDriveOwner,
        ]
    );

    // --- GDrive Owners List (deduped, sorted) ---
    const gdriveOwners = Array.from(new Set(gdriveFiles.map(f => f.name).filter(Boolean))).sort();

    // --- Filter/SORT change: immediately update results IF there is an active search term or last search was performed ---
    useEffect(() => {
        if (searchTerm || (pendingSearchTerm && pendingSearchTerm.trim())) {
            handleSearch(searchTerm);
        }
        // eslint-disable-next-line
    }, [assetTypeFilter, selectedGDriveOwner, currentSort]);

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
                    <PosterSearchControls
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
                        assetTypeFilter={assetTypeFilter}
                        setAssetTypeFilter={setAssetTypeFilter}
                        showAssetTypeFilter={currentSource === 'assets'}
                        gdriveOwners={gdriveOwners}
                        selectedGDriveOwner={selectedGDriveOwner}
                        setSelectedGDriveOwner={setSelectedGDriveOwner}
                        showGDriveOwnerFilter={currentSource === 'gdrive'}
                    />
                    {isSearching ? (
                        <div style={{ textAlign: 'center', margin: 32 }}>{getSpinner()}</div>
                    ) : (
                        <PosterSearchResults
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
                    onDeleted={() => {
                        handleCloseModal();
                        setAssetCacheLoaded(false);
                    }}
                />
            )}
        </div>
    );
}
