# DAPS Form System Implementation Context

**Phase 7: Schema-Driven Form System for Test-UI**

This document provides comprehensive context for implementing the DAPS form system in test-ui from scratch, using React compositional principles and architectural patterns derived from analysis of the main UI system.

## 🎯 Project Context & React Philosophy

**Objective**: Architect a production-ready form system that embodies React's core principle: **"Write once, use everywhere"**

**Phase Position**: Phase 7 of systematic DAPS frontend recreation
**Implementation Approach**: Build compositional, reusable components following React 19 patterns
**Success Criteria**: Every field component can be used independently OR composed into complex forms seamlessly

### **Core React Compositional Principles**

**1. Single Responsibility Components**
- Each field component does ONE thing well
- Components compose together rather than inherit from each other
- No "bespoke" implementations - reusable patterns only

**2. Consistent Interface Contracts**
- Every field component implements the same props interface
- Predictable behavior across all field types
- Consumer components don't need field-specific knowledge

**3. Registry-Driven Architecture**
- Central registry maps field types to components
- Add new fields without touching existing code
- Schema drives component selection and rendering

## 🏗️ Main UI Architecture Analysis (React Composition Patterns)

### **Registry Pattern: The Foundation**
The main UI implements a sophisticated registry system that perfectly embodies "write once, use everywhere":

```javascript
// ui/src/components/fields/FieldRegistry.jsx
export const FIELD_RENDERERS = {
    // Basic Fields (7 types) - Reusable primitives
    text: BasicFields.TextField,
    password: BasicFields.PasswordField,  
    number: BasicFields.NumberField,
    float: BasicFields.FloatField,        // Percentage input (0-100% → 0-1)
    textarea: BasicFields.TextareaField,
    json: BasicFields.JsonField,
    hidden: BasicFields.HiddenField,

    // Select Fields (8 types) - Choice-based inputs
    dropdown: SelectFields.DropdownField,
    check_box: SelectFields.CheckBoxField,
    instance_dropdown: SelectFields.InstanceDropdownField,
    gdrive_presets: SelectFields.GdrivePresetsField,
    holiday_presets: SelectFields.HolidayPresetsField,
    holiday_schedule: SelectFields.HolidayScheduleField,
    schedule: SelectFields.ScheduleField,
    tag_select: SelectFields.TagSelectField,
    tag_display: SelectFields.TagDisplayField,
    tag_multiselect: SelectFields.TagMultiSelectField,

    // Directory Fields (5 types) - File system interactions
    dir_picker: DirFields.DirPickerField,
    dir: DirFields.DirField,
    dirlist: DirFields.DirListField,
    dirlist_dragdrop: DirFields.DirListDragDropField,
    dirlist_options: DirFields.DirListOptionsField,

    // Color Fields (2 types) - Color selection/management
    color_list: ColorFields.ColorListField,  // Complex: color array + poster preview
    color: ColorFields.ColorField,

    // Display Fields (2 types) - Read-only information
    media_info_display: MediaInfoField,
    media_display: MediaDisplayField,

    // Specialized Fields (6 types) - Domain-specific
    instances: InstancesField,
    poster: PosterField,
    gdrive_custom: CustomFields.GDriveCustomField,
    replacerr_custom: CustomFields.ReplacerrCustomField,
    upgradinatorr_custom: CustomFields.UpgradinatorrCustomField,
    labelarr_custom: CustomFields.LabelarrCustomField,
};
```

### **Compositional Field Interface Contract**
Every field component in the main UI follows this EXACT interface:

```javascript
/**
 * Universal Field Component Interface
 * ALL fields must implement this contract for "write once, use everywhere"
 */
function UniversalFieldComponent({
    // Core Props (REQUIRED for all fields)
    field,                    // Field configuration from schema
    value,                    // Current field value (any type)
    onChange,                 // (newValue) => void
    
    // Validation Props (STANDARD)
    highlightInvalid = false, // Boolean: show error styling
    errorMessage = null,      // String: error text to display
    
    // Context Props (OPTIONAL - passed through for complex fields)
    moduleConfig,             // Module-specific configuration
    rootConfig,               // Application root configuration
    formData,                 // Complete form data for cross-field logic
    disabled = false,         // Boolean: disable interaction
    
    // Advanced Props (SPECIALIZED - used by complex fields only)
    onFocus,                  // Focus event handler
    onBlur,                   // Blur event handler
    tabIndex,                 // Tab order management
    'aria-describedby',       // Accessibility
    'aria-labelledby',        // Accessibility
    // ... other ARIA props as needed
}) {
    // Every field component returns the same JSX structure pattern:
    return (
        <div className={`settings-field-row${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                {/* Field-specific input implementation */}
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
}
```

### **Organizational Categories (Composition Over Inheritance)**

The main UI organizes 35+ field types into logical categories that promote reuse:

**1. BasicFields** (7 types) - Fundamental input primitives
- Simple, single-purpose components
- No external dependencies or complex logic
- Direct user input → value transformations

**2. SelectFields** (8 types) - Choice-based interactions  
- Dropdown variations, checkboxes, multi-selects
- Composed from basic selection primitives
- Often compose with data fetching hooks

**3. DirFields** (5 types) - File system interactions
- Directory pickers, lists, drag-drop functionality
- Compose file system APIs with UI interactions
- Complex validation for paths and permissions

**4. ColorFields** (2 types) - Color management
- `ColorField`: Simple color picker (composes HTML color input)
- `ColorListField`: Complex array management + poster preview generation
- Shows how simple → complex composition works

**5. CustomFields** (4 types) - Domain-specific business logic
- Module-specific configurations (gdrive, replacerr, etc.)
- Compose multiple basic fields into domain workflows
- Heavy business logic encapsulation

**6. Display/Specialized** (8 types) - Read-only and unique cases
- Media display, instances management, poster fields
- Often compose multiple data sources
- Complex rendering logic

### Test-UI Current State
- ✅ **Complete Provider Hierarchy**: Toast, Theme, GlobalError, UIState, SearchCoordinator
- ✅ **Layout System**: Header, sidebar, responsive navigation
- ✅ **CSS Architecture**: Design tokens, themes, component layers
- ✅ **Context System**: Error handling, state management
- ✅ **Form System**: Complete primitive-based field system implemented (Phase 7 COMPLETED)

## 📋 True React Compositional Implementation Strategy

### **Problem: Current Approach is Bespoke (NOT Compositional)**

Our current fields like `TextField`, `NumberField`, etc. are **bespoke implementations** that duplicate patterns:
- Each field reimplements label rendering
- Each field reimplements error display  
- Each field reimplements description display
- Each field reimplements wrapper structure
- Each field reimplements accessibility patterns

**This is NOT "write once, use everywhere" - it's "write 35 times, slightly different each time"**

### **Solution: Build Truly Reusable Primitives First**

**Phase 1: Atomic Primitives (True Reusables)**
Build the smallest possible reusable components that get composed into everything else:

```javascript
// 🧩 PRIMITIVES - Write once, compose everywhere
export const FieldLabel = ({ htmlFor, label, required, className = "" }) => (
  <label htmlFor={htmlFor} className={`field-label ${className}`}>
    {label}
    {required && <span className="required-indicator">*</span>}
  </label>
);

