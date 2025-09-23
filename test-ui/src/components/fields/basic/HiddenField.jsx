import { useId } from 'react';
import { InputBase } from '../primitives/InputBase';

export const HiddenField = ({ field, value, onChange, ...fieldProps }) => {
    const inputId = useId();

    return (
        <InputBase id={inputId} type="hidden" value={value} onChange={onChange} {...fieldProps} />
    );
};
