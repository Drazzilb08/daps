import * as BasicFields from './basic';
import * as SelectFields from './select';
import * as DirFields from './dir';
import * as ColorFields from './color';
import * as CustomFields from './custom';
import PosterField from './image/PosterField';
import InstancesField from './instances/InstancesField';
import MediaInfoField from './display/MediaInfoField';
import MediaDisplayField from './display/MediaDisplayField';

/**
 * Field Registry - Comprehensive mapping of field types to React components
 *
 * Provides the core registry that enables dynamic form rendering throughout
 * the DAPS application. Maps string field type identifiers to their corresponding
 * React components, enabling flexible schema-driven form generation.
 *
 * Registry categories:
 * - Basic fields: Text, number, textarea, etc. for simple data input
 * - Select fields: Dropdowns, checkboxes, multi-selects for choices
 * - Directory fields: File/folder pickers with validation
 * - Color fields: Color pickers and lists
 * - Custom fields: Complex domain-specific components
 * - Display fields: Read-only information presentation
 * - Instance fields: Service instance configuration
 *
 * Usage pattern:
 * 1. Schema defines field with 'type' property
 * 2. RenderFields looks up component in this registry
 * 3. Component is instantiated with field configuration and data
 * 4. Component handles its own validation and change events
 *
 * Extension pattern:
 * To add new field types:
 * 1. Create component following field component interface
 * 2. Add mapping to FIELD_RENDERERS registry
 * 3. Update validation if needed
 * 4. Document new field type
 *
 * @example
 * // Schema-driven field rendering
 * const fieldConfig = {
 *   key: 'api_key',
 *   type: 'password', // Maps to BasicFields.PasswordField
 *   label: 'API Key',
 *   required: true
 * };
 *
 * @example
 * // Adding custom field type
 * FIELD_RENDERERS.my_custom_field = MyCustomFieldComponent;
 *
 * @example
 * // Dynamic rendering usage
 * const FieldComponent = FIELD_RENDERERS[field.type];
 * return <FieldComponent field={field} value={value} onChange={onChange} />;
 */
export const FIELD_RENDERERS = {
    text: BasicFields.TextField,
    password: BasicFields.PasswordField,
    number: BasicFields.NumberField,
    float: BasicFields.FloatField,
    textarea: BasicFields.TextareaField,
    json: BasicFields.JsonField,
    hidden: BasicFields.HiddenField,

    dropdown: SelectFields.DropdownField,
    check_box: SelectFields.CheckBoxField,
    instance_dropdown: SelectFields.InstanceDropdownField,
    gdrive_presets: SelectFields.GdrivePresetsField,
    holiday_presets: SelectFields.HolidayPresetsField,
    holiday_schedule: SelectFields.HolidayScheduleField,
    schedule: SelectFields.ScheduleField,

    tag_select: SelectFields.TagSelectField,
    tag_display: SelectFields.TagDisplayField,
    tag_multiselect: SelectFields.TagMultiSelectField,
    media_info_display: MediaInfoField,
    media_display: MediaDisplayField,

    dir_picker: DirFields.DirPickerField,
    dir: DirFields.DirField,
    dirlist: DirFields.DirListField,
    dirlist_dragdrop: DirFields.DirListDragDropField,
    dirlist_options: DirFields.DirListOptionsField,

    instances: InstancesField,

    color_list: ColorFields.ColorListField,
    color: ColorFields.ColorField,

    poster: PosterField,

    gdrive_custom: CustomFields.GDriveCustomField,
    replacerr_custom: CustomFields.ReplacerrCustomField,
    upgradinatorr_custom: CustomFields.UpgradinatorrCustomField,
    labelarr_custom: CustomFields.LabelarrCustomField,
};