export const FieldError = ({ id, message, className = "" }) => 
  message ? (
    <div id={id} className={`field-error ${className}`} role="alert">
      {message}
    </div>
  ) : null;

export const FieldDescription = ({ id, description, className = "" }) =>
  description ? (
    <div id={id} className={`field-description ${className}`}>
      {description}
    </div>
  ) : null;

export const FieldWrapper = ({ children, invalid = false, className = "" }) => (
  <div className={`field-wrapper ${invalid ? 'field-wrapper--invalid' : ''} ${className}`}>
    {children}
  </div>
);

export const InputBase = ({ 
  id, type = "text", value, onChange, className = "", 
  disabled, required, placeholder, ...inputProps 
}) => (
  <input
    id={id}
    type={type}
    value={value || ''}
    onChange={onChange}
    disabled={disabled}
    required={required}
    placeholder={placeholder}
    className={`field-input ${className}`}
    {...inputProps}
  />
);

export const TextareaBase = ({ 
  id, value, onChange, rows = 4, className = "",
  disabled, required, placeholder, ...textareaProps 
}) => (
  <textarea
    id={id}
    value={value || ''}
    onChange={onChange}
    rows={rows}
    disabled={disabled}
    required={required}
    placeholder={placeholder}
    className={`field-textarea ${className}`}
    {...textareaProps}
  />
);
```

**Phase 2: Field Compositions (Compose Primitives)**
Now build field components by composing primitives - **no duplicate logic**:

```javascript
// 🏗️ COMPOSITIONS - Compose primitives into field interfaces
export const TextField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        htmlFor={inputId} 
        label={field.label} 
        required={field.required} 
      />
      
      <InputBase
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        maxLength={field.maxLength}
        minLength={field.minLength}
        pattern={field.pattern}
        aria-describedby={`${inputId}-desc ${inputId}-error`}
        aria-invalid={highlightInvalid}
      />
      
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};

export const NumberField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
      
      <div className="number-field-container">
        <button 
          onClick={() => onChange((value || 0) - (field.step || 1))}
          className="btn btn--secondary btn--small number-field-decrement"
        >
          −
        </button>
        
        <InputBase
          id={inputId}
          type="text"  // Allow typing while controlling value
          value={value}
          onChange={(e) => {
            const num = Number(e.target.value);
            if (!isNaN(num)) onChange(num);
          }}
          className="number-field-display"
        />
        
        <button 
          onClick={() => onChange((value || 0) + (field.step || 1))}
          className="btn btn--secondary btn--small number-field-increment"
        >
          +
        </button>
      </div>
      
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};

export const TextareaField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
      
      <TextareaBase
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={field.rows || 4}
        required={field.required}
      />
      
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};
```

**Phase 3: Selection Compositions**
Build selection components by composing primitives with choice logic:

```javascript
// 🔄 SELECT COMPOSITIONS - Compose primitives + choice mechanisms
export const DropdownField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
      
      <select
        id={inputId}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="field-select"
        required={field.required}
      >
        {field.placeholder && <option value="">{field.placeholder}</option>}
        {field.options?.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};

export const CheckboxField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <div className="checkbox-field-container">
        <input
          id={inputId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="field-checkbox"
          required={field.required}
        />
        <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
      </div>
      
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};
```

**Phase 4: Complex Array Compositions**
Compose field components into array management patterns:

```javascript
// 🎨 ARRAY COMPOSITIONS - Compose existing fields + array logic
export const ColorListField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const colors = Array.isArray(value) ? value : [];
  
  const updateColor = (index, newColor) => {
    const updated = [...colors];
    updated[index] = newColor;
    onChange(updated);
  };
  
  const addColor = () => onChange([...colors, '#000000']);
  const removeColor = (index) => onChange(colors.filter((_, i) => i !== index));
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel label={field.label} required={field.required} />
      
      <div className="color-list-container">
        {colors.map((color, idx) => (
          <div key={idx} className="color-list-item">
            <InputBase  // Compose InputBase primitive
              type="color"
              value={color}
              onChange={(e) => updateColor(idx, e.target.value)}
              className="color-field-input"
            />
            <button 
              onClick={() => removeColor(idx)}
              className="btn btn--danger btn--small"
            >
              Remove
            </button>
          </div>
        ))}
        
        <button onClick={addColor} className="btn btn--primary btn--small">
          Add Color
        </button>
      </div>
      
      <FieldDescription id={`${field.key}-desc`} description={field.description} />
      <FieldError id={`${field.key}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};

export const DirListField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const dirs = Array.isArray(value) ? value : [];
  
  const updateDir = (index, newDir) => {
    const updated = [...dirs];
    updated[index] = newDir;
    onChange(updated);
  };
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel label={field.label} required={field.required} />
      
      {dirs.map((dir, idx) => (
        <div key={idx} className="dir-list-item">
          <InputBase  // Compose InputBase primitive
            type="text"
            value={dir}
            onChange={(e) => updateDir(idx, e.target.value)}
            placeholder="/path/to/directory"
          />
          <button onClick={() => onChange(dirs.filter((_, i) => i !== idx))}>
            Remove
          </button>
        </div>
      ))}
      
      <button onClick={() => onChange([...dirs, ''])}>Add Directory</button>
      
      <FieldDescription id={`${field.key}-desc`} description={field.description} />
      <FieldError id={`${field.key}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};
