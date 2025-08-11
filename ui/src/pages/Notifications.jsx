import { useState, useEffect, useCallback } from 'react';
import { fetchConfig, postConfig, runTestNotification } from '../utils/api';
import { humanize, getIcon, getSpinner } from '../utils/tools';
import { NOTIFICATIONS_SCHEMA } from '../utils/constants/notifications_schema';
import ModalFactory from '../components/modals/ModalFactory';
import { useToast } from '../components/providers/ToastProvider';
import '../css/pages/notifications.css';

// Utility: get schema def by type
function getTypeDef(type) {
    return NOTIFICATIONS_SCHEMA.find(n => n.type === type);
}

export default function Notifications() {
    const [notifications, setNotifications] = useState({});
    const [modal, setModal] = useState(null); // {title, children, ...modalFactoryProps}
    const toast = useToast();

    const loadNotifications = useCallback(async () => {
        const config = await fetchConfig('notifications');
        setNotifications(config.notifications || {});
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    // --- Open the Type Picker modal ---
    function openTypePickerModal(module) {
        setModal({
            title: 'Select Notification Type',
            isSmallModal: true,
            onClose: () => setModal(null),
            children: (
                <div style={{ textAlign: 'center' }}>
                    {NOTIFICATIONS_SCHEMA.map(n => {
                        const used = notifications?.[module] ? Object.keys(notifications[module]) : [];
                        return (
                            <button
                                key={n.type}
                                type="button"
                                className="btn notify-type-btn"
                                disabled={used.includes(n.type)}
                                style={{ 
                                    minWidth: 0, 
                                    width: '100%', 
                                    marginBottom: '0.7em' 
                                }}
                                onClick={() => {
                                    setModal(null);
                                    setTimeout(() => {
                                        openNotificationModal({
                                            module,
                                            type: n.type,
                                            settings: {},
                                            isEdit: false,
                                        });
                                    }, 10);
                                }}
                            >
                                {n.label}
                            </button>
                        );
                    })}
                </div>
            ),
            footerButtons: [],
        });
    }

    // --- Open the Add/Edit Notification Modal ---
    function openNotificationModal({ module, type, settings = {}, isEdit }) {
        const def = getTypeDef(type);
        if (!def) {
            toast('Invalid notification type', 'error');
            return;
        }
        let entry = { ...settings };
        let loading = false;

        const closeModal = () => setModal(null);

        // Validate required fields
        const getFieldError = f => {
            if (!f.required) return false;
            if (entry[f.key] == null || entry[f.key] === '') return true;
            return false;
        };

        // Save handler (add or edit)
        async function handleSave() {
            let errorFields = def.fields.filter(getFieldError);
            if (errorFields.length) {
                toast('All required fields must be filled', 'error');
                return;
            }
            // Validate (optionally test)
            const updated = JSON.parse(JSON.stringify(notifications));
            if (!updated[module]) updated[module] = {};
            updated[module][type] = { ...entry };
            const resp = await postConfig({ notifications: updated });
            if (resp.success) {
                toast('Notification saved!', 'success');
                closeModal();
                await loadNotifications();
                return true;
            }
            toast(resp.error || 'Failed to save', 'error');
            return false;
        }

        // Delete handler
        async function handleDelete() {
            if (!window.confirm(`Delete notification ${type} from ${humanize(module)}?`)) return;
            const updated = JSON.parse(JSON.stringify(notifications));
            if (updated[module]) {
                delete updated[module][type];
            }
            const resp = await postConfig({ notifications: updated });
            if (resp.success) {
                toast('Notification deleted!', 'success');
                closeModal();
                await loadNotifications();
            } else {
                toast(resp.error || 'Failed to delete', 'error');
            }
        }

        // Test handler
        async function handleTest() {
            loading = true;
            setModal(old => ({ ...old }));
            try {
                const res = await runTestNotification(type, entry);
                const success = res.ok === true || res.result === true;
                toast(
                    res.message ||
                        res.error ||
                        (success ? 'Test notification sent!' : 'Test failed'),
                    success ? 'success' : 'error'
                );
            } finally {
                loading = false;
                setModal(old => ({ ...old }));
            }
        }

        setModal({
            title: `${isEdit ? 'Edit' : 'Add'} ${humanize(module)} - ${
                def?.label || humanize(type)
            } Notification`,
            onClose: closeModal,
            schema: def.fields,
            entry: { ...settings },
            footerButtons: [
                {
                    id: 'test-btn',
                    label: loading ? getSpinner() : 'Test',
                    className: '',
                    type: 'button',
                },
                {
                    id: 'cancel-modal-btn',
                    label: 'Cancel',
                    className: 'btn--cancel',
                    type: 'button',
                },
                {
                    id: isEdit ? 'save-btn' : 'add-btn',
                    label: isEdit ? 'Save' : 'Add',
                    className: 'btn--success',
                    type: 'submit',
                },
                ...(isEdit
                    ? [
                          {
                              id: 'delete-modal-btn',
                              label: 'Delete',
                              className: 'btn--remove-item',
                              type: 'button',
                          },
                      ]
                    : []),
            ],
            onButtonClick: {
                'test-btn': handleTest,
                'cancel-modal-btn': closeModal,
                'save-btn': handleSave,
                'add-btn': handleSave,
                'delete-modal-btn': handleDelete,
            },
        });
    }

    // --- Render ---
    return (
        <>
            <div className="card-list" id="notifications-list">
                {!notifications || Object.keys(notifications).length === 0 ? (
                    <AddNotificationCard
                        module={null}
                        notifications={notifications}
                        onAdd={() => openTypePickerModal(null)}
                    />
                ) : (
                    Object.entries(notifications).map(([module, notifTypes]) =>
                        typeof notifTypes === 'object' ? (
                            <NotificationGroup
                                key={module}
                                module={module}
                                notifTypes={notifTypes}
                                notifications={notifications}
                                onEdit={(type, settings) =>
                                    openNotificationModal({ module, type, settings, isEdit: true })
                                }
                                onAdd={() => openTypePickerModal(module)}
                            />
                        ) : null
                    )
                )}
            </div>
            {modal && <ModalFactory {...modal} />}
        </>
    );
}

// --- Individual notification card ---
function NotificationCard({ type, settings, onEdit }) {
    const def = getTypeDef(type);
    return (
        <div className="card notification-card" tabIndex={0} onClick={() => onEdit(type, settings)}>
            <div className="notification-type-icon icon">{getIcon(type)}</div>
            <div className="notification-type-label">{def?.label || type}</div>
        </div>
    );
}

// --- Add card ---
function AddNotificationCard({ onAdd }) {
    return (
        <div className="card card-add" tabIndex={0} onClick={onAdd}>
            <div className="card-add-plus">&#43;</div>
        </div>
    );
}

// --- Group ---
function NotificationGroup({ module, notifTypes, notifications, onEdit, onAdd }) {
    const usedTypes = Object.keys(notifTypes || {});
    const unused = NOTIFICATIONS_SCHEMA.filter(n => !usedTypes.includes(n.type));

    return (
        <div className="notification-group">
            <div className="notification-group-header">{humanize(module)}</div>
            <div className="card-list">
                {Object.entries(notifTypes).map(([type, settings]) => (
                    <NotificationCard
                        key={type}
                        module={module}
                        type={type}
                        settings={settings}
                        onEdit={onEdit}
                    />
                ))}
                {unused.length > 0 && (
                    <AddNotificationCard
                        module={module}
                        notifications={notifications}
                        onAdd={onAdd}
                    />
                )}
            </div>
        </div>
    );
}
