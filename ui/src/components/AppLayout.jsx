import PropTypes from 'prop-types';
import Sidebar from './NavigationSidebar';
import Header from './AppHeader';
import { SearchCoordinatorProvider } from '../contexts/SearchCoordinatorProvider';

/**
 * Main application layout component that wraps page content with header and sidebar
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content to render in main area
 * @returns {JSX.Element} Complete layout structure with navigation and content area
 */
export default function Layout({ children }) {
    return (
        <SearchCoordinatorProvider>
            <div>
                <Header />
                <Sidebar />
                <main className="container">
                    <div id="viewFrame" className="view-frame" style={{ opacity: 1 }}>
                        {children}
                    </div>
                </main>
            </div>
        </SearchCoordinatorProvider>
    );
}

Layout.propTypes = {
    children: PropTypes.node.isRequired,
};
