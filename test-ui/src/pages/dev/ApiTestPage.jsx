/**
 * API Test Page - Real DAPS Backend Integration Testing
 * 
 * Tests actual DAPS API endpoints with real backend integration:
 * - /api/version - Get application version
 * - /api/config - Configuration management
 * - /api/jobs/stats - Job statistics
 * - /api/instances - Service instances
 * - Error handling and toast integration
 */

import React, { useState, useCallback } from 'react';
import { useApiData } from '../../hooks/useApiData.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { api } from '../../utils/api/index.js';

/**
 * Test section component for organized testing
 */
const TestSection = React.memo(({ title, description, children }) => (
  <section className="api-test-section">
    <h2 className="test-section-title">{title}</h2>
    <p className="test-section-description">{description}</p>
    <div className="test-section-content">
      {children}
    </div>
  </section>
));

TestSection.displayName = 'TestSection';

/**
 * API response display component
 */
const ApiResponseDisplay = React.memo(({ data, isLoading, error, title }) => (
  <div className="api-response-display">
    <h4 className="response-title">{title}</h4>
    {isLoading && (
      <div className="loading-state">
        <div className="spinner" aria-label="Loading..." />
        <span>Loading...</span>
      </div>
    )}
    {error && (
      <div className="error-state" role="alert">
        <strong>Error:</strong> {error.message}
      </div>
    )}
    {data && !isLoading && (
      <pre className="response-data">
        {JSON.stringify(data, null, 2)}
      </pre>
    )}
  </div>
));

ApiResponseDisplay.displayName = 'ApiResponseDisplay';

/**
 * Version test component - Tests systemAPI.getVersion()
 */
const VersionTestComponent = React.memo(() => {
  const apiFunction = useCallback(() => {
    return api.system.getVersion();
  }, []);

  const { data, isLoading, error, execute } = useApiData({
    apiFunction,
    options: { 
      immediate: false,
      showSuccessToast: true,
      successMessage: 'Version retrieved successfully!'
    }
  });

  return (
    <div className="version-test">
      <div className="test-controls">
        <button 
          onClick={execute} 
          disabled={isLoading}
          className="btn btn--primary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
        >
          {isLoading ? 'Loading...' : 'Get Version'}
        </button>
      </div>
      <ApiResponseDisplay 
        data={data} 
        isLoading={isLoading} 
        error={error} 
        title="Version Response (with caching)"
      />
      <div className="test-info">
        <p><strong>API Layer:</strong> systemAPI.getVersion()</p>
        <p><strong>Caching:</strong> 1 hour TTL</p>
        <p><strong>Endpoint:</strong> GET /api/version</p>
      </div>
    </div>
  );
});

VersionTestComponent.displayName = 'VersionTestComponent';

/**
 * Config test component - Tests /api/config endpoint
 */
const ConfigTestComponent = React.memo(() => {
  const [section, setSection] = useState('');
  
  const configApiFunction = useCallback(() => {
    if (section) {
      return api.config.fetchSection(section);
    } else {
      return api.config.fetchConfig();
    }
  }, [section]);
  
  const { data, isLoading, error, execute } = useApiData({
    apiFunction: configApiFunction,
    options: { 
      immediate: false,
      showSuccessToast: true,
      successMessage: 'Configuration retrieved!'
    }
  });

  return (
    <div className="config-test">
      <div className="test-controls">
        <select 
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="domain-select"
        >
          <option value="">All Configuration</option>
          <option value="instances">Instances</option>
          <option value="modules">Modules</option>
          <option value="notifications">Notifications</option>
        </select>
        <button 
          onClick={execute} 
          disabled={isLoading}
          className="btn btn--primary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
        >
          {isLoading ? 'Loading...' : 'Get Config'}
        </button>
      </div>
      <ApiResponseDisplay 
        data={data} 
        isLoading={isLoading} 
        error={error} 
        title="Configuration Response (with caching)"
      />
      <div className="test-info">
        <p><strong>API Layer:</strong> configAPI.fetchConfig() / fetchSection()</p>
        <p><strong>Caching:</strong> 10 minutes TTL</p>
        <p><strong>Endpoint:</strong> GET /api/config{section ? `?section=${section}` : ''}</p>
      </div>
    </div>
  );
});

ConfigTestComponent.displayName = 'ConfigTestComponent';

/**
 * Job stats test component - Tests jobsAPI.getStats()
 */
const JobStatsTestComponent = React.memo(() => {
  const apiFunction = useCallback(() => {
    return api.jobs.getStats();
  }, []);

  const { data, isLoading, error, execute } = useApiData({
    apiFunction,
    options: { 
      immediate: false,
      showSuccessToast: true,
      successMessage: 'Job statistics retrieved!'
    }
  });

  return (
    <div className="job-stats-test">
      <div className="test-controls">
        <button 
          onClick={execute} 
          disabled={isLoading}
          className="btn btn--primary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
        >
          {isLoading ? 'Loading...' : 'Get Job Stats'}
        </button>
      </div>
      <ApiResponseDisplay 
        data={data} 
        isLoading={isLoading} 
        error={error} 
        title="Job Statistics Response (with caching)"
      />
      <div className="test-info">
        <p><strong>API Layer:</strong> jobsAPI.getStats()</p>
        <p><strong>Caching:</strong> 30 seconds TTL</p>
        <p><strong>Endpoint:</strong> GET /api/jobs/stats</p>
      </div>
    </div>
  );
});