```

**Phase 5: Advanced Compositions**
Build sophisticated fields by composing multiple primitives and patterns:

```javascript
// 🚀 ADVANCED COMPOSITIONS - Multi-primitive compositions
export const JsonField = ({ field, value, onChange, highlightInvalid, errorMessage }) => {
  const [jsonError, setJsonError] = useState(null);
  const [textValue, setTextValue] = useState(() => 
    typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)
  );
  
  const handleChange = (newValue) => {
    setTextValue(newValue);
    try {
      const parsed = JSON.parse(newValue);
      onChange(newValue);
      setJsonError(null);
    } catch (error) {
      setJsonError(error.message);
      onChange(newValue); // Still pass through for user editing
    }
  };
  
  const formatJson = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(textValue), null, 2);
      setTextValue(formatted);
      onChange(formatted);
    } catch (error) {
      setJsonError(`Cannot format: ${error.message}`);
    }
  };
  
  const inputId = `field-${field.key}`;
  const finalError = errorMessage || jsonError;
  
  return (
    <FieldWrapper invalid={highlightInvalid || !!jsonError}>
      <div className="json-field-header">
        <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
        
        <div className="json-field-controls">
          <button onClick={formatJson} className="btn btn--secondary btn--small">
            Format
          </button>
        </div>
      </div>
      
      <TextareaBase  // Compose TextareaBase primitive
        id={inputId}
        value={textValue}
        onChange={(e) => handleChange(e.target.value)}
        rows={8}
        className={jsonError ? 'json-textarea--error' : 'json-textarea'}
        spellCheck={false}
      />
      
      {!jsonError && textValue && (
        <div className="json-validation-success">✅ Valid JSON</div>
      )}
      
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={finalError} />
    </FieldWrapper>
  );
};
```

### **Compositional Benefits of This Approach**

1. **Incremental Development**: Each phase builds on the previous
2. **Maximum Reuse**: Later fields compose earlier ones (no duplication)
3. **Consistent Patterns**: All fields follow the same interface contract
4. **Easy Testing**: Test primitives once, compositions inherit reliability
5. **Schema Flexibility**: New field types can be added by composing existing ones

### **Schema Integration Pattern**
The test-ui schema system should work exactly like main UI:

```javascript
// Schema defines field types and configuration
const fieldConfig = {
    key: 'database_path',
    type: 'dir',           // Maps to DirField component via registry
    label: 'Database Path',
    required: true,
    placeholder: '/path/to/database',
    validation: { /* rules */ }
};

// Registry maps type to component
const FieldComponent = FIELD_RENDERERS[fieldConfig.type]; // DirField

// Render with consistent interface
<FieldComponent 
    field={fieldConfig} 
    value={currentValue} 
    onChange={handleChange}
    highlightInvalid={hasError}
    errorMessage={errorText}
/>
```

## 🎨 CSS Integration Requirements

### Existing Test-UI CSS Architecture:
- **Design Tokens**: `/css/tokens.css` (spacing, typography, measurements)
- **Theme System**: `/css/theme/dark.css`, `/css/theme/light.css`
- **Component Layers**: `@layer components` for form styles
- **Mobile-First**: Responsive breakpoints at 375px, 768px, 1024px


## 🔧 React Compositional Architecture Requirements

### **Core Compositional Patterns (Main UI Proven Patterns)**

**1. Registry Pattern** - The foundation of "write once, use everywhere"
```javascript
// Single registry maps all field types to components
export const FIELD_RENDERERS = {
    text: BasicFields.TextField,
    dir: DirFields.DirField,
    color_list: ColorFields.ColorListField,
    // ... all 35+ field types
};

// Usage: Consumer never needs to know which specific component to use
const FieldComponent = FIELD_RENDERERS[field.type];
return <FieldComponent {...standardProps} />;
```

**2. Universal Interface Contract** - Predictable composition
```javascript
// EVERY field component implements EXACTLY this interface:
interface UniversalFieldProps {
    field: FieldConfig;          // Schema configuration
    value: any;                  // Current value (any type)
    onChange: (newValue) => void; // Value change handler
    highlightInvalid?: boolean;   // Error state
    errorMessage?: string;        // Error message
    // Context props for complex fields
    moduleConfig?: object;        // Module configuration
    rootConfig?: object;          // Application config
    formData?: object;           // Complete form for cross-field validation
}
```

**3. Layered Composition** - Build complex from simple
```javascript
// Example: ColorListField composes multiple simpler components
export const ColorListField = ({ field, value, onChange, ...props }) => {
    return (
        <div className="color-list-container">
            {/* Composes basic ColorField components */}
            {colorArray.map((color, idx) => (
                <ColorField 
                    key={idx}
                    field={{ ...field, key: `${field.key}_${idx}` }}
                    value={color}
                    onChange={(newColor) => updateColorAtIndex(idx, newColor)}
                    {...props}
                />
            ))}
            {/* Composes array management UI */}
            <ArrayControls onAdd={handleAdd} onRemove={handleRemove} />
            {/* Composes preview generation system */}
            <PosterPreviewGrid colors={colorArray} />
        </div>
    );
};
```

### **CSS Compositional Architecture**

**Main UI CSS Pattern Analysis:**
```css
/* All fields use the same base structure for perfect consistency */
.settings-field-row {
    /* Base field container - used by ALL 35+ field types */
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
}

