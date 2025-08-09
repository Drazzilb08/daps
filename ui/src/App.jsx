import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import NotFound from './components/providers/NotFound';

import { FIELD_RENDERERS } from './components/fields/FieldRegistry';
import { SETTINGS_SCHEMA } from './utils/constants/settings_schema';

import { ToastProvider } from './components/providers/ToastProvider';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { GlobalErrorProvider } from './components/providers/GlobalErrorProvider';
import { UnsavedChangesProvider } from './components/providers/UnsavedChangesProvider';

// Lazy load page components
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

// Loading component for Suspense fallback
const LoadingSpinner = () => (
    <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
    </div>
);

export default function App() {
    return (
        <ToastProvider>
            <ThemeProvider>
                <GlobalErrorProvider
                    fieldRenderers={FIELD_RENDERERS}
                    settingsSchema={SETTINGS_SCHEMA}
                >
                    <Router>
                        <Layout>
                            <Suspense fallback={<LoadingSpinner />}>
                                <Routes>
                                    <Route path="/" element={<Splash />} />
                                    <Route path="/schedule" element={<Schedule />} />
                                    <Route path="/instances" element={<Instances />} />
                                    <Route path="/notifications" element={<Notifications />} />
                                    <Route path="/poster/search/gdrive" element={<GdriveSearch />} />
                                    <Route path="/poster/search/assets" element={<AssetsSearch />} />
                                    <Route path="/poster/manage" element={<PosterManagement />} />
                                    <Route path="/poster/statistics" element={<PosterStatistics />} />
                                    <Route path="/media/search" element={<MediaSearch />} />
                                    <Route path="/media/manage" element={<MediaManagement />} />
                                    <Route path="/media/statistics" element={<MediaStatistics />} />
                                    <Route
                                        path="/settings/*"
                                        element={
                                            <UnsavedChangesProvider>
                                                <Routes>
                                                    <Route path="" element={<Settings />} />
                                                    <Route path=":moduleName" element={<Settings />} />
                                                </Routes>
                                            </UnsavedChangesProvider>
                                        }
                                    />
                                    <Route path="/logs" element={<LogViewer />} />
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </Suspense>
                        </Layout>
                    </Router>
                </GlobalErrorProvider>
            </ThemeProvider>
        </ToastProvider>
    );
}