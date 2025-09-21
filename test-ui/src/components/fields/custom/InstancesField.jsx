/**
 * InstancesField Component
 *
 * Schema-driven instances selection field for DAPS service management.
 * Dynamically adapts behavior based on field configuration from settings_schema.js.
 *
 * Supported schema configurations:
 * 1. All services with poster option (poster_renamerr): ['plex', 'radarr', 'sonarr'] + add_posters_option: true
 * 2. ARR services only (renameinatorr, nohl): ['radarr', 'sonarr']
 * 3. Plex only (labelarr): ['plex'] + add_posters_option: false
 * 4. Health checks (health_checkarr): ['radarr', 'sonarr'] + add_posters_option: false
 * 5. Mixed configurations with different requirements
 *
 * Value Structure:
 * - Array of mixed strings and objects
 * - Simple instances: "instance_name"
 * - Plex with full options: { name: "instance_name", upload_posters: true/false, libraries: ["lib1", "lib2"] }
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, CheckboxBase } from '../primitives';
import { useApiData } from '../../../hooks/useApiData.js';
import { instancesAPI } from '../../../utils/api';
import { humanize } from '../../../utils/tools';

/**
 * Simple Instance Selector - For Radarr/Sonarr instances
 * Basic checkbox selection for simple string values
 */
