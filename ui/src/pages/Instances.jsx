import { useState, useEffect, useCallback } from 'react';
import { fetchConfig, postConfig, testInstance } from '../utils/api';
import { humanize, getIcon } from '../utils/tools';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { INSTANCE_SCHEMA } from '../utils/constants/instance_schema';
import ModalFactory from '../components/modals/ModalFactory';
import { useToast } from '../components/providers/ToastProvider';
import '../css/pages/instances.css';

// --- Instance Group Rendering ---
function InstanceGroup({ service, items, onOpenModal }) {
    return (
        <div className="instance-group">
            <div className="instance-group-header">
                <span>{humanize(service)}</span>
                <span className="instance-group-icon icon">{getIcon(service)}</span>
            </div>
            <div className="card-list">
                {Object.entries(items).map(([name, settings]) => (
                    <InstanceCard
                        key={name}
                        service={service}
                        name={name}
                        settings={settings}
                        onOpenModal={onOpenModal}
                    />
                ))}
                <AddInstanceCard service={service} onOpenModal={onOpenModal} />
            </div>
        </div>
    );
}

function InstanceCard({ service, name, settings, onOpenModal }) {
    return (
        <div
            className="card"
            tabIndex={0}
            onClick={() => onOpenModal({ service, name, settings, isEdit: true })}
        >
            <div className="card-title">{name}</div>
        </div>
    );
}

function AddInstanceCard({ service, onOpenModal }) {
    return (
        <div
            className="card card-add"
            tabIndex={0}
            onClick={() => onOpenModal({ service, name: '', settings: {}, isEdit: false })}
        >
            <div className="card-add-plus">&#43;</div>
        </div>
    );
}

export default function Instances() {
    const [instances, setInstances] = useState({});
    const [modal, setModal] = useState(null);
    const [modalEntry, setModalEntry] = useState({ name: '', url: '', api: '' });
    const [modalMode, setModalMode] = useState({ service: '', name: '', isEdit: false });
    const [testStatus, setTestStatus] = useState('idle'); // idle | testing | success | error
    const toast = useToast();

    // Load instances
    const loadInstances = useCallback(async () => {
        const result = await fetchConfig('instances');
        setInstances(result.instances || {});
    }, []);
    useEffect(() => {
        loadInstances();
    }, [loadInstances]);

    // Open the modal
    function openInstanceModal({ service, name = '', settings = {}, isEdit }) {
        setModalEntry({
            name: name || '',
            url: settings.url || '',
            api: settings.api || '',
        });
        setModalMode({ service, name: name || '', isEdit: !!isEdit });
        setTestStatus('idle');
        setModal(true);
    }

    // Modal handlers
    const closeModal = () => setModal(false);

    // Change a field in the modal
    function setField(key, value) {
        setModalEntry(prev => ({ ...prev, [key]: value }));
        setTestStatus('idle'); // reset on change
    }

    // Save/add handler
    async function handleSave() {
        if (!modalEntry.name || !modalEntry.url || !modalEntry.api) {
            toast('All fields required', 'error');
            return;
        }
        const updated = JSON.parse(JSON.stringify(instances));
        updated[modalMode.service] = updated[modalMode.service] || {};
        // For edit: handle renames
        if (modalMode.isEdit && modalMode.name !== modalEntry.name) {
            delete updated[modalMode.service][modalMode.name];
        }
        updated[modalMode.service][modalEntry.name] = { url: modalEntry.url, api: modalEntry.api };
        const { success, error } = await postConfig(updated);
        if (success) {
            toast('Instance saved!', 'success');
            closeModal();
            await loadInstances();
        } else {
            toast(error || 'Failed to save instance', 'error');
        }
    }

    // Delete handler
    async function handleDelete() {
        if (!window.confirm(`Delete ${modalMode.service} instance "${modalMode.name}"?`)) return;
        const updated = JSON.parse(JSON.stringify(instances));
        delete updated[modalMode.service][modalMode.name];
        const { success, error } = await postConfig(updated);
        if (success) {
            toast('Instance deleted!', 'success');
            closeModal();
            await loadInstances();
        } else {
            toast(error || 'Failed to delete instance', 'error');
        }
    }

    // Test handler (with visual feedback)
    async function handleTest() {
        if (!modalEntry.name || !modalEntry.url || !modalEntry.api) {
            toast('All fields required to test', 'error');
            setTestStatus('error');
            setTimeout(() => setTestStatus('idle'), 1600);
            return;
        }
        setTestStatus('testing');
        const ok = await testInstance(modalMode.service, modalEntry);
        setTestStatus(ok ? 'success' : 'error');
        setTimeout(() => setTestStatus('idle'), 1600);
        toast(
            ok ? 'Connection successful!' : 'Test failed. Check the instance details.',
            ok ? 'success' : 'error'
        );
    }

    let testIcon, testClass;
    if (testStatus === 'testing') {
        testIcon = <LoadingSpinner size="small" />;
        testClass = 'btn--info';
    } else if (testStatus === 'success') {
        testIcon = getIcon('mi:check', {
            style: { color: '#27d545', fontSize: '1.5em', verticalAlign: 'middle' },
        });
        testClass = 'btn--info';
    } else if (testStatus === 'error') {
        testIcon = getIcon('mi:close', {
            style: { color: '#ff375f', fontSize: '1.5em', verticalAlign: 'middle' },
        });
        testClass = 'btn--info';
    } else {
        testIcon = 'Test';
        testClass = 'btn--info';
    }

    // Modal config (similar to Notifications)
    const modalConfig = modal
        ? {
              title: `${modalMode.isEdit ? 'Edit' : 'Add'} ${humanize(modalMode.service)}`,
              schema: INSTANCE_SCHEMA,
              entry: modalEntry,
              onFieldChange: setField,
              footerButtons: [
                  ...(modalMode.isEdit
                      ? [
                            {
                                id: 'delete-modal-btn',
                                label: 'Delete',
                                className: 'btn--remove-item',
                                type: 'button',
                            },
                        ]
                      : []),
                  {
                      id: 'test-modal-btn',
                      label: testIcon,
                      className: testClass,
                      type: 'button',
                      disabled: testStatus === 'testing',
                  },
                  {
                      id: 'cancel-modal-btn',
                      label: 'Cancel',
                      className: 'btn--cancel',
                      type: 'button',
                  },
                  {
                      id: modalMode.isEdit ? 'save-btn' : 'add-btn',
                      label: modalMode.isEdit ? 'Save' : 'Add',
                      className: 'btn--success',
                      type: 'submit',
                  },
              ],
              onButtonClick: {
                  'test-modal-btn': handleTest,
                  'save-btn': handleSave,
                  'add-btn': handleSave,
                  'delete-modal-btn': handleDelete,
                  'cancel-modal-btn': closeModal,
              },
              onClose: closeModal,
          }
        : null;

    // ---- Render ----
    return (
        <>
            <div className="instances-list">
                {Object.entries(instances).map(([service, items]) => (
                    <InstanceGroup
                        key={service}
                        service={service}
                        items={items}
                        onOpenModal={openInstanceModal}
                    />
                ))}
            </div>
            {modal && <ModalFactory {...modalConfig} />}
        </>
    );
}
