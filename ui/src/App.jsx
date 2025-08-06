import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './pages/Splash';
import Schedule from './pages/Schedule';
import Instances from './pages/Instances';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import LogViewer from './pages/Logs';

import PosterManagement from './pages/PosterManage';
import GdriveSearch from './pages/GdriveSearch';
import AssetsSearch from './pages/AssetsSearch';
import PosterStatistics from './pages/PosterStatistics';

import MediaManagement from './pages/MediaManage';
import MediaSearch from './pages/MediaSearch';
import MediaStatistics from './pages/MediaStatistics';

import NotFound from './components/providers/NotFound';

import { FIELD_RENDERERS } from './components/fields/FieldRegistry';
import { SETTINGS_SCHEMA } from './utils/constants/settings_schema';

import { ToastProvider } from './components/providers/ToastProvider';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { GlobalErrorProvider } from './components/providers/GlobalErrorProvider';
import { UnsavedChangesProvider } from './components/providers/UnsavedChangesProvider';

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
                        </Layout>
                    </Router>
                </GlobalErrorProvider>
            </ThemeProvider>
        </ToastProvider>
    );
}
