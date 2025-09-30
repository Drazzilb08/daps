/**
 * Instance Data Management Hook
 * Provides centralized access to instances API data with caching and helper functions
 */

import { useCallback } from 'react';
import { useApiData } from './useApiData';
import { configAPI } from '../utils/api/config';
import {
    generateInstanceOptions,
    getInstanceType as getInstanceTypeUtil,
} from '../utils/forms/conditionalFields';

/**
 * Hook for managing instance data with API integration
 * @returns {Object} Instance data and helper functions
 */
export const useInstancesData = () => {
    console.log('[useInstancesData] Hook initializing');

    const {
        data: instancesResponse,
        isLoading,
        error,
    } = useApiData({
        apiFunction: () => configAPI.fetchSection('instances'),
        options: {
            retryAttempts: 2,
            cacheKey: 'instances_data',
            cacheTTL: 300000, // 5 minutes
            showErrorToast: true,
            successMessage: null, // Don't show success toast for background data loading
        },
    });

    // Extract instances data from API response - config API nests it under data.instances
    const instancesData = instancesResponse?.data?.instances;

    console.log('[useInstancesData] Current state:', {
        isLoading,
        hasError: !!error,
        hasInstancesData: !!instancesData,
        instancesDataKeys: instancesData ? Object.keys(instancesData) : [],
    });

    /**
     * Get dropdown options for specific allowed instance types
     * @param {Array} allowedTypes - Array of allowed service types (e.g. ['radarr', 'sonarr'])
     * @returns {Array} Dropdown options array
     */
    const getInstanceOptions = useCallback(
        (allowedTypes = []) => {
            console.log('[useInstancesData] getInstanceOptions called:', {
                allowedTypes,
                hasInstancesData: !!instancesData,
            });

            const options = generateInstanceOptions(instancesData, allowedTypes);

            console.log('[useInstancesData] Generated options:', {
                optionCount: options.length,
                options,
            });

            return options;
        },
        [instancesData]
    );

    /**
     * Get instance type for a specific instance name
     * @param {string} instanceName - Instance name to look up
     * @returns {string|null} Instance type (radarr, sonarr, plex) or null
     */
    const getInstanceType = useCallback(
        instanceName => {
            console.log('[useInstancesData] getInstanceType called:', {
                instanceName,
                hasInstancesData: !!instancesData,
            });

            const instanceType = getInstanceTypeUtil(instanceName, instancesData);

            console.log('[useInstancesData] Instance type result:', {
                instanceName,
                instanceType,
            });

            return instanceType;
        },
        [instancesData]
    );

    /**
     * Check if instances data is ready for use
     * @returns {boolean} True if data is loaded and available
     */
    const isInstancesReady = useCallback(() => {
        const ready = !isLoading && !error && !!instancesData;
        console.log('[useInstancesData] isInstancesReady:', {
            ready,
            isLoading,
            hasError: !!error,
            hasData: !!instancesData,
        });
        return ready;
    }, [isLoading, error, instancesData]);

    /**
     * Get all available service types
     * @returns {Array} Array of service type strings
     */
    const getAvailableServiceTypes = useCallback(() => {
        if (!instancesData) {
            console.log('[useInstancesData] No instances data for service types');
            return [];
        }

        const serviceTypes = Object.keys(instancesData);
        console.log('[useInstancesData] Available service types:', serviceTypes);
        return serviceTypes;
    }, [instancesData]);

    /**
     * Get instances for a specific service type
     * @param {string} serviceType - Service type (radarr, sonarr, plex)
     * @returns {Object} Instance objects for the service type
     */
    const getInstancesForServiceType = useCallback(
        serviceType => {
            if (!instancesData || !serviceType) {
                console.log('[useInstancesData] Missing data for getInstancesForServiceType:', {
                    serviceType,
                    hasInstancesData: !!instancesData,
                });
                return {};
            }

            const instances = instancesData[serviceType] || {};
            console.log('[useInstancesData] Instances for service type:', {
                serviceType,
                instanceCount: Object.keys(instances).length,
                instances,
            });
            return instances;
        },
        [instancesData]
    );

    const result = {
        // Raw data
        instancesData,
        isLoading,
        error,

        // Helper functions
        getInstanceOptions,
        getInstanceType,
        isInstancesReady,
        getAvailableServiceTypes,
        getInstancesForServiceType,
    };

    console.log('[useInstancesData] Returning result:', {
        hasInstancesData: !!result.instancesData,
        isLoading: result.isLoading,
        hasError: !!result.error,
        isReady: result.isInstancesReady(),
    });

    return result;
};