const SimpleInstanceSelector = React.memo(({
    instances,
    selectedInstances,
    onSelectionChange,
    serviceType,
    disabled
}) => {
    const serviceInstances = useMemo(() => {
        if (!instances || !Array.isArray(instances)) {
            return [];
        }
        return instances.filter(instance => instance.type === serviceType);
    }, [instances, serviceType]);

    const handleInstanceToggle = useCallback((instanceName, checked) => {
        const safeSelectedInstances = selectedInstances || [];
        const newSelection = checked
            ? [...safeSelectedInstances, instanceName]
            : safeSelectedInstances.filter(name => name !== instanceName);
        onSelectionChange(newSelection);
    }, [selectedInstances, onSelectionChange]);

    if (serviceInstances.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 p-6 text-center bg-surface border border-dashed rounded-md text-secondary">
                <div className="empty-message font-medium text-primary">
                    No {humanize(serviceType)} instances configured
                </div>
                <div className="empty-help text-sm text-tertiary">
                    Configure instances in Settings → Instances
                </div>
            </div>
        );
    }

    return (
        <div className="instance-selection-list flex flex-col gap-2">
            {serviceInstances.map(instance => {
                const isSelected = (selectedInstances || []).includes(instance.name);
                const inputId = `instance-${serviceType}-${instance.name}`;

                return (
                    <div key={instance.name} className="instance-item">
                        <div
                            className="flex items-center gap-3 py-2 px-3 bg-surface border rounded-md hover:bg-surface-hover focus:border-primary cursor-pointer transition-colors duration-200 ease-in-out"
                            onClick={(e) => {
                                // Don't handle click if it came from the label or checkbox input
                                if (disabled) return;
                                if (e.target.tagName === 'LABEL' || e.target.tagName === 'INPUT') return;
                                handleInstanceToggle(instance.name, !isSelected);
                            }}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            onKeyDown={(e) => {
                                if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
                                    e.preventDefault();
                                    handleInstanceToggle(instance.name, !isSelected);
                                }
                            }}
                            aria-pressed={isSelected}
                            aria-disabled={disabled}
                        >
                            <CheckboxBase
                                id={inputId}
                                name={`${serviceType}-instances`}
                                checked={isSelected}
                                onChange={(e) => handleInstanceToggle(instance.name, e.target.checked)}
                                disabled={disabled}
                            />
                            <div className="checkbox-content flex flex-col">
                                <FieldLabel
                                    htmlFor={inputId}
                                    label={humanize(instance.name)}
                                    className="text-sm font-normal leading-normal text-primary cursor-pointer select-none"
                                />
                                {instance.url && (
                                    <div className="instance-url text-xs text-secondary">{instance.url}</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

SimpleInstanceSelector.displayName = 'SimpleInstanceSelector';

/**
 * Plex Library Selector - Component for selecting libraries within a Plex instance
 * Handles library loading and selection for Plex instances
 */
const PlexLibrarySelector = React.memo(({
    instanceName,
    selectedLibraries = [],
    onLibrariesChange,
    disabled
}) => {
    // Load libraries for this specific Plex instance
    const {
        data: librariesResponse,
        isLoading: librariesLoading,
        error: librariesError
    } = useApiData({
        apiFunction: () => instancesAPI.fetchPlexLibraries(instanceName),
        dependencies: [instanceName],
        options: {
            immediate: true,
            showErrorToast: false, // Don't show toast for library loading errors
        },
    });

    // Extract libraries from API response
    const libraries = useMemo(() => {
        if (!librariesResponse?.data?.libraries) {
            return [];
        }
        return librariesResponse.data.libraries;
    }, [librariesResponse]);

    // Handle library selection toggle
    const handleLibraryToggle = useCallback((libraryName, checked) => {
        const currentLibraries = selectedLibraries || [];
        const newLibraries = checked
            ? [...currentLibraries, libraryName]
            : currentLibraries.filter(lib => lib !== libraryName);
        onLibrariesChange(newLibraries);
    }, [selectedLibraries, onLibrariesChange]);

    if (librariesLoading) {
        return (
            <div className="libraries-loading flex items-center gap-2 text-sm text-secondary bg-surface">
                <div className="loading-spinner-small" />
                <span>Loading libraries...</span>
            </div>
        );
    }

    if (librariesError) {
        return (
            <div className="libraries-error flex items-center gap-2 text-sm text-secondary bg-surface">
                <span className="error-icon">⚠️</span>
                <span>Failed to load libraries: {librariesError.message}</span>
            </div>
        );
    }

    if (!libraries || libraries.length === 0) {
        return (
            <div className="libraries-empty flex items-center gap-2 text-sm text-secondary bg-surface">
                <span className="info-icon">ℹ️</span>
                <span>No libraries found for this Plex instance</span>
            </div>
        );
    }

    return (
        <div className="libraries-selection">
            <div className="libraries-title text-base font-semibold text-primary">Select Libraries:</div>

            {/* Mobile: Compact chip-style selection */}
            <div className="md:hidden">
                <div className="grid gap-2 grid-cols-auto-fit-xs">
                    {libraries.map(library => {
                        const isSelected = selectedLibraries.includes(library);
                        return (
                            <button
                                key={library}
                                type="button"
                                className={`relative flex items-center justify-center text-center py-2 px-3 min-h-11 rounded-md border-2 text-sm font-medium cursor-pointer transition-all duration-200 ${
                                    isSelected
                                        ? 'bg-surface-elevated border-primary text-primary shadow-md'
                                        : 'bg-surface-elevated border-border text-primary hover:bg-surface-hover hover:border-border-hover hover:-translate-y-0.5 hover:shadow-sm'
                                }`}
                                onClick={() => handleLibraryToggle(library, !isSelected)}
                                disabled={disabled}
                            >
                                {library}
                                {isSelected && (
                                    <span className="absolute top-0.5 right-1 text-xs">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Desktop: Grid layout with checkboxes */}
            <div className="hidden md:block">
                <div className="grid gap-2 grid-cols-auto-fit-sm">
                    {libraries.map(library => {
                        const isSelected = selectedLibraries.includes(library);
                        const libraryId = `library-${instanceName}-${library}`;

                        return (
                            <div key={library}>
                                <div
                                    className="flex items-center gap-3 py-2 px-3 bg-surface border rounded-md hover:bg-surface-hover focus:border-primary cursor-pointer transition-colors duration-200 ease-in-out"
                                    onClick={(e) => {
                                        // Don't handle click if it came from the label or checkbox input
                                        if (disabled) return;
                                        if (e.target.tagName === 'LABEL' || e.target.tagName === 'INPUT') return;
                                        handleLibraryToggle(library, !isSelected);
                                    }}
                                    role="button"
                                    tabIndex={disabled ? -1 : 0}
                                    onKeyDown={(e) => {
                                        if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
                                            e.preventDefault();
                                            handleLibraryToggle(library, !isSelected);
                                        }
                                    }}
                                    aria-pressed={isSelected}
                                    aria-disabled={disabled}
                                >
                                    <CheckboxBase
                                        id={libraryId}
                                        name={`${instanceName}-libraries`}
                                        checked={isSelected}
                                        onChange={(e) => handleLibraryToggle(library, e.target.checked)}
                                        disabled={disabled}
                                    />
                                    <div className="checkbox-content flex flex-col">
                                        <FieldLabel
                                            htmlFor={libraryId}
                                            label={library}
                                            className="text-sm font-medium leading-normal text-primary cursor-pointer select-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

PlexLibrarySelector.displayName = 'PlexLibrarySelector';

/**
 * Plex Instance Selector - For Plex instances with libraries and optional poster upload
 * Handles complex object values with upload_posters boolean and libraries array
 */
const PlexInstanceSelector = React.memo(({
    instances,
    selectedInstances,
    onSelectionChange,
    showPosterOption,
    disabled
}) => {
    const plexInstances = useMemo(() => {
        if (!instances || !Array.isArray(instances)) {
            return [];
        }
        return instances.filter(instance => instance.type === 'plex');
    }, [instances]);

    // Parse selected instances to handle both string and object formats
    const parsedSelection = useMemo(() => {
        if (!selectedInstances || !Array.isArray(selectedInstances)) {
            return [];
        }
        return selectedInstances.map(item => {
            if (typeof item === 'string') {
                return { name: item, upload_posters: false, libraries: [] };
            }
            return {
                name: item.name,
                upload_posters: item.upload_posters || false,
                libraries: item.libraries || []
            };
        });
    }, [selectedInstances]);

    const handleInstanceToggle = useCallback((instanceName, checked) => {
        if (checked) {
            // Add new instance with proper structure
            const newInstance = showPosterOption
                ? { name: instanceName, upload_posters: false, libraries: [] }
                : { name: instanceName, libraries: [] };
            onSelectionChange([...(selectedInstances || []), newInstance]);
        } else {
            // Remove instance
            const newSelection = (selectedInstances || []).filter(item =>
                typeof item === 'string' ? item !== instanceName : item.name !== instanceName
            );
            onSelectionChange(newSelection);
        }
    }, [selectedInstances, onSelectionChange, showPosterOption]);

    const handlePosterUploadToggle = useCallback((instanceName, uploadPosters) => {
        const newSelection = (selectedInstances || []).map(item => {
            if (typeof item === 'string' && item === instanceName) {
                return { name: instanceName, upload_posters: uploadPosters, libraries: [] };
            }
            if (typeof item === 'object' && item.name === instanceName) {
                return { ...item, upload_posters: uploadPosters };
            }
            return item;
        });
        onSelectionChange(newSelection);
    }, [selectedInstances, onSelectionChange]);

    const handleLibrariesChange = useCallback((instanceName, libraries) => {
        const newSelection = (selectedInstances || []).map(item => {
            if (typeof item === 'string' && item === instanceName) {
                return { name: instanceName, upload_posters: false, libraries };
            }
            if (typeof item === 'object' && item.name === instanceName) {
                return { ...item, libraries };
            }
            return item;
        });
        onSelectionChange(newSelection);
    }, [selectedInstances, onSelectionChange]);

    if (plexInstances.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 p-6 text-center bg-surface border border-dashed rounded-md text-secondary">
                <div className="empty-message font-medium text-primary">No Plex instances configured</div>
                <div className="empty-help text-sm text-tertiary">Configure instances in Settings → Instances</div>
            </div>
        );
    }

    return (
        <div className="instance-selection-list flex flex-col gap-2">
            {plexInstances.map(instance => {
                const selectedItem = parsedSelection.find(item => item.name === instance.name);
                const isSelected = Boolean(selectedItem);
                const uploadPosters = selectedItem?.upload_posters || false;
                const selectedLibraries = selectedItem?.libraries || [];
                const instanceId = `instance-plex-${instance.name}`;
                const uploadId = `upload-${instance.name}`;

                return (
                    <div key={instance.name} className="instance-item plex-instance-item">
                        <div
                            className="flex items-center gap-3 py-2 px-3 bg-surface border rounded-md hover:bg-surface-hover focus:border-primary cursor-pointer transition-colors duration-200 ease-in-out"
                            onClick={(e) => {
                                // Don't handle click if it came from the label or checkbox input
                                if (disabled) return;
                                if (e.target.tagName === 'LABEL' || e.target.tagName === 'INPUT') return;
                                handleInstanceToggle(instance.name, !isSelected);
                            }}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            onKeyDown={(e) => {
                                if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
                                    e.preventDefault();
                                    handleInstanceToggle(instance.name, !isSelected);
                                }
                            }}
                            aria-pressed={isSelected}
                            aria-disabled={disabled}
                        >
                            <CheckboxBase
                                id={instanceId}
                                name="plex-instances"
                                checked={isSelected}
                                onChange={(e) => handleInstanceToggle(instance.name, e.target.checked)}
                                disabled={disabled}
                            />
                            <div className="checkbox-content flex flex-col">
                                <FieldLabel
                                    htmlFor={instanceId}
                                    label={humanize(instance.name)}
                                    className="text-sm font-normal leading-normal text-primary cursor-pointer select-none"
                                />
                                {instance.url && (
                                    <div className="instance-url text-xs text-secondary">{instance.url}</div>
                                )}
                            </div>
                        </div>

                        {isSelected && (
                            <div className="plex-options flex flex-col gap-4">
                                {/* Poster upload option */}
                                {showPosterOption && (
                                    <div className="poster-upload-option">
                                        <div
                                            className="flex items-center gap-3 py-2 px-3 bg-surface border rounded-md hover:bg-surface-hover focus:border-primary cursor-pointer transition-colors duration-200 ease-in-out"
                                            onClick={(e) => {
                                                // Don't handle click if it came from the label or checkbox input
                                                if (disabled) return;
                                                if (e.target.tagName === 'LABEL' || e.target.tagName === 'INPUT') return;
                                                handlePosterUploadToggle(instance.name, !uploadPosters);
                                            }}
                                            role="button"
                                            tabIndex={disabled ? -1 : 0}
                                            onKeyDown={(e) => {
                                                if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
                                                    e.preventDefault();
                                                    handlePosterUploadToggle(instance.name, !uploadPosters);
                                                }
                                            }}
                                            aria-pressed={uploadPosters}
                                            aria-disabled={disabled}
                                        >
                                            <CheckboxBase
                                                id={uploadId}
                                                name={`upload-${instance.name}`}
                                                checked={uploadPosters}
                                                onChange={(e) => handlePosterUploadToggle(instance.name, e.target.checked)}
                                                disabled={disabled}
                                            />
                                            <div className="checkbox-content flex flex-col">
                                                <FieldLabel
                                                    htmlFor={uploadId}
                                                    label="Upload posters to this Plex instance"
                                                    className="text-sm font-medium leading-normal text-primary cursor-pointer select-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Library selection */}
                                <PlexLibrarySelector
                                    instanceName={instance.name}
                                    selectedLibraries={selectedLibraries}
                                    onLibrariesChange={(libraries) => handleLibrariesChange(instance.name, libraries)}
                                    disabled={disabled}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

PlexInstanceSelector.displayName = 'PlexInstanceSelector';

/**
 * InstancesField component - Schema-driven instances selection
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object from schema
 * @param {Array} props.value - Current field value (mixed array of strings and objects)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const InstancesField = React.memo(({
    field,
    value = [],
    onChange,
    disabled = false,
    highlightInvalid = false,
    errorMessage = null,
}) => {
    // Parse schema configuration
    const instanceTypes = field.instance_types || [];
    const showPosterOption = field.add_posters_option === true;
    const isRequired = field.required === true;

    // Load instances data using proper DAPS pattern
    const {
        data: instancesResponse,
        isLoading: loading,
        error: loadError
    } = useApiData({
        apiFunction: instancesAPI.fetchInstances,
        options: {
            immediate: true,
            showErrorToast: false, // Don't show toast errors for field-level API calls
        },
    });

    // Extract instances from API response and transform to expected format
    const instances = useMemo(() => {
        if (!instancesResponse?.data) {
            return [];
        }

        const instancesData = instancesResponse.data;
        const transformedInstances = [];

        // Transform nested object structure to flat array
        Object.entries(instancesData).forEach(([serviceType, serviceInstances]) => {
            Object.entries(serviceInstances || {}).forEach(([instanceName, instanceConfig]) => {
                transformedInstances.push({
                    type: serviceType,
                    name: instanceName,
                    url: instanceConfig.url,
                    api: instanceConfig.api
                });
            });
        });

        return transformedInstances;
    }, [instancesResponse]);

    // Parse current value into service-specific selections
    const serviceSelections = useMemo(() => {
        const selections = {};

        instanceTypes.forEach(serviceType => {
            if (serviceType === 'plex') {
                // Plex handles complex objects
                selections[serviceType] = value.filter(item => {
                    if (!instances || !Array.isArray(instances)) {
                        return false;
                    }
                    if (typeof item === 'string') {
                        // Check if this string matches a plex instance
                        return instances.some(inst => inst.type === 'plex' && inst.name === item);
                    }
                    if (typeof item === 'object' && item.name) {
                        // Check if this object refers to a plex instance
                        return instances.some(inst => inst.type === 'plex' && inst.name === item.name);
                    }
                    return false;
                });
            } else {
                // Other services use simple strings
                selections[serviceType] = value.filter(item => {
                    if (!instances || !Array.isArray(instances)) {
                        return false;
                    }
                    if (typeof item === 'string') {
                        // Check if this string matches this service type
                        return instances.some(inst => inst.type === serviceType && inst.name === item);
                    }
                    return false;
                });
            }
        });

        return selections;
    }, [value, instanceTypes, instances]);

    // Update selection for a specific service type
    const updateServiceSelection = useCallback((serviceType, newSelection) => {
        const otherSelections = instanceTypes
            .filter(type => type !== serviceType)
            .flatMap(type => serviceSelections[type] || []);

        onChange([...otherSelections, ...newSelection]);
    }, [instanceTypes, serviceSelections, onChange]);

    const inputId = `field-${field.key}`;

    // Show loading state
    if (loading) {
        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={isRequired} />
                <div className="instances-loading flex flex-col items-center justify-center gap-3 text-center bg-surface border-2 text-secondary">
                    <div className="loading-spinner" />
                    <span>Loading instances...</span>
                </div>
                {field.description && (
                    <FieldDescription id={`${inputId}-desc`} description={field.description} />
                )}
            </FieldWrapper>
        );
    }

    // Show error state
    if (loadError) {
        return (
            <FieldWrapper invalid={true}>
                <FieldLabel htmlFor={inputId} label={field.label} required={isRequired} />
                <div className="instances-error flex flex-col items-center gap-3 text-center bg-error-subtle border-2 border-error">
                    <div className="error-icon">⚠️</div>
                    <div className="error-content flex flex-col gap-2">
                        <div className="error-title font-semibold text-base">Failed to load instances</div>
                        <div className="error-message text-sm">{loadError?.message || 'Unknown error occurred'}</div>
                    </div>
                </div>
                {field.description && (
                    <FieldDescription id={`${inputId}-desc`} description={field.description} />
                )}
            </FieldWrapper>
        );
    }

    // Render based on schema configuration
    const renderServiceSelector = (serviceType) => {
        if (serviceType === 'plex') {
            return (
                <PlexInstanceSelector
                    key={serviceType}
                    instances={instances}
                    selectedInstances={serviceSelections[serviceType] || []}
                    onSelectionChange={(newSelection) => updateServiceSelection(serviceType, newSelection)}
                    showPosterOption={showPosterOption}
                    disabled={disabled}
                />
            );
        } else {
            return (
                <SimpleInstanceSelector
                    key={serviceType}
                    instances={instances}
                    selectedInstances={serviceSelections[serviceType] || []}
                    onSelectionChange={(newSelection) => updateServiceSelection(serviceType, newSelection)}
                    serviceType={serviceType}
                    disabled={disabled}
                />
            );
        }
    };

    return (
        <FieldWrapper invalid={highlightInvalid}>
            <FieldLabel htmlFor={inputId} label={field.label} required={isRequired} />

            <div className="instances-field-content" id={inputId}>
                {instanceTypes.length === 1 ? (
                    // Single service type - simplified UI
                    <div className="single-service-selector flex flex-col gap-4">
                        <h4 className="service-title text-base font-semibold text-primary">{humanize(instanceTypes[0])}</h4>
                        {renderServiceSelector(instanceTypes[0])}
                    </div>
                ) : (
                    // Multiple service types - sectioned UI
                    <div className="multi-service-selector grid gap-3 grid-cols-auto-fit-md">
                        {instanceTypes.map(serviceType => (
                            <div key={serviceType} className="service-section flex flex-col gap-2 bg-surface border">
                                <h4 className="service-title text-base font-semibold text-primary">{humanize(serviceType)}</h4>
                                {renderServiceSelector(serviceType)}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {field.description && (
                <FieldDescription id={`${inputId}-desc`} description={field.description} />
            )}

            {errorMessage && (
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            )}
        </FieldWrapper>
    );
});

InstancesField.displayName = 'InstancesField';

export default InstancesField;