.settings-field-labelcol {
    /* Label column - consistent across all fields */
    flex: 0 0 200px;
    padding-top: var(--space-2);
}

.settings-field-inputwrap {
    /* Input column - field-specific content goes here */
    flex: 1;
    min-width: 0; /* Prevents flex overflow */
}

/* Field-specific styles compose on top of base */
.color-list-container { /* Specific to ColorListField */ }
.directory-picker { /* Specific to DirField */ }
.json-editor { /* Specific to JsonField */ }
```

**Test-UI Must Match This Pattern:**
- Same base CSS structure for all fields
- Field-specific classes compose on top
- Use existing design tokens from `css/tokens.css`
- Maintain responsive behavior with test-ui breakpoints

### **Component Directory Structure (Matches Main UI)**
```
test-ui/src/components/fields/
├── FieldRegistry.jsx      # Central registry (like main UI)
├── basic/                 # BasicFields namespace
│   ├── TextField.jsx      # ✅ DONE
│   ├── NumberField.jsx    # ✅ DONE  
│   ├── FloatField.jsx     # ✅ DONE - percentage field
│   ├── HiddenField.jsx    # ✅ DONE - hidden input
│   └── index.js           # Export namespace
├── select/                # SelectFields namespace
│   ├── DropdownField.jsx  # ✅ DONE
│   ├── CheckboxField.jsx  # ✅ DONE (as CheckBoxField)
│   ├── InstanceDropdownField.jsx # TODO
│   └── index.js
├── dir/                   # DirFields namespace (TODO category)
├── color/                 # ColorFields namespace (TODO category)
├── custom/                # CustomFields namespace (TODO category)
├── display/               # Display fields (TODO category)
└── instances/             # Specialized fields (TODO category)
```

### **State Management: Composition Over Complexity**

**Form State Pattern (From Main UI Analysis):**
```javascript
// Form components compose individual field state into form state
const FormContainer = ({ schema, initialData, onSubmit }) => {
    // Single form state object - no complex state management needed
    const [formData, setFormData] = useState(initialData);
    const [errors, setErrors] = useState({});
    
    // Universal change handler works with ANY field component
    const handleFieldChange = useCallback((fieldKey) => (newValue) => {
        setFormData(prev => ({ ...prev, [fieldKey]: newValue }));
        // Clear error when field changes
        if (errors[fieldKey]) {
            setErrors(prev => { const next = { ...prev }; delete next[fieldKey]; return next; });
        }
    }, [errors]);
    
    // Render each field using registry pattern
    return schema.fields.map(field => {
        const FieldComponent = FIELD_RENDERERS[field.type];
        return (
            <FieldComponent
                key={field.key}
                field={field}
                value={formData[field.key]}
                onChange={handleFieldChange(field.key)}
                highlightInvalid={!!errors[field.key]}
                errorMessage={errors[field.key]}
                // Pass context for complex fields
                formData={formData}
                moduleConfig={moduleConfig}
                rootConfig={rootConfig}
            />
        );
    });
};
```

### **Validation: Composable Rules**
```javascript
// Validation composes simple rules into complex field validation
const validateField = (field, value, context = {}) => {
    const errors = [];
    
    // Compose basic validation rules
    if (field.required && !value) errors.push('This field is required');
    if (field.minLength && value.length < field.minLength) errors.push(`Minimum ${field.minLength} characters`);
    if (field.pattern && !field.pattern.test(value)) errors.push('Invalid format');
    
    // Compose field-specific validation
    if (field.type === 'dir' && value && !isValidDirectory(value)) {
        errors.push('Directory does not exist');
    }
    
    // Compose cross-field validation using context
    if (field.dependsOn && !context.formData[field.dependsOn]) {
        errors.push(`${field.dependsOn} must be set first`);
    }
    
    return errors.length > 0 ? errors[0] : null; // Return first error
};
```

## 📱 Mobile-First Requirements

### Touch Target Standards
- **Minimum 44px height** for all interactive elements
- **16px minimum font size** to prevent mobile zoom
- **8px minimum spacing** between touch targets
- **No horizontal scrolling** on mobile viewports

### Responsive Breakpoints
- **Mobile**: 375px - 767px (stack fields vertically)
- **Tablet**: 768px - 1023px (2-column grid)
- **Desktop**: 1024px+ (full horizontal layout)

## 🔗 Integration Points

### With Existing Test-UI Systems
- **useToast()**: Success/error notifications for form actions
- **useError()**: Global error handling for form failures
- **useApiData()**: Loading field options from API
- **Themes**: Dark/light theme support for all form elements

### With Settings System
Forms must dynamically generate from the static settings schema:
```javascript
// Settings page usage example
import { SETTINGS_SCHEMA } from '../utils/constants/settings_schema.js';

// Form system should interpret and render the schema structure
const schema = SETTINGS_SCHEMA.find(module => module.key === 'general');
// Implement your own form rendering logic based on schema.fields
```

**Note**: The actual implementation approach for schema interpretation and form generation should be architected by the frontend-dev agent based on requirements, not this example.

## ✅ Success Criteria Checklist

### Core Functionality
- [ ] All 30+ field types render correctly from schema
- [ ] Dynamic form generation works with DAPS settings
- [ ] Field validation displays clear error messages
- [ ] Form submission integrates with existing API layer

### Mobile Compliance
- [ ] All touch targets meet 44px minimum requirement
- [ ] No horizontal scrolling on 375px viewport
- [ ] Font sizes prevent mobile browser zoom
- [ ] Responsive layouts work at all breakpoints

### Integration
- [ ] Perfect integration with existing test-ui providers
- [ ] Theme switching affects all form elements
- [ ] Toast notifications for form feedback
- [ ] Unsaved changes detection working

### Quality Standards
- [ ] No console errors or warnings
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Performance optimized (React.memo, proper hooks)
- [ ] Clean CSS using design tokens only

## 🚀 React Compositional Implementation Strategy

### **"Write Once, Use Everywhere" Development Workflow**

**Step 1: Build Foundation Layer (Primitives)**
Implement basic field components that serve as building blocks:

```bash
# Implement in this exact order for maximum reuse:
1. FloatField (✅ COMPLETED) - Composes NumberField + percentage display
2. HiddenField (✅ COMPLETED) - Composes TextField with type="hidden"

