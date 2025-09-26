import React, { useState } from 'react';
import { SETTINGS_SCHEMA } from '../../../utils/constants/settings_schema.js';
import { FieldRegistry } from '../../../components/fields/FieldRegistry.jsx';
import { Accordion } from '../../../components/Accordion.jsx';
import { AccordionItem } from '../../../components/AccordionItem.jsx';

/**
 * Module Settings Page - Phase 1 Implementation
 * Schema-driven accordion interface using the field registry system
 * @returns {JSX.Element} Module settings page component
 */
export const ModuleSettingsPage = () => {
  const [expandedModules, setExpandedModules] = useState(['sync_gdrive']); // Start with one expanded

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev =>
      prev.includes(moduleKey)
        ? prev.filter(key => key !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2 text-text-primary">Module Settings</h1>
        <p className="text-text-secondary">Configure DAPS module settings</p>
      </div>

      <Accordion>
        {SETTINGS_SCHEMA.map(module => (
          <AccordionItem
            key={module.key}
            title={module.label}
            isExpanded={expandedModules.includes(module.key)}
            onToggle={() => toggleModule(module.key)}
          >
            {module.fields && module.fields.length > 0 ? (
              <div className="space-y-4">
                {module.fields.map(field => {
                  const FieldComponent = FieldRegistry.getField(field.type);

                  if (!FieldComponent) {
                    return (
                      <div key={field.key} className="p-2 bg-warning/20 text-warning rounded">
                        Field type '{field.type}' not implemented
                      </div>
                    );
                  }

                  // Phase 1: Provide appropriate default values by field type
                  let defaultValue = "";
                  if (field.type === 'instances' || field.type === 'dirlist' || field.type === 'dirlist_dragdrop' || field.type === 'dirlist_options' || field.type === 'color_list' || field.type === 'color_list_poster') {
                    defaultValue = []; // Array-type fields need array defaults
                  } else if (field.type === 'check_box') {
                    defaultValue = false; // Boolean fields need boolean defaults
                  } else if (field.type === 'number' || field.type === 'float') {
                    defaultValue = 0; // Number fields need number defaults
                  } else if (field.type === 'json') {
                    defaultValue = "{}"; // JSON fields need valid JSON defaults
                  }

                  return (
                    <FieldComponent
                      key={field.key}
                      field={field}
                      value={defaultValue} // Phase 1: appropriate placeholder values
                      onChange={() => {}} // Phase 1: no-op handlers
                      disabled={false}
                      highlightInvalid={false}
                      errorMessage=""
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-text-tertiary">
                <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                <p>This module requires no configuration</p>
              </div>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default ModuleSettingsPage;