JobStatsTestComponent.displayName = 'JobStatsTestComponent';

/**
 * Error test component - Tests error handling
 */
const ErrorTestComponent = React.memo(() => {
  const [errorType, setErrorType] = useState('404');
  const toast = useToast();

  const errorApiFunction = useCallback(() => {
    switch (errorType) {
      case '404':
        // This will trigger a 404 error through the API layer
        return api.core.get('/nonexistent-endpoint');
      case '400':
        // This should trigger a 400 error through config API
        return api.config.fetchSection('invalid-section');
      case '500':
        // This will trigger a 500 error by calling an endpoint that causes server errors
        return api.core.get('/api/trigger-server-error');
      default:
        return api.system.getVersion();
    }
  }, [errorType]);

  const { data, isLoading, error, execute } = useApiData({
    apiFunction: errorApiFunction,
    options: { 
      immediate: false,
      showErrorToast: true,
      errorMessage: 'API call failed!'
    }
  });

  return (
    <div className="error-test">
      <div className="test-controls">
        <select 
          value={errorType}
          onChange={(e) => setErrorType(e.target.value)}
          className="error-type-select"
        >
          <option value="404">404 - Not Found</option>
          <option value="400">400 - Bad Request</option>
          <option value="500">500 - Server Error</option>
        </select>
        <button 
          onClick={execute} 
          disabled={isLoading}
          className="btn btn--danger inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
        >
          {isLoading ? 'Testing...' : 'Test Error'}
        </button>
      </div>
      <ApiResponseDisplay 
        data={data} 
        isLoading={isLoading} 
        error={error} 
        title="Error Response (through API layer)"
      />
      <div className="test-info">
        <p><strong>API Layer:</strong> {
          errorType === '404' ? 'apiCore.get()' :
          errorType === '400' ? 'configAPI.fetchSection()' :
          errorType === '500' ? 'systemAPI.test()' : 
          'systemAPI.getVersion()'
        }</p>
        <p><strong>Error Type:</strong> {errorType}</p>
        <p><strong>Purpose:</strong> Test error handling through abstraction layer</p>
      </div>
    </div>
  );
});

ErrorTestComponent.displayName = 'ErrorTestComponent';

/**
 * Toast test component - Tests all toast types
 */
const ToastTestComponent = React.memo(() => {
  const toast = useToast();

  const testToasts = useCallback(() => {
    toast.success('Success! Everything is working perfectly.');
    setTimeout(() => toast.error('Error! Something went wrong.'), 500);
    setTimeout(() => toast.warning('Warning! Please check your settings.'), 1000);
    setTimeout(() => toast.info('Info: Here is some useful information.'), 1500);
  }, [toast]);

  return (
    <div className="toast-test">
      <div className="test-controls">
        <button onClick={testToasts} className="btn btn--info inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
          Test All Toasts
        </button>
        <button onClick={() => toast.success('Success toast!')} className="btn btn--primary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast">
          Success
        </button>
        <button onClick={() => toast.error('Error toast!')} className="btn btn--danger inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
          Error
        </button>
        <button onClick={() => toast.warning('Warning toast!')} className="btn btn--warning inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
          Warning
        </button>
        <button onClick={() => toast.info('Info toast!')} className="btn btn--secondary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
          Info
        </button>
      </div>
    </div>
  );
});

ToastTestComponent.displayName = 'ToastTestComponent';

/**
 * Main API Test Page component
 */
const ApiTestPage = () => {
  return (
    <div className="api-test-page">
      <div className="api-test-header">
        <h1 className="api-test-title">API Integration Testing</h1>
        <p className="api-test-description">
          Real DAPS backend API testing with actual endpoints, error handling, 
          and toast notifications. This tests the live integration with localhost:8000.
        </p>
      </div>

      <div className="test-sections">
        <TestSection 
          title="Toast Notifications" 
          description="Test all toast notification types and integration with ToastProvider"
        >
          <ToastTestComponent />
        </TestSection>

        <TestSection 
          title="System API - Version" 
          description="Test systemAPI.getVersion() with 1-hour caching"
        >
          <VersionTestComponent />
        </TestSection>

        <TestSection 
          title="Config API - Configuration" 
          description="Test configAPI.fetchConfig() and fetchSection() with 10-minute caching"
        >
          <ConfigTestComponent />
        </TestSection>

        <TestSection 
          title="Jobs API - Statistics" 
          description="Test jobsAPI.getStats() with 30-second caching"
        >
          <JobStatsTestComponent />
        </TestSection>

        <TestSection 
          title="API Error Handling" 
          description="Test error handling through the API abstraction layer"
        >
          <ErrorTestComponent />
        </TestSection>
      </div>
    </div>
  );
};

ApiTestPage.displayName = 'ApiTestPage';

export default ApiTestPage;