# Goal: All basic primitives complete before moving to compositions
```

**Step 2: Build Choice Layer (Selection Components)**
Compose basic validation patterns with selection logic:

```bash
# These compose basic field patterns with choice mechanisms:
1. InstanceDropdownField - Composes DropdownField + API data loading
2. TagSelectField - Composes DropdownField + tag creation
3. ScheduleField - Composes DropdownField + time logic

# Goal: All selection primitives ready for complex compositions  
```

**Step 3: Build Feature Layer (Complex Interactions)**
Compose multiple primitives into sophisticated field interactions:

```bash
# These show the power of composition over inheritance:
1. DirField - Composes TextField + directory picker modal
2. ColorField - Composes <input type="color"> + validation pattern
3. ColorListField - Composes array of ColorField + poster preview system

# Goal: Demonstrate how simple components compose into complex features
```

**Step 4: Build Business Layer (Domain-Specific Logic)**
Compose multiple features for specific business requirements:

```bash
# These compose multiple field types into domain workflows:
1. InstancesField - Complex array management with validation
2. GDriveCustomField - Multi-field Google Drive configuration
3. Custom domain fields as needed

# Goal: Show how composition scales to complex business requirements
```

### **Compositional Development Guidelines**

**DO: Follow Compositional Patterns**
```javascript
// ✅ Compose simpler components into complex ones
export const DirListField = ({ field, value, onChange, ...props }) => {
    const dirs = Array.isArray(value) ? value : [];
    
    return (
        <div className="dir-list-container">
            {dirs.map((dir, idx) => (
                <DirField  // Composes existing DirField
                    key={idx}
                    field={{ ...field, key: `${field.key}_${idx}` }}
                    value={dir}
                    onChange={(newDir) => updateDirAtIndex(idx, newDir)}
                    {...props}  // Pass through standard props
                />
            ))}
            <ArrayControls onAdd={addDir} onRemove={removeDir} />
        </div>
    );
};
```

**DON'T: Create Bespoke Implementations**
```javascript
// ❌ Don't duplicate logic from other fields
export const DirListField = ({ field, value, onChange, ...props }) => {
    // Bad: reimplementing directory validation, input handling, etc.
    return (
        <div>
            {dirs.map(dir => (
                <input  // Bad: should compose DirField instead
                    type="text"
                    value={dir}
                    onChange={handleDirChange}
                    // Duplicating all the logic from DirField...
                />
            ))}
        </div>
    );
};
```

### **Registry Integration Pattern**

Every new field component must be added to the registry for "write once, use everywhere":

```javascript
// 1. Create component following universal interface
export const MyNewField = ({ field, value, onChange, highlightInvalid, errorMessage, ...context }) => {
    // Implementation that follows standard field patterns
    return (
        <div className="settings-field-row">
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                {/* Your field implementation */}
            </div>
        </div>
    );
};

// 2. Export from appropriate namespace
// basic/index.js or select/index.js or dir/index.js etc.
export { MyNewField } from './MyNewField.jsx';

// 3. Register in central registry  
// FieldRegistry.jsx
export const FIELD_RENDERERS = {
    // ... existing fields
    my_new_field: BasicFields.MyNewField,
};

