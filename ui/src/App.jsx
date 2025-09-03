import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/AppLayout';
import NotFound from './pages/404Page';
import RouteErrorBoundary from './components/providers/RouteErrorProvider';

import { FIELD_RENDERERS } from './components/fields/FieldRegistry';
import { SETTINGS_SCHEMA } from './utils/constants/settings_schema';

import { ToastProvider } from './components/providers/ToastProvider';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { GlobalErrorProvider } from './components/providers/GlobalErrorProvider';
import { UnsavedChangesProvider } from './components/providers/UnsavedChangesProvider';
import { UIStateProvider } from './contexts/UIStateContext';

// Lazy load page components for performance optimization
const Splash = lazy(() => import('./pages/Splash'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Instances = lazy(() => import('./pages/Instances'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const LogViewer = lazy(() => import('./pages/Logs'));

const PosterManagement = lazy(() => import('./pages/PosterManage'));
const GdriveSearch = lazy(() => import('./pages/GdriveSearch'));
const AssetsSearch = lazy(() => import('./pages/AssetsSearch'));
const PosterStatistics = lazy(() => import('./pages/PosterStatistics'));

const MediaManagement = lazy(() => import('./pages/MediaManage'));
const MediaSearch = lazy(() => import('./pages/MediaSearch'));
const MediaStatistics = lazy(() => import('./pages/MediaStatistics'));

// Development pages
const PopoverTest = lazy(() => import('./pages/dev/PopoverTest'));
const ModalExamples = lazy(() => import('./components/modals/examples/ModalExamples'));
const ApiDataTest = lazy(() => import('./pages/dev/ApiDataTest'));

import LoadingSpinner from './components/common/LoadingSpinner';

/**
 * Loading fallback component for Suspense boundaries
 * @returns {JSX.Element} Loading indicator with spinner and text
 */
const SuspenseLoading = () => (
    <div className="loading-container">
        <LoadingSpinner size="large" />
        <p>Loading...</p>
    </div>
);

/**
 * Main application component that sets up routing and global providers
 * @returns {JSX.Element} Complete application with routing and error boundaries
 */
export default function App() {
    return (
        <ToastProvider>
            <ThemeProvider>
                <GlobalErrorProvider
                    fieldRenderers={FIELD_RENDERERS}
                    settingsSchema={SETTINGS_SCHEMA}
                >
                    <UIStateProvider>
                        <Router>
                            <Layout>
                                <Suspense fallback={<SuspenseLoading />}>
                                    <Routes>
                                        {/* Core Application Routes */}
                                        <Route
                                            path="/"
                                            element={
                                                <RouteErrorBoundary routeName="Dashboard">
                                                    <Splash />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/schedule"
                                            element={
                                                <RouteErrorBoundary routeName="Schedule Management">
                                                    <Schedule />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/instances"
                                            element={
                                                <RouteErrorBoundary routeName="Instance Monitor">
                                                    <Instances />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/notifications"
                                            element={
                                                <RouteErrorBoundary routeName="Notifications">
                                                    <Notifications />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/logs"
                                            element={
                                                <RouteErrorBoundary routeName="Log Viewer">
                                                    <LogViewer />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        {/* Poster Management Routes */}
                                        <Route
                                            path="/poster/search/gdrive"
                                            element={
                                                <RouteErrorBoundary routeName="Google Drive Search">
                                                    <GdriveSearch />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/poster/search/assets"
                                            element={
                                                <RouteErrorBoundary routeName="Assets Search">
                                                    <AssetsSearch />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/poster/manage"
                                            element={
                                                <RouteErrorBoundary routeName="Poster Management">
                                                    <PosterManagement />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/poster/statistics"
                                            element={
                                                <RouteErrorBoundary routeName="Poster Statistics">
                                                    <PosterStatistics />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        {/* Media Management Routes */}
                                        <Route
                                            path="/media/search"
                                            element={
                                                <RouteErrorBoundary routeName="Media Search">
                                                    <MediaSearch />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/media/manage"
                                            element={
                                                <RouteErrorBoundary routeName="Media Management">
                                                    <MediaManagement />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        <Route
                                            path="/media/statistics"
                                            element={
                                                <RouteErrorBoundary routeName="Media Statistics">
                                                    <MediaStatistics />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        {/* Settings Routes with nested error boundary */}
                                        <Route
                                            path="/settings/*"
                                            element={
                                                <RouteErrorBoundary routeName="Settings">
                                                    <UnsavedChangesProvider>
                                                        <Routes>
                                                            <Route path="" element={<Settings />} />
                                                            <Route
                                                                path=":moduleName"
                                                                element={<Settings />}
                                                            />
                                                        </Routes>
                                                    </UnsavedChangesProvider>
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        {/* Development Routes */}
                                        <Route
                                            path="/dev/popover"
                                            element={
                                                <RouteErrorBoundary routeName="Popover Test">
                                                    <PopoverTest />
                                                </RouteErrorBoundary>
                                            }
                                        />
                                        <Route
                                            path="/dev/modals"
                                            element={
                                                <RouteErrorBoundary routeName="Modal Examples">
                                                    <ModalExamples />
                                                </RouteErrorBoundary>
                                            }
                                        />
                                        <Route
                                            path="/dev/api-data"
                                            element={
                                                <RouteErrorBoundary routeName="API Data Hook Test">
                                                    <ApiDataTest />
                                                </RouteErrorBoundary>
                                            }
                                        />

                                        {/* 404 Route */}
                                        <Route
                                            path="*"
                                            element={
                                                <RouteErrorBoundary routeName="Page Not Found">
                                                    <NotFound />
                                                </RouteErrorBoundary>
                                            }
                                        />
                                    </Routes>
                                </Suspense>
                            </Layout>
                        </Router>
                    </UIStateProvider>
                </GlobalErrorProvider>
            </ThemeProvider>
        </ToastProvider>
    );
}
