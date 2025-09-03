import React, { useState } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import PageErrorBoundary from '../PageErrorBoundary';
import FeatureErrorBoundary from '../FeatureErrorBoundary';

/**
 * Test component that throws errors on demand
 */
const ErrorThrowingComponent = ({ shouldThrow, errorType = 'generic' }) => {
  if (shouldThrow) {
    const error = new Error(`Test ${errorType} error - this is intentional for testing`);
    error.name = `${errorType}Error`;
    throw error;
  }
  return <div>Component is working fine!</div>;
};

/**
 * Test suite for Error Boundary components
 * This component demonstrates all three error boundaries and allows testing their functionality
 */
const ErrorBoundaryTest = () => {
  const [genericError, setGenericError] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [featureError, setFeatureError] = useState(false);

  const handleError = (error, errorInfo) => {
    console.log('Error caught by boundary:', error, errorInfo);
  };

  return (
    <div className="error-boundary-test" style={{ padding: '2rem', fontFamily: 'var(--font-family)' }}>
      <h1>Error Boundary Test Suite</h1>
      <p>Click the buttons below to test each error boundary type:</p>

      <div style={{ marginBottom: '3rem' }}>
        <h2>1. Generic Error Boundary</h2>
        <button 
          onClick={() => setGenericError(!genericError)}
          style={{ marginBottom: '1rem' }}
        >
          {genericError ? 'Fix Component' : 'Trigger Generic Error'}
        </button>
        
        <ErrorBoundary 
          context="Test Component"
          onError={handleError}
        >
          <ErrorThrowingComponent 
            shouldThrow={genericError} 
            errorType="Generic"
          />
        </ErrorBoundary>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2>2. Page Error Boundary</h2>
        <button 
          onClick={() => setPageError(!pageError)}
          style={{ marginBottom: '1rem' }}
        >
          {pageError ? 'Fix Page' : 'Trigger Page Error'}
        </button>
        
        <PageErrorBoundary 
          pageName="Test Page"
          pageDescription="Test page for demonstrating page-level error recovery"
          onError={handleError}
        >
          <ErrorThrowingComponent 
            shouldThrow={pageError} 
            errorType="Page"
          />
        </PageErrorBoundary>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2>3. Feature Error Boundary (Non-Critical)</h2>
        <button 
          onClick={() => setFeatureError(!featureError)}
          style={{ marginBottom: '1rem' }}
        >
          {featureError ? 'Fix Feature' : 'Trigger Feature Error'}
        </button>
        
        <FeatureErrorBoundary 
          featureName="Test Feature"
          featureDescription="Test feature for demonstrating feature-level error recovery"
          critical={false}
          allowDegradation={true}
          onError={handleError}
          onFeatureDisabled={(name) => console.log(`Feature disabled: ${name}`)}
          degradedMode={() => (
            <div style={{ 
              padding: '1rem', 
              background: 'var(--warning)', 
              color: 'var(--bg)', 
              borderRadius: '4px' 
            }}>
              🔧 Running in degraded mode - limited functionality
            </div>
          )}
        >
          <ErrorThrowingComponent 
            shouldThrow={featureError} 
            errorType="Feature"
          />
        </FeatureErrorBoundary>
      </div>

      <div style={{ marginTop: '3rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '4px' }}>
        <h3>Test Instructions:</h3>
        <ul>
          <li><strong>Generic Error Boundary:</strong> Shows retry and reload options</li>
          <li><strong>Page Error Boundary:</strong> Shows navigation and retry options</li>
          <li><strong>Feature Error Boundary:</strong> Shows retry, degraded mode, and disable options</li>
        </ul>
        <p><strong>Note:</strong> All errors are caught and reported to the GlobalErrorProvider system.</p>
      </div>
    </div>
  );
};

export default ErrorBoundaryTest;