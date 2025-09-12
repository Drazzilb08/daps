/**
 * Demo Form Schemas - Comprehensive examples showcasing all field types and features
 * 
 * These schemas demonstrate the full power of the schema-driven form system,
 * including validation, conditional fields, and complex compositions.
 */

/**
 * Basic Form Schema - Simple example with common field types
 */
export const basicFormSchema = {
  title: "User Registration",
  description: "Create your account with basic information",
  submitLabel: "Create Account",
  cancelLabel: "Reset",
  layout: "vertical",
  validateOnChange: true,
  
  fields: {
    firstName: {
      type: "text",
      label: "First Name",
      placeholder: "Enter your first name",
      required: true,
      validation: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: "^[a-zA-Z\\s]+$"
      }
    },
    
    lastName: {
      type: "text",
      label: "Last Name",
      placeholder: "Enter your last name",
      required: true,
      validation: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: "^[a-zA-Z\\s]+$"
      }
    },
    
    email: {
      type: "text",
      label: "Email Address",
      placeholder: "user@example.com",
      required: true,
      validation: {
        required: true,
        email: true
      }
    },
    
    password: {
      type: "password",
      label: "Password",
      placeholder: "Enter a secure password",
      required: true,
      validation: {
        required: true,
        minLength: 8,
        custom: (value) => {
          if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            return "Password must contain at least one uppercase letter, lowercase letter, and number";
          }
          return null;
        }
      }
    },
    
    age: {
      type: "number",
      label: "Age",
      placeholder: "Enter your age",
      required: true,
      min: 13,
      max: 120,
      validation: {
        required: true,
        min: 13,
        max: 120
      }
    },
    
    terms: {
      type: "check_box",
      label: "I agree to the terms and conditions",
      required: true,
      validation: {
        custom: (value) => value ? null : "You must accept the terms and conditions"
      }
    }
  }
};

/**
 * Comprehensive Field Showcase Schema - All field types with validation
 */
