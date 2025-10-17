import { useState, useEffect, useCallback } from 'react';
import { fetchInstances, fetchPlexLibrariesByInstance } from '../../utils/api';

/**
 * Custom hook to manage instances and libraries data for search interface
 * Extracted from SearchInterface.jsx to improve maintainability
 *
 * @param {Object} params - Configuration parameters
 * @param {Function} params.executeRefresh - Function to execute refresh with selected options
 * @returns {Object} Instances data state and handlers
 */
export function useInstancesData({ executeRefresh = null } = {}) {
    // Refresh functionality state
    const [selectedRefreshOptions, setSelectedRefreshOptions] = useState({
        arrInstances: [],
        plexInstances: [],
        libraries: [],
    });

    const [availableInstances, setAvailableInstances] = useState({
        radarrInstances: [],
        sonarrInstances: [],
        plexInstances: [],
    });

    const [availableLibraries, setAvailableLibraries] = useState([]);
    const [loadingLibraries, setLoadingLibraries] = useState(false);

    // Load available instances from API on component mount
    useEffect(() => {
        const loadInstances = async () => {
            try {
                const data = await fetchInstances();

                if (data) {
                    const radarrInstances = [];
                    const sonarrInstances = [];
                    const plexInstances = [];

                    // Extract Radarr instances
                    if (data.radarr) {
                        radarrInstances.push(...Object.keys(data.radarr));
                    }

                    // Extract Sonarr instances
                    if (data.sonarr) {
                        sonarrInstances.push(...Object.keys(data.sonarr));
                    }

                    // Extract Plex instances
                    if (data.plex) {
                        plexInstances.push(...Object.keys(data.plex));
                    }

                    setAvailableInstances({
                        radarrInstances,
                        sonarrInstances,
                        plexInstances,
                    });
                }
            } catch (error) {
                console.warn('Failed to load instances for refresh options:', error);
                setAvailableInstances({
                    radarrInstances: [],
                    sonarrInstances: [],
                    plexInstances: [],
                });
            }
        };

        loadInstances();
    }, []);

    // Handle library loading
    const handleLoadLibraries = useCallback(async () => {
        setLoadingLibraries(true);
        try {
            // Fetch instances first to get Plex instances
            const instancesData = await fetchInstances();

            const plexInstances = instancesData?.plex || {};
            const librariesWithInstance = [];

            // Load libraries for each Plex instance and track which instance they belong to
            for (const [instanceName] of Object.entries(plexInstances)) {
                try {
                    const libraries = await fetchPlexLibrariesByInstance(instanceName);

                    if (libraries && libraries.length > 0) {
                        libraries.forEach(lib => {
                            librariesWithInstance.push({
                                name: lib,
                                instance: instanceName,
                                displayName: `${lib} (${instanceName})`,
                            });
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load libraries for ${instanceName}:`, error);
                }
            }

            setAvailableLibraries(librariesWithInstance);
        } catch (error) {
            console.error('Failed to load libraries:', error);
        } finally {
            setLoadingLibraries(false);
        }
    }, []);

    // Refresh option handlers
    const handleRefreshOptionToggle = useCallback(
        (category, item) => {
            setSelectedRefreshOptions(prev => {
                if (category === 'libraries') {
                    // When toggling a library, automatically include/exclude the associated Plex instance
                    const library = availableLibraries.find(
                        lib => lib.name === item || lib.displayName === item
                    );
                    const isCurrentlySelected = prev.libraries.includes(item);

                    let newLibraries;
                    let newPlexInstances = [...prev.plexInstances];

                    if (isCurrentlySelected) {
                        // Removing library
                        newLibraries = prev.libraries.filter(x => x !== item);

                        // Check if this was the last library for this Plex instance
                        if (library) {
                            const otherLibrariesForSameInstance = newLibraries.some(libName => {
                                const lib = availableLibraries.find(
                                    l => l.name === libName || l.displayName === libName
                                );
                                return lib && lib.instance === library.instance;
                            });

                            // If no other libraries from this instance are selected, remove the Plex instance
                            if (!otherLibrariesForSameInstance) {
                                newPlexInstances = newPlexInstances.filter(
                                    x => x !== library.instance
                                );
                            }
                        }
                    } else {
                        // Adding library
                        newLibraries = [...prev.libraries, item];

                        // Automatically add the associated Plex instance
                        if (library && !newPlexInstances.includes(library.instance)) {
                            newPlexInstances.push(library.instance);
                        }
                    }

                    return {
                        ...prev,
                        libraries: newLibraries,
                        plexInstances: newPlexInstances,
                    };
                } else {
                    // For other categories (ARR instances, Plex instances), use normal toggle
                    return {
                        ...prev,
                        [category]: prev[category].includes(item)
                            ? prev[category].filter(x => x !== item)
                            : [...prev[category], item],
                    };
                }
            });
        },
        [availableLibraries]
    );

    // Select/deselect handlers
    const handleSelectAllRadarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: [
                ...new Set([...prev.arrInstances, ...availableInstances.radarrInstances]),
            ],
        }));
    }, [availableInstances.radarrInstances]);

    const handleDeselectAllRadarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: prev.arrInstances.filter(
                instance => !availableInstances.radarrInstances.includes(instance)
            ),
        }));
    }, [availableInstances.radarrInstances]);

    const handleSelectAllSonarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: [
                ...new Set([...prev.arrInstances, ...availableInstances.sonarrInstances]),
            ],
        }));
    }, [availableInstances.sonarrInstances]);

    const handleDeselectAllSonarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: prev.arrInstances.filter(
                instance => !availableInstances.sonarrInstances.includes(instance)
            ),
        }));
    }, [availableInstances.sonarrInstances]);

    const handleSelectAllLibraries = useCallback(() => {
        const allLibraries = availableLibraries.map(lib => lib.name || lib);
        const allPlexInstances = [...new Set(availableLibraries.map(lib => lib.instance))];
        setSelectedRefreshOptions(prev => ({
            ...prev,
            libraries: allLibraries,
            plexInstances: allPlexInstances,
        }));
    }, [availableLibraries]);

    const handleDeselectAllLibraries = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            libraries: [],
            plexInstances: [],
        }));
    }, []);

    const handleSelectAllOverall = useCallback(() => {
        const allInstances = [
            ...availableInstances.radarrInstances,
            ...availableInstances.sonarrInstances,
        ];
        const allLibraries = availableLibraries.map(lib => lib.name || lib);
        const allPlexInstances = [...new Set(availableLibraries.map(lib => lib.instance))];

        setSelectedRefreshOptions({
            arrInstances: allInstances,
            libraries: allLibraries,
            plexInstances: allPlexInstances,
        });
    }, [availableInstances, availableLibraries]);

    const handleDeselectAllOverall = useCallback(() => {
        setSelectedRefreshOptions({
            arrInstances: [],
            libraries: [],
            plexInstances: [],
        });
    }, []);

    const handleRefreshExecute = useCallback(() => {
        if (executeRefresh) {
            executeRefresh(selectedRefreshOptions);
        }
    }, [executeRefresh, selectedRefreshOptions]);

    return {
        // State values
        selectedRefreshOptions,
        availableInstances,
        availableLibraries,
        loadingLibraries,

        // State setters (for external control)
        setSelectedRefreshOptions,

        // Handlers
        handleLoadLibraries,
        handleRefreshOptionToggle,
        handleSelectAllRadarr,
        handleDeselectAllRadarr,
        handleSelectAllSonarr,
        handleDeselectAllSonarr,
        handleSelectAllLibraries,
        handleDeselectAllLibraries,
        handleSelectAllOverall,
        handleDeselectAllOverall,
        handleRefreshExecute,
    };
}

export default useInstancesData;
