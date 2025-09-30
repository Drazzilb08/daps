import { useId } from 'react';
import { InputBase } from '../primitives/InputBase';

export const HiddenField = ({ field, value, onChange, ...fieldProps }) => {
    const inputId = useId();
    const finalId = field.id || inputId;

    return (
        <InputBase id={finalId} type="hidden" value={value} onChange={onChange} {...fieldProps} />
    );
};
