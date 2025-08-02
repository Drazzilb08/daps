import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { fetchDirectoryList } from '../../../utils/api';

export const DirPickerField = forwardRef(function DirPickerField(
    { field, value, onChange, onValidityChange }, // onValidityChange: parent callback for validity
    ref
) {
    const [currentDir, setCurrentDir] = useState('/');
    const [dirs, setDirs] = useState([]);
    const [filterText, setFilterText] = useState('');
    const [activeIdx, setActiveIdx] = useState(-1);
    const [error, setError] = useState('');
    const [, setIsValid] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const inputRef = useRef();
    const itemRefs = useRef([]);
    const suggestionTimeout = useRef();

    // Expose refresh to parent (after folder create)
    useImperativeHandle(ref, () => ({
        forceRefresh: newPath => {
            setCurrentDir(newPath);
            setFilterText('');
            setActiveIdx(-1);
            onChange && onChange(newPath);
            setRefreshKey(k => k + 1);
        },
    }));

    // Focus input when value changes
    useEffect(() => {
        inputRef.current?.focus();
    }, [value, onValidityChange]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (activeIdx >= 0 && itemRefs.current[activeIdx]) {
            itemRefs.current[activeIdx].scrollIntoView({ block: 'nearest' });
        }
    }, [activeIdx, dirs]);

    // Set current dir and filter from value
    useEffect(() => {
        let path = (value || '').trim() || '/';
        if (!path.endsWith('/')) {
            const lastSlash = path.lastIndexOf('/');
            setCurrentDir(lastSlash >= 0 ? path.slice(0, lastSlash) || '/' : '/');
            setFilterText(path.slice(lastSlash + 1));
        } else {
            setCurrentDir(path);
            setFilterText('');
            setActiveIdx(-1);
        }
    }, [value]);

    // Fetch directory list when currentDir/filterText/refresh changes
    useEffect(() => {
        let ignore = false;
        fetchDirectoryList(currentDir).then(({ directories }) => {
            if (!ignore) {
                setDirs(
                    filterText
                        ? directories.filter(d =>
                              d.toLowerCase().startsWith(filterText.toLowerCase())
                          )
                        : directories
                );
            }
        });
        return () => {
            ignore = true;
        };
    }, [currentDir, filterText, refreshKey]);

    // Validate the current value
    useEffect(() => {
        async function validate() {
            const val = (value || '').trim();
            let valid = false;
            if (!val || !val.endsWith('/')) {
                setError('Must be a valid directory (end with /)');
                valid = false;
            } else {
                // backend now returns {directories, exists, writable, error}
                const { exists, writable, error: backendError } = await fetchDirectoryList(val);
                if (!exists) {
                    setError(backendError || 'Directory does not exist.');
                    valid = false;
                } else if (writable === false) {
                    setError('Directory is not writable.');
                    valid = false;
                } else {
                    setError('');
                    valid = true;
                }
            }
            setIsValid(valid);
            if (typeof onValidityChange === 'function') onValidityChange(valid);
        }
        validate();
    }, [value, onValidityChange]);

    // Build the directory list (.. + dirs)
    const combinedList = [];
    if (currentDir !== '/') combinedList.push({ type: 'parent', label: '..' });
    dirs.forEach(name => combinedList.push({ type: 'dir', label: name }));

    // Handlers
    const handleKeyDown = e => {
        if (!combinedList.length) return;
        if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => (i + 1) % combinedList.length);
            return;
        }
        if ((e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => (i - 1 + combinedList.length) % combinedList.length);
            return;
        }
        if (e.key === 'Enter' && activeIdx >= 0) {
            e.preventDefault();
            const item = combinedList[activeIdx];
            if (item.type === 'parent') handleParentClick();
            else if (item.type === 'dir') handleDirClick(item.label);
            return;
        }
        if (e.key === 'Escape') setActiveIdx(-1);
    };

    const handleInputChange = e => {
        const val = e.target.value.trim() || '/';
        onChange(val);
        clearTimeout(suggestionTimeout.current);
        suggestionTimeout.current = setTimeout(() => {
            if (val.endsWith('/')) {
                setFilterText('');
                setCurrentDir(val);
            } else {
                const lastSlash = val.lastIndexOf('/');
                setCurrentDir(lastSlash >= 0 ? val.slice(0, lastSlash) || '/' : '/');
                setFilterText(val.slice(lastSlash + 1));
            }
            setActiveIdx(-1);
        }, 120);
    };

    const handleDirClick = name => {
        const newPath = currentDir.endsWith('/')
            ? currentDir + name + '/'
            : currentDir + '/' + name + '/';
        onChange(newPath);
        setCurrentDir(newPath);
        setFilterText('');
        setActiveIdx(-1);
        inputRef.current?.focus();
    };

    const handleParentClick = () => {
        let parent = currentDir.replace(/\/+$/, '');
        parent = parent.substring(0, parent.lastIndexOf('/')) || '/';
        const parentPath = parent.endsWith('/') ? parent : parent + '/';
        onChange(parentPath);
        setCurrentDir(parentPath);
        setFilterText('');
        setActiveIdx(-1);
        inputRef.current?.focus();
    };

    return (
        <div className="settings-field-row field-dir-picker">
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <input
                    ref={inputRef}
                    type="text"
                    className="input dir-picker-input"
                    name={field.key}
                    value={value ?? ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={field.placeholder || 'Choose directory…'}
                    autoComplete="off"
                    aria-label="Directory path"
                    spellCheck={false}
                />
                <ul className="dir-list" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {combinedList.map((item, i) =>
                        item.type === 'parent' ? (
                            <li
                                key="parent"
                                ref={el => (itemRefs.current[i] = el)}
                                className={i === activeIdx ? 'dir-parent active' : 'dir-parent'}
                                aria-label="Parent directory"
                                aria-selected={i === activeIdx}
                                tabIndex={-1}
                                onClick={handleParentClick}
                                // Removed onMouseEnter here
                            >
                                ..
                            </li>
                        ) : (
                            <li
                                key={item.label}
                                ref={el => (itemRefs.current[i] = el)}
                                className={i === activeIdx ? 'active' : ''}
                                aria-label={item.label}
                                aria-selected={i === activeIdx}
                                tabIndex={-1}
                                onClick={() => handleDirClick(item.label)}
                                // Removed onMouseEnter here
                            >
                                {item.label}
                            </li>
                        )
                    )}
                </ul>
                {field.description && <div className="field-help-text">{field.description}</div>}
                {error && <div className="field-error-message">{error}</div>}
            </div>
        </div>
    );
});
