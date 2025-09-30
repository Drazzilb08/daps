import React, { createContext, useContext } from 'react';

/**
 * Configuration Context - Provides config data to all child components
 * This eliminates the need to pass config props through every component
 */
const ConfigContext = createContext(null);

/**
 * ConfigProvider - Provides configuration data to all child components
 * @param {Object} props - Provider props
 * @param {Object} props.config - Full application configuration
 * @param {React.ReactNode} props.children - Child components
 */
export const ConfigProvider = ({ config, children }) => {
    return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

/**
 * useConfig - Hook to access configuration data in any component
 * @returns {Object} Full application configuration
 * @throws {Error} If used outside of ConfigProvider
 */
export const useConfig = () => {
    const config = useContext(ConfigContext);
    if (config === null) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return config;
};

/**
 * useInstances - Hook to get transformed instances data
 * @returns {Array} Transformed instances array for field components
 */
export const useInstances = () => {
    const config = useConfig();

    // Transform config.instances into flat array format that fields expect
    const instances = [];
    const instancesConfig = config.instances || {};

    Object.entries(instancesConfig).forEach(([serviceType, serviceInstances]) => {
        Object.entries(serviceInstances || {}).forEach(([instanceName, instanceConfig]) => {
            instances.push({
                type: serviceType,
                name: instanceName,
                url: instanceConfig.url,
                api: instanceConfig.api,
            });
        });
    });

    return instances;
};
