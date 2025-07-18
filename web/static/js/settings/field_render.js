import {
    renderLabelarrCustomField,
    renderUpgradinatorrCustomField,
    renderReplacerrCustomField,
    renderGDriveCustomField,
} from './renders/custom_renders.js';
import {
    renderNumberField,
    renderJsonField,
    renderTextField,
    renderPasswordField,
    renderTextareaField,
} from './renders/input_renders.js';
import {
    renderDirListOptionsField,
    renderDirListDragDropField,
    renderDirListField,
    renderDirField,
    renderDirPickerField,
} from './renders/dir_renders.js';
import {
    renderGdrivePresetsField,
    renderScheduleField,
    renderInstanceDropdownField,
    renderCheckBoxField,
    renderDropdownField,
    renderHolidayPresetsField,
    renderHolidayScheduleField,
} from './renders/select_renders.js';
import { renderColorField, renderColorListField } from './renders/color_renders.js';
import { renderInstancesField } from './renders/instance_renders.js';

// -------- FIELD DISPATCHER ----------

export function renderField(field, value, config, rootConfig) {
    switch (field.type) {
        case 'dropdown':
            return renderDropdownField(field, value, config);
        case 'textarea':
            return renderTextareaField(field, value, config);
        case 'json':
            return renderJsonField(field, value, config);
        case 'number':
            return renderNumberField(field, value, config);
        case 'dir':
            return renderDirField(field, value, config);
        case 'dir_list':
            return renderDirListField(field, value, config);
        case 'dir_list_drag_drop':
            return renderDirListDragDropField(field, value, config);
        case 'dir_list_options':
            return renderDirListOptionsField(field, value, config);
        case 'password':
            return renderPasswordField(field, value, config);
        case 'color_list':
            return renderColorListField(field, value, config);
        case 'instances':
            return renderInstancesField(field, value, config, rootConfig);
        case 'check_box':
            return renderCheckBoxField(field, value, config);
        case 'instance_dropdown':
            return renderInstanceDropdownField(field, value, config, rootConfig);
        case 'gdrive_custom':
            return renderGDriveCustomField(field, value, config);
        case 'replacerr_custom':
            return renderReplacerrCustomField(field, value, config);
        case 'upgradinatorr_custom':
            return renderUpgradinatorrCustomField(field, value, config, rootConfig);
        case 'labelarr_custom':
            return renderLabelarrCustomField(field, value, config, rootConfig);
        case 'dir_picker':
            return renderDirPickerField(field, value, config);
        case 'schedule':
            return renderScheduleField(field, value, config);
        case 'holiday_schedule':
            return renderHolidayScheduleField(field, value);
        case 'color':
            return renderColorField(field, value, config);
        case 'gdrive_presets':
            return renderGdrivePresetsField(field, value, config);
        case 'holiday_presets':
            return renderHolidayPresetsField(field, value, config);
        default:
            return renderTextField(field, value, config);
    }
}
