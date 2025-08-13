// ui/src/components/search/adapters/GdriveSearchAdapter.js
// GDrive/Custom search adapter that replicates exact logic from GdriveSearch.jsx

import { fetchConfig, fetchPosters, fetchPosterPreviewUrl } from '../../../utils/api';


// Utility function to check if a file is an image (preserved from existing code)
function isImageFile(filename) {
    return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

// Cache for loaded data to prevent multiple loads
let cachedData = null;
let isLoading = false;

export const gdriveSearchAdapter = {
    /**
     * Clear data cache (call this when configuration changes)
     */
    clearLocationCache() {
        cachedData = null; // Clear data cache
        isLoading = false;
        console.log('GDrive data cache cleared');
    },
    
    /**
     * Get status of data cache (for debugging)
     */
    getCacheStatus() {
        return {
            hasCache: !!cachedData,
            isLoading
        };
    },
    /**
     * Load initial data for GDrive/Custom search
     * Replicates the exact logic from GdriveSearch.jsx useEffect
     */
    async loadInitialData() {
        // Return cached data if available
        if (cachedData) {
            return cachedData;
        }
        
        // Prevent multiple simultaneous loads
        if (isLoading) {
            return new Promise(resolve => {
                const checkLoading = () => {
                    if (!isLoading && cachedData) {
                        resolve(cachedData);
                    } else if (!isLoading) {
                        resolve(this.loadInitialData());
                    } else {
                        setTimeout(checkLoading, 100);
                    }
                };
                checkLoading();
            });
        }
        
        isLoading = true;
        try {
            // Load config first
            const config = await fetchConfig();
            
            // GDrive Locations & Files (exact same logic)
            let gdriveLocations = (config.sync_gdrive?.gdrive_list || []).map(g => ({
                name: g.name,
                location: g.location,
            })) || [];
            
            // Custom Locations (exact same logic)
            const gdriveLocSet = new Set(gdriveLocations.map(g => g.location));
            const sourceDirs = config.poster_renamerr?.source_dirs || [];
            const customLocations = sourceDirs.filter(dir => !gdriveLocSet.has(dir));
            
            // Fetch files for GDrive/Custom (exact same logic)
            let gdriveFiles = [];
            let customFiles = [];
            let errorSources = [];
            
            // Load GDrive files (exact same logic as original)
            for (const { name, location } of gdriveLocations) {
                const stats = await fetchPosters(location);
                if (stats.error || !Array.isArray(stats.files)) {
                    errorSources.push('GDrive');
                    continue;
                }
                stats.files.forEach(f => gdriveFiles.push({ file: f, name, location }));
            }
            
            // Load Custom files (exact same logic as original)
            for (const dir of customLocations) {
                const stats = await fetchPosters(dir);
                if (stats.error || !Array.isArray(stats.files)) {
                    errorSources.push('Custom');
                    continue;
                }
                customFiles.push(
                    ...stats.files.map(f => ({
                        file: f,
                        name: dir.split('/').pop() + ' (Custom)',
                        location: dir,
                    }))
                );
            }
            
            // Priority order - match GDrive locations to source_dirs positions
            // This is the complex part: GDrive locations get priority based on their position in source_dirs
            const priorityOrder = {};
            
            // For each GDrive location, check if it exists in source_dirs and assign priority
            gdriveLocations.forEach(gdrive => {
                const sourceIndex = sourceDirs.indexOf(gdrive.location);
                if (sourceIndex !== -1) {
                    // Found in source_dirs - assign priority based on position
                    priorityOrder[gdrive.location] = sourceDirs.length - sourceIndex - 1;
                }
            });
            
            // Extract unique owners for filtering
            const gdriveOwners = Array.from(new Set(gdriveFiles.map(f => f.name).filter(Boolean))).sort();
            
            const result = {
                config,
                gdriveLocations,
                customLocations,
                gdriveFiles,
                customFiles,
                gdriveOwners,
                priorityOrder,
                errorSources,
                files: [...gdriveFiles, ...customFiles] // Combined for easier access
            };
            
            // Cache the result
            cachedData = result;
            return result;
        } catch (error) {
            console.error('Error loading GDrive configuration:', error);
            // Return empty state instead of throwing - allows UI to continue
            const result = {
                config: {},
                gdriveLocations: [],
                customLocations: [],
                gdriveFiles: [],
                customFiles: [],
                gdriveOwners: [],
                priorityOrder: {},
                errorSources: ['Configuration'],
                files: []
            };
            
            // Cache even the error state to prevent retries
            cachedData = result;
            return result;
        } finally {
            isLoading = false;
        }
    },
    
    /**
     * Search through GDrive/Custom data
     * Replicates the exact handleSearch() logic from GdriveSearch.jsx
     */
    search(data, searchTerm, filters, currentSource) {
        if (!data) return [];
        
        const { gdriveFiles, customFiles } = data;
        
        // Get all files based on current source (exact same logic as getAllFiles())
        function getAllFiles() {
            if (currentSource === 'gdrive') return gdriveFiles;
            if (currentSource === 'custom') return customFiles;
            return [];
        }
        
        let allFiles = getAllFiles();
        let filtered = allFiles.filter(obj => obj.file && isImageFile(obj.file));
        
        // Apply search term (exact same logic)
        let results = filtered;
        if (searchTerm && searchTerm.trim()) {
            const lc = searchTerm.trim().toLowerCase();
            results = filtered.filter(obj => obj.file.toLowerCase().includes(lc));
        }
        
        return results;
    },
    
    /**
     * Apply additional filters to search results
     * Replicates the useMemo filtering logic from GdriveSearch.jsx
     */
    filter(results, filters, currentSource) {
        let filtered = [...results];
        
        // Owner filter (for GDrive only - exact same logic)
        const selectedGDriveOwner = filters.selectedGDriveOwner;
        if (currentSource === 'gdrive' && selectedGDriveOwner) {
            filtered = filtered.filter(obj => obj.name === selectedGDriveOwner);
        }
        
        return filtered;
    },
    
    /**
     * Sort search results
     * Replicates the exact sorting logic from GdriveSearch.jsx useMemo
     */
    sort(results, sortOption, currentSource, priorityOrder) {
        const sortedResults = [...results];
        
        if (sortOption === 'priority-asc' || sortOption === 'priority-desc') {
            sortedResults.sort((a, b) => {
                const pa = priorityOrder[a.location] ?? 9999;
                const pb = priorityOrder[b.location] ?? 9999;
                return sortOption === 'priority-asc' ? pa - pb : pb - pa;
            });
        } else if (sortOption === 'alpha') {
            sortedResults.sort((a, b) => a.file.localeCompare(b.file));
        } else if (sortOption === 'alpha-desc') {
            sortedResults.sort((a, b) => b.file.localeCompare(a.file));
        }
        // Note: Date sort could be added here if needed
        
        return sortedResults;
    },
    
    /**
     * Format a result item for display
     * Ensures consistent structure for SearchResults component
     */
    formatResult(item) {
        return {
            id: `${item.location}|${item.file}`, // Create unique ID
            title: item.file, // Use filename as title for display
            subtitle: item.name || '', // Owner/source name as subtitle
            imageUrl: item.location && item.file 
                ? fetchPosterPreviewUrl(item.location, item.file)
                : '',
            metadata: {
                owner: item.name,
                source: item.location
            },
            // Keep all original data
            ...item
        };
    },
    
    /**
     * Get available owners for GDrive filtering
     * Replicates the gdriveOwners useMemo logic from GdriveSearch.jsx
     */
    getAvailableOwners(data, currentSource) {
        if (!data || currentSource !== 'gdrive') return [];
        
        const { gdriveFiles } = data;
        return Array.from(new Set(gdriveFiles.map(f => f.name).filter(Boolean))).sort();
    },
    
    /**
     * Check if we should show the empty search prompt
     * Replicates the logic from GdriveSearchResults.jsx
     */
    shouldShowSearchPrompt(searchTerm) {
        return !searchTerm || !searchTerm.trim();
    }
};

// Default export for easier importing
export default gdriveSearchAdapter;