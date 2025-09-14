/**
 * DAPS Field Test Page - Clean Development Testing Interface
 * 
 * Focused interface for field development and testing:
 * - Field status overview (working vs placeholder)
 * - Individual field testing with various states
 * - Approval workflow for field implementations
 * - Clean, minimal interface for actual development work
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { FieldRegistry } from '../../components/fields/FieldRegistry.jsx';
import { FormRenderer } from '../../utils/forms/FormRenderer.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

/**
 * Field Status Overview Component
 * Simple display of implemented vs placeholder field types
 */
const FieldStatusOverview = React.memo(() => {
  const workingTypes = FieldRegistry.getWorkingFieldTypes();
  const placeholderTypes = FieldRegistry.getPlaceholderFieldTypes();
  const totalTypes = FieldRegistry.getFieldTypes().length;
  
  const workingCount = workingTypes.length;
  const placeholderCount = placeholderTypes.length;
  const completionPercentage = Math.round((workingCount / totalTypes) * 100);
  
  return (
    <div className="field-status-overview">
      <h2 className="field-status-overview__title">Field Implementation Status</h2>
      
      <div className="grid grid-cols-auto gap-3 mb-4">
        <div className="status-metric status-metric--working">
          <div className="metric-number">{workingCount}</div>
          <div className="metric-label">Working Fields</div>
        </div>
        <div className="status-metric status-metric--placeholder">
          <div className="metric-number">{placeholderCount}</div>
          <div className="metric-label">Placeholder Fields</div>
        </div>
        <div className="status-metric status-metric--progress">
          <div className="metric-number">{completionPercentage}%</div>
          <div className="metric-label">Completion Rate</div>
        </div>
      </div>
      
      <div className="field-type-lists">
        <div className="field-type-group">
          <h3 className="group-title">✅ Working Fields</h3>
          <div className="field-type-badges">
            {workingTypes.map(type => (
              <span key={type} className="field-badge field-badge--working">
                {type}
              </span>
            ))}
          </div>
        </div>
        
        <div className="field-type-group">
          <h3 className="group-title">❌ Placeholder Fields</h3>
          <div className="field-type-badges">
            {placeholderTypes.slice(0, 12).map(type => (
              <span key={type} className="field-badge field-badge--placeholder">
                {type}
              </span>
            ))}
            {placeholderCount > 12 && (
              <span className="field-badge field-badge--more">
                +{placeholderCount - 12} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

FieldStatusOverview.displayName = 'FieldStatusOverview';

/**
 * Individual Field Tester Component
 * Test a single field type with different configurations and states
 */
const FieldTester = React.memo(({ fieldType, onApprove, onDisapprove, isApproved }) => {
  const [testConfig, setTestConfig] = useState(() => {
    const baseConfig = {
      label: `Test ${fieldType} Field`,
      required: false,
      disabled: false,
      placeholder: `Enter ${fieldType} value...`,
      description: `Testing ${fieldType} field implementation`
    };
    
    // Add sample options for dropdown fields
    if (fieldType === 'dropdown') {
      baseConfig.options = [
        { value: 'option1', label: 'First Option' },
        { value: 'option2', label: 'Second Option' },
        { value: 'option3', label: 'Third Option' },
        { value: 'group1', label: 'Group Item 1' },
        { value: 'group2', label: 'Group Item 2' },
        'Simple String Option',
        'Another String Option'
      ];
      baseConfig.placeholder = 'Select an option from the dropdown...';
      baseConfig.description = 'Testing dropdown field with sample options (mix of objects and strings)';
    }
    
    return baseConfig;
  });
  
  const [testValue, setTestValue] = useState('');
  const [showError, setShowError] = useState(false);
  const toast = useToast();
  
  // Update test configuration when field type changes
  useEffect(() => {
    const baseConfig = {
      label: `Test ${fieldType} Field`,
      required: false,
      disabled: false,
      placeholder: `Enter ${fieldType} value...`,
      description: `Testing ${fieldType} field implementation`
    };
    
    // Add sample options for dropdown fields
    if (fieldType === 'dropdown') {
      baseConfig.options = [
        { value: 'option1', label: 'First Option' },
        { value: 'option2', label: 'Second Option' },
        { value: 'option3', label: 'Third Option' },
        { value: 'group1', label: 'Group Item 1' },
        { value: 'group2', label: 'Group Item 2' },
        'Simple String Option',
        'Another String Option'
      ];
      baseConfig.placeholder = 'Select an option from the dropdown...';
      baseConfig.description = 'Testing dropdown field with sample options (mix of objects and strings)';
    }
    
    setTestConfig(baseConfig);
  }, [fieldType]);
  
  // Create test field configuration
  const testField = useMemo(() => ({
    key: `test_${fieldType}`,
    type: fieldType,
    ...testConfig
  }), [fieldType, testConfig]);
  
  // Test form schema with error injection for testing
  const testSchema = useMemo(() => ({
    label: `${fieldType} Field Test`,
    fields: [testField]
  }), [testField]);
  
  // Test form values with error state simulation
  const testFormValues = useMemo(() => ({ 
    [`test_${fieldType}`]: testValue 
  }), [fieldType, testValue]);
  
  // Error state simulation - inject error if showError is true
  const testErrors = useMemo(() => {
    if (showError) {
      return { [`test_${fieldType}`]: "Test error message - this is how errors appear" };
    }
    return {};
  }, [showError, fieldType]);
  
  const handleConfigChange = useCallback((key, value) => {
    setTestConfig(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleTestSubmit = useCallback((values) => {
    console.log(`[${fieldType}] Test submit:`, values);
    toast.success(`${fieldType} field test submitted successfully!`);
  }, [fieldType, toast]);
  
  const handleApprove = useCallback(() => {
    onApprove(fieldType);
    toast.success(`${fieldType} field approved for production!`);
  }, [fieldType, onApprove, toast]);
  
  const handleDisapprove = useCallback(() => {
    onDisapprove(fieldType);
    if (isApproved) {
      toast.success(`${fieldType} field unapproved - moved to needs testing`);
    } else {
      toast.info(`${fieldType} field marked as needs work`);
    }
  }, [fieldType, onDisapprove, toast, isApproved]);
  
  const isWorking = FieldRegistry.isWorkingFieldType(fieldType);
  
  return (
    <div className={`field-tester ${!isWorking ? 'field-tester--placeholder' : ''}`}>
      <div className="field-tester__header">
        <h3 className="field-tester__title">{fieldType}</h3>
        <div className="field-tester__status">
          {!isWorking && <span className="status-badge status-badge--placeholder">Placeholder</span>}
          {isWorking && isApproved && <span className="status-badge status-badge--approved">Approved</span>}
          {isWorking && !isApproved && <span className="status-badge status-badge--working">Needs Testing</span>}
        </div>
      </div>
      
      {isWorking && (
        <>
          <div className="field-tester__config">
            <h4 className="config-title">Field Configuration</h4>
            <div className="config-controls">
              <label className="config-control touch-target">
                <input
                  type="checkbox"
                  checked={testConfig.required}
                  onChange={(e) => handleConfigChange('required', e.target.checked)}
                />
                Required
              </label>
              <label className="config-control touch-target">
                <input
                  type="checkbox"
                  checked={testConfig.disabled}
                  onChange={(e) => handleConfigChange('disabled', e.target.checked)}
                />
                Disabled
              </label>
              <label className="config-control touch-target">
                <input
                  type="checkbox"
                  checked={showError}
                  onChange={(e) => setShowError(e.target.checked)}
                />
                Show Error State
              </label>
            </div>
          </div>
          
          <div className="field-tester__test-area">
            <h4 className="test-title">Field Test</h4>
            <FormRenderer
              schema={testSchema}
              initialValues={testFormValues}
              onSubmit={handleTestSubmit}
              onChange={(values) => setTestValue(values[`test_${fieldType}`])}
              submitText="Test Submit"
              validateOnChange={false}
              customErrors={testErrors}
            />
          </div>
          
          <div className="field-tester__approval">
            <h4 className="approval-title">Approval Status</h4>
            <div className="approval-actions">
              {isApproved ? (
                <button
                  onClick={handleDisapprove}
                  className="btn btn--warning"
                >
                  Unapprove
                </button>
              ) : (
                <button
                  onClick={handleApprove}
                  className="approval-btn approval-btn--approve"
                >
                  Approve for Production
                </button>
              )}
              <button
                onClick={handleDisapprove}
                className="btn btn--error"
              >
                Needs Work
              </button>
            </div>
          </div>
        </>
      )}
      
      {!isWorking && (
        <div className="field-tester__placeholder">
          <p>This field type is not implemented. It will show a placeholder message in forms.</p>
        </div>
      )}
    </div>
  );
});

FieldTester.displayName = 'FieldTester';

/**
 * Main Field Test Page Component
 * Clean interface focused on field development and testing
 */
const FieldTestPage = () => {
  // Load approved fields from localStorage on mount, with updated default list
  const [approvedFields, setApprovedFields] = useState(() => {
    const saved = localStorage.getItem('daps-field-approvals');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (error) {
        console.warn('[FieldTestPage] Failed to parse saved approvals, using defaults:', error);
      }
    }
    // Default approved fields - include all stable implementations
    return new Set(['text', 'password', 'number', 'textarea', 'float', 'hidden', 'check_box', 'dropdown', 'json']);
  });
  const [selectedFieldType, setSelectedFieldType] = useState('text');
  const [filter, setFilter] = useState('all'); // 'all', 'working', 'placeholder', 'approved', 'unapproved'
  
  const allFieldTypes = FieldRegistry.getFieldTypes();
  const workingFieldTypes = FieldRegistry.getWorkingFieldTypes();
  
  // Save approved fields to localStorage whenever the set changes
  useEffect(() => {
    localStorage.setItem('daps-field-approvals', JSON.stringify(Array.from(approvedFields)));
  }, [approvedFields]);
  
  // Filter field types based on current filter
  const filteredFieldTypes = useMemo(() => {
    switch (filter) {
      case 'working':
        return workingFieldTypes;
      case 'placeholder':
        return FieldRegistry.getPlaceholderFieldTypes();
      case 'approved':
        return workingFieldTypes.filter(type => approvedFields.has(type));
      case 'unapproved':
        return workingFieldTypes.filter(type => !approvedFields.has(type));
      default:
        return allFieldTypes;
    }
  }, [allFieldTypes, workingFieldTypes, filter, approvedFields]);

  // Auto-handle field selection when filtered list changes
  useEffect(() => {
    if (filteredFieldTypes.length === 0) {
      // No fields match filter - keep current selection for now
      // The UI will show a "no fields" message
      return;
    } else if (filteredFieldTypes.length === 1) {
      // Exactly one field - auto-select it
      setSelectedFieldType(filteredFieldTypes[0]);
    } else if (!filteredFieldTypes.includes(selectedFieldType)) {
      // Current selection not in filtered list - select first valid option
      setSelectedFieldType(filteredFieldTypes[0]);
    }
  }, [filteredFieldTypes, selectedFieldType]);
  
  const handleApproveField = useCallback((fieldType) => {
    setApprovedFields(prev => new Set([...prev, fieldType]));
  }, []);
  
  const handleDisapproveField = useCallback((fieldType) => {
    setApprovedFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldType);
      return newSet;
    });
  }, []);
  
  const handleFieldTypeSelect = useCallback((fieldType) => {
    setSelectedFieldType(fieldType);
  }, []);
  
  const stats = useMemo(() => {
    const working = workingFieldTypes.length;
    const approved = workingFieldTypes.filter(type => approvedFields.has(type)).length;
    const unapproved = working - approved;
    const placeholder = FieldRegistry.getPlaceholderFieldTypes().length;
    
    return { working, approved, unapproved, placeholder };
  }, [workingFieldTypes, approvedFields]);
  
  return (
    <div className="field-test-page">
      <div className="field-test-page__header">
        <h1 className="page-title">Field Development Testing</h1>
        <p className="page-description">
          Development interface for testing and approving field implementations.
          Focus on working field types and approval workflow.
        </p>
      </div>
      
      <FieldStatusOverview />
      
      <div className="field-testing-section">
        <div className="testing-header">
          <h2 className="testing-title">Individual Field Testing</h2>
          <div className="testing-stats">
            <span className="stat">Working: {stats.working}</span>
            <span className="stat">Approved: {stats.approved}</span>
            <span className="stat">Needs Testing: {stats.unapproved}</span>
            <span className="stat">Placeholder: {stats.placeholder}</span>
          </div>
        </div>
        
        <div className="testing-controls">
          <div className="filter-controls">
            <label htmlFor="filter-select">Filter:</label>
            <select
              id="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Field Types</option>
              <option value="working">Working Only</option>
              <option value="placeholder">Placeholder Only</option>
              <option value="approved">Approved Only</option>
              <option value="unapproved">Needs Testing</option>
            </select>
          </div>
          
          <div className="field-type-selector">
            <label htmlFor="field-type-select">Test Field:</label>
            {filteredFieldTypes.length === 0 ? (
              <div className="no-fields-message">
                <span className="no-fields-text">No fields match this filter</span>
              </div>
            ) : (
              <select
                id="field-type-select"
                value={selectedFieldType}
                onChange={(e) => handleFieldTypeSelect(e.target.value)}
                className="field-type-select"
              >
                {filteredFieldTypes.map(type => (
                  <option key={type} value={type}>
                    {type} {FieldRegistry.isWorkingFieldType(type) ? '' : '(placeholder)'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        
        <div className="field-tester-container">
          {filteredFieldTypes.length === 0 ? (
            <div className="no-fields-tester">
              <h3>No Fields Available</h3>
              <p>No field types match the current filter. Try adjusting your filter selection to see available fields for testing.</p>
            </div>
          ) : (
            <FieldTester
              key={selectedFieldType}
              fieldType={selectedFieldType}
              onApprove={handleApproveField}
              onDisapprove={handleDisapproveField}
              isApproved={approvedFields.has(selectedFieldType)}
            />
          )}
        </div>
      </div>
      
      <div className="quick-actions">
        <h3 className="quick-actions-title">Quick Actions</h3>
        <div className="quick-action-buttons">
          <button
            onClick={() => {
              workingFieldTypes.forEach(type => setApprovedFields(prev => new Set([...prev, type])));
            }}
            className="quick-action-btn quick-action-btn--approve-all"
          >
            Approve All Working Fields
          </button>
          <button
            onClick={() => setApprovedFields(new Set())}
            className="quick-action-btn quick-action-btn--reset"
          >
            Reset All Approvals
          </button>
          <button
            onClick={() => setFilter('unapproved')}
            className="quick-action-btn quick-action-btn--show-unapproved"
          >
            Show Fields Needing Testing
          </button>
        </div>
      </div>
    </div>
  );
};

FieldTestPage.displayName = 'FieldTestPage';

export default FieldTestPage;