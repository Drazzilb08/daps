import React from 'react';
import SmallModalFactory from './SmallModalFactory';

export default function NotificationTypePickerModal({
    module,
    notifications,
    notifyTypes,
    onTypePicked,
    onClose,
}) {
    const used = notifications?.[module] ? Object.keys(notifications[module]) : [];
    return (
        <SmallModalFactory
            title="Select Notification Type"
            message=""
            onClose={onClose}
            actions={notifyTypes.map(n => ({
                id: n.type,
                label: n.label,
                className: 'btn notify-type-btn',
                onClick: () => onTypePicked({ type: n.type }),
                disabled: used.includes(n.type),
            }))}
            maxWidth={370}
        />
    );
}
