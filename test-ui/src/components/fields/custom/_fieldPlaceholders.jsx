/**
 * Field Placeholders
 *
 * Simple placeholder component for unimplemented field types.
 * Shows clear "not implemented" message to avoid confusion.
 */

import React from 'react';

// Simple placeholder for unimplemented field types
const UnavailableField = ({ field }) => {
    return (
        <div className="flex flex-col gap-2 mb-4 w-full">
            <label className="text-sm font-medium text-secondary">
                {field.label}
                {field.required && <span className="text-error ml-1">*</span>}
            </label>

            <div className="p-4 bg-surface-elevated border border-border rounded-md text-center text-tertiary text-sm">
                <strong>Field type "{field.type}" not implemented</strong>
                <br />
                <small>This field type is not available in the current version</small>
            </div>

            {field.description && <div className="text-sm text-tertiary mt-1">{field.description}</div>}
        </div>
    );
};

// All field types - simple placeholders

export const ColorField = React.memo(props => <UnavailableField {...props} />);
export const ColorListField = React.memo(props => <UnavailableField {...props} />);

export const DirField = React.memo(props => <UnavailableField {...props} />);
export const DirListField = React.memo(props => <UnavailableField {...props} />);
export const InstanceDropdownField = React.memo(props => <UnavailableField {...props} />);
export const InstancesField = React.memo(props => <UnavailableField {...props} />);
export const GDrivePresetsField = React.memo(props => <UnavailableField {...props} />);
export const HolidayPresetsField = React.memo(props => <UnavailableField {...props} />);
export const HolidayScheduleField = React.memo(props => <UnavailableField {...props} />);
export const DirListDragDropField = React.memo(props => <UnavailableField {...props} />);
export const DirListOptionsField = React.memo(props => <UnavailableField {...props} />);

// Additional field types from original vision - currently placeholders
// TagSelectField and TagDisplayField replaced by tag_input and tag_display field types
// which use the configurable TagInputField component
// export const TagSelectField = React.memo(props => <UnavailableField {...props} />);
// export const TagDisplayField = React.memo(props => <UnavailableField {...props} />);
export const TagMultiSelectField = React.memo(props => <UnavailableField {...props} />);
export const MediaInfoDisplayField = React.memo(props => <UnavailableField {...props} />);
export const MediaDisplayField = React.memo(props => <UnavailableField {...props} />);
export const DirPickerField = React.memo(props => <UnavailableField {...props} />);
export const PosterField = React.memo(props => <UnavailableField {...props} />);
export const ColorListPosterField = React.memo(props => <UnavailableField {...props} />);
