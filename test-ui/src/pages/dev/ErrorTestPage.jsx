import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useGlobalError, ERROR_TYPES, ERROR_SEVERITY } from '../../contexts/GlobalErrorContext.jsx';
import { PageErrorBoundary, FeatureErrorBoundary } from '../../components/error';

// Simple component that crashes when told to
const CrashComponent = ({ shouldCrash, type = "demonstration" }) => {
  if (shouldCrash) {
    throw new Error(`${type} error for testing`);
  }
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
      <p>✅ Component working normally</p>
    </div>
  );
};

const ErrorTestPage = () => {
  const toast = useToast();
  const globalError = useGlobalError();
  const [crashes, setCrashes] = useState({
    critical: false,
    page: false,
    feature: false
  });

  const triggerCrash = (type) => {
    setCrashes(prev => ({ ...prev, [type]: true }));
  };

  const resetCrash = (type) => {
    setCrashes(prev => ({ ...prev, [type]: false }));
  };

  const showToast = (type) => {
    const messages = {
      success: 'Operation completed successfully!',
      error: 'Something went wrong!',
      warning: 'Please review your settings',
      info: 'New features available'
    };
    toast[type](messages[type]);
  };

  const showGlobalError = () => {
    globalError.setError('Network connection failed. Please try again.', {
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.HIGH
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔬 Error Handling Demonstrations</h1>
      <p>Click the buttons below to see different error handling approaches:</p>

      {/* Toast Notifications */}
      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>🍞 Toast Notifications</h2>
        <p><strong>What it is:</strong> Small popup notifications that appear briefly</p>
        <p><strong>When to use:</strong> Success confirmations, alerts, quick feedback</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => showToast('success')} style={{ padding: '8px 16px', background: 'green', color: 'white', border: 'none', borderRadius: '4px' }}>
            Success Toast
          </button>
          <button onClick={() => showToast('error')} style={{ padding: '8px 16px', background: 'red', color: 'white', border: 'none', borderRadius: '4px' }}>
            Error Toast
          </button>
          <button onClick={() => showToast('warning')} style={{ padding: '8px 16px', background: 'orange', color: 'white', border: 'none', borderRadius: '4px' }}>
            Warning Toast
          </button>
          <button onClick={() => showToast('info')} style={{ padding: '8px 16px', background: 'blue', color: 'white', border: 'none', borderRadius: '4px' }}>
            Info Toast
          </button>
        </div>
      </section>

      {/* Global Error Handling */}
      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>🌐 Global Error Handling</h2>
        <p><strong>What it is:</strong> Centralized error handling for the entire app</p>
        <p><strong>When to use:</strong> Network failures, authentication issues, server errors</p>
        <button onClick={showGlobalError} style={{ padding: '8px 16px', background: 'purple', color: 'white', border: 'none', borderRadius: '4px' }}>
          Trigger Global Error
        </button>
      </section>

      {/* Critical Feature Error (Full Screen Overlay) */}
      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>⚠️ Critical Feature Error</h2>
        <p><strong>What it is:</strong> Full-screen overlay that blocks everything</p>
        <p><strong>When to use:</strong> Essential features like navigation or authentication</p>
        <p><strong>Visual behavior:</strong> Covers entire screen, forces user to resolve</p>
        
        <button 
          onClick={() => triggerCrash('critical')} 
          style={{ padding: '8px 16px', background: 'darkred', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '10px' }}
        >
          Trigger Critical Error
        </button>
        
        <FeatureErrorBoundary
          featureName="Critical Navigation"
          featureDescription="Essential navigation system"
          critical={true}
        >
          <CrashComponent shouldCrash={crashes.critical} type="Critical navigation" />
        </FeatureErrorBoundary>
        
        {crashes.critical && (
          <button 
            onClick={() => resetCrash('critical')} 
            style={{ padding: '6px 12px', background: 'gray', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px' }}
          >
            Reset
          </button>
        )}
      </section>

      {/* Page Error (Full Page Replacement) */}
      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>📄 Page Error</h2>
        <p><strong>What it is:</strong> Replaces entire page content with error page</p>
        <p><strong>When to use:</strong> When entire pages/routes fail to load</p>
        <p><strong>Visual behavior:</strong> Shows error page with navigation options</p>
        
        <button 
          onClick={() => triggerCrash('page')} 
          style={{ padding: '8px 16px', background: 'darkorange', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '10px' }}
        >
          Trigger Page Error
        </button>
        
        <PageErrorBoundary pageName="Demo Page" pageDescription="Page error demonstration">
          <CrashComponent shouldCrash={crashes.page} type="Page content" />
        </PageErrorBoundary>
        
        {crashes.page && (
          <button 
            onClick={() => resetCrash('page')} 
            style={{ padding: '6px 12px', background: 'gray', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px' }}
          >
            Reset
          </button>
        )}
      </section>

      {/* Feature Error (Inline Replacement) */}
      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>🛡️ Feature Error</h2>
        <p><strong>What it is:</strong> Replaces just the broken component inline</p>
        <p><strong>When to use:</strong> Individual features that might fail independently</p>
        <p><strong>Visual behavior:</strong> Shows error UI in place of component, allows retry/skip</p>
        
        <button 
          onClick={() => triggerCrash('feature')} 
          style={{ padding: '8px 16px', background: 'darkblue', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '10px' }}
        >
          Trigger Feature Error
        </button>
        
        <FeatureErrorBoundary
          featureName="Search Component"
          featureDescription="Media search functionality"
        >
          <CrashComponent shouldCrash={crashes.feature} type="Search feature" />
        </FeatureErrorBoundary>
        
        {crashes.feature && (
          <button 
            onClick={() => resetCrash('feature')} 
            style={{ padding: '6px 12px', background: 'gray', color: 'white', border: 'none', borderRadius: '4px', marginTop: '10px' }}
          >
            Reset
          </button>
        )}
      </section>
    </div>
  );
};

export default ErrorTestPage;