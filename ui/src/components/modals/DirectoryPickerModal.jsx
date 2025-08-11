import React, { useRef, useState } from 'react';
import ModalFactory from './ModalFactory';
import { createDirectory } from '../../utils/api';

export default function DirectoryPickerModal({
    initialPath = '/',
    nameValue = null,
    onAccept,
    onCancel,
}) {
    const [path, setPath] = useState(initialPath || '/');
    const [acceptEnabled, setAcceptEnabled] = useState(false); // false by default!
    const fieldRefs = { path: useRef() };

    const schema = [
        {
            key: 'path',
            label: 'Directory Path',
            type: 'dir_picker',
            required: true,
            placeholder: 'Type or select a directory…',
            // This is picked up by your field registry/RenderFields
            onValidityChange: setAcceptEnabled,
        },
    ];

    const footerButtons = [
        { id: 'dir-create', label: 'New Folder', className: 'btn', type: 'button' },
        {
            id: 'dir-accept',
            label: 'Accept',
            className: 'btn--success',
            type: 'button',
            disabled: !acceptEnabled,
        },
        { id: 'dir-cancel', label: 'Cancel', className: 'btn--cancel', type: 'button' },
    ];

    const onButtonClick = {
        'dir-create': async ({ formData }) => {
            const currPath = formData.path?.trim() || path || '/';
            const name = window.prompt('New folder name:');
            if (!name) return;
            if (currPath === '/' || currPath === '') {
                window.alert('Please navigate to a directory before creating a subfolder.');
                return;
            }
            const newPath = currPath.endsWith('/') ? currPath + name : currPath + '/' + name;
            try {
                await createDirectory(newPath);
                const finalPath = newPath.endsWith('/') ? newPath : newPath + '/';
                fieldRefs.path.current?.forceRefresh(finalPath);
                setPath(finalPath);
            } catch (e) {
                window.alert('Create failed: ' + (e?.message || e));
            }
        },
        'dir-accept': ({ formData, closeModal }) => {
            if (!formData.path || !formData.path.trim()) return;
            onAccept && onAccept(formData.path);
            closeModal();
        },
        'dir-cancel': ({ closeModal }) => {
            onCancel && onCancel();
            closeModal();
        },
    };

    return (
        <ModalFactory
            title={
                nameValue ? `Select a location for ${nameValue}'s directory` : 'Select Directory'
            }
            schema={schema}
            entry={{ path }}
            footerButtons={footerButtons}
            onClose={onCancel}
            onButtonClick={onButtonClick}
            moduleConfig={null}
            rootConfig={null}
            onFieldChange={(fieldKey, val) => {
                if (fieldKey === 'path') setPath(val);
            }}
            fieldRefs={fieldRefs}
        />
    );
}
