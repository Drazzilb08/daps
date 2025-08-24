// ui/src/components/search/plugins/MediaModalComponent.jsx
// Modal component for media search plugin - handles media management operations

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ModalFactory from '../../modals/ModalFactory';
import { fetchConfig } from '../../../utils/api';
import { useToast } from '../../providers/ToastProvider';
import { subPluginRegistry } from './subplugins';

/**
 * Create modal schema using sub-plugin system
 */
function createMediaManagementSchema(mediaItem, rootConfig = {}, selectedInstance = null) {
    // Determine the best sub-plugin for this media item
    const subPlugin = subPluginRegistry.findBestPlugin(mediaItem);

    if (!subPlugin) {
        console.warn('No sub-plugin found for media item:', mediaItem);
        return [];
    }

    console.log(`Using sub-plugin: ${subPlugin.name} (${subPlugin.id}) for ${mediaItem.title}`);

    // Delegate schema creation to the sub-plugin
    return subPlugin.createModalSchema(mediaItem, rootConfig, selectedInstance);
}

/**
 * Media Modal Component - handles media management operations
 */
export default function MediaModalComponent({ obj, onClose }) {
    const toast = useToast();
    const [selectedInstance, setSelectedInstance] = useState(null);
    const [rootConfig, setRootConfig] = useState({});

    // Load root configuration on component mount
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await fetchConfig();
                setRootConfig(config);
            } catch (error) {
                console.error('MediaModalComponent: Failed to load configuration:', error);
                setRootConfig({}); // Fallback to empty config
            }
        };
        loadConfig();
    }, []);

    // Get sub-plugin for current media item
    const getSubPluginForItem = useCallback(mediaItem => {
        return subPluginRegistry.findBestPlugin(mediaItem);
    }, []);

    // Memoize schema generation to prevent unnecessary re-renders
    const memoizedSchema = useMemo(() => {
        if (!obj) return [];
        return createMediaManagementSchema(obj, rootConfig, selectedInstance);
    }, [obj, rootConfig, selectedInstance]);

    // Memoize button handlers
    const memoizedButtonHandlers = useMemo(() => {
        if (!obj) return {};

        const subPlugin = getSubPluginForItem(obj);
        if (!subPlugin) return {};

        const baseButtonHandlers = subPlugin.getButtonHandlers(obj, toast);
        return {
            ...baseButtonHandlers,
            // Handle field changes, specifically for instance selection
            onFieldChange: (fieldKey, newValue) => {
                if (fieldKey === 'selected_arr_instance') {
                    setSelectedInstance(newValue);
                }
            },
        };
    }, [obj, toast, getSubPluginForItem]);

    if (!obj) return null;

    const subPlugin = getSubPluginForItem(obj);

    if (!subPlugin) {
        return (
            <div className="modal-error">No management plugin available for this media item.</div>
        );
    }

    return (
        <ModalFactory
            schema={memoizedSchema}
            entry={obj}
            title={`${subPlugin.name} - ${obj.title} (${obj.year})`}
            modalClass={`modal-content ${subPlugin.id}-management-modal`}
            rootConfig={rootConfig}
            layout={subPlugin.getModalLayout()}
            footerButtons={subPlugin.getModalButtons()}
            onClose={onClose}
            onButtonClick={memoizedButtonHandlers}
            onFieldChange={memoizedButtonHandlers.onFieldChange}
        />
    );
}
