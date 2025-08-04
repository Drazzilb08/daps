import React, { useEffect, useState, useCallback } from 'react';
import { fetchConfig, fetchMediaCache, fetchCollectionCache } from '../utils/api';
import { getSpinner } from '../utils/tools';
import AssetsSearchControls from '../components/poster_search/assets_search/AssetsSearchControls';
import AssetsSearchResults from '../components/poster_search/assets_search/AssetsSearchResults';
import PosterSearchModalTrigger from '../components/poster_search/PosterSearchModalTrigger';
import usePosterSearchHoverPreview from '../components/poster_search/PosterSearchHoverPreview';
import { useToast } from '../components/providers/ToastProvider';
import '../css/poster_search.css';

function isImageFile(filename) {
    return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

export default function AssetsSearch() {
    const [assetsDir, setAssetsDir] = useState('');
    const [mediaCache, setMediaCache] = useState([]);
    const [collectionCache, setCollectionCache] = useState([]);
    const [assetCacheLoaded, setAssetCacheLoaded] = useState(false);

    // Controls
    const [pendingSearchTerm, setPendingSearchTerm] = useState('');
    const [assetTypeFilter, setAssetTypeFilter] = useState('all');
    const [currentSort, setCurrentSort] = useState('alpha');
    const [currentView, setCurrentView] = useState('grid');
    const [isSearching, setIsSearching] = useState(false);

    // Results
    const [searchResults, setSearchResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalInfo, setModalInfo] = useState(null);
    const [errorMsg] = useState(null);

    const hoverPreviewImgRef = usePosterSearchHoverPreview();
    const toast = useToast();

    // Load config (assetsDir)
    useEffect(() => {
        fetchConfig().then(cfg => {
            setAssetsDir(cfg.poster_renamerr?.destination_dir || '');
        });
    }, []);

    // Load assets ONCE
    useEffect(() => {
        if (assetCacheLoaded) return;
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
    }, [assetCacheLoaded]);

    // Always start from "source of truth"
    const getAllAssets = useCallback(() => {
        // Flatten both caches as before
        const allAssets = [
            ...collectionCache.map(c => ({
                ...c,
                file: c.renamed_file || c.original_file,
                location: assetsDir,
                asset_type: 'collection',
                relativeFile:
                    c.renamed_file || c.original_file
                        ? (c.renamed_file || c.original_file)
                              .replace(assetsDir + '/', '')
                              .replace(assetsDir + '\\', '')
                        : '',
            })),
            ...mediaCache.map(m => ({
                ...m,
                file: m.renamed_file || m.original_file,
                location: assetsDir,
                asset_type: m.asset_type || m.type || 'movie',
                relativeFile:
                    m.renamed_file || m.original_file
                        ? (m.renamed_file || m.original_file)
                              .replace(assetsDir + '/', '')
                              .replace(assetsDir + '\\', '')
                        : '',
            })),
        ].filter(obj => obj.file && isImageFile(obj.file));

        // Deduplicate based on absolute file path (relative to assetsDir)
        const seen = new Set();
        const uniqueAssets = [];
        for (const asset of allAssets) {
            const key = asset.location + '|' + asset.file;
            if (!seen.has(key)) {
                uniqueAssets.push(asset);
                seen.add(key);
            }
        }
        return uniqueAssets;
    }, [assetsDir, collectionCache, mediaCache]);

    // Core filter/sort function
    const doSearch = useCallback(
        overrideTerm => {
            let assets = getAllAssets();

            // Asset type filter
            const assetTypeMap = {
                collections: 'collection',
                movies: 'movie',
                shows: 'show',
            };
            if (assetTypeFilter && assetTypeFilter !== 'all') {
                assets = assets.filter(
                    obj => (obj.asset_type || '').toLowerCase() === assetTypeMap[assetTypeFilter]
                );
            }

            // Search term
            const term = overrideTerm !== undefined ? overrideTerm : pendingSearchTerm;
            if (term && term.trim()) {
                const lc = term.trim().toLowerCase();
                assets = assets.filter(obj => obj.file && obj.file.toLowerCase().includes(lc));
            }

            // Sort
            if (currentSort === 'alpha') {
                assets = assets.sort((a, b) => a.file.localeCompare(b.file));
            } else if (currentSort === 'alpha-desc') {
                assets = assets.sort((a, b) => b.file.localeCompare(a.file));
            } else if (currentSort === 'date') {
                assets = assets.sort((a, b) => {
                    const dateA = new Date(a.last_indexed || a.added_at || 0);
                    const dateB = new Date(b.last_indexed || b.added_at || 0);
                    return dateB - dateA;
                });
            }

            setSearchTerm(term || '');
            setSearchResults([...assets]);
        },
        [getAllAssets, assetTypeFilter, pendingSearchTerm, currentSort]
    );

    // Only run search when user hits Enter/search button in controls
    const handlePendingSearch = () => {
        doSearch();
    };

    // If filter changes AFTER a search, refilter current results using last search term
    useEffect(() => {
        if (searchTerm) doSearch(searchTerm);
    }, [assetTypeFilter, currentSort, doSearch, searchTerm]);

    // Clear search bar AND results
    const handleClearSearch = () => {
        setPendingSearchTerm('');
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleOpenModal = obj => setModalInfo(obj);
    const handleCloseModal = () => setModalInfo(null);

    return (
        <div className="poster-search-root">
            <div className="poster-search-card">
                <div className="poster-search-content">
                    <AssetsSearchControls
                        currentSort={currentSort}
                        setCurrentSort={setCurrentSort}
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                        pendingSearchTerm={pendingSearchTerm}
                        setPendingSearchTerm={setPendingSearchTerm}
                        onSearch={handlePendingSearch}
                        onClearSearch={handleClearSearch}
                        isSearching={isSearching}
                        assetTypeFilter={assetTypeFilter}
                        setAssetTypeFilter={setAssetTypeFilter}
                        showAssetTypeFilter={true}
                    />
                    {isSearching ? (
                        <div style={{ textAlign: 'center', margin: 32 }}>{getSpinner()}</div>
                    ) : (
                        <AssetsSearchResults
                            errorMsg={errorMsg}
                            files={searchResults}
                            searchTerm={searchTerm}
                            currentSort={currentSort}
                            currentView={currentView}
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
