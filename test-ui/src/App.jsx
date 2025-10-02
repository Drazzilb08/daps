import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { GlobalErrorProvider } from './contexts/GlobalErrorContext.jsx';
import { UIStateProvider } from './contexts/UIStateContext.jsx';
import { SearchCoordinatorProvider } from './contexts/SearchCoordinatorContext.jsx';
import { PageErrorBoundary } from './components/error';
import Layout from './components/Layout.jsx';
import ErrorTestPage from './pages/dev/ErrorTestPage.jsx';
import FieldTestPage from './pages/dev/FieldTestPage.jsx';
import ApiTestPage from './pages/dev/ApiTestPage.jsx';
import ToolbarTestPage from './pages/dev/ToolbarTestPage.jsx';
import ToolbarCompoundTest from './pages/dev/ToolbarCompoundTest.jsx';
import SpinnerTestPage from './pages/dev/SpinnerTestPage.jsx';
import SettingsMockPage from './pages/dev/SettingsMockPage.jsx';
import ArrayObjectFieldPage from './pages/dev/ArrayObjectFieldPage.jsx';
import AccordionTestPage from './pages/dev/AccordionTestPage.jsx';
import StatsPrimitivesTestPage from './pages/dev/StatsPrimitivesTestPage.jsx';
import ButtonPrimitivesTestPage from './pages/dev/ButtonPrimitivesTestPage.jsx';
import CardPrimitivesTestPage from './pages/dev/CardPrimitivesTestPage.jsx';
import ModuleSettingsPage from './pages/settings/modules/ModuleSettingsPage.jsx';
import GeneralSettingsPage from './pages/settings/GeneralSettingsPage.jsx';
import UISettingsPage from './pages/settings/UISettingsPage.jsx';
import { SchedulePage } from './pages/settings/SchedulePage.jsx';
import { InstancesPage } from './pages/settings/InstancesPage.jsx';

/**
 * DAPS Application Root - Phase 4 Ready
 *
 * Clean provider hierarchy without layout structure:
 * 1. ToastProvider (outermost)
 * 2. ThemeProvider
 * 3. GlobalErrorProvider
 * 4. UIStateProvider
 * 5. Router
 * 6. SearchCoordinatorProvider
 * 7. RouteErrorProvider (innermost)
 *
 * Layout structure removed for Phase 4 component integration.
 * All context providers maintained in exact order.
 */

/**
 * Route Error Boundary - Catches route-specific errors with sophisticated recovery
 */
const RouteErrorBoundary = ({ children }) => {
    return (
        <PageErrorBoundary
            pageName="Application"
            pageDescription="Main application routing"
            showNavigation={true}
            showRetry={true}
        >
            {children}
        </PageErrorBoundary>
    );
};

/**
 * Main Application Component - Phase 4 Ready
 * Clean provider hierarchy without layout wrapper
 */
