/**
 * DirectoryBrowserModal Component
 *
 * API-based directory browser modal that provides proper directory selection
 * with absolute paths using the DAPS /api/directory endpoint.
 *
 * Replaces the HTML file input limitations with a real directory browser
 * that can provide absolute paths and multiple directory selection.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useApiData } from '../hooks/useApiData.js';
import { api } from '../utils/api/index.js';

/**
 * Directory Browser Modal Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close modal callback
 * @param {Function} props.onDirectorySelect - Directory selection callback
 * @param {boolean} props.multiple - Allow multiple directory selection
 * @param {string} props.title - Modal title
 */
export const DirectoryBrowserModal = React.memo(({
    isOpen,
    onClose,
    onDirectorySelect,
    multiple = false,
    title = 'Select Directory'
}) => {
    const [currentPath, setCurrentPath] = useState('/');
    const [selectedDirectories, setSelectedDirectories] = useState(new Set());
    const [breadcrumbs, setBreadcrumbs] = useState([{ name: 'Root', path: '/' }]);

    // Fetch directory contents using the DAPS API
    const { data: directoryData, isLoading, error, execute: refreshDirectory } = useApiData({
        apiFunction: () => api.system.listDirectory(currentPath),
        options: {
            immediate: false,
            showErrorToast: true,
            errorMessage: 'Failed to load directory contents'
        }
    });

    // Load directory contents when path changes
    useEffect(() => {
        if (isOpen) {
            refreshDirectory();
        }
    }, [currentPath, isOpen, refreshDirectory]);

    // Handle directory navigation
    const navigateToDirectory = useCallback((dirName) => {
        const newPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
        setCurrentPath(newPath);

        // Update breadcrumbs
        setBreadcrumbs(prev => [...prev, { name: dirName, path: newPath }]);
    }, [currentPath]);

    // Handle breadcrumb navigation
    const navigateToBreadcrumb = useCallback((targetPath, index) => {
        setCurrentPath(targetPath);
        setBreadcrumbs(prev => prev.slice(0, index + 1));
    }, []);

    // Handle directory selection toggle
    const toggleDirectorySelection = useCallback((dirName) => {
        const fullPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;

        setSelectedDirectories(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(fullPath)) {
                newSelection.delete(fullPath);
            } else {
                if (!multiple) {
                    newSelection.clear();
                }
                newSelection.add(fullPath);
            }
            return newSelection;
        });
    }, [currentPath, multiple]);

    // Handle confirm selection
    const handleConfirmSelection = useCallback(() => {
        const selectedPaths = Array.from(selectedDirectories);
        if (selectedPaths.length > 0) {
            if (multiple) {
                onDirectorySelect(selectedPaths);
            } else {
                onDirectorySelect(selectedPaths[0]);
            }
            onClose();
            // Reset state for next use
            setSelectedDirectories(new Set());
            setCurrentPath('/');
            setBreadcrumbs([{ name: 'Root', path: '/' }]);
        }
    }, [selectedDirectories, multiple, onDirectorySelect, onClose]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        onClose();
        // Reset state
        setSelectedDirectories(new Set());
        setCurrentPath('/');
        setBreadcrumbs([{ name: 'Root', path: '/' }]);
    }, [onClose]);

    if (!isOpen) return null;

    const directories = directoryData?.data?.directories || [];
    const hasSelection = selectedDirectories.size > 0;

    return (
        <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button
                        onClick={handleCancel}
                        className="modal-close-button"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {/* Breadcrumb navigation */}
                    <div className="breadcrumb-nav">
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.path}>
                                <button
                                    onClick={() => navigateToBreadcrumb(crumb.path, index)}
                                    className="breadcrumb-item"
                                >
                                    {crumb.name}
                                </button>
                                {index < breadcrumbs.length - 1 && (
                                    <span className="breadcrumb-separator">/</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Current path display */}
                    <div className="current-path">
                        <strong>Current Path:</strong> {currentPath}
                    </div>

                    {/* Directory listing */}
                    <div className="directory-listing">
                        {isLoading && (
                            <div className="loading-state">
                                <div className="spinner" aria-label="Loading directories..." />
                                <span>Loading directories...</span>
                            </div>
                        )}

                        {error && (
                            <div className="error-state" role="alert">
                                <strong>Error:</strong> {error.message}
                            </div>
                        )}

                        {!isLoading && !error && directories.length === 0 && (
                            <div className="empty-state">
                                No directories found in this location.
                            </div>
                        )}

                        {!isLoading && !error && directories.length > 0 && (
                            <div className="directory-list">
                                {directories.map((dirName) => {
                                    const fullPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
                                    const isSelected = selectedDirectories.has(fullPath);

                                    return (
                                        <div
                                            key={dirName}
                                            className={`directory-item ${isSelected ? 'selected' : ''}`}
                                        >
                                            <div className="directory-info">
                                                <span className="directory-icon">📁</span>
                                                <span className="directory-name">{dirName}</span>
                                            </div>
                                            <div className="directory-actions">
                                                <button
                                                    onClick={() => navigateToDirectory(dirName)}
                                                    className="btn btn--small btn--secondary"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => toggleDirectorySelection(dirName)}
                                                    className={`btn btn--small ${isSelected ? 'btn--success' : 'btn--primary'}`}
                                                >
                                                    {isSelected ? 'Selected' : 'Select'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selection summary */}
                    {hasSelection && (
                        <div className="selection-summary">
                            <h4>Selected Directories ({selectedDirectories.size}):</h4>
                            <ul className="selected-paths">
                                {Array.from(selectedDirectories).map(path => (
                                    <li key={path} className="selected-path">
                                        {path}
                                        <button
                                            onClick={() => {
                                                setSelectedDirectories(prev => {
                                                    const newSet = new Set(prev);
                                                    newSet.delete(path);
                                                    return newSet;
                                                });
                                            }}
                                            className="remove-selection"
                                            aria-label={`Remove ${path} from selection`}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        onClick={handleCancel}
                        className="btn btn--secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmSelection}
                        disabled={!hasSelection}
                        className="btn btn--primary"
                    >
                        Confirm Selection {hasSelection && `(${selectedDirectories.size})`}
                    </button>
                </div>
            </div>
        </div>
    );
});

DirectoryBrowserModal.displayName = 'DirectoryBrowserModal';

export default DirectoryBrowserModal;