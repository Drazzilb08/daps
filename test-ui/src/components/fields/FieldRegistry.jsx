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
  float: CustomFields.FloatField,
  
  // Boolean fields
  check_box: SelectFields.CheckboxField,
  
  // Selection fields
  dropdown: SelectFields.DropdownField,
  instance_dropdown: CustomFields.InstanceDropdownField,
  
  // Text areas
  textarea: BasicFields.TextareaField,
  
  // Specialized input fields
  json: CustomFields.JsonField,
  dir: CustomFields.DirField,
  
  // List fields
  dirlist: CustomFields.DirListField,
  dirlist_dragdrop: CustomFields.DirListDragDropField,
  dirlist_options: CustomFields.DirListOptionsField,
  color_list: CustomFields.ColorListField,
  
  // Complex custom fields
  instances: CustomFields.InstancesField,
  gdrive_custom: CustomFields.GDriveCustomField,
  replacerr_custom: CustomFields.ReplacerCustomField,
  upgradinatorr_custom: CustomFields.UpgradinatorCustomField,
  labelarr_custom: CustomFields.LabelarrCustomField,
  
  // Preset fields
  gdrive_presets: CustomFields.GDrivePresetsField,
  holiday_presets: CustomFields.HolidayPresetsField,
  holiday_schedule: CustomFields.HolidayScheduleField
};

/**
 * FieldRegistry class provides methods to register, retrieve, and manage field components
 */
export class FieldRegistry {
  /**
   * Get a field component by type
   * @param {string} fieldType - The field type string
   * @returns {React.Component|null} The field component or null if not found
   */
  static getField(fieldType) {
    const component = FIELD_COMPONENTS[fieldType];
    if (!component) {
      console.warn(`[FieldRegistry] Unknown field type: ${fieldType}`);
      return null;
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