import { useState } from 'react';
import { useLogControls } from '../context/LogControlsContext';

/**
 * SearchInput - Search input with clear functionality
 *
 * Provides search input with Material Icons clear button.
 * Consumes LogControlsContext for state and actions.
 *
 * @returns {JSX.Element}
 */
export const SearchInput = () => {
    const { onSearchChange } = useLogControls();
    const [searchValue, setSearchValue] = useState('');

    const handleChange = e => {
        const value = e.target.value;
        setSearchValue(value);
        onSearchChange(value);
    };

    const handleClear = () => {
        setSearchValue('');
        onSearchChange('');
    };

    return (
        <div className="relative flex-1 min-w-0">
            <input
                type="text"
                value={searchValue}
                onChange={handleChange}
                placeholder="Search logs..."
                className="w-full px-3 py-2 pr-10 rounded-md border border-divider bg-input text-primary min-h-11"
                aria-label="Search logs"
            />
            {searchValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-primary transition-colors min-h-11 min-w-11 flex items-center justify-center"
                    aria-label="Clear search"
                >
                    <span className="material-symbols-outlined text-xl">cancel</span>
                </button>
            )}
        </div>
    );
};
