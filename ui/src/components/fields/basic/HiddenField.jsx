import React from 'react';

/**
 * HiddenField - A hidden input field for storing values that don't need UI
 */
export const HiddenField = React.memo(function HiddenField({ field, value = '', onChange }) {
    return (
        <input
            type="hidden"
            name={field.key}
            value={value}
            onChange={e => onChange && onChange(e.target.value)}
        />
    );
});

export default HiddenField;
