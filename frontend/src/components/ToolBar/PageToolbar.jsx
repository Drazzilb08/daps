import { useToolbar } from '../../contexts/ToolbarContext';

/**
 * PageToolbar - Generic toolbar that renders registered content
 *
 * This component replaces the search-specific SearchToolbar conditional in Layout.jsx.
 * It renders ANY toolbar content registered by pages via the useToolbar hook.
 *
 * Position: Renders before <main> tag in Layout, creating a horizontal bar
 * at the top of the content area (identical to SearchToolbar positioning).
 *
 * @returns {JSX.Element|null} Registered toolbar content or null if no toolbar
 */
const PageToolbar = () => {
    const { hasToolbar, content } = useToolbar();

    // Return null if no toolbar registered
    if (!hasToolbar || !content) {
        return null;
    }

    // Render registered toolbar content
    return content;
};

export default PageToolbar;