const App = () => {
    return (
        // Provider hierarchy - EXACT order as required:
        // 1. ToastProvider (outermost)
        // 2. ThemeProvider
        // 3. GlobalErrorProvider
        // 4. UIStateProvider
        // 5. Router
        // 6. SearchCoordinatorProvider
        // 7. RouteErrorProvider (innermost)
        <ToastProvider>
            <ThemeProvider>
                <GlobalErrorProvider>
                    <UIStateProvider>
                        <BrowserRouter>
                            <SearchCoordinatorProvider>
                                <RouteErrorBoundary>
                                    <Routes>
                                        <Route path="/" element={<Layout />}>
                                            <Route
                                                index
                                                element={<Navigate to="/dashboard" replace />}
                                            />
                                            <Route
                                                path="dashboard"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Dashboard"
                                                        pageDescription="Main dashboard overview"
                                                    ></PageErrorBoundary>
                                                }
                                            />

                                            {/* Media Section - Hierarchical Routes */}
                                            <Route
                                                path="media"
                                                element={<Navigate to="/media/search" replace />}
                                            />
                                            <Route
                                                path="media/search"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>Media Search</h1>
                                                        <p>
                                                            Search and discover content in your
                                                            media collection
                                                        </p>
                                                    </div>
                                                }
                                            />
                                            <Route
                                                path="media/manage"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>Media Management</h1>
                                                        <p>
                                                            Manage and organize your media library
                                                        </p>
                                                    </div>
                                                }
                                            />
                                            <Route
                                                path="media/statistics"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>Media Statistics</h1>
                                                        <p>
                                                            View media library statistics and
                                                            analytics
                                                        </p>
                                                    </div>
                                                }
                                            />

                                            {/* Poster Section - Hierarchical Routes (note: /poster not /posters) */}
                                            <Route
                                                path="poster"
                                                element={
                                                    <Navigate to="/poster/search/gdrive" replace />
                                                }
                                            />
                                            <Route
                                                path="poster/search/gdrive"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>GDrive Poster Search</h1>
                                                        <p>Search for posters in Google Drive</p>
                                                    </div>
                                                }
                                            />
                                            <Route
                                                path="poster/search/assets"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>Assets Poster Search</h1>
                                                        <p>Search for posters in local assets</p>
                                                    </div>
                                                }
                                            />
                                            <Route
                                                path="poster/manage"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>Poster Management</h1>
                                                        <p>
                                                            Manage your poster and artwork
                                                            collection
                                                        </p>
                                                    </div>
                                                }
                                            />
                                            <Route
                                                path="poster/statistics"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>Poster Statistics</h1>
                                                        <p>View poster collection statistics</p>
                                                    </div>
                                                }
                                            />

                                            {/* Settings Section - Direct Routes */}
                                            <Route
                                                path="settings"
                                                element={
                                                    <div className="p-4 md:p-6 max-w-4xl mx-auto">
                                                        <h1 className="text-xl md:text-2xl font-semibold mb-2 text-primary">
                                                            Settings Splash
                                                        </h1>
                                                        <p className="text-sm md:text-base text-secondary mb-6">
                                                            Splash page for all settings links
                                                        </p>
                                                        <div className="text-center py-8 text-tertiary">
                                                            <span className="material-symbols-outlined text-4xl mb-2 block">
                                                                schedule
                                                            </span>
                                                            <p>Splash page coming soon</p>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                            <Route
                                                path="settings/general"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="General Settings"
                                                        pageDescription="General DAPS application settings"
                                                    >
                                                        <GeneralSettingsPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="settings/interface"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="User Interface Settings"
                                                        pageDescription="UI theme and appearance settings"
                                                    >
                                                        <UISettingsPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="settings/modules"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Module Settings"
                                                        pageDescription="Module-specific configuration settings"
                                                    >
                                                        <ModuleSettingsPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="settings/schedule"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Schedule Settings"
                                                        pageDescription="Module scheduling and automation configuration"
                                                    >
                                                        <SchedulePage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="settings/instances"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Instance Management"
                                                        pageDescription="Service instance configuration and connection testing"
                                                    >
                                                        <InstancesPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="settings/notifications"
                                                element={
                                                    <div className="p-4 md:p-6 max-w-4xl mx-auto">
                                                        <h1 className="text-xl md:text-2xl font-semibold mb-2 text-primary">
                                                            Notification Settings
                                                        </h1>
                                                        <p className="text-sm md:text-base text-secondary mb-6">
                                                            Configure notification providers and
                                                            alerts
                                                        </p>
                                                        <div className="text-center py-8 text-tertiary">
                                                            <span className="material-symbols-outlined text-4xl mb-2 block">
                                                                notifications
                                                            </span>
                                                            <p>
                                                                Notification configuration coming
                                                                soon
                                                            </p>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                            {/* Logs Route */}
                                            <Route
                                                path="logs"
                                                element={
                                                    <div className="grid gap-12 max-w-full">
                                                        <h1>System Logs</h1>
                                                        <p>
                                                            View system logs and debugging
                                                            information
                                                        </p>
                                                    </div>
                                                }
                                            />

                                            {/* Development Routes */}
                                            <Route
                                                path="dev/error"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Error Test"
                                                        pageDescription="Error handling demonstration page"
                                                    >
                                                        <ErrorTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/fields"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Field Test"
                                                        pageDescription="Field system development testing interface"
                                                    >
                                                        <FieldTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/api"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="API Test"
                                                        pageDescription="API Testing"
                                                    >
                                                        <ApiTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/toolbar"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Toolbar Test"
                                                        pageDescription="Toolbar overflow testing"
                                                    >
                                                        <ToolbarTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/toolbar-compound"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Toolbar Compound Pattern Test"
                                                        pageDescription="Toolbar compound component pattern testing"
                                                    >
                                                        <ToolbarCompoundTest />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/spinner"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Spinner Test"
                                                        pageDescription="Spinner component testing and development"
                                                    >
                                                        <SpinnerTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/settings"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Settings Mock"
                                                        pageDescription="Settings accordion interface mockup and design exploration"
                                                    >
                                                        <SettingsMockPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/array-object-field"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Array Object Field"
                                                        pageDescription="Unified ArrayObjectField component demonstration"
                                                    >
                                                        <ArrayObjectFieldPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/accordion"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Accordion Test"
                                                        pageDescription="AccordionItem compound component validation and testing"
                                                    >
                                                        <AccordionTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/stats-primitives"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Statistics Primitives Test"
                                                        pageDescription="Statistics System primitive composition and layout testing"
                                                    >
                                                        <StatsPrimitivesTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/button-primitives"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Button Primitives Test"
                                                        pageDescription="Button System primitive composition and component testing"
                                                    >
                                                        <ButtonPrimitivesTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                            <Route
                                                path="dev/card-primitives"
                                                element={
                                                    <PageErrorBoundary
                                                        pageName="Card Primitives Test"
                                                        pageDescription="Card System primitive composition and variant testing"
                                                    >
                                                        <CardPrimitivesTestPage />
                                                    </PageErrorBoundary>
                                                }
                                            />
                                        </Route>
                                        <Route
                                            path="*"
                                            element={<Navigate to="/dashboard" replace />}
                                        />
                                    </Routes>
                                </RouteErrorBoundary>
                            </SearchCoordinatorProvider>
                        </BrowserRouter>
                    </UIStateProvider>
                </GlobalErrorProvider>
            </ThemeProvider>
        </ToastProvider>
    );
};

export default App;
