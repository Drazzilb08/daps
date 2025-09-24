/**
 * Custom field components export index
 *
 * All custom and specialized field components are exported from this module
 * for clean imports and organization.
 */

// Working implementations
export { JsonField } from './JsonField.jsx';
export { GDrivePresetsField } from './GDrivePresetsField.jsx';
export { HolidayPresetsField } from './HolidayPresetsField.jsx';
export { InstancesField } from './InstancesField.jsx';
export { TagInputField } from './TagInputField.jsx';

// Placeholder implementations
export {
    DirListField,
    InstanceDropdownField,
    GDriveCustomField,
    ReplacerCustomField,
    UpgradinatorCustomField,
    LabelarrCustomField,
    HolidayScheduleField,
    DirListDragDropField,
    DirListOptionsField,
    // Additional field types from original vision
    ScheduleField,
    TagMultiSelectField, // Note: TagSelectField and TagDisplayField replaced by tag_input/tag_display
    MediaInfoDisplayField,
    MediaDisplayField,
    DirPickerField,
    PosterField,
} from './_fieldPlaceholders.jsx';
