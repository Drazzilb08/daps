import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './contexts/GlobalErrorContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { GlobalErrorProvider } from './contexts/GlobalErrorContext.jsx';
import { UIStateProvider } from './contexts/UIStateContext.jsx';
import { SearchCoordinatorProvider } from './contexts/SearchCoordinatorContext.jsx';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

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
 * Route Error Provider - Catches route-specific errors
 */
const RouteErrorProvider = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="error-boundary-fallback">
          <h2>Page Error</h2>
          <p>Something went wrong loading this page.</p>
          <details>
            <summary>Error Details</summary>
            <pre>{error?.message}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
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
                <RouteErrorProvider>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={<DashboardPage />} />
                      
                      {/* Media Section - Hierarchical Routes */}
                      <Route path="media" element={<Navigate to="/media/search" replace />} />
                      <Route path="media/search" element={<div className="content-layout"><h1>Media Search</h1><p>Search for media content to add to your library</p></div>} />
                      <Route path="media/library" element={<div className="content-layout"><h1>Media Library</h1><p>Browse your existing media collection</p></div>} />
                      <Route path="media/statistics" element={<div className="content-layout"><h1>Media Statistics</h1><p>View media library statistics and analytics</p></div>} />
                      
                      {/* Posters Section - Hierarchical Routes */}
                      <Route path="posters" element={<Navigate to="/posters/search" replace />} />
                      <Route path="posters/search" element={<div className="content-layout"><h1>Poster Search</h1><p>Search for posters and artwork</p></div>} />
                      <Route path="posters/manage" element={<div className="content-layout"><h1>Poster Management</h1><p>Manage your poster and artwork collection</p></div>} />
                      <Route path="posters/statistics" element={<div className="content-layout"><h1>Poster Statistics</h1><p>View poster collection statistics</p></div>} />
                      
                      {/* Single Level Routes */}
                      <Route path="activity" element={<div className="content-layout"><h1>Activity</h1><p>System activity monitoring and logs</p></div>} />
                      <Route path="settings" element={<div className="content-layout"><h1>Settings</h1><p>Configuration settings and preferences</p></div>} />
                      <Route path="logs" element={<div className="content-layout"><h1>Logs</h1><p>System logs and debugging information</p></div>} />
                      
                    </Route>
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </RouteErrorProvider>
              </SearchCoordinatorProvider>
            </BrowserRouter>
          </UIStateProvider>
        </GlobalErrorProvider>
      </ThemeProvider>
    </ToastProvider>
  );
};

export default App;