import React, { useState, useCallback, useEffect } from 'react';
import { SETTINGS_SCHEMA } from '../../utils/constants/settings_schema.js';

/**
 * Settings Mock Page - Layout prototype for schema-driven accordion interface
 *
 * This mock demonstrates the key design patterns from the action plan:
 * - Progressive disclosure accordion interface
 * - Mobile-first vertical layout
 * - Schema-driven module generation
 * - Clean aesthetic with proper spacing
 *
 * @returns {JSX.Element} Settings mock layout
 */
const SettingsMockPage = () => {
    // Track which modules are expanded (progressive disclosure)
    const [expandedModules, setExpandedModules] = useState(['sync_gdrive']); // Start with one expanded
    const [filteredModules, setFilteredModules] = useState(SETTINGS_SCHEMA);

    // Handle module expand/collapse
    const toggleModule = useCallback((moduleKey) => {
        setExpandedModules(prev =>
            prev.includes(moduleKey)
                ? prev.filter(key => key !== moduleKey)
                : [...prev, moduleKey]
        );
    }, []);

    // Handle expand/collapse all
    const expandAll = useCallback(() => {
        setExpandedModules(SETTINGS_SCHEMA.map(module => module.key));
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedModules([]);
    }, []);

    // Mock header search integration
    const handleSettingsSearch = useCallback((query) => {
        if (!query) {
            setFilteredModules(SETTINGS_SCHEMA);
            return;
        }

        const searchLower = query.toLowerCase();
        const filtered = SETTINGS_SCHEMA.filter(module =>
            module.label.toLowerCase().includes(searchLower) ||
            module.fields.some(field =>
                field.label?.toLowerCase().includes(searchLower) ||
                field.key?.toLowerCase().includes(searchLower)
            )
        );
        setFilteredModules(filtered);
    }, []);

    // Mock SearchCoordinator integration
    useEffect(() => {
        // In real implementation, this would register with SearchCoordinatorProvider
        console.log('Mock: Registering settings search handler with header search system');

        // Simulate search integration with window message for demo
        const handleSearchMessage = (event) => {
            if (event.data?.type === 'settings-search') {
                handleSettingsSearch(event.data.query);
            }
        };

        window.addEventListener('message', handleSearchMessage);
        return () => window.removeEventListener('message', handleSearchMessage);
    }, [handleSettingsSearch]);


    // Get field type summary for mock display
    const getFieldTypeSummary = (fields) => {
        if (!fields || fields.length === 0) return 'No fields configured';

        const types = fields.reduce((acc, field) => {
            acc[field.type] = (acc[field.type] || 0) + 1;
            return acc;
        }, {});

        const summary = Object.entries(types)
            .map(([type, count]) => `${count} ${type}`)
            .slice(0, 3) // Show first 3 types
            .join(', ');

        const total = fields.length;
        const remaining = Object.keys(types).length > 3 ? ` (+${Object.keys(types).length - 3} more)` : '';

        return `${total} fields: ${summary}${remaining}`;
    };

    return (
        <div className="p-6 max-w-4xl mx-auto min-h-screen">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-text-primary mb-2">
                    Settings Configuration
                </h1>
                <p className="text-text-secondary mb-4">
                    Mock interface for schema-driven accordion layout demonstrating header search integration.
                    All modules generated from settings_schema.js. Search functionality integrated with header search system.
                </p>

                {/* Note about header search integration */}
                <div className="p-4 bg-bg-secondary border border-border-subtle rounded-md mb-6">
                    <p className="text-sm text-text-primary mb-2">
                        <span className="material-symbols-outlined text-primary mr-2" style={{ fontSize: '16px' }}>info</span>
                        <strong>Header Search Integration</strong>
                    </p>
                    <p className="text-sm text-text-secondary">
                        In the final implementation, search functionality will be handled by the header search system.
                        The SearchToolbar will automatically appear with expand/collapse and save/reset controls
                        when navigating to the settings page. No inline search controls needed.
                    </p>
                </div>
            </div>

            {/* Module Accordion List */}
            <div className="space-y-3">
                {filteredModules.map((module) => {
                    const isExpanded = expandedModules.includes(module.key);
                    const fieldCount = module.fields?.length || 0;

                    return (
                        <div
                            key={module.key}
                            className="bg-surface border border-border-subtle rounded-lg overflow-hidden"
                        >
                            {/* Accordion Header */}
                            <button
                                onClick={() => toggleModule(module.key)}
                                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-hover transition-colors min-h-16"
                                aria-expanded={isExpanded}
                                aria-controls={`module-content-${module.key}`}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Expand/Collapse Icon */}
                                    <span className="material-symbols-outlined text-xl text-text-secondary transition-transform duration-200 shrink-0" style={{
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                                    }}>
                                        chevron_right
                                    </span>

                                    {/* Module Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium text-text-primary mb-1">
                                            {module.label}
                                        </h3>
                                    </div>
                                </div>
                            </button>

                            {/* Accordion Content */}
                            <div
                                id={`module-content-${module.key}`}
                                className="overflow-hidden transition-all duration-300 ease-in-out"
                                style={{
                                    maxHeight: isExpanded ? '2000px' : '0px'
                                }}
                            >
                                <div className="border-t border-border-subtle bg-bg-secondary/30">
                                    {module.fields && module.fields.length > 0 ? (
                                        <div className="p-6 bg-surface-elevated">
                                            <div className="space-y-4">
                                                {/* Field List Mock */}
                                                <h4 className="text-sm font-medium text-text-primary mb-4">
                                                    Field Configuration ({module.fields.length} fields)
                                                </h4>

                                                {/* Clean vertical field layout */}
                                                <div className="space-y-4">
                                                    {module.fields.map((field, index) => (
                                                        <div
                                                            key={`${module.key}-${field.key}`}
                                                            className="flex flex-col gap-2 p-4 bg-surface-elevated border border-border-subtle rounded-md"
                                                        >
                                                            {/* Field Header */}
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-text-primary">
                                                                            {field.label}
                                                                        </span>
                                                                        {field.required && (
                                                                            <span className="text-error text-sm">*</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-text-tertiary mt-1 font-mono">
                                                                        {field.key}
                                                                    </p>
                                                                </div>

                                                                {/* Field Type Badge */}
                                                                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-mono shrink-0">
                                                                    {field.type}
                                                                </span>
                                                            </div>

                                                            {/* Field Description */}
                                                            {field.description && (
                                                                <p className="text-sm text-text-secondary">
                                                                    {field.description}
                                                                </p>
                                                            )}

                                                            {/* Field Options/Properties */}
                                                            {(field.options || field.placeholder || field.required) && (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {field.options && (
                                                                        <span className="px-2 py-1 bg-surface border border-border-subtle text-xs rounded">
                                                                            Options: {Array.isArray(field.options) ? field.options.join(', ') : field.options}
                                                                        </span>
                                                                    )}
                                                                    {field.placeholder && (
                                                                        <span className="px-2 py-1 bg-surface border border-border-subtle text-xs rounded">
                                                                            Placeholder: {field.placeholder.substring(0, 30)}...
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Nested Fields (for custom types) */}
                                                            {field.fields && field.fields.length > 0 && (
                                                                <div className="mt-3 pl-4 border-l-2 border-border-subtle">
                                                                    <p className="text-xs font-medium text-text-secondary mb-2">
                                                                        Nested fields ({field.fields.length}):
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        {field.fields.slice(0, 3).map((nestedField) => (
                                                                            <span
                                                                                key={nestedField.key}
                                                                                className="inline-block px-2 py-1 bg-bg-tertiary text-xs rounded mr-2 mb-1"
                                                                            >
                                                                                {nestedField.label} ({nestedField.type})
                                                                            </span>
                                                                        ))}
                                                                        {field.fields.length > 3 && (
                                                                            <span className="text-xs text-text-tertiary">
                                                                                +{field.fields.length - 3} more...
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Empty Module State
                                        <div className="p-8 text-center">
                                            <span className="material-symbols-outlined text-4xl text-text-tertiary mb-4 block">
                                                inbox
                                            </span>
                                            <p className="text-text-secondary">
                                                This module requires no configuration
                                            </p>
                                            <p className="text-sm text-text-tertiary mt-2">
                                                Module key: <code className="px-2 py-1 bg-surface border border-border-subtle rounded text-xs">{module.key}</code>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* No Results State */}
            {filteredModules.length === 0 && (
                <div className="text-center py-12">
                    <span className="material-symbols-outlined text-4xl text-text-tertiary mb-4 block">
                        search_off
                    </span>
                    <p className="text-text-secondary">
                        No modules found matching "{searchTerm}"
                    </p>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="mt-4 px-4 py-2 bg-primary text-primary-text rounded-md hover:bg-primary-hover transition-colors"
                    >
                        Clear search
                    </button>
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-12 p-6 bg-surface border border-border-subtle rounded-lg">
                <h3 className="font-medium text-text-primary mb-2">Mock Layout Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-text-secondary">Total Modules:</span>
                        <span className="ml-2 font-medium text-text-primary">{SETTINGS_SCHEMA.length}</span>
                    </div>
                    <div>
                        <span className="text-text-secondary">Expanded:</span>
                        <span className="ml-2 font-medium text-text-primary">{expandedModules.length}</span>
                    </div>
                    <div>
                        <span className="text-text-secondary">Schema-Driven:</span>
                        <span className="ml-2 font-medium text-success">100%</span>
                    </div>
                </div>
                <p className="text-xs text-text-tertiary mt-3">
                    This mockup demonstrates the accordion interface from the action plan with header search integration.
                    Next steps: implement SearchCoordinatorProvider integration and real field components via FieldRegistry system.
                </p>
            </div>
        </div>
    );
};

export default SettingsMockPage;