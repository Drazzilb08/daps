import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FeatureErrorBoundary } from './error';
import LayoutHeader from './LayoutHeader.jsx';
import LayoutSidebar from './LayoutSidebar.jsx';
import PageToolbar from './ToolBar/PageToolbar.jsx';
import { ToolbarProvider } from '../contexts/ToolbarContext.jsx';
import { useUIState } from '../contexts/UIStateContext.jsx';

const Layout = ({ children }) => {
    const { mobileMenuOpen, closeMobileMenu, isMobile } = useUIState();

    return (
        <ToolbarProvider>
            <div className="h-screen flex flex-col">
                {/* Skip link for keyboard navigation - WCAG 2.1 AA requirement */}
                <a href="#main-content" className="skip-link">
                    Skip to main content
                </a>

                {/* Fixed Header - full width */}
                <FeatureErrorBoundary
                    featureName="Page Header"
                    featureDescription="Main navigation and header"
                    critical={true}
                >
                    <LayoutHeader />
                </FeatureErrorBoundary>

                {/* Mobile Menu Backdrop */}
                {isMobile && mobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={closeMobileMenu}
                        aria-hidden="true"
                    />
                )}

                {/* Content Area - remaining height after header */}
                <div className="flex flex-1 overflow-hidden">
                    <FeatureErrorBoundary
                        featureName="Sidebar Navigation"
                        featureDescription="Left navigation sidebar"
                        critical={true}
                    >
                        <LayoutSidebar />
                    </FeatureErrorBoundary>

                    {/* Main Content Area - remaining width after sidebar */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Generic toolbar - renders any registered content */}
                        <FeatureErrorBoundary
                            featureName="Page Toolbar"
                            featureDescription="Page toolbar with actions"
                            critical={false}
                        >
                            <PageToolbar />
                        </FeatureErrorBoundary>

                        <main
                            id="main-content"
                            className="flex-1 overflow-y-auto p-4 px-3 md:p-6 md:px-4 bg-bg"
                        >
                            <FeatureErrorBoundary
                                featureName="Page Content"
                                featureDescription="Main page content area"
                                critical={false}
                            >
                                {children || <Outlet />}
                            </FeatureErrorBoundary>
                        </main>
                    </div>
                </div>
            </div>
        </ToolbarProvider>
    );
};

Layout.propTypes = {
    children: PropTypes.node,
};

export default Layout;
