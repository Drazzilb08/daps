import PropTypes from 'prop-types';
import Sidebar from './NavigationSidebar';
import Header from './AppHeader';
import { HeaderSearchProvider } from '../contexts/HeaderSearchProvider';

/**
 * Main application layout component that wraps page content with header and sidebar
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content to render in main area
 * @returns {JSX.Element} Complete layout structure with navigation and content area
 */
export default function Layout({ children }) {
    return (
        <HeaderSearchProvider>
            <div>
                <Header />
                <Sidebar />
                <main className="container">
                    <div id="viewFrame" className="view-frame" style={{ opacity: 1 }}>
                        {children}
                    </div>
                </main>
            </div>
        </HeaderSearchProvider>
    );
}

Layout.propTypes = {
    children: PropTypes.node.isRequired,
};
