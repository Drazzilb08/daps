/**
 * Field component testing page
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FieldRegistry } from '../../components/fields/FieldRegistry.jsx';
import { FormRenderer } from '../../utils/forms/FormRenderer.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { instancesAPI } from '../../utils/api';
import { InstancesField } from '../../components/fields/custom/InstancesField.jsx';

const FieldStatusOverview = React.memo(() => {
    const workingTypes = FieldRegistry.getWorkingFieldTypes();
    const placeholderTypes = FieldRegistry.getPlaceholderFieldTypes();
    const totalTypes = FieldRegistry.getFieldTypes().length;

    const workingCount = workingTypes.length;
    const placeholderCount = placeholderTypes.length;
    const completionPercentage = Math.round((workingCount / totalTypes) * 100);

    return (
        <div className="bg-surface-elevated rounded p-4 mb-8 border">
            <h2 className="text-lg font-semibold text-primary mb-3 text-center">
                Field Implementation Status
            </h2>

            <div className="grid grid-cols-auto gap-3 mb-4">
                <div className="bg-surface border rounded-sm p-3 text-center border-success bg-success-subtle">
                    <div className="text-xl font-bold text-primary mb-1">{workingCount}</div>
                    <div className="text-sm text-secondary">Working Fields</div>
                </div>
                <div className="bg-surface border rounded-sm p-3 text-center border-error bg-error-subtle">
                    <div className="text-xl font-bold text-primary mb-1">{placeholderCount}</div>
                    <div className="text-sm text-secondary">Placeholder Fields</div>
                </div>
                <div className="bg-surface border rounded-sm p-3 text-center border-primary bg-primary-subtle">
                    <div className="text-xl font-bold text-primary mb-1">
                        {completionPercentage}%
                    </div>
                    <div className="text-sm text-secondary">Completion Rate</div>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-auto-fit-md">
                <div className="bg-surface border rounded-sm p-3">
                    <h3 className="text-base font-medium text-primary mb-2">✅ Working Fields</h3>
                    <div className="flex flex-wrap gap-1">
                        {workingTypes.map(type => (
                            <span
                                key={type}
                                className="inline-flex items-center px-2 py-1 text-sm font-medium border rounded-sm bg-surface text-success border-success"
                            >
                                {type}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-surface border rounded-sm p-3">
                    <h3 className="text-base font-medium text-primary mb-2">
                        ❌ Placeholder Fields
                    </h3>
                    <div className="flex flex-wrap gap-1">
                        {placeholderTypes.slice(0, 12).map(type => (
                            <span
                                key={type}
                                className="inline-flex items-center px-2 py-1 text-sm font-medium border rounded-sm bg-surface text-error border-error"
                            >
                                {type}
                            </span>
                        ))}
                        {placeholderCount > 12 && (
                            <span className="inline-flex items-center px-2 py-1 text-sm font-medium border rounded-sm bg-surface-elevated text-secondary border-border italic">
                                +{placeholderCount - 12} more
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

FieldStatusOverview.displayName = 'FieldStatusOverview';

/**
 * Individual Field Tester Component
 * Test a single field type with different configurations and states
 */
