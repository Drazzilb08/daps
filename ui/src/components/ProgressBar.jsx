// src/components/common/ProgressBar.jsx
import React from 'react';

/**
 * value: 0-100 for determinate, null for indeterminate (animated)
 * active: true = apply indeterminate animation even if value is null
 * className: optional extra class
 */
export default function ProgressBar({
    value = null,
    active = false,
    className = '',
    style = {},
    ...props
}) {
    const hasValue = value !== null && value !== undefined;

    return (
        <div
            className={`progress-bar${active || hasValue ? ' progress-bar--active' : ''}${className ? ' ' + className : ''}`}
            style={style}
            {...props}
        >
            <div
                className="progress-bar__inner"
                style={hasValue ? { width: `${Math.max(0, Math.min(100, value))}%` } : undefined}
            >
                {hasValue && (
                    <span className="progress-bar__label">
                        {Math.round(Math.max(0, Math.min(100, value)))}%
                    </span>
                )}
            </div>
        </div>
    );
}
