import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { GlobalErrorProvider } from './contexts/GlobalErrorContext.jsx';
import { UIStateProvider } from './contexts/UIStateContext.jsx';
import { SearchCoordinatorProvider } from './contexts/SearchCoordinatorContext.jsx';
import { PageErrorBoundary } from './components/error';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ErrorTestPage from './pages/dev/ErrorTestPage.jsx';

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
                          <DashboardPage />
                        </PageErrorBoundary>
                      } />
                      
                      {/* Media Section - Hierarchical Routes */}
                      <Route path="media" element={<Navigate to="/media/search" replace />} />
                      <Route path="media/search" element={<div className="content-layout"><h1>Media Search</h1><p>Search through your media collection</p></div>} />
                      <Route path="media/library" element={<div className="content-layout"><h1>Media Library</h1><p>Browse your existing media collection</p></div>} />
                      <Route path="media/statistics" element={<div className="content-layout"><h1>Media Statistics</h1><p>View media library statistics and analytics</p></div>} />
                      
                      {/* Posters Section - Hierarchical Routes */}
                      <Route path="posters" element={<Navigate to="/posters/search/gdrive" replace />} />
                      <Route path="posters/search/gdrive" element={<div className="content-layout"><h1>Poster Search</h1><p>Search for posters and artwork</p></div>} />
                      <Route path="posters/search/assets" element={<div className="content-layout"><h1>Poster Search</h1><p>Search for gdrive and artwork</p></div>} />
                      <Route path="posters/manage" element={<div className="content-layout"><h1>Poster Management</h1><p>Manage your poster and artwork collection</p></div>} />
                      <Route path="posters/statistics" element={<div className="content-layout"><h1>Poster Statistics</h1><p>View poster collection statistics</p></div>} />
                      
                      {/* Single Level Routes */}
                      <Route path="activity" element={<div className="content-layout"><h1>Activity</h1><p>System activity monitoring and logs</p></div>} />
                      <Route path="settings" element={<div className="content-layout"><h1>Settings</h1><p>Configuration settings and preferences</p></div>} />
                      <Route path="logs" element={<div className="content-layout"><h1>Logs</h1><p>System logs and debugging information</p></div>} />
                      
                      {/* Development Routes */}
                      <Route path="dev/error-test" element={
                        <PageErrorBoundary pageName="Error Test" pageDescription="Error handling demonstration page">
                          <ErrorTestPage />
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