const FieldTester = React.memo(({
    fieldType,
    onApprove,
    onDisapprove,
    isApproved,
    instances = [],
    instancesLoading = false,
    instancesError = null,
    plexLibraries = {},
    librariesLoading = false,
    librariesError = null,
}) => {
    const [testConfig, setTestConfig] = useState(() => {
        const baseConfig = {
            label: `Test ${fieldType} Field`,
            required: false,
            disabled: false,
            placeholder: `Enter ${fieldType} value...`,
            description: `Testing ${fieldType} field implementation`,
        };

        // Add sample options for dropdown fields
        if (fieldType === 'dropdown') {
            baseConfig.options = [
                { value: 'option1', label: 'First Option' },
                { value: 'option2', label: 'Second Option' },
                { value: 'option3', label: 'Third Option' },
                { value: 'group1', label: 'Group Item 1' },
                { value: 'group2', label: 'Group Item 2' },
                'Simple String Option',
                'Another String Option',
            ];
            baseConfig.placeholder = 'Select an option from the dropdown...';
            baseConfig.description =
                'Testing dropdown field with sample options (mix of objects and strings)';
        }

        // Add sample mode options for dirlist_options fields
        if (fieldType === 'dirlist_options') {
            baseConfig.mode_options = [
                { value: 'copy', label: 'Copy' },
                { value: 'move', label: 'Move' },
                { value: 'link', label: 'Link' },
                { value: 'hardlink', label: 'Hard Link' },
                { value: 'symlink', label: 'Symbolic Link' },
            ];
            baseConfig.placeholder = 'Click to select directory...';
            baseConfig.description =
                'Testing directory list field with mode selection dropdowns';
            baseConfig.add_button_text = 'Add Directory';
            baseConfig.remove_button_text = 'Remove';
            baseConfig.max_directories = 10;
            baseConfig.min_directories = 1;
        }

        // Add schema configuration for instances fields
        if (fieldType === 'instances') {
            baseConfig.instance_types = ['radarr', 'sonarr', 'plex'];
            baseConfig.add_posters_option = true;
            baseConfig.placeholder = 'Select instances for this module...';
            baseConfig.description =
                'Testing instances field with multiple service types and poster upload options';
        }

        // Add configuration for tag fields
        if (fieldType === 'tag_input') {
            baseConfig.suggestions = ['action', 'adventure', 'animation', 'comedy', 'drama', 'documentary', 'family', 'fantasy', 'horror', 'kids', 'mystery', 'romance', 'sci-fi', 'thriller', 'western'];

            // Custom filter function for "starts with" behavior
            baseConfig.filterFunction = (suggestion, input) => {
                const suggestionText = suggestion.toLowerCase();
                const inputText = input.toLowerCase();
                return suggestionText.startsWith(inputText); // Type "r" → shows "romance"
            };
            baseConfig.allowCustom = true;
            baseConfig.placeholder = 'Type "r" to see romance, "a" for action...';
            baseConfig.description = 'Testing "starts with" filtering - type "r" and only items beginning with "r" appear';
        }

        if (fieldType === 'tag_display') {
            baseConfig.disabled = true;
            baseConfig.placeholder = 'Read-only tag display';
            baseConfig.description = 'Testing tag display field in read-only mode';
        }

        return baseConfig;
    });

    const [testValue, setTestValue] = useState(() => {
        // Initialize test value based on field type
        if (fieldType === 'instances') {
            return []; // Array for instances field
        }
        if (fieldType === 'color_list' || fieldType === 'color_list_poster') {
            return []; // Array for color list fields
        }
        if (fieldType === 'dirlist' || fieldType === 'dirlist_dragdrop' || fieldType === 'dirlist_options') {
            return []; // Array for directory list fields
        }
        if (fieldType === 'check_box') {
            return false; // Boolean for checkbox
        }
        if (fieldType === 'tag_input') {
            return []; // Array for tag input field
        }
        if (fieldType === 'tag_display') {
            return ['action', 'comedy', 'kids']; // Array with sample tags for display
        }
        return ''; // String for most fields
    });
    const [showError, setShowError] = useState(false);
    const toast = useToast();

    // Update test configuration when field type changes
    useEffect(() => {
        const baseConfig = {
            label: `Test ${fieldType} Field`,
            required: false,
            disabled: false,
            placeholder: `Enter ${fieldType} value...`,
            description: `Testing ${fieldType} field implementation`,
        };

        // Add sample options for dropdown fields
        if (fieldType === 'dropdown') {
            baseConfig.options = [
                { value: 'option1', label: 'First Option' },
                { value: 'option2', label: 'Second Option' },
                { value: 'option3', label: 'Third Option' },
                { value: 'group1', label: 'Group Item 1' },
                { value: 'group2', label: 'Group Item 2' },
                'Simple String Option',
                'Another String Option',
            ];
            baseConfig.placeholder = 'Select an option from the dropdown...';
            baseConfig.description =
                'Testing dropdown field with sample options (mix of objects and strings)';
        }

        // Add sample mode options for dirlist_options fields
        if (fieldType === 'dirlist_options') {
            baseConfig.mode_options = [
                { value: 'copy', label: 'Copy' },
                { value: 'move', label: 'Move' },
                { value: 'link', label: 'Link' },
                { value: 'hardlink', label: 'Hard Link' },
                { value: 'symlink', label: 'Symbolic Link' },
            ];
            baseConfig.placeholder = 'Click to select directory...';
            baseConfig.description =
                'Testing directory list field with mode selection dropdowns';
            baseConfig.add_button_text = 'Add Directory';
            baseConfig.remove_button_text = 'Remove';
            baseConfig.max_directories = 10;
            baseConfig.min_directories = 1;
        }

        // Add schema configuration for instances fields
        if (fieldType === 'instances') {
            baseConfig.instance_types = ['radarr', 'sonarr', 'plex'];
            baseConfig.add_posters_option = true;
            baseConfig.placeholder = 'Select instances for this module...';
            baseConfig.description =
                'Testing instances field with multiple service types and poster upload options';
        }

        // Add configuration for tag fields
        if (fieldType === 'tag_input') {
            baseConfig.suggestions = ['action', 'adventure', 'animation', 'comedy', 'drama', 'documentary', 'family', 'fantasy', 'horror', 'kids', 'mystery', 'romance', 'sci-fi', 'thriller', 'western'];

            // Custom filter function for "starts with" behavior
            baseConfig.filterFunction = (suggestion, input) => {
                const suggestionText = suggestion.toLowerCase();
                const inputText = input.toLowerCase();
                return suggestionText.startsWith(inputText); // Type "r" → shows "romance"
            };
            baseConfig.allowCustom = true;
            baseConfig.placeholder = 'Type "r" to see romance, "a" for action...';
            baseConfig.description = 'Testing "starts with" filtering - type "r" and only items beginning with "r" appear';
        }

        if (fieldType === 'tag_display') {
            baseConfig.disabled = true;
            baseConfig.placeholder = 'Read-only tag display';
            baseConfig.description = 'Testing tag display field in read-only mode';
        }

        setTestConfig(baseConfig);

        // Reset test value based on field type
        if (fieldType === 'instances') {
            setTestValue([]); // Array for instances field
        } else if (fieldType === 'color_list' || fieldType === 'color_list_poster') {
            setTestValue([]); // Array for color list fields
        } else if (fieldType === 'dirlist' || fieldType === 'dirlist_dragdrop' || fieldType === 'dirlist_options') {
            setTestValue([]); // Array for directory list fields
        } else if (fieldType === 'check_box') {
            setTestValue(false); // Boolean for checkbox
        } else if (fieldType === 'tag_input') {
            setTestValue([]); // Array for tag input field
        } else if (fieldType === 'tag_display') {
            setTestValue(['action', 'comedy', 'kids']); // Array with sample tags for display
        } else {
            setTestValue(''); // String for most fields
        }
    }, [fieldType]);

    // Create test field configuration
    const testField = useMemo(
        () => ({
            key: `test_${fieldType}`,
            type: fieldType,
            ...testConfig,
        }),
        [fieldType, testConfig]
    );

    // Test form schema with error injection for testing
    const testSchema = useMemo(
        () => ({
            label: `${fieldType} Field Test`,
            fields: [testField],
        }),
        [testField]
    );

    // Test form values with error state simulation
    const testFormValues = useMemo(
        () => ({
            [`test_${fieldType}`]: testValue,
        }),
        [fieldType, testValue]
    );

    // Error state simulation - inject error if showError is true
    const testErrors = useMemo(() => {
        if (showError) {
            return { [`test_${fieldType}`]: 'Test error message - this is how errors appear' };
        }
        return {};
    }, [showError, fieldType]);

    const handleConfigChange = useCallback((key, value) => {
        setTestConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleTestSubmit = useCallback(
        values => {
            console.log(`[${fieldType}] Test submit:`, values);
            toast.success(`${fieldType} field test submitted successfully!`);
        },
        [fieldType, toast]
    );

    const handleApprove = useCallback(() => {
        onApprove(fieldType);
        toast.success(`${fieldType} field approved for production!`);
    }, [fieldType, onApprove, toast]);

    const handleDisapprove = useCallback(() => {
        onDisapprove(fieldType);
        if (isApproved) {
            toast.success(`${fieldType} field unapproved - moved to needs testing`);
        } else {
            toast.info(`${fieldType} field marked as needs work`);
        }
    }, [fieldType, onDisapprove, toast, isApproved]);

    const isWorking = FieldRegistry.isWorkingFieldType(fieldType);

    return (
        <div className={`bg-surface border rounded p-4 ${!isWorking ? 'opacity-70 border-dashed' : ''}`}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-medium text-primary font-mono m-0">{fieldType}</h3>
                <div className="flex gap-2">
                    {!isWorking && (
                        <span className="inline-flex items-center px-2 py-1 text-sm font-medium border rounded-sm bg-surface text-error border-error">Placeholder</span>
                    )}
                    {isWorking && isApproved && (
                        <span className="inline-flex items-center px-2 py-1 text-sm font-medium border rounded-sm bg-surface text-success border-success">Approved</span>
                    )}
                    {isWorking && !isApproved && (
                        <span className="inline-flex items-center px-2 py-1 text-sm font-medium border rounded-sm bg-surface text-warning border-warning">Needs Testing</span>
                    )}
                </div>
            </div>

            {isWorking && (
                <>
                    <div className="mb-4 p-3 bg-surface-elevated border rounded-sm">
                        <h4 className="text-base font-medium text-primary mb-2">Field Configuration</h4>
                        <div className="flex gap-4 flex-wrap">
                            <label className="flex items-center justify-center gap-2 text-sm text-primary cursor-pointer touch-target px-2 py-2">
                                <input
                                    type="checkbox"
                                    checked={testConfig.required}
                                    onChange={e => handleConfigChange('required', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                Required
                            </label>
                            <label className="flex items-center justify-center gap-2 text-sm text-primary cursor-pointer touch-target px-2 py-2">
                                <input
                                    type="checkbox"
                                    checked={testConfig.disabled}
                                    onChange={e => handleConfigChange('disabled', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                Disabled
                            </label>
                            <label className="flex items-center justify-center gap-2 text-sm text-primary cursor-pointer touch-target px-2 py-2">
                                <input
                                    type="checkbox"
                                    checked={showError}
                                    onChange={e => setShowError(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                Show Error State
                            </label>
                        </div>
                    </div>

                    <div className="mb-4 p-3 bg-surface-elevated border rounded-sm">
                        <h4 className="text-base font-medium text-primary mb-2">Field Test</h4>

                        {fieldType === 'instances' ? (
                            // Special handling for InstancesField with API data
                            <div className="field-wrapper">
                                <InstancesField
                                    field={testConfig}
                                    value={testValue}
                                    onChange={setTestValue}
                                    disabled={testConfig.disabled}
                                    highlightInvalid={showError}
                                    errorMessage={showError ? 'Test error message' : null}
                                    instances={instances}
                                    instancesLoading={instancesLoading}
                                    instancesError={instancesError}
                                    plexLibraries={plexLibraries}
                                    librariesLoading={librariesLoading}
                                    librariesError={librariesError}
                                />
                            </div>
                        ) : (
                            // Standard FormRenderer for other field types
                            <FormRenderer
                                schema={testSchema}
                                initialValues={testFormValues}
                                onSubmit={handleTestSubmit}
                                onChange={values => setTestValue(values[`test_${fieldType}`])}
                                submitText="Test Submit"
                                validateOnChange={false}
                                customErrors={testErrors}
                            />
                        )}
                    </div>

                    <div className="p-3 bg-surface-elevated border border-primary rounded-sm">
                        <h4 className="text-base font-medium text-primary mb-2">Approval Status</h4>
                        <div className="flex gap-2 flex-wrap">
                            {isApproved ? (
                                <button
                                    onClick={handleDisapprove}
                                    className="touch-target bg-warning text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                                >
                                    Unapprove
                                </button>
                            ) : (
                                <button
                                    onClick={handleApprove}
                                    className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                                >
                                    Approve for Production
                                </button>
                            )}
                            <button
                                onClick={handleDisapprove}
                                className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                            >
                                Needs Work
                            </button>
                        </div>
                    </div>
                </>
            )}

            {!isWorking && (
                <div className="p-4 text-center text-secondary italic">
                    <p>
                        This field type is not implemented. It will show a placeholder message in
                        forms.
                    </p>
                </div>
            )}
        </div>
    );
});

FieldTester.displayName = 'FieldTester';

/**
 * Main Field Test Page Component
 * Clean interface focused on field development and testing
 */
const FieldTestPage = () => {
    // Load approved fields from localStorage on mount, with updated default list
    const [approvedFields, setApprovedFields] = useState(() => {
        const saved = localStorage.getItem('daps-field-approvals');
        if (saved) {
            try {
                return new Set(JSON.parse(saved));
            } catch (error) {
                console.warn(
                    '[FieldTestPage] Failed to parse saved approvals, using defaults:',
                    error
                );
            }
        }
        // Default approved fields - include all stable implementations
        return new Set([
            'text',
            'password',
            'number',
            'textarea',
            'float',
            'hidden',
            'check_box',
            'dropdown',
            'json',
        ]);
    });
    const [selectedFieldType, setSelectedFieldType] = useState('text');
    const [filter, setFilter] = useState('all'); // 'all', 'working', 'placeholder', 'approved', 'unapproved'

    const allFieldTypes = FieldRegistry.getFieldTypes();
    const workingFieldTypes = FieldRegistry.getWorkingFieldTypes();

    // Load instances data for InstancesField testing
    const {
        data: instancesResponse,
        isLoading: instancesLoading,
        error: instancesError
    } = useApiData({
        apiFunction: instancesAPI.fetchInstances,
        options: {
            immediate: true,
            showErrorToast: false,
        },
    });

    // Transform instances data to expected format
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

    // Load Plex libraries for all Plex instances
    const plexInstances = useMemo(() => {
        return instances.filter(instance => instance.type === 'plex');
    }, [instances]);

    const {
        data: librariesResponse,
        isLoading: librariesLoading,
        error: librariesError
    } = useApiData({
        apiFunction: async () => {
            if (plexInstances.length === 0) {
                return { data: {} };
            }

            const librariesByInstance = {};
            for (const instance of plexInstances) {
                try {
                    const response = await instancesAPI.fetchPlexLibraries(instance.name);
                    librariesByInstance[instance.name] = response?.data?.libraries || [];
                } catch (error) {
                    console.warn(`Failed to load libraries for ${instance.name}:`, error);
                    librariesByInstance[instance.name] = [];
                }
            }
            return { data: librariesByInstance };
        },
        dependencies: [plexInstances.map(i => i.name).join(',')],
        options: {
            immediate: plexInstances.length > 0,
            showErrorToast: false,
        },
    });

    const plexLibraries = librariesResponse?.data || {};

    // Save approved fields to localStorage whenever the set changes
    useEffect(() => {
        localStorage.setItem('daps-field-approvals', JSON.stringify(Array.from(approvedFields)));
    }, [approvedFields]);

    // Filter field types based on current filter
    const filteredFieldTypes = useMemo(() => {
        switch (filter) {
            case 'working':
                return workingFieldTypes;
            case 'placeholder':
                return FieldRegistry.getPlaceholderFieldTypes();
            case 'approved':
                return workingFieldTypes.filter(type => approvedFields.has(type));
            case 'unapproved':
                return workingFieldTypes.filter(type => !approvedFields.has(type));
            default:
                return allFieldTypes;
        }
    }, [allFieldTypes, workingFieldTypes, filter, approvedFields]);

    // Auto-handle field selection when filtered list changes
    useEffect(() => {
        if (filteredFieldTypes.length === 0) {
            // No fields match filter - keep current selection for now
            // The UI will show a "no fields" message
            return;
        } else if (filteredFieldTypes.length === 1) {
            // Exactly one field - auto-select it
            setSelectedFieldType(filteredFieldTypes[0]);
        } else if (!filteredFieldTypes.includes(selectedFieldType)) {
            // Current selection not in filtered list - select first valid option
            setSelectedFieldType(filteredFieldTypes[0]);
        }
    }, [filteredFieldTypes, selectedFieldType]);

    const handleApproveField = useCallback(fieldType => {
        setApprovedFields(prev => new Set([...prev, fieldType]));
    }, []);

    const handleDisapproveField = useCallback(fieldType => {
        setApprovedFields(prev => {
            const newSet = new Set(prev);
            newSet.delete(fieldType);
            return newSet;
        });
    }, []);

    const handleFieldTypeSelect = useCallback(fieldType => {
        setSelectedFieldType(fieldType);
    }, []);

    const stats = useMemo(() => {
        const working = workingFieldTypes.length;
        const approved = workingFieldTypes.filter(type => approvedFields.has(type)).length;
        const unapproved = working - approved;
        const placeholder = FieldRegistry.getPlaceholderFieldTypes().length;

        return { working, approved, unapproved, placeholder };
    }, [workingFieldTypes, approvedFields]);

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="text-center mb-8 pb-4 border-b">
                <h1 className="text-2xl font-bold text-primary mb-2">Field Development Testing</h1>
                <p className="text-base text-secondary max-w-60ch mx-auto mb-4">
                    Development interface for testing and approving field implementations. Focus on
                    working field types and approval workflow.
                </p>
            </div>

            <FieldStatusOverview />

            <div className="bg-surface-elevated rounded p-4 mb-8 border">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-lg font-semibold text-primary m-0">
                        Individual Field Testing
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <span className="text-sm text-secondary bg-surface border p-1 px-2">Working: {stats.working}</span>
                        <span className="text-sm text-secondary bg-surface border p-1 px-2">Approved: {stats.approved}</span>
                        <span className="text-sm text-secondary bg-surface border p-1 px-2">Needs Testing: {stats.unapproved}</span>
                        <span className="text-sm text-secondary bg-surface border p-1 px-2">Placeholder: {stats.placeholder}</span>
                    </div>
                </div>

                <div className="flex gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label htmlFor="filter-select" className="text-sm font-medium text-primary">Filter:</label>
                        <select
                            id="filter-select"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="touch-target-target py-2.5 px-3 border bg-surface text-primary text-sm min-w-200 rounded-sm min-h-11"
                        >
                            <option value="all">All Field Types</option>
                            <option value="working">Working Only</option>
                            <option value="placeholder">Placeholder Only</option>
                            <option value="approved">Approved Only</option>
                            <option value="unapproved">Needs Testing</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label htmlFor="field-type-select" className="text-sm font-medium text-primary">Test Field:</label>
                        {filteredFieldTypes.length === 0 ? (
                            <div className="text-sm text-secondary">
                                <span>No fields match this filter</span>
                            </div>
                        ) : (
                            <select
                                id="field-type-select"
                                value={selectedFieldType}
                                onChange={e => handleFieldTypeSelect(e.target.value)}
                                className="touch-target-target py-2.5 px-3 border bg-surface text-primary text-sm min-w-200 rounded-sm min-h-11"
                            >
                                {filteredFieldTypes.map(type => (
                                    <option key={type} value={type}>
                                        {type}{' '}
                                        {FieldRegistry.isWorkingFieldType(type)
                                            ? ''
                                            : '(placeholder)'}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="mb-4">
                    {filteredFieldTypes.length === 0 ? (
                        <div className="text-center p-4">
                            <h3 className="text-lg font-medium text-primary mb-2">No Fields Available</h3>
                            <p className="text-secondary">
                                No field types match the current filter. Try adjusting your filter
                                selection to see available fields for testing.
                            </p>
                        </div>
                    ) : (
                        <FieldTester
                            key={selectedFieldType}
                            fieldType={selectedFieldType}
                            onApprove={handleApproveField}
                            onDisapprove={handleDisapproveField}
                            isApproved={approvedFields.has(selectedFieldType)}
                            instances={instances}
                            instancesLoading={instancesLoading}
                            instancesError={instancesError}
                            plexLibraries={plexLibraries}
                            librariesLoading={librariesLoading}
                            librariesError={librariesError}
                        />
                    )}
                </div>
            </div>

            <div className="bg-surface-elevated rounded p-4 border">
                <h3 className="text-lg font-semibold text-primary mb-3 text-center">Quick Actions</h3>
                <div className="flex gap-2 justify-center flex-wrap">
                    <button
                        onClick={() => {
                            workingFieldTypes.forEach(type =>
                                setApprovedFields(prev => new Set([...prev, type]))
                            );
                        }}
                        className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors"
                    >
                        Approve All Working Fields
                    </button>
                    <button
                        onClick={() => setApprovedFields(new Set())}
                        className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors"
                    >
                        Reset All Approvals
                    </button>
                    <button
                        onClick={() => setFilter('unapproved')}
                        className="touch-target bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover"
                    >
                        Show Fields Needing Testing
                    </button>
                </div>
            </div>
        </div>
    );
};

FieldTestPage.displayName = 'FieldTestPage';

export default FieldTestPage;
