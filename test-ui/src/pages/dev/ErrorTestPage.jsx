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
    <div className="working-component">
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
    <div className="error-test-page">
      <div className="error-test-header">
        <h1 className="error-test-title">🔬 Error Handling Demonstrations</h1>
        <p className="error-test-description">Click the buttons below to see different error handling approaches:</p>
      </div>

      {/* Toast Notifications */}
      <section className="error-demo-section">
        <h2 className="error-demo-section__title">🍞 Toast Notifications</h2>
        <p className="error-demo-section__description"><strong>What it is:</strong> Small popup notifications that appear briefly</p>
        <p className="error-demo-section__description"><strong>When to use:</strong> Success confirmations, alerts, quick feedback</p>
        <div className="toast-buttons">
          <button onClick={() => showToast('success')} className="btn btn--success inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
            Success Toast
          </button>
          <button onClick={() => showToast('error')} className="btn btn--error inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
            Error Toast
          </button>
          <button onClick={() => showToast('warning')} className="btn btn--warning inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
            Warning Toast
          </button>
          <button onClick={() => showToast('info')} className="btn btn--info inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim">
            Info Toast
          </button>
        </div>
      </section>

      {/* Global Error Handling */}
      <section className="error-demo-section">
        <h2 className="error-demo-section__title">🌐 Global Error Handling</h2>
        <p className="error-demo-section__description"><strong>What it is:</strong> Centralized error handling for the entire app</p>
        <p className="error-demo-section__description"><strong>When to use:</strong> Network failures, authentication issues, server errors</p>
        <button onClick={showGlobalError} className="btn btn--primary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast">
          Trigger Global Error
        </button>
      </section>

      {/* Critical Feature Error (Full Screen Overlay) */}
      <section className="error-demo-section">
        <h2 className="error-demo-section__title">⚠️ Critical Feature Error</h2>
        <p className="error-demo-section__description"><strong>What it is:</strong> Full-screen overlay that blocks everything</p>
        <p className="error-demo-section__description"><strong>When to use:</strong> Essential features like navigation or authentication</p>
        <p className="error-demo-section__description"><strong>Visual behavior:</strong> Covers entire screen, forces user to resolve</p>
        
        <button 
          onClick={() => triggerCrash('critical')} 
          className="btn btn--danger inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
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
            className="btn btn--secondary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
          >
            Reset
          </button>
        )}
      </section>

      {/* Page Error (Full Page Replacement) */}
      <section className="error-demo-section">
        <h2 className="error-demo-section__title">📄 Page Error</h2>
        <p className="error-demo-section__description"><strong>What it is:</strong> Replaces entire page content with error page</p>
        <p className="error-demo-section__description"><strong>When to use:</strong> When entire pages/routes fail to load</p>
        <p className="error-demo-section__description"><strong>Visual behavior:</strong> Shows error page with navigation options</p>
        
        <button 
          onClick={() => triggerCrash('page')} 
          className="btn btn--danger inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
        >
          Trigger Page Error
        </button>
        
        <PageErrorBoundary pageName="Demo Page" pageDescription="Page error demonstration">
          <CrashComponent shouldCrash={crashes.page} type="Page content" />
        </PageErrorBoundary>
        
        {crashes.page && (
          <button 
            onClick={() => resetCrash('page')} 
            className="btn btn--secondary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
          >
            Reset
          </button>
        )}
      </section>

      {/* Feature Error (Inline Replacement) */}
      <section className="error-demo-section">
        <h2 className="error-demo-section__title">🛡️ Feature Error</h2>
        <p className="error-demo-section__description"><strong>What it is:</strong> Replaces just the broken component inline</p>
        <p className="error-demo-section__description"><strong>When to use:</strong> Individual features that might fail independently</p>
        <p className="error-demo-section__description"><strong>Visual behavior:</strong> Shows error UI in place of component, allows retry/skip</p>
        
        <button 
          onClick={() => triggerCrash('feature')} 
          className="btn btn--danger inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
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
            className="btn btn--secondary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
          >
            Reset
          </button>
        )}
      </section>
    </div>
  );
};

export default ErrorTestPage;