export const comprehensiveFieldSchema = {
  title: "Complete Field Type Showcase",
  description: "Demonstration of all available field types and validation features",
  submitLabel: "Submit Form",
  cancelLabel: "Clear All",
  showProgress: true,
  validateOnChange: true,
  
  sections: [
    {
      title: "Basic Text Fields",
      description: "Standard text input variations",
      fields: ["basicText", "passwordField", "textareaField", "hiddenField"]
    },
    {
      title: "Numeric Fields", 
      description: "Number and float inputs with validation",
      fields: ["numberField", "floatField", "rangeField"]
    },
    {
      title: "Selection Fields",
      description: "Dropdowns and checkboxes",
      fields: ["dropdownField", "checkboxField"]
    },
    {
      title: "Color & Visual Fields",
      description: "Color pickers and visual selection tools",
      fields: ["colorField", "colorListField"]
    },
    {
      title: "Directory & File Fields",
      description: "Path selection and file management",
      fields: ["dirField", "dirListField"]
    },
    {
      title: "Advanced Custom Fields",
      description: "Complex specialized field types",
      collapsible: true,
      collapsed: true,
      fields: ["jsonField", "instanceField"]
    }
  ],
  
  fields: {
    // Basic text fields
    basicText: {
      type: "text",
      label: "Basic Text Input",
      description: "Standard text field with validation",
      placeholder: "Enter some text...",
      required: true,
      maxLength: 100,
      validation: {
        required: true,
        minLength: 3,
        maxLength: 100
      }
    },
    
    passwordField: {
      type: "password", 
      label: "Password Field",
      description: "Secure password input with strength requirements",
      placeholder: "Create a strong password",
      required: true,
      validation: {
        required: true,
        minLength: 8,
        custom: (value) => {
          const hasLower = /[a-z]/.test(value);
          const hasUpper = /[A-Z]/.test(value);
          const hasDigit = /\d/.test(value);
          const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
          
          if (!hasLower) return "Password must contain lowercase letters";
          if (!hasUpper) return "Password must contain uppercase letters";
          if (!hasDigit) return "Password must contain numbers";
          if (!hasSpecial) return "Password must contain special characters";
          
          return null;
        }
      }
    },
    
    textareaField: {
      type: "textarea",
      label: "Multi-line Text",
      description: "Large text input for longer content",
      placeholder: "Enter detailed information...",
      required: false,
      maxLength: 500,
      validation: {
        maxLength: 500
      }
    },
    
    hiddenField: {
      type: "hidden",
      default: "hidden-value-123"
    },
    
    // Numeric fields
    numberField: {
      type: "number",
      label: "Integer Number",
      description: "Whole numbers only",
      placeholder: "Enter a number",
      required: true,
      min: 1,
      max: 1000,
      validation: {
        required: true,
        min: 1,
        max: 1000
      }
    },
    
    floatField: {
      type: "float",
      label: "Decimal Number",
      description: "Numbers with decimal places",
      placeholder: "0.00",
      required: false,
      min: 0,
      max: 99.99,
      step: 0.01,
      validation: {
        min: 0,
        max: 99.99
      }
    },
    
    rangeField: {
      type: "number",
      label: "Score (1-10)",
      description: "Rate your experience",
      required: true,
      min: 1,
      max: 10,
      default: 5,
      validation: {
        required: true,
        min: 1,
        max: 10
      }
    },
    
    // Selection fields
    dropdownField: {
      type: "dropdown",
      label: "Country",
      description: "Select your country",
      placeholder: "Choose a country...",
      required: true,
      options: [
        { value: "us", label: "United States" },
        { value: "ca", label: "Canada" },
        { value: "uk", label: "United Kingdom" },
        { value: "au", label: "Australia" },
        { value: "de", label: "Germany" },
        { value: "fr", label: "France" },
        { value: "jp", label: "Japan" }
      ],
      validation: {
        required: true
      }
    },
    
    checkboxField: {
      type: "check_box",
      label: "Newsletter Subscription",
      description: "Receive updates and promotional emails",
      default: false
    },
    
    // radioField: {
    //   type: "radio", // TODO: Implement RadioField  
    //   label: "Preferred Contact Method",
    //   description: "How would you like to be contacted?",
    //   required: true,
    //   options: [...],
    //   validation: {
    //     required: true
    //   }
    // },
    
    // multiSelectField: {
    //   type: "multi_select", // TODO: Implement MultiSelectField
    //   label: "Interests", 
    //   description: "Select all topics that interest you",
    //   multiple: true,
    //   options: [...],
    //   default: [],
    //   validation: {...}
    // },
    
    // Color fields
    colorField: {
      type: "color",
      label: "Favorite Color",
      description: "Pick your preferred color",
      default: "#0066cc",
      required: false
    },
    
    colorListField: {
      type: "color_list",
      label: "Color Palette",
      description: "Create a custom color palette",
      default: ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4"],
      validation: {
        minItems: 2,
        maxItems: 8
      }
    },
    
    // Directory fields
    dirField: {
      type: "dir",
      label: "Installation Directory",
      description: "Select the installation path",
      placeholder: "/path/to/directory",
      required: false,
      validation: {
        pattern: "^(/[^/ ]*)+/?$"
      }
    },
    
    dirListField: {
      type: "dir_list",
      label: "Search Directories",
      description: "Add multiple directories to search",
      default: ["/home/user/Documents", "/home/user/Downloads"],
      validation: {
        minItems: 1,
        maxItems: 10
      }
    },
    
    // Advanced custom fields
    jsonField: {
      type: "json",
      label: "Configuration JSON",
      description: "Enter valid JSON configuration",
      placeholder: '{\n  "key": "value"\n}',
      required: false,
      validation: {
        custom: (value) => {
          if (!value) return null;
          try {
            JSON.parse(value);
            return null;
          } catch (error) {
            return "Invalid JSON format";
          }
        }
      }
    },
    
    instanceField: {
      type: "instance_dropdown",
      label: "Service Instance",
      description: "Select a configured service instance",
      placeholder: "Choose an instance...",
      required: false,
      options: [
        { value: "prod-01", label: "Production Server 01" },
        { value: "staging-01", label: "Staging Server 01" },
        { value: "dev-01", label: "Development Server 01" }
      ]
    }
  },
  
  // Form-level validation
  customValidate: (formData) => {
    const errors = {};
    
    // Cross-field validation example
    if (formData.floatField && formData.numberField && 
        parseFloat(formData.floatField) > formData.numberField) {
      errors.floatField = "Decimal value cannot exceed the integer value";
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
  }
};

/**
 * Conditional Fields Schema - Demonstrates field dependencies and dynamic forms
 */
export const conditionalFieldsSchema = {
  title: "Dynamic Form with Conditional Fields",
  description: "Fields appear and disappear based on your selections",
  submitLabel: "Submit Application",
  validateOnChange: true,
  showProgress: true,
  
  sections: [
    {
      title: "Basic Information",
      fields: ["userType", "companyName", "personalInfo"]
    },
    {
      title: "Service Selection",
      fields: ["serviceType", "basicPlan", "premiumPlan", "enterprisePlan"]
    },
    {
      title: "Additional Options",
      fields: ["newsletter", "promotions", "specialOffers"]
    }
  ],
  
  fields: {
    userType: {
      type: "radio",
      label: "User Type",
      description: "Select your account type",
      required: true,
      options: [
        { value: "individual", label: "Individual User" },
        { value: "business", label: "Business Account" }
      ],
      default: "individual",
      validation: {
        required: true
      }
    },
    
    companyName: {
      type: "text",
      label: "Company Name",
      description: "Enter your company or organization name",
      placeholder: "ACME Corp",
      required: true,
      conditionalOn: "userType",
      conditionalValue: "business",
      validation: {
        required: true,
        minLength: 2,
        maxLength: 100
      }
    },
    
    personalInfo: {
      type: "textarea",
      label: "Tell us about yourself",
      description: "Brief personal introduction",
      placeholder: "I'm interested in...",
      conditionalOn: "userType",
      conditionalValue: "individual",
      validation: {
        maxLength: 300
      }
    },
    
    serviceType: {
      type: "dropdown",
      label: "Service Level",
      description: "Choose your service package",
      required: true,
      options: [
        { value: "basic", label: "Basic ($9/month)" },
        { value: "premium", label: "Premium ($29/month)" },
        { value: "enterprise", label: "Enterprise (Custom)" }
      ],
      validation: {
        required: true
      }
    },
    
    basicPlan: {
      type: "check_box",
      label: "Include basic support (free)",
      conditionalOn: "serviceType",
      conditionalValue: "basic",
      default: true
    },
    
    premiumPlan: {
      type: "textarea", // Changed from multi_select to textarea for now
      label: "Premium Add-ons Description", 
      description: "Describe the premium features you need",
      placeholder: "Please describe which premium features interest you...",
      conditionalOn: "serviceType",
      conditionalValue: "premium",
      validation: {
        maxLength: 500
      }
    },
    
    enterprisePlan: {
      type: "textarea",
      label: "Enterprise Requirements",
      description: "Describe your specific enterprise needs",
      placeholder: "We need custom features for...",
      conditionalOn: "serviceType",
      conditionalValue: "enterprise",
      required: true,
      validation: {
        required: true,
        minLength: 20,
        maxLength: 1000
      }
    },
    
    newsletter: {
      type: "check_box",
      label: "Subscribe to newsletter",
      description: "Get weekly updates and tips",
      conditionalOn: "userType",
      conditionalOperator: "truthy",
      default: false
    },
    
    promotions: {
      type: "check_box",
      label: "Receive promotional offers",
      description: "Special discounts and limited-time offers",
      conditionalOn: "newsletter",
      conditionalOperator: "truthy",
      default: false
    },
    
    specialOffers: {
      type: "dropdown",
      label: "Preferred Offer Type",
      description: "What kind of offers interest you most?",
      conditionalOn: "promotions",
      conditionalOperator: "truthy",
      options: [
        { value: "discounts", label: "Price Discounts" },
        { value: "features", label: "Free Feature Upgrades" },
        { value: "early-access", label: "Early Access to New Features" },
        { value: "bundles", label: "Service Bundles" }
      ]
    }
  }
};

/**
 * Validation Showcase Schema - Complex validation scenarios
 */
export const validationShowcaseSchema = {
  title: "Advanced Validation Examples",
  description: "Comprehensive validation rules and custom validators",
  submitLabel: "Validate & Submit",
  validateOnChange: true,
  
  fields: {
    username: {
      type: "text",
      label: "Username",
      description: "3-20 characters, letters, numbers, and underscores only",
      placeholder: "user_name123",
      required: true,
      validation: {
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: "^[a-zA-Z0-9_]+$",
        custom: async (value) => {
          // Simulate async validation (checking if username is taken)
          if (value === "admin" || value === "administrator") {
            return "This username is reserved";
          }
          return null;
        }
      }
    },
    
    website: {
      type: "text",
      label: "Website URL",
      description: "Must be a valid website URL",
      placeholder: "https://example.com",
      validation: {
        url: true,
        custom: (value) => {
          if (value && !value.startsWith('https://')) {
            return "URL must use HTTPS protocol";
          }
          return null;
        }
      }
    },
    
    phone: {
      type: "text",
      label: "Phone Number",
      description: "US format: (123) 456-7890",
      placeholder: "(123) 456-7890",
      validation: {
        pattern: "^\\(\\d{3}\\) \\d{3}-\\d{4}$"
      }
    },
    
    dateRange: {
      type: "text",
      label: "Birth Year",
      description: "Must be between 1900 and current year",
      placeholder: "1990",
      validation: {
        custom: (value) => {
          if (!value) return null;
          const year = parseInt(value);
          const currentYear = new Date().getFullYear();
          
          if (isNaN(year)) return "Please enter a valid year";
          if (year < 1900) return "Year must be 1900 or later";
          if (year > currentYear) return `Year cannot be later than ${currentYear}`;
          if (year > currentYear - 13) return "Must be at least 13 years old";
          
          return null;
        }
      }
    },
    
    tags: {
      type: "textarea", // Changed from multi_select 
      label: "Skills",
      description: "List 3-5 of your top skills (one per line)",
      placeholder: "JavaScript\nPython\nReact\n...",
      validation: {
        custom: (value) => {
          if (!value) return "Please list your skills";
          const skills = value.split('\n').filter(s => s.trim());
          if (skills.length < 3) return "Please list at least 3 skills";
          if (skills.length > 5) return "Please limit to 5 skills maximum";
          return null;
        }
      }
    },
    
    portfolio: {
      type: "json",
      label: "Portfolio Projects",
      description: "JSON array of your projects",
      placeholder: '[{\n  "name": "Project Name",\n  "url": "https://...",\n  "description": "..."\n}]',
      validation: {
        custom: (value) => {
          if (!value) return null;
          
          try {
            const projects = JSON.parse(value);
            if (!Array.isArray(projects)) {
              return "Must be a JSON array of projects";
            }
            
            if (projects.length < 1) {
              return "Please include at least one project";
            }
            
            if (projects.length > 5) {
              return "Please limit to 5 projects maximum";
            }
            
            for (const project of projects) {
              if (!project.name || !project.url || !project.description) {
                return "Each project must have name, url, and description";
              }
            }
            
            return null;
          } catch (error) {
            return "Invalid JSON format";
          }
        }
      }
    }
  }
};

export default {
  basicFormSchema,
  comprehensiveFieldSchema,
  conditionalFieldsSchema,
  validationShowcaseSchema
};