// 4. Use anywhere in schemas without additional code
const fieldConfig = { type: 'my_new_field', /* ... */ };
// Component automatically rendered via registry pattern
```

### **Quality Assurance Through Composition**

**Interface Consistency Validation**
```javascript
// Every field component MUST pass this interface test:
const validateFieldInterface = (FieldComponent, testProps) => {
    const requiredProps = ['field', 'value', 'onChange'];
    const standardProps = ['highlightInvalid', 'errorMessage'];
    
    // Test that component accepts all standard props without errors
    const renderResult = render(
        <FieldComponent 
            field={{ key: 'test', type: 'test', label: 'Test' }}
            value={null}
            onChange={() => {}}
            highlightInvalid={false}
            errorMessage={null}
            // ... context props
        />
    );
    
    // Component should render without crashing
    expect(renderResult.container).toBeInTheDocument();
};
```

**Composition Reuse Validation**
```javascript
// Test that composed components properly reuse their dependencies
describe('DirListField composition', () => {
    it('should compose DirField components', () => {
        const { getAllByRole } = render(
            <DirListField 
                field={{ type: 'dirlist', key: 'dirs' }}
                value={['/path1', '/path2']}
                onChange={() => {}}
            />
        );
        
        // Should render multiple DirField instances
        const inputs = getAllByRole('textbox');
        expect(inputs).toHaveLength(2);
        
        // Each input should have DirField styling/behavior
        inputs.forEach(input => {
            expect(input).toHaveClass('expected-dir-field-class');
        });
    });
});
```

## 🔍 Testing Strategy

### Test Page Requirements
Create `test-ui/src/pages/dev/FormTestPage.jsx` demonstrating:
- All field types rendering correctly
- Validation working with various scenarios
- Mobile responsiveness at different breakpoints
- Complex nested field behavior
- Schema-driven form generation

### Manual Testing Checklist
- [ ] Navigate to `/dev/form-test` and verify all fields display
- [ ] Test form submission with valid/invalid data
- [ ] Resize viewport from 375px to 1440px and verify responsive behavior
- [ ] Test with both dark and light themes
- [ ] Verify keyboard navigation and accessibility
- [ ] Test on mobile device for touch interactions

## 📚 Reference Materials

### Main UI Patterns (for reference, don't copy)
- `ui/src/components/fields/FieldRegistry.jsx` - Registry pattern
- `ui/src/components/fields/basic/TextField.jsx` - Field interface example  
- `ui/src/components/fields/RenderFields.jsx` - Dynamic rendering
- `ui/src/css/components/*` - CSS patterns (adapt for test-ui tokens)

### Test-UI Architecture
- `test-ui/src/contexts/` - Provider integration points
- `test-ui/src/css/tokens.css` - Design system tokens
- `test-ui/src/css/theme/` - Theme system
- `test-ui/src/utils/constants/settings_schema.js` - Schema requirements

## 🎯 Deliverable Summary

**Expected Output**: A production-ready form system that enables DAPS settings configuration through schema-driven form generation, with perfect mobile responsiveness and integration with the existing test-ui architecture.

**Expected Architecture**: The frontend-dev agent will determine the optimal file structure and component organization based on the requirements. The system should handle all field types found in `SETTINGS_SCHEMA` and provide a clean, maintainable architecture for form management.

This form system will be the foundation for all DAPS configuration interfaces and must meet the highest standards for usability, accessibility, and mobile responsiveness while demonstrating clean architectural principles.

## 🎯 Complete Implementation Workflow

### **Development Phase Approach**

**Phase 1: Primitive Components Foundation**
Build the truly reusable atomic components that will be composed everywhere:

```javascript
// components/fields/primitives/
├── FieldLabel.jsx        # Universal label with required indicator
├── FieldError.jsx        # Universal error message display
├── FieldDescription.jsx  # Universal help text display  
├── FieldWrapper.jsx      # Universal field container
├── InputBase.jsx         # Base input element with all standard props
├── TextareaBase.jsx      # Base textarea with standard props
└── SelectBase.jsx        # Base select with standard props
```

**Success Criteria**: These components can be used independently AND as building blocks for all other fields.

**Phase 2: Basic Field Compositions**
Compose primitives into the core field types:

```javascript
// Each field uses ONLY primitives - no duplicate logic
export const TextField = ({ field, value, onChange, ...props }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <FieldWrapper invalid={props.highlightInvalid}>
      <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
      <InputBase
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...extractInputProps(field)}
      />
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={props.errorMessage} />
    </FieldWrapper>
  );
};
```

**Phase 3: Selection Compositions**
Build choice-based fields by composing primitives + selection logic:

```javascript
// DropdownField composes SelectBase + validation patterns
// CheckboxField composes input[type="checkbox"] + label patterns
// All follow the same primitive composition approach
```

**Phase 4: Complex Compositions**
Build sophisticated fields by composing simpler fields:

```javascript
// DirListField composes multiple DirField instances
// ColorListField composes multiple ColorField instances  
// JsonField composes TextareaBase + validation + formatting
```

**Phase 5: Registry Integration**
Central registry pattern enables schema-driven form generation:

```javascript
export const FIELD_RENDERERS = {
  text: BasicFields.TextField,
  textarea: BasicFields.TextareaField,
  dropdown: SelectFields.DropdownField,
  dir_list: DirFields.DirListField,
  color_list: ColorFields.ColorListField,
  json: BasicFields.JsonField,
  // ... all field types
};
```

### **Quality Assurance Through Composition**

**Interface Consistency Testing**
```javascript
// Every field component must pass standardized interface tests
const testUniversalFieldInterface = (FieldComponent) => {
  const standardProps = {
    field: { key: 'test', type: 'test', label: 'Test Field' },
    value: null,
    onChange: () => {},
    highlightInvalid: false,
    errorMessage: null
  };
  
  // Should render without errors
  expect(() => render(<FieldComponent {...standardProps} />)).not.toThrow();
  
  // Should handle value changes
  const mockOnChange = jest.fn();
  const { container } = render(<FieldComponent {...standardProps} onChange={mockOnChange} />);
  // ... interaction tests
};
```

**Composition Reuse Validation**
```javascript  
// Test that complex fields properly compose simpler ones
describe('ColorListField composition', () => {
  it('should compose ColorField components correctly', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    const { container } = render(
      <ColorListField 
        field={{ type: 'color_list', key: 'colors', label: 'Colors' }}
        value={colors}
        onChange={() => {}}
      />
    );
    
    // Should render individual ColorField instances
    const colorInputs = container.querySelectorAll('input[type="color"]');
    expect(colorInputs).toHaveLength(3);
    
    // Each should have correct ColorField behavior
    colorInputs.forEach((input, index) => {
      expect(input.value).toBe(colors[index]);
    });
  });
});
```

## 🏗️ Architectural Patterns Implementation

### **Primitive Component Design Patterns**

**1. Props Extraction Pattern**
Primitives should extract relevant props and pass through standard HTML attributes:

```javascript
export const InputBase = ({ 
  id, type = "text", value, onChange, className = "",
  // Field-specific props
  disabled, required, placeholder, maxLength, minLength, pattern,
  // Accessibility props  
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  // Pass through any other HTML input props
  ...inputProps 
}) => (
  <input
    id={id}
    type={type}
    value={value || ''}
    onChange={onChange}
    disabled={disabled}
    required={required}
    placeholder={placeholder}
    maxLength={maxLength}
    minLength={minLength}
    pattern={pattern}
    className={`field-input ${className}`}
    aria-describedby={ariaDescribedby}
    aria-invalid={ariaInvalid}
    {...inputProps}
  />
);
```

**2. Context Prop Forwarding Pattern**
Complex fields may need additional context - handle this gracefully:

```javascript
export const ComplexField = ({ 
  field, value, onChange, highlightInvalid, errorMessage,
  // Context props for complex logic
  moduleConfig, rootConfig, formData, 
  // Forward any additional props to primitives
  ...forwardedProps 
}) => {
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
      
      {/* Complex fields can access context for business logic */}
      <ComplexInputLogic 
        moduleConfig={moduleConfig}
        rootConfig={rootConfig}
        formData={formData}
        {...forwardedProps}
      />
      
      <FieldDescription id={`${inputId}-desc`} description={field.description} />
      <FieldError id={`${inputId}-error`} message={errorMessage} />
    </FieldWrapper>
  );
};
```

### **Registry Pattern Implementation**

**1. Type-Safe Registry**
Ensure all field types are properly registered:

```javascript
// FieldRegistry.jsx
import * as BasicFields from './basic';
import * as SelectFields from './select';
import * as DirFields from './dir';
import * as ColorFields from './color';
import * as CustomFields from './custom';

