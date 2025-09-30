/**
 * Standardized page header for consistent page titles and descriptions
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {React.ReactNode} [props.actions] - Optional action buttons in header
 */
export const PageHeader = ({ title, description, actions }) => {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-semibold text-primary">{title}</h1>
                {actions && <div className="flex gap-2">{actions}</div>}
            </div>
            {description && <p className="text-secondary text-lg">{description}</p>}
        </div>
    );
};
