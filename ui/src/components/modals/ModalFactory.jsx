import React from 'react';
import ModalRegistry from './ModalRegistry';

/**
 * Modal factory orchestrator using registry pattern for component routing
 * Maintains EXACT API compatibility while delegating to specialized modal components
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Modal title
 * @param {Array} [props.schema=[]] - Field schema configuration
 * @param {Object} [props.entry={}] - Initial form data
 * @param {Array} [props.footerButtons=[]] - Footer button configurations
 * @param {Object|null} [props.moduleConfig=null] - Module configuration
 * @param {Object|null} [props.rootConfig=null] - Root configuration
 * @param {string} [props.modalClass='modal-content'] - CSS class for modal
 * @param {Object|null} [props.layout=null] - Layout configuration
 * @param {Function} props.onClose - Close handler
 * @param {Object} [props.onButtonClick={}] - Button click handlers
 * @param {Function|null} [props.onFieldChange=null] - Field change handler
 * @param {Object} [props.fieldRefs={}] - Field ref objects
 * @param {React.ReactNode} props.children - Modal content
 * @param {boolean} [props.isSmallModal=false] - Whether to render compact modal
 * @param {number} [props.maxWidth=370] - Maximum modal width
 * @param {number} [props.minWidth=0] - Minimum modal width
 * @returns {JSX.Element} Rendered modal component
 */
export default function ModalFactory(props) {
    // Use registry to determine and create appropriate modal component
    const ModalComponent = ModalRegistry.createModal(props);

    // Pass through all props unchanged for complete API compatibility
    return <ModalComponent {...props} />;
}
