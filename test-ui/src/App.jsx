import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { GlobalErrorProvider } from './contexts/GlobalErrorContext.jsx';
import { UIStateProvider } from './contexts/UIStateContext.jsx';
import { SearchCoordinatorProvider } from './contexts/SearchCoordinatorContext.jsx';
import { PageErrorBoundary } from './components/error';
import Layout from './components/Layout.jsx';
import Splash from './pages/Splash.jsx';
import ErrorTestPage from './pages/dev/ErrorTestPage.jsx';
import SettingsTestPage from './pages/dev/SettingsTestPage.jsx';
import FormTestPage from './pages/dev/FormTestPage.jsx';
import ApiTestPage from './pages/dev/ApiTestPage.jsx';

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
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={
                        <PageErrorBoundary pageName="Dashboard" pageDescription="Main dashboard overview">
                          <Splash />
                        </PageErrorBoundary>
                      } />
                      
                      {/* Media Section - Hierarchical Routes */}
                      <Route path="media" element={<Navigate to="/media/search" replace />} />
                      <Route path="media/search" element={<div className="content-layout"><h1>Media Search</h1><p>Search and discover content in your media collection</p></div>} />
                      <Route path="media/manage" element={<div className="content-layout"><h1>Media Management</h1><p>Manage and organize your media library</p></div>} />
                      <Route path="media/statistics" element={<div className="content-layout"><h1>Media Statistics</h1><p>View media library statistics and analytics</p></div>} />
                      
                      {/* Poster Section - Hierarchical Routes (note: /poster not /posters) */}
                      <Route path="poster" element={<Navigate to="/poster/search/gdrive" replace />} />
                      <Route path="poster/search/gdrive" element={<div className="content-layout"><h1>GDrive Poster Search</h1><p>Search for posters in Google Drive</p></div>} />
                      <Route path="poster/search/assets" element={<div className="content-layout"><h1>Assets Poster Search</h1><p>Search for posters in local assets</p></div>} />
                      <Route path="poster/manage" element={<div className="content-layout"><h1>Poster Management</h1><p>Manage your poster and artwork collection</p></div>} />
                      <Route path="poster/statistics" element={<div className="content-layout"><h1>Poster Statistics</h1><p>View poster collection statistics</p></div>} />
                      
                      {/* Settings Section - Hierarchical Routes */}
                      <Route path="settings" element={<div className="content-layout"><h1>Settings</h1><p>Configuration and system settings</p></div>} />
                      <Route path="settings/schedule" element={<div className="content-layout"><h1>Schedule Settings</h1><p>Configure job scheduling and automation</p></div>} />
                      <Route path="settings/instances" element={<div className="content-layout"><h1>Instance Settings</h1><p>Configure service instances and connections</p></div>} />
                      <Route path="settings/notifications" element={<div className="content-layout"><h1>Notification Settings</h1><p>Configure notification providers and alerts</p></div>} />
                      
                      {/* Logs Route */}
                      <Route path="logs" element={<div className="content-layout"><h1>System Logs</h1><p>View system logs and debugging information</p></div>} />
                      
                      {/* Development Routes */}
                      <Route path="dev/error-test" element={
                        <PageErrorBoundary pageName="Error Test" pageDescription="Error handling demonstration page">
                          <ErrorTestPage />
                        </PageErrorBoundary>
                      } />
                      <Route path="dev/settings" element={
                        <PageErrorBoundary pageName="DAPS Settings" pageDescription="Real DAPS configuration settings page">
                          <SettingsTestPage />
                        </PageErrorBoundary>
                      } />
                      <Route path="dev/forms" element={
                        <PageErrorBoundary pageName="Form Test" pageDescription="Form system demonstration and testing page">
                          <FormTestPage />
                        </PageErrorBoundary>
                      } />
                      <Route path="dev/api-test" element={
                        <PageErrorBoundary pageName="API Test" pageDescription="API Testing">
                          <ApiTestPage />
                        </PageErrorBoundary>
                      } />
                    </Route>
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
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