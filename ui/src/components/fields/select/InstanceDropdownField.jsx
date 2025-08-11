// src/components/fields/select/InstanceDropdownField.jsx
import React, { useMemo } from 'react';

function humanize(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function InstanceDropdownField({ field, value, onChange, rootConfig }) {
    // Compute instance options
    const options = useMemo(() => {
        let types = [];
        if (Array.isArray(field.from)) {
            types = field.from;
        } else if (rootConfig?.instances) {
            types = Object.keys(rootConfig.instances);
        }
        let flatOptions = [];
        types.forEach(type => {
            if (rootConfig?.instances?.[type]) {
                flatOptions.push(...Object.keys(rootConfig.instances[type]));
            }
        });
        return flatOptions;
    }, [field, rootConfig]);

    // Auto-select first if nothing chosen and options exist
    React.useEffect(() => {
        if ((!value || !options.includes(value)) && options.length) {
            onChange(field.key, options[0]);
        }
    }, [options, value, onChange, field.key]);

    return (
        <div className="settings-field-row">
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label || 'Instance'}</label>
            </div>
            <div className="settings-field-inputwrap">
                <select
                    className="select instance-dropdown-select"
                    name={field.key}
                    id={field.key}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                >
                    {options.map(opt => (
                        <option key={opt} value={opt}>
                            {humanize(opt)}
                        </option>
                    ))}
                </select>
                {field.description && <div className="field-help-text">{field.description}</div>}
            </div>
        </div>
    );
}
