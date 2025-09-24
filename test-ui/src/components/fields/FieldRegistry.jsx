/**
 * Field Registry - Central registry for all form field components
 * Maps field type strings to React components.
 */

import * as BasicFields from './basic';
import * as SelectFields from './select';
import * as CustomFields from './custom';
import * as ColorFields from './color';
import * as DirFields from './dir';

/**
 * Field type to component mapping
 * Each field component must implement the standard interface:
 * - field: Field configuration object
 * - value: Current field value
 * - onChange: Value change handler (value) => void
 * - disabled: Boolean disabled state
 * - highlightInvalid: Boolean validation error state
 * - errorMessage: String error message to display
 */
const FIELD_COMPONENTS = {
    // Basic
    text: BasicFields.TextField,
    password: BasicFields.PasswordField,
    number: BasicFields.NumberField,
    textarea: BasicFields.TextareaField,
    float: BasicFields.FloatField,
    hidden: BasicFields.HiddenField,
    check_box: SelectFields.CheckboxField,
    dropdown: SelectFields.DropdownField,
    json: CustomFields.JsonField,

    // Color
    color: ColorFields.ColorField,
    color_list: ColorFields.ColorListField,
    color_list_poster: ColorFields.ColorListPosterField,

    // Dir
    dir: DirFields.DirField,
    dirlist: DirFields.DirListField,
    dirlist_dragdrop: DirFields.DirListDragDropField,
    dirlist_options: DirFields.DirListOptionsField,

    // Date/Schedule fields
    holiday_schedule: SelectFields.DateRangeField,
    holiday_presets: CustomFields.HolidayPresetsField,

    gdrive_custom: CustomFields.GDriveCustomField,
    gdrive_presets: CustomFields.GDrivePresetsField,

    replacerr_custom: CustomFields.ReplacerCustomField,
    upgradinatorr_custom: CustomFields.UpgradinatorCustomField,
    labelarr_custom: CustomFields.LabelarrCustomField,
    instances: CustomFields.InstancesField,
    instance_dropdown: CustomFields.InstanceDropdownField,
    schedule: CustomFields.ScheduleField,
    tag_input: CustomFields.TagInputField,
    tag_display: CustomFields.TagInputField, // Same component, different config
    media_info_display: CustomFields.MediaInfoDisplayField,
    media_display: CustomFields.MediaDisplayField,
    dir_picker: CustomFields.DirPickerField,
    poster: CustomFields.PosterField,
};

/**
 * Fallback component for truly unknown field types (not in registry at all)
 */
const UnknownFieldType = ({ field }) => {
    const inputId = `field-${field.key}`;

    return (
        <>
            <label htmlFor={inputId} className="text-sm font-medium text-secondary">
                {field.label}
                {field.required && <span className="text-error ml-1">*</span>}
            </label>

            <div className="mt-2">
                <div className="p-4 bg-error/20 border border-error rounded-md text-center text-error text-sm">
                    <strong>Unknown field type "{field.type}"</strong>
                    <br />
                    <small>This field type is not recognized by the system</small>
                </div>
            </div>

            {field.description && (
                <div id={`${inputId}-description`} className="text-sm text-tertiary mt-1">
                    {field.description}
                </div>
            )}
        </>
    );
};

// Define which field types are IMPLEMENTED
const IMPLEMENTED_FIELD_TYPES = new Set([
    'text',
    'password',
    'number',
    'textarea',
    'float',
    'hidden',
    'check_box',
    'dropdown',
    'json',
    'color',
    'color_list',
    'color_list_poster',
    'dir',
    'dirlist',
    'dirlist_dragdrop',
    'dirlist_options',
    'gdrive_presets',
    'holiday_presets',
    'holiday_schedule',
    'instances',
    'tag_input',
    'tag_display',
]);

/**
 * FieldRegistry class provides methods to register, retrieve, and manage field components
 */
export class FieldRegistry {
    /**
     * Get a field component by type
     * @param {string} fieldType - The field type string
     * @returns {React.Component} The field component or UnknownFieldType fallback
     */
    static getField(fieldType) {
        const component = FIELD_COMPONENTS[fieldType];
        if (!component) {
            console.warn(`[FieldRegistry] Unknown field type: ${fieldType}`);
            return UnknownFieldType;
        }
        return component;
    }

    /**
     * Register a new field component
     * @param {string} fieldType - The field type string
     * @param {React.Component} component - The React component to register
     */
    static register(fieldType, component) {
        if (FIELD_COMPONENTS[fieldType]) {
            console.warn(`[FieldRegistry] Overriding existing field type: ${fieldType}`);
        }
        FIELD_COMPONENTS[fieldType] = component;
    }

    /**
     * Check if a field type is registered
     * @param {string} fieldType - The field type string
     * @returns {boolean} True if field type exists
     */
    static hasField(fieldType) {
        return fieldType in FIELD_COMPONENTS;
    }

    /**
     * Get all registered field types (including placeholders)
     * @returns {string[]} Array of all field type strings
     */
    static getFieldTypes() {
        return Object.keys(FIELD_COMPONENTS);
    }

    /**
     * Get only implemented field types (excludes placeholders)
     * @returns {string[]} Array of implemented field type strings
     */
    static getWorkingFieldTypes() {
        return Array.from(IMPLEMENTED_FIELD_TYPES);
    }

    /**
     * Get only placeholder field types
     * @returns {string[]} Array of placeholder field type strings
     */
    static getPlaceholderFieldTypes() {
        return Object.keys(FIELD_COMPONENTS).filter(type => !IMPLEMENTED_FIELD_TYPES.has(type));
    }

    /**
     * Check if a field type is implemented (not a placeholder)
     * @param {string} fieldType - The field type string
     * @returns {boolean} True if field type is implemented
     */
    static isWorkingFieldType(fieldType) {
        return IMPLEMENTED_FIELD_TYPES.has(fieldType);
    }

    /**
     * Remove a field type from the registry
     * @param {string} fieldType - The field type string
     */
    static unregister(fieldType) {
        delete FIELD_COMPONENTS[fieldType];
    }
}

/**
 * React hook to get a field component
 * @param {string} fieldType - The field type string
 * @returns {React.Component|null} The field component or null if not found
 */
export function useFieldComponent(fieldType) {
    return FieldRegistry.getField(fieldType);
}

/**
 * Default export for convenience
 */
export default FieldRegistry;
