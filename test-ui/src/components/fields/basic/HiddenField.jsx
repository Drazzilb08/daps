import { useId } from 'react';
import { InputBase } from '../primitives/InputBase';

/**
 * HiddenField Component - Hidden form input for storing data not displayed to user
 *
 * Composed from InputBase primitive for consistency with other field types.
 * Used for storing form state, IDs, or other data that needs to be submitted
 * but not displayed or edited by the user.
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.field.key - Unique field identifier
 * @param {string|number} props.value - Current field value
 * @param {Function} props.onChange - Value change handler (rarely used for hidden fields)
 */
export const HiddenField = ({ field, value, onChange, ...fieldProps }) => {
    const inputId = useId();

    return (
        <InputBase id={inputId} type="hidden" value={value} onChange={onChange} {...fieldProps} />
    );
};
