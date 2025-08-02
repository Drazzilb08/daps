import React, { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DirectoryPickerModal from '../../modals/DirectoryPickerModal';

// --- Sortable Item component with drag handle
function SortableRow({ id, dir, onRemove, onInput, onRowClick, isOnlyRow }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`field-dragdrop-row draggable${isDragging ? ' dragging' : ''}`}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                background: isDragging ? 'var(--surface-alt, #f3f3fc)' : undefined,
                zIndex: isDragging ? 2 : undefined,
            }}
            data-row-key={id}
        >
            <span
                className="drag-handle"
                title="Drag to reorder"
                style={{ cursor: 'grab' }}
                {...attributes}
                {...listeners}
            >
                ⋮⋮
            </span>
            <input
                type="text"
                className="input field-input"
                value={dir || ''}
                onClick={onRowClick}
                onChange={onInput}
                readOnly={false}
            />
            <button
                type="button"
                className="btn btn--remove-item remove-btn"
                onClick={onRemove}
                disabled={isOnlyRow}
                aria-disabled={isOnlyRow}
            >
                −
            </button>
        </div>
    );
}

export function DirListDragDropField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    // Memoize dirs so reference is stable unless value changes
    const dirs = useMemo(
        () => (Array.isArray(value) ? (value.length ? [...value] : ['']) : value ? [value] : ['']),
        [value]
    );
    const [localDirs, setLocalDirs] = useState(dirs);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalIndex, setModalIndex] = useState(null);

    // DnD-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    // Ensure local state matches parent (if parent changes it)
    React.useEffect(() => {
        setLocalDirs(dirs);
    }, [dirs]);

    function openModalAtIndex(idx) {
        setModalIndex(idx);
        setModalOpen(true);
    }
    function handleModalAccept(selectedPath) {
        if (selectedPath) handleInputChange(modalIndex, selectedPath);
        setModalOpen(false);
        setModalIndex(null);
    }
    function handleModalCancel() {
        setModalOpen(false);
        setModalIndex(null);
    }
    function handleInputChange(idx, val) {
        const arr = [...localDirs];
        arr[idx] = val;
        setLocalDirs(arr);
        onChange(arr);
    }
    function handleRemove(idx) {
        if (localDirs.length === 1) return;
        const arr = localDirs.slice();
        arr.splice(idx, 1);
        setLocalDirs(arr);
        onChange(arr);
    }
    function handleAdd() {
        const arr = [...localDirs, ''];
        setLocalDirs(arr);
        onChange(arr);
    }

    function handleDragEnd(event) {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = localDirs.findIndex((_, i) => `${localDirs[i]}__${i}` === active.id);
            const newIndex = localDirs.findIndex((_, i) => `${localDirs[i]}__${i}` === over?.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newArr = arrayMove(localDirs, oldIndex, newIndex);
                setLocalDirs(newArr);
                onChange(newArr);
            }
        }
    }

    // Use a unique id per row for DnD-kit
    const itemIds = useMemo(() => localDirs.map((dir, i) => `${dir}__${i}`), [localDirs]);

    return (
        <>
            <div
                className={`settings-field-row field-dir-list${highlightInvalid ? ' field-error' : ''}`}
            >
                <div className="settings-field-labelcol dirlist-label-col">
                    <label htmlFor={field.key}>{field.label}</label>
                    <div style={{ flex: 1 }} />
                    <button type="button" className="btn add-btn" onClick={handleAdd}>
                        Add Directory
                    </button>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        <div className="settings-field-inputwrap dirlist-input-col">
                            {localDirs.map((dir, idx) => (
                                <SortableRow
                                    key={itemIds[idx]}
                                    id={itemIds[idx]}
                                    dir={dir}
                                    idx={idx}
                                    isOnlyRow={localDirs.length === 1}
                                    onRemove={() => handleRemove(idx)}
                                    onInput={e => handleInputChange(idx, e.target.value)}
                                    onRowClick={() => openModalAtIndex(idx)}
                                />
                            ))}
                            {field.description && (
                                <div className="field-help-text">{field.description}</div>
                            )}
                            {errorMessage && <div className="field-error-text">{errorMessage}</div>}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
            {modalOpen && (
                <DirectoryPickerModal
                    initialPath={localDirs[modalIndex] || '/'}
                    onAccept={handleModalAccept}
                    onCancel={handleModalCancel}
                    nameValue={null}
                />
            )}
        </>
    );
}
