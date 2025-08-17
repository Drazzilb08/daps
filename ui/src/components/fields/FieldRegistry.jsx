import * as BasicFields from './basic';
import * as SelectFields from './select';
import * as DirFields from './dir';
import * as ColorFields from './color';
import * as CustomFields from './custom';
import PosterField from './image/PosterField';
import InstancesField from './instances/InstancesField';
import MediaInfoField from './display/MediaInfoField';
import MediaDisplayField from './display/MediaDisplayField';

// You can add more groups (color, custom, etc.) as you implement them

export const FIELD_RENDERERS = {
    // Basic fields
    text: BasicFields.TextField,
    password: BasicFields.PasswordField,
    number: BasicFields.NumberField,
    float: BasicFields.FloatField,
    textarea: BasicFields.TextareaField,
    json: BasicFields.JsonField,
    hidden: BasicFields.HiddenField,

    // Select fields
    dropdown: SelectFields.DropdownField,
    check_box: SelectFields.CheckBoxField,
    instance_dropdown: SelectFields.InstanceDropdownField,
    gdrive_presets: SelectFields.GdrivePresetsField,
    holiday_presets: SelectFields.HolidayPresetsField,
    holiday_schedule: SelectFields.HolidayScheduleField,
    schedule: SelectFields.ScheduleField,

    // Tag management fields
    tag_select: SelectFields.TagSelectField,
    tag_display: SelectFields.TagDisplayField,
    tag_multiselect: SelectFields.TagMultiSelectField,
    media_info_display: MediaInfoField,
    media_display: MediaDisplayField,

    // Dir fields
    dir_picker: DirFields.DirPickerField,
    dir: DirFields.DirField,
    dirlist: DirFields.DirListField,
    dirlist_dragdrop: DirFields.DirListDragDropField,
    dirlist_options: DirFields.DirListOptionsField,

    // Instance Fields
    instances: InstancesField,

    // Color Fields
    color_list: ColorFields.ColorListField,
    color: ColorFields.ColorField,

    // Poster Fields
    poster: PosterField,

    // Custom Fields
    gdrive_custom: CustomFields.GDriveCustomField,
    replacerr_custom: CustomFields.ReplacerrCustomField,
    upgradinatorr_custom: CustomFields.UpgradinatorrCustomField,
    labelarr_custom: CustomFields.LabelarrCustomField,
};
