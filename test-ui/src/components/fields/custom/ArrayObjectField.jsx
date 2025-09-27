import { useState, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { RemoveButton, AddButton, EmptyState, ColorSwatches } from '../features/shared';
import { FieldRegistry } from '../FieldRegistry';


/**
 * Unified ArrayObjectField - Handles dynamic array of objects with configurable schemas
 * Uses accordion-style expansion for mobile-first design without modal dependency
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration with schema for object fields
 * @param {Array} props.value - Array of objects
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation errors
 * @param {string} props.errorMessage - Error message to display
 */
export const ArrayObjectField = ({
    field,
    value = [],
    onChange,
    disabled = false,
    highlightInvalid = false,
    errorMessage,
}) => {
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [editingData, setEditingData] = useState({});

    const inputId = `field-${field.key}`;

    // Get display template for this field type
    const displayTemplate = getDisplayTemplate(field.displayType || field.type);

    const handleAdd = useCallback(() => {
        const newIndex = value.length;
        setExpandedIndex(newIndex);
        setEditingData({});
    }, [value.length]);

    const handleEdit = useCallback((index) => {
        // Toggle behavior: if clicking on already expanded item, close it
        if (expandedIndex === index) {
            setExpandedIndex(null);
            setEditingData({});
        } else {
            setExpandedIndex(index);
            setEditingData({ ...value[index] });
        }
    }, [value, expandedIndex]);

    const handleSave = useCallback(() => {
        if (expandedIndex === null) return;

        const newArray = [...value];
        if (expandedIndex >= newArray.length) {
            // Adding new item
            newArray.push(editingData);
        } else {
            // Editing existing item
            newArray[expandedIndex] = editingData;
        }

        onChange(newArray);
        setExpandedIndex(null);
        setEditingData({});
    }, [expandedIndex, editingData, value, onChange]);

    const handleCancel = useCallback(() => {
        setExpandedIndex(null);
        setEditingData({});
    }, []);

    const handleRemove = useCallback((index) => {
        const newArray = value.filter((_, i) => i !== index);
        onChange(newArray);
        if (expandedIndex === index) {
            setExpandedIndex(null);
            setEditingData({});
        }
    }, [value, onChange, expandedIndex]);

    const handleFieldChange = useCallback((fieldKey, fieldValue) => {
        setEditingData(prev => ({
            ...prev,
            [fieldKey]: fieldValue
        }));
    }, []);

    // Handle preset selection for fields that support multi-field updates
    const handlePresetSelected = useCallback((presetFieldUpdates) => {
        console.log('[ArrayObjectField] handlePresetSelected called with:', presetFieldUpdates);
        setEditingData(prev => ({
            ...prev,
            ...presetFieldUpdates
        }));
    }, []);

    const renderDisplayItem = (item, index) => {
        const { primary, secondary, badge } = displayTemplate.display(item);
        const isExpanded = expandedIndex === index;

        return (
            <div key={index} className="border-b border-border last:border-b-0">
                <div
                    className="flex items-center justify-between p-3 min-h-11 cursor-pointer transition-colors hover:bg-surface-hover focus:bg-surface-hover focus:outline-2 focus:outline-primary focus:outline-offset-[-2px]"
                    onClick={() => handleEdit(index)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleEdit(index);
                        }
                    }}
                >
                    <div className="flex-1 flex flex-col gap-1 md:flex-row md:items-center md:gap-4 min-w-0">
                        <div className="font-medium text-primary text-sm truncate">
                            {primary}
                        </div>
                        {secondary && (
                            <div className="text-xs text-secondary truncate md:flex-shrink md:min-w-[120px]">
                                {secondary}
                            </div>
                        )}
                        {badge && (
                            <div className="inline-flex items-center px-2 py-0.5 bg-accent-bg text-brand-primary-text rounded text-xs font-medium whitespace-nowrap self-start md:ml-auto md:flex-shrink-0">
                                {/* Show color swatches for items with colors array */}
                                {item.colors && Array.isArray(item.colors) ? (
                                    <ColorSwatches colors={item.colors} size="sm" maxDisplay={3} />
                                ) : (
                                    badge
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                        <RemoveButton
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(index);
                            }}
                            ariaLabel={`Remove ${displayTemplate.itemName} ${index + 1}`}
                            disabled={disabled}
                        />
                    </div>
                </div>

                {/* Render edit form directly below this item if expanded */}
                {isExpanded && renderEditForm()}
            </div>
        );
    };

    const renderEditForm = () => {
        if (expandedIndex === null) return null;

        const isEditing = expandedIndex < value.length;
        const title = isEditing
            ? `Edit ${displayTemplate.itemName} ${expandedIndex + 1}`
            : `Add New ${displayTemplate.itemName}`;

        return (
            <div className="border border-border rounded-md bg-surface-alt overflow-hidden animate-slide-down">
                <div className="p-4 border-b border-border bg-surface">
                    <h3 className="m-0 text-base font-semibold text-primary">{title}</h3>
                </div>

                <div className="p-4 flex flex-col gap-4">
                    {field.fields.map((subField) => {
                        const FieldComponent = getFieldComponent(subField.type);

                        // Additional props for specific field types
                        const additionalProps = {};
                        if (subField.type === 'presets') {
                            additionalProps.onPresetSelected = handlePresetSelected;
                            additionalProps.moduleConfig = value; // Pass current array as moduleConfig for duplicate detection
                            console.log('[ArrayObjectField] Adding onPresetSelected for presets field:', subField.key);
                        }

                        return (
                            <div key={subField.key}>
                                <FieldComponent
                                    field={subField}
                                    value={editingData[subField.key] || ''}
                                    onChange={(value) => handleFieldChange(subField.key, value)}
                                    disabled={disabled}
                                    {...additionalProps}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-3 p-4 border-t border-border bg-surface justify-end flex-col-reverse md:flex-row">
                    <button
                        type="button"
                        className="min-h-11 min-w-11 inline-flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer border bg-surface text-primary border-border hover:bg-surface-hover focus:outline-2 focus:outline-primary focus:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto md:min-w-[100px]"
                        onClick={handleCancel}
                        disabled={disabled}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="min-h-11 min-w-11 inline-flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer border bg-primary text-primary-text border-primary hover:bg-primary-hover focus:outline-2 focus:outline-primary focus:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto md:min-w-[100px]"
                        onClick={handleSave}
                        disabled={disabled}
                    >
                        {isEditing ? 'Save Changes' : 'Add Item'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <FieldWrapper invalid={highlightInvalid} variant="standard">
            <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

            <div className="flex flex-col gap-3 min-h-11" id={inputId}>
                {/* Existing items */}
                {value.length > 0 ? (
                    <div className="flex flex-col border border-border rounded-md bg-surface overflow-hidden">
                        {value.map((item, index) => renderDisplayItem(item, index))}
                    </div>
                ) : (
                    <div className="p-8 text-center border border-dashed border-border rounded-md bg-surface-alt">
                        <div className="text-sm text-secondary">
                            No {displayTemplate.itemName.toLowerCase()}s configured
                        </div>
                    </div>
                )}

                {/* Add form (only show when adding new item at bottom) */}
                {expandedIndex !== null && expandedIndex >= value.length && renderEditForm()}

                {/* Add button */}
                {expandedIndex === null && (
                    <div className="flex justify-start py-2">
                        <AddButton
                            onClick={handleAdd}
                            disabled={disabled}
                            ariaLabel={`Add new ${displayTemplate.itemName.toLowerCase()}`}
                        />
                    </div>
                )}
            </div>

            <FieldDescription id={`${inputId}-description`} description={field.description} />
            <FieldError id={`${inputId}-error`} message={errorMessage} />
        </FieldWrapper>
    );
};

/**
 * Display templates for different field types
 */
const DISPLAY_TEMPLATES = {
    gdrive: {
        itemName: 'Drive Location',
        display: (item) => ({
            primary: item.name || 'Unnamed Drive',
            secondary: item.location || 'No location specified',
            badge: item.id ? `ID: ${item.id.substring(0, 8)}...` : null
        })
    },
    replacerr: {
        itemName: 'Holiday Mapping',
        display: (item) => {
            let scheduleText = 'No schedule';
            if (item.schedule) {
                if (typeof item.schedule === 'string') {
                    scheduleText = item.schedule;
                } else if (item.schedule.start && item.schedule.end) {
                    scheduleText = `${item.schedule.start} to ${item.schedule.end}`;
                }
            }

            return {
                primary: item.name || 'Unknown Holiday',
                secondary: scheduleText,
                badge: item.colors ? `${item.colors.length} colors` : 'No colors'
            };
        }
    },
    upgradinatorr: {
        itemName: 'Instance Mapping',
        display: (item) => ({
            primary: item.instance || 'Unknown Instance',
            secondary: `Tag: ${item.tag_name || 'None'} | Count: ${item.count || 0}`,
            badge: item.unattended ? 'Unattended' : 'Manual'
        })
    },
    labelarr: {
        itemName: 'Tag Mapping',
        display: (item) => ({
            primary: item.app_instance || 'Unknown Instance',
            secondary: item.labels || 'No labels',
            badge: item.plex_instances?.length ? `${item.plex_instances.length} Plex` : 'No Plex'
        })
    }
};

/**
 * Get display template for field type
 */
function getDisplayTemplate(fieldType) {
    // Direct mapping for displayType
    if (DISPLAY_TEMPLATES[fieldType]) {
        return DISPLAY_TEMPLATES[fieldType];
    }

    // Default fallback to gdrive template
    return DISPLAY_TEMPLATES.gdrive;
}

/**
 * Get field component from registry
 */
function getFieldComponent(fieldType) {
    return FieldRegistry.getField(fieldType);
}

ArrayObjectField.displayName = 'ArrayObjectField';