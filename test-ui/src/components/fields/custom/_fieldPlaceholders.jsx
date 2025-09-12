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
    <div className="field-placeholder">
      <label className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div style={{
        padding: 'var(--space-4)',
        background: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-2)',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--font-size-sm)'
      }}>
        <strong>Field type "{field.type}" not implemented</strong>
        <br />
        <small>This field type is not available in the current version</small>
      </div>
      
      {field.description && (
        <div className="field-description">{field.description}</div>
      )}
    </div>
  );
};

// All field types - simple placeholders

export const ColorField = React.memo((props) => <UnavailableField {...props} />);
export const ColorListField = React.memo((props) => <UnavailableField {...props} />);

export const DirField = React.memo((props) => <UnavailableField {...props} />);

export const DirListField = React.memo((props) => <UnavailableField {...props} />);
export const InstanceDropdownField = React.memo((props) => <UnavailableField {...props} />);
export const InstancesField = React.memo((props) => <UnavailableField {...props} />);
export const GDriveCustomField = React.memo((props) => <UnavailableField {...props} />);
export const ReplacerCustomField = React.memo((props) => <UnavailableField {...props} />);
export const UpgradinatorCustomField = React.memo((props) => <UnavailableField {...props} />);
export const LabelarrCustomField = React.memo((props) => <UnavailableField {...props} />);
export const GDrivePresetsField = React.memo((props) => <UnavailableField {...props} />);
export const HolidayPresetsField = React.memo((props) => <UnavailableField {...props} />);
export const HolidayScheduleField = React.memo((props) => <UnavailableField {...props} />);
export const DirListDragDropField = React.memo((props) => <UnavailableField {...props} />);
export const DirListOptionsField = React.memo((props) => <UnavailableField {...props} />);

// Additional field types from original vision - currently placeholders
export const ScheduleField = React.memo((props) => <UnavailableField {...props} />);
export const TagSelectField = React.memo((props) => <UnavailableField {...props} />);
export const TagDisplayField = React.memo((props) => <UnavailableField {...props} />);
export const TagMultiSelectField = React.memo((props) => <UnavailableField {...props} />);
export const MediaInfoDisplayField = React.memo((props) => <UnavailableField {...props} />);
export const MediaDisplayField = React.memo((props) => <UnavailableField {...props} />);
export const DirPickerField = React.memo((props) => <UnavailableField {...props} />);
export const PosterField = React.memo((props) => <UnavailableField {...props} />);