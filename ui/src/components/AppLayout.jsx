// src/components/Layout.jsx
import PropTypes from 'prop-types';
import Sidebar from './NavigationSidebar';
import Header from './AppHeader';
import { HeaderSearchProvider } from '../contexts/HeaderSearchProvider';

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
