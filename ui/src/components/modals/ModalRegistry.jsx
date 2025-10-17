import ModalForm from './ModalForm';
import ModalSimple from './ModalSimple';

/**
 * Modal registry implementing the factory pattern for modal type management
 * Routes modal creation based on props analysis and modal characteristics
 */
export class ModalRegistry {
    /**
     * Registry of modal types and their components
     */
    static modalTypes = {
        simple: ModalSimple,
        form: ModalForm,
        // Extensible for future modal types
    };

    /**
     * Determine appropriate modal type based on props analysis
     * @param {Object} props - Modal component props
     * @returns {string} Modal type identifier
     */
    static determineModalType(props) {
        const { isSmallModal, schema } = props;

        // Small modal takes priority - compact display with inline buttons
        if (isSmallModal) {
            return 'simple';
        }

        // Form modal - has schema configuration for dynamic field rendering
        if (schema && schema.length > 0) {
            return 'form';
        }

        // Default to form modal for consistency with current behavior
        return 'form';
    }

    /**
     * Get modal component class for specified type
     * @param {string} modalType - Modal type identifier
     * @returns {React.ComponentType} Modal component class
     */
    static getModalComponent(modalType) {
        const Component = this.modalTypes[modalType];
        if (!Component) {
            console.warn(`Unknown modal type: ${modalType}, falling back to form modal`);
            return this.modalTypes.form;
        }
        return Component;
    }

    /**
     * Create modal component with appropriate type based on props
     * @param {Object} props - Modal component props
     * @returns {React.ComponentType} Configured modal component
     */
    static createModal(props) {
        const modalType = this.determineModalType(props);
        return this.getModalComponent(modalType);
    }

    /**
     * Register new modal type for extensibility
     * @param {string} type - Modal type identifier
     * @param {React.ComponentType} component - Modal component class
     */
    static register(type, component) {
        this.modalTypes[type] = component;
    }

    /**
     * Get all registered modal types
     * @returns {Array<string>} Array of modal type identifiers
     */
    static getRegisteredTypes() {
        return Object.keys(this.modalTypes);
    }

    /**
     * Check if modal type is registered
     * @param {string} type - Modal type identifier
     * @returns {boolean} Whether type is registered
     */
    static isRegistered(type) {
        return type in this.modalTypes;
    }
}

export default ModalRegistry;
