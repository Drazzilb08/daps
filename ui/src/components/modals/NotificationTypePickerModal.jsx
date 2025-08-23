import React from 'react';
import ModalFactory from './ModalFactory';

export default function NotificationTypePickerModal({
    module,
    notifications,
    notifyTypes,
    onTypePicked,
    onClose,
}) {
    const used = notifications?.[module] ? Object.keys(notifications[module]) : [];
    const buttonHandlers = {};

    notifyTypes.forEach(n => {
        buttonHandlers[n.type] = () => onTypePicked({ type: n.type });
    });

    return (
        <ModalFactory
            title="Select Notification Type"
            isSmallModal={true}
            maxWidth={370}
            onClose={onClose}
            footerButtons={notifyTypes.map(n => ({
                id: n.type,
                label: n.label,
                className: 'btn notify-type-btn',
                disabled: used.includes(n.type),
            }))}
            onButtonClick={buttonHandlers}
        />
    );
}
