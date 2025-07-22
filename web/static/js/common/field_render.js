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
    renderFloatField,
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
import { renderPosterField } from './renders/image_renders.js';

// -------- FIELD DISPATCHER ----------
export function renderField(field, immediateData, moduleConfig, rootConfig) {
    switch (field.type) {
        case 'dropdown':
            return renderDropdownField(field, immediateData);
        case 'textarea':
            return renderTextareaField(field, immediateData);
        case 'json':
            return renderJsonField(field, immediateData);
        case 'number':
            return renderNumberField(field, immediateData);
        case 'dir':
            return renderDirField(field, immediateData);
        case 'dir_list':
            return renderDirListField(field, immediateData);
        case 'dir_list_drag_drop':
            return renderDirListDragDropField(field, immediateData);
        case 'dir_list_options':
            return renderDirListOptionsField(field, immediateData);
        case 'password':
            return renderPasswordField(field, immediateData);
        case 'color_list':
            return renderColorListField(field, immediateData, moduleConfig);
        case 'instances':
            return renderInstancesField(field, immediateData, rootConfig);
        case 'check_box':
            return renderCheckBoxField(field, immediateData);
        case 'instance_dropdown':
            return renderInstanceDropdownField(field, immediateData, rootConfig);
        case 'gdrive_custom':
            return renderGDriveCustomField(field, immediateData, moduleConfig);
        case 'replacerr_custom':
            return renderReplacerrCustomField(field, immediateData, moduleConfig);
        case 'upgradinatorr_custom':
            return renderUpgradinatorrCustomField(field, immediateData, moduleConfig, rootConfig);
        case 'labelarr_custom':
            return renderLabelarrCustomField(field, immediateData, moduleConfig, rootConfig);
        case 'dir_picker':
            return renderDirPickerField(field, immediateData);
        case 'schedule':
            return renderScheduleField(field, immediateData);
        case 'holiday_schedule':
            return renderHolidayScheduleField(field, immediateData);
        case 'color':
            return renderColorField(field, immediateData);
        case 'gdrive_presets':
            return renderGdrivePresetsField(field, immediateData, moduleConfig);
        case 'holiday_presets':
            return renderHolidayPresetsField(field, immediateData, moduleConfig);
        case 'poster':
            return renderPosterField(field);
        case 'float':
            return renderFloatField(field, immediateData);
        default:
            return renderTextField(field, immediateData);
    }
}
