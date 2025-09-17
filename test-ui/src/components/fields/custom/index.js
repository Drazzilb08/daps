/**
 * Custom field components export index
 *
 * All custom and specialized field components are exported from this module
 * for clean imports and organization.
 */

// Working implementations
export { JsonField } from './JsonField.jsx';
export { GDrivePresetsField } from './GDrivePresetsField.jsx';

// Placeholder implementations
export {
    DirListField,
    InstanceDropdownField,
    InstancesField,
    GDriveCustomField,
    ReplacerCustomField,
    UpgradinatorCustomField,
    LabelarrCustomField,
    HolidayPresetsField,
    HolidayScheduleField,
    DirListDragDropField,
    DirListOptionsField,
    // Additional field types from original vision
    ScheduleField,
    TagSelectField,
    TagDisplayField,
    TagMultiSelectField,
    MediaInfoDisplayField,
    MediaDisplayField,
    DirPickerField,
    PosterField,
} from './_fieldPlaceholders.jsx';
