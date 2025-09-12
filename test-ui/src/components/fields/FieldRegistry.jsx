/**
 * Field Registry - Central registry for all form field components
 * 
 * Maps field type strings to React components. Follows the registry pattern
 * used in the main DAPS UI for extensible field system.
 */

// Import field components from categorized directories
import * as BasicFields from './basic';
import * as SelectFields from './select';
import * as CustomFields from './custom';
import * as ColorFields from './color';
import * as DirFields from './dir';

/**
 * Field type to component mapping
 * 
 * Each field component must implement the standard interface:
 * - field: Field configuration object
 * - value: Current field value
 * - onChange: Value change handler (value) => void
 * - disabled: Boolean disabled state
 * - highlightInvalid: Boolean validation error state
 * - errorMessage: String error message to display
 */
const FIELD_COMPONENTS = {
  // Basic input fields
  text: BasicFields.TextField,
  password: BasicFields.PasswordField,
  number: BasicFields.NumberField,
  textarea: BasicFields.TextareaField,
  float: BasicFields.FloatField,
  hidden: BasicFields.HiddenField,
  
  // Boolean fields
  check_box: SelectFields.CheckboxField,
  
  // Selection fields
  dropdown: SelectFields.DropdownField,
  // multi_select: SelectFields.MultiSelectField, // TODO: Implement
  // radio: SelectFields.RadioField, // TODO: Implement
  
  // Color fields
  color: ColorFields.ColorField,
  color_list: ColorFields.ColorListField,
  
  // Directory fields
  dir: DirFields.DirField,
  dir_list: DirFields.DirListField,
  
  // Specialized custom fields
  json: CustomFields.JsonField,
  // instance_dropdown: CustomFields.InstanceDropdownField, // TODO: Test
  
  // List fields (legacy mappings for backward compatibility) - TODO: Test placeholders
  // dirlist: DirFields.DirListField,
  // dirlist_dragdrop: CustomFields.DirListDragDropField,
  // dirlist_options: CustomFields.DirListOptionsField,
  
  // Complex custom fields - TODO: Test placeholders
  // instances: CustomFields.InstancesField,
  // gdrive_custom: CustomFields.GDriveCustomField,
  // replacerr_custom: CustomFields.ReplacerCustomField,
  // upgradinatorr_custom: CustomFields.UpgradinatorCustomField,
  // labelarr_custom: CustomFields.LabelarrCustomField,
  
  // Preset fields - TODO: Test placeholders
  // gdrive_presets: CustomFields.GDrivePresetsField,
  // holiday_presets: CustomFields.HolidayPresetsField,
  // holiday_schedule: CustomFields.HolidayScheduleField
};

/**
 * Fallback component for truly unknown field types (not in registry at all)
 */
const UnknownFieldType = ({ field }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="field-unknown">
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--color-error-bg)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-2)',
          textAlign: 'center',
          color: 'var(--color-error-text)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <strong>Unknown field type "{field.type}"</strong>
          <br />
          <small>This field type is not recognized by the system</small>
        </div>
      </div>
      
      {field.description && (
        <div id={`${inputId}-description`} className="field-description">
          {field.description}
        </div>
      )}
    </>
  );
};

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
   * Get all registered field types
   * @returns {string[]} Array of field type strings
   */
  static getFieldTypes() {
    return Object.keys(FIELD_COMPONENTS);
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