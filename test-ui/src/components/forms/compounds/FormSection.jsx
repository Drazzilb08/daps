import React, { useState } from 'react';

/**
 * FormSection - Form section compound component
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.description - Section description
 * @param {boolean} props.collapsible - Enable accordion behavior
 * @param {boolean} props.defaultCollapsed - Initial collapsed state
 * @param {ReactNode} props.children - Section content (field components)
 * @param {string} props.className - CSS classes
 */
export const FormSection = React.memo(
    ({
        title,
        description,
        collapsible = false,
        defaultCollapsed = false,
        children,
        className = '',
    }) => {
        const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

        const toggleCollapsed = () => {
            if (collapsible) {
                setIsCollapsed(prev => !prev);
            }
        };

        return (
            <div className={`mb-6 ${className}`}>
                {/* Section header */}
                {(title || description) && (
                    <div className="mb-4 pb-2 border-b">
                        {title &&
                            (collapsible ? (
                                <button
                                    type="button"
                                    className="flex items-center w-full bg-transparent border-none p-0 text-left cursor-pointer hover:text-primary transition-colors"
                                    onClick={toggleCollapsed}
                                    aria-expanded={!isCollapsed}
                                >
                                    <span
                                        className={`mr-2 text-sm text-secondary transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                                    >
                                        ▼
                                    </span>
                                    <h3 className="m-0 text-lg font-medium text-primary">
                                        {title}
                                    </h3>
                                </button>
                            ) : (
                                <h3 className="m-0 text-lg font-medium text-primary">{title}</h3>
                            ))}

                        {description && (
                            <p className="mt-2 mb-0 text-sm text-secondary">{description}</p>
                        )}
                    </div>
                )}

                {/* Section content */}
                {(!collapsible || !isCollapsed) && <div className="space-y-4">{children}</div>}
            </div>
        );
    }
);

FormSection.displayName = 'Form.Section';

export default FormSection;