export const FIELD_RENDERERS = {
  // Basic Fields - primitive compositions
  text: BasicFields.TextField,
  password: BasicFields.PasswordField,
  number: BasicFields.NumberField,
  float: BasicFields.FloatField,
  textarea: BasicFields.TextareaField,
  json: BasicFields.JsonField,
  hidden: BasicFields.HiddenField,
  
  // Select Fields - choice compositions
  dropdown: SelectFields.DropdownField,
  check_box: SelectFields.CheckboxField,
  instance_dropdown: SelectFields.InstanceDropdownField,
  
  // Directory Fields - file system compositions
  dir: DirFields.DirField,
  dir_list: DirFields.DirListField,
  dir_picker: DirFields.DirPickerField,
  
  // Color Fields - color management compositions
  color: ColorFields.ColorField,
  color_list: ColorFields.ColorListField,
  
  // Custom Fields - domain-specific compositions
  gdrive_custom: CustomFields.GDriveCustomField,
  // ... other custom fields as needed
};

// Validation: Ensure all field types exist
export const validateFieldType = (fieldType) => {
  if (!FIELD_RENDERERS[fieldType]) {
    console.error(`Unknown field type: ${fieldType}. Available types:`, Object.keys(FIELD_RENDERERS));
    return false;
  }
  return true;
};
```

**2. Dynamic Field Rendering**
Schema-driven form generation using the registry:

```javascript
// FormRenderer.jsx
export const FormRenderer = ({ schema, formData, onChange, errors = {} }) => {
  return (
    <div className="form-container">
      {schema.fields.map(field => {
        const FieldComponent = FIELD_RENDERERS[field.type];
        
        if (!FieldComponent) {
          console.warn(`No renderer found for field type: ${field.type}`);
          return <div key={field.key}>Unknown field type: {field.type}</div>;
        }
        
        return (
          <FieldComponent
            key={field.key}
            field={field}
            value={formData[field.key]}
            onChange={(newValue) => onChange(field.key, newValue)}
            highlightInvalid={!!errors[field.key]}
            errorMessage={errors[field.key]}
            // Pass context for complex fields
            moduleConfig={schema.moduleConfig}
            rootConfig={schema.rootConfig}
            formData={formData}
          />
        );
      })}
    </div>
  );
};
```

### **CSS Compositional Architecture**

**1. Base Field Structure (Used by ALL fields)**
```css
/* Base structure that ALL 35+ field types must use */
@layer components {
  .field-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  
  .field-wrapper--invalid {
    /* Error state styling applies to entire field */
  }
  
  .field-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--space-1);
  }
  
  .required-indicator {
    color: var(--color-error);
    margin-left: var(--space-1);
  }
  
  .field-input,
  .field-textarea,
  .field-select {
    min-height: var(--control-min-height); /* 44px for touch */
    padding: var(--space-3) var(--space-3);
    border: var(--border-width-1) solid var(--color-border);
    border-radius: var(--radius-2);
    font-size: var(--font-size-base);
    background: var(--color-surface);
    color: var(--color-text-primary);
    transition: border-color var(--duration-fast) var(--easing);
  }
  
  .field-input:focus,
  .field-textarea:focus,
  .field-select:focus {
    outline: var(--focus-ring-width) solid var(--color-focus);
    outline-offset: var(--focus-ring-offset);
    border-color: var(--color-primary);
  }
  
  .field-input:invalid,
  .field-textarea:invalid,
  .field-select:invalid,
  .field-wrapper--invalid .field-input,
  .field-wrapper--invalid .field-textarea,
  .field-wrapper--invalid .field-select {
    border-color: var(--color-error);
  }
  
  .field-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
  
  .field-error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    font-weight: var(--font-weight-medium);
  }
}
```

**2. Field-Specific Compositions**
```css
/* Field-specific styles compose on top of base */
@layer components {
  /* Number field compositions */
  .number-field-container {
    display: flex;
    align-items: stretch;
  }
  
  .number-field-decrement,
  .number-field-increment {
    min-width: var(--control-min-height);
    background: var(--color-surface-variant);
    border: var(--border-width-1) solid var(--color-border);
    color: var(--color-primary);
  }
  
  .number-field-display {
    flex: 1;
    text-align: center;
    border-left: none;
    border-right: none;
    border-radius: 0;
  }
  
  /* Color list field compositions */
  .color-list-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .color-list-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .color-field-input {
    width: var(--control-min-height);
    height: var(--control-min-height);
    padding: var(--space-1);
    cursor: pointer;
  }
  
  /* Directory list compositions */
  .dir-list-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .dir-list-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
}
```

**3. Responsive Compositions**
```css
/* Mobile-first responsive behavior */
@layer components {
  /* Stack vertically on mobile */
  @media (max-width: 767px) {
    .field-wrapper {
      margin-bottom: var(--space-3); /* Tighter spacing on mobile */
    }
    
    .number-field-container {
      /* Ensure touch targets remain 44px on mobile */
      min-height: var(--control-min-height);
    }
    
    .color-list-container,
    .dir-list-container {
      /* Full width items on mobile */
      width: 100%;
    }
  }
  
  /* Enhanced spacing on larger screens */
  @media (min-width: 768px) {
    .field-wrapper {
      margin-bottom: var(--space-5);
    }
  }
}
```

## 🔄 Development Workflow Guidelines

### **Step-by-Step Development Process**

**1. Planning Phase**
- Analyze field requirements from main UI patterns
- Identify reusable primitives needed
- Plan composition hierarchy (simple → complex)
- Define registry integration points

**2. Primitive Development**
- Build atomic components first (FieldLabel, FieldError, etc.)
- Test each primitive independently
- Ensure consistent interface across all primitives
- Validate accessibility compliance

**3. Basic Field Composition**
- Compose primitives into basic field types
- Test field interface consistency
- Validate responsive behavior
- Test with dark/light themes

**4. Complex Field Composition**
- Compose basic fields into complex interactions
- Test array management patterns
- Validate business logic integration
- Test performance with large data sets

**5. Registry Integration**
- Add all fields to central registry
- Test schema-driven form generation
- Validate error handling for unknown field types
- Test dynamic field switching

**6. Quality Assurance**
- Run comprehensive accessibility audits
- Test on multiple devices and screen sizes
- Validate theme switching behavior
- Performance testing with complex forms

### **Testing Strategy**

**Unit Testing**
```javascript
// Test each primitive component independently
describe('FieldLabel', () => {
  it('should render label text correctly', () => {
    const { getByText } = render(<FieldLabel label="Test Label" />);
    expect(getByText('Test Label')).toBeInTheDocument();
  });
  
  it('should show required indicator when required', () => {
    const { getByText } = render(<FieldLabel label="Test" required />);
    expect(getByText('*')).toBeInTheDocument();
  });
});
```

**Integration Testing**
```javascript
// Test field compositions work correctly
describe('TextField composition', () => {
  it('should compose all primitives correctly', () => {
    const { container, getByLabelText } = render(
      <TextField 
        field={{ key: 'test', label: 'Test Field', description: 'Help text' }}
        value="test value"
        onChange={() => {}}
        errorMessage="Error message"
      />
    );
    
    // Should contain all composed primitives
    expect(getByLabelText('Test Field')).toBeInTheDocument();
    expect(container.querySelector('.field-description')).toHaveTextContent('Help text');
    expect(container.querySelector('.field-error')).toHaveTextContent('Error message');
  });
});
```

**Form-Level Testing**
```javascript
// Test complete form generation from schema
describe('Schema-driven form generation', () => {
  it('should render all field types from schema', () => {
    const schema = {
      fields: [
        { key: 'name', type: 'text', label: 'Name' },
        { key: 'type', type: 'dropdown', label: 'Type', options: [...] },
        { key: 'dirs', type: 'dir_list', label: 'Directories' }
      ]
    };
    
    const { container } = render(
      <FormRenderer schema={schema} formData={{}} onChange={() => {}} />
    );
    
    // Should render all field types correctly
    expect(container.querySelector('[data-field-type="text"]')).toBeInTheDocument();
    expect(container.querySelector('[data-field-type="dropdown"]')).toBeInTheDocument();
    expect(container.querySelector('[data-field-type="dir_list"]')).toBeInTheDocument();
  });
});
```

### **Performance Guidelines**

**React.memo Usage**
```javascript
// Use React.memo for expensive field components
export const ColorListField = React.memo(({ field, value, onChange, ...props }) => {
  // Implementation
}, (prevProps, nextProps) => {
  // Custom comparison for complex fields
  return (
    prevProps.value === nextProps.value &&
    prevProps.field.key === nextProps.field.key &&
    prevProps.highlightInvalid === nextProps.highlightInvalid
  );
});
```

**Expensive Operations Optimization**
```javascript
// Memoize expensive computations
export const JsonField = ({ field, value, onChange, ...props }) => {
  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(value || '{}');
    } catch (error) {
      return null;
    }
  }, [value]);
  
  const isValidJson = parsedJson !== null;
  
  // Component implementation
};
```

**Bundle Size Considerations**
```javascript
// Use dynamic imports for heavy field types
const HeavyCustomField = lazy(() => import('./HeavyCustomField'));

