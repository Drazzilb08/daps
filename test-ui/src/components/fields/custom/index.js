/**
 * Custom field components export index
 *
 * All custom and specialized field components are exported from this module
 * for clean imports and organization.
 */

// Working implementations
export { JsonField } from './JsonField.jsx';
export { PresetsField } from './PresetsField.jsx';
export { InstancesField } from './InstancesField.jsx';
export { TagInputField } from './TagInputField.jsx';
export { ScheduleField } from './ScheduleField.jsx';
export { ArrayObjectField } from './ArrayObjectField.jsx';

// Placeholder implementations
export {
    DirListField,
    InstanceDropdownField,
    HolidayScheduleField,
    DirListDragDropField,
    DirListOptionsField,
    // Additional field types from original vision
    TagMultiSelectField, // Note: TagSelectField and TagDisplayField replaced by tag_input/tag_display
    MediaInfoDisplayField,
    MediaDisplayField,
    DirPickerField,
    PosterField,
} from './_fieldPlaceholders.jsx';
