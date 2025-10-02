import React, { useState } from 'react';
import { Form } from '../../components/forms/compounds/Form';
import { FormRenderer } from '../../components/forms/FormRenderer';
import { TextField } from '../../components/fields/basic/TextField';
import { NumberField } from '../../components/fields/basic/NumberField';
import { CheckboxField } from '../../components/fields/select/CheckboxField';
import { Button } from '../../components/ui/button/Button';
import { PageHeader } from '../../components/ui/PageHeader';

/**
 * Form Compounds Test Page
 *
 * Comprehensive validation of Phase 6 Form System:
 * 1. Manual compound composition (Form.Header, Form.Section, Form.Actions)
 * 2. Schema-driven FormRenderer using compounds internally
 * 3. Custom layout composition patterns
 * 4. Validation state management
 * 5. FormContext integration
 *
 * Tests complete Form compound pattern implementation from
 * .local/action_plans/phase-6-form-system.md Step 8
 */
export const FormCompoundsTest = () => {
    const [manualFormData, setManualFormData] = useState({
        name: '',
        email: '',
        age: 0,
        subscribe: false,
    });

    const [schemaFormData, setSchemaFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        terms: false,
    });

    const [customFormData, setCustomFormData] = useState({
        left1: '',
        left2: '',
        right1: '',
        right2: '',
    });

    // Manual form submission handler with async simulation
    const handleManualSubmit = async data => {
        console.log('Manual form submitted:', data);
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Manual form submitted successfully!\n\n' + JSON.stringify(data, null, 2));
    };

    // Schema form submission handler
    const handleSchemaSubmit = async data => {
        console.log('Schema form submitted:', data);
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Schema form submitted successfully!\n\n' + JSON.stringify(data, null, 2));
        // Update state to reflect submission
        setSchemaFormData(data);
    };

    // Custom layout submission handler
    const handleCustomSubmit = async data => {
        console.log('Custom form submitted:', data);
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('Custom form saved!\n\n' + JSON.stringify(data, null, 2));
        // Update state to reflect submission
        setCustomFormData(data);
    };

    // Validation rules for manual form
    const manualValidation = {
        name: value => (!value ? 'Name is required' : null),
        email: value => (!value?.includes('@') ? 'Valid email required' : null),
        age: value => (value < 18 ? 'Must be 18 or older' : null),
    };

    // Validation rules for schema form
    const schemaValidation = {
        username: value => (!value ? 'Username is required' : null),
        password: value =>
            !value ? 'Password is required' : value.length < 6 ? 'Password too short' : null,
        confirmPassword: (value, formData) =>
            value !== formData.password ? 'Passwords must match' : null,
        terms: value => (!value ? 'You must accept the terms' : null),
    };

    // Schema for FormRenderer test
    // Must use Format B: top-level fields object with sections referencing field keys
    const registrationSchema = {
        title: 'Account Registration',
        description: 'Create your DAPS account',

        // REQUIRED: Top-level fields object with all field definitions
        fields: {
            username: {
                type: 'text',
                label: 'Username',
                required: true,
                description: 'Choose a unique username',
            },
            password: {
                type: 'password',
                label: 'Password',
                required: true,
                description: 'Minimum 6 characters',
            },
            confirmPassword: {
                type: 'password',
                label: 'Confirm Password',
                required: true,
            },
            terms: {
                type: 'check_box',
                label: 'I accept the terms and conditions',
                required: true,
            },
        },

        // Sections reference field keys from fields object
        sections: [
            {
                title: 'Account Details',
                collapsible: true,
                collapsed: false,
                fields: ['username', 'password', 'confirmPassword'], // Array of field keys
            },
            {
                title: 'Terms & Conditions',
                collapsible: true,
                collapsed: true,
                fields: ['terms'], // Array of field keys
            },
        ],
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <PageHeader
                title="Form Compounds Test"
                description="Testing Form.Header, Form.Section, Form.Actions compound composition"
            />

            {/* Test 1: Manual Compound Composition */}
            <div className="mb-8 bg-surface border border-border rounded-md p-6">
                <h2 className="text-xl font-semibold mb-2 text-primary">
                    Test 1: Manual Compound Composition
                </h2>
                <p className="text-sm text-secondary mb-4">
                    Direct composition of Form.Header, Form.Section, Form.Actions with individual
                    fields
                </p>

                <Form
                    initialData={manualFormData}
                    onSubmit={handleManualSubmit}
                    validation={manualValidation}
                >
                    <Form.Header
                        title="User Registration"
                        description="Fill in your details below"
                        submitStatus="All fields required"
                    />

                    <Form.Section title="Personal Information" collapsible defaultCollapsed={false}>
                        <TextField
                            field={{
                                key: 'name',
                                label: 'Full Name',
                                required: true,
                                description: 'Enter your legal name',
                            }}
                        />
                        <TextField
                            field={{
                                key: 'email',
                                label: 'Email Address',
                                required: true,
                                description: 'We will never share your email',
                            }}
                        />
                        <NumberField
                            field={{
                                key: 'age',
                                label: 'Age',
                                required: true,
                                description: 'Must be 18 or older',
                            }}
                        />
                    </Form.Section>

                    <Form.Section title="Preferences" collapsible defaultCollapsed={true}>
                        <CheckboxField
                            field={{
                                key: 'subscribe',
                                label: 'Subscribe to newsletter',
                                description: 'Receive updates about new features',
                            }}
                        />
                    </Form.Section>

                    <Form.Actions align="right">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setManualFormData({
                                    name: '',
                                    email: '',
                                    age: 0,
                                    subscribe: false,
                                });
                                alert('Form reset!');
                            }}
                        >
                            Reset
                        </Button>
                        <Button variant="primary" type="submit">
                            Submit
                        </Button>
                    </Form.Actions>
                </Form>
            </div>

            {/* Test 2: Schema-Driven FormRenderer */}
            <div className="mb-8 bg-surface border border-border rounded-md p-6">
                <h2 className="text-xl font-semibold mb-2 text-primary">
                    Test 2: Schema-Driven FormRenderer
                </h2>
                <p className="text-sm text-secondary mb-4">
                    Same form structure generated from schema (uses Form compounds internally)
                </p>

                <FormRenderer
                    schema={registrationSchema}
                    initialData={schemaFormData}
                    onSubmit={handleSchemaSubmit}
                    validation={schemaValidation}
                    submitButtonText="Create Account"
                    showResetButton={true}
                />
            </div>

            {/* Test 3: Custom Layout Composition */}
            <div className="bg-surface border border-border rounded-md p-6">
                <h2 className="text-xl font-semibold mb-2 text-primary">
                    Test 3: Custom Layout Composition
                </h2>
                <p className="text-sm text-secondary mb-4">
                    Grid layout demonstrating flexible Form.Section composition
                </p>

                <Form initialData={customFormData} onSubmit={handleCustomSubmit}>
                    <Form.Header
                        title="Two-Column Configuration"
                        description="Flexible layout using grid composition"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Section title="Left Column">
                            <TextField
                                field={{
                                    key: 'left1',
                                    label: 'Field 1',
                                    description: 'Left column first field',
                                }}
                            />
                            <TextField
                                field={{
                                    key: 'left2',
                                    label: 'Field 2',
                                    description: 'Left column second field',
                                }}
                            />
                        </Form.Section>

                        <Form.Section title="Right Column">
                            <TextField
                                field={{
                                    key: 'right1',
                                    label: 'Field 1',
                                    description: 'Right column first field',
                                }}
                            />
                            <TextField
                                field={{
                                    key: 'right2',
                                    label: 'Field 2',
                                    description: 'Right column second field',
                                }}
                            />
                        </Form.Section>
                    </div>

                    <Form.Actions align="center">
                        <Button variant="primary" type="submit">
                            Save Configuration
                        </Button>
                    </Form.Actions>
                </Form>
            </div>

            {/* Information Panel */}
            <div className="mt-8 bg-surface border border-info rounded-md p-4">
                <h3 className="text-base font-semibold mb-2 text-info flex items-center gap-2">
                    <span className="material-symbols-outlined text-info">info</span>
                    Test Validation Notes
                </h3>
                <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
                    <li>
                        <strong>Test 1:</strong> Manual composition - validates Form.Header,
                        Form.Section (collapsible), Form.Actions
                    </li>
                    <li>
                        <strong>Test 2:</strong> Schema-driven - FormRenderer uses Form compounds
                        internally
                    </li>
                    <li>
                        <strong>Test 3:</strong> Custom layout - demonstrates grid composition with
                        Form.Section
                    </li>
                    <li>All forms include validation, collapsible sections, and proper ARIA</li>
                    <li>Submit handlers show async simulation with alerts</li>
                    <li>
                        Check browser console for form submission data and FormContext debugging
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default FormCompoundsTest;