export const FIELD_RENDERERS = {
  // ... basic fields loaded immediately
  heavy_custom: HeavyCustomField, // Loaded when needed
};
```

## 📋 Final Implementation Checklist

### **Architecture Compliance**
- [ ] All field components follow universal interface contract
- [ ] Primitive components are truly reusable (used in multiple fields)
- [ ] Complex fields compose simpler ones (no duplicate logic)
- [ ] Registry pattern enables schema-driven form generation
- [ ] CSS follows compositional architecture (base + field-specific)

### **React Best Practices**
- [ ] Function components with hooks only
- [ ] Complete dependency arrays in useEffect/useCallback
- [ ] React.memo used where beneficial
- [ ] Proper cleanup in useEffect hooks
- [ ] JSDoc documentation for all components

### **Accessibility Compliance**
- [ ] All interactive elements meet 44px touch target minimum
- [ ] Proper ARIA attributes and labels
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Focus management in complex fields

### **Mobile Responsiveness**
- [ ] No horizontal scrolling on 375px viewport
- [ ] Touch-optimized interactions
- [ ] Readable text sizes (16px minimum)
- [ ] Appropriate spacing for mobile
- [ ] Responsive layouts at all breakpoints

### **Integration Compliance**
- [ ] Perfect integration with test-ui provider hierarchy
- [ ] Theme switching affects all form elements
- [ ] Toast notifications for form feedback
- [ ] Error handling integration
- [ ] API integration for dynamic field options

### **Quality Standards**
- [ ] No console errors or warnings
- [ ] Performance optimized (fast rendering/interactions)
- [ ] Clean CSS using design tokens only
- [ ] Cross-browser compatibility
- [ ] Comprehensive test coverage

This comprehensive implementation strategy ensures that the DAPS test-ui form system will be built using true React compositional principles, creating a maintainable, scalable, and reusable architecture that embodies the "write once, use everywhere" philosophy while meeting all quality and accessibility standards.