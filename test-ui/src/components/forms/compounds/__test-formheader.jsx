/**
 * Manual test file for FormHeader component
 * This file demonstrates all FormHeader prop combinations
 *
 * To test: Import this component into a dev route
 */

import React from 'react';
import { FormHeader } from './FormHeader';

export const FormHeaderTest = () => {
    return (
        <div className="p-6 max-w-screen-lg mx-auto">
            <h1 className="text-3xl font-bold mb-8">FormHeader Test Cases</h1>

            {/* Test 1: Full header */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 1: Full Header</h3>
                <FormHeader
                    title="User Registration"
                    description="Fill in your details below"
                    submitStatus="All fields required"
                />
            </div>

            {/* Test 2: Title only */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 2: Title Only</h3>
                <FormHeader title="Settings" />
            </div>

            {/* Test 3: Description only */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 3: Description Only</h3>
                <FormHeader description="Configure your preferences" />
            </div>

            {/* Test 4: Status only */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 4: Status Only</h3>
                <FormHeader submitStatus="Unsaved changes" />
            </div>

            {/* Test 5: Title + Description */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 5: Title + Description</h3>
                <FormHeader
                    title="Profile Settings"
                    description="Update your profile information"
                />
            </div>

            {/* Test 6: Title + Status */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 6: Title + Status</h3>
                <FormHeader title="Account Settings" submitStatus="Saved" />
            </div>

            {/* Test 7: Description + Status */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 7: Description + Status</h3>
                <FormHeader
                    description="Customize your experience"
                    submitStatus="Auto-save enabled"
                />
            </div>

            {/* Test 8: No content (null rendering) */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 8: No Content (Null Rendering)</h3>
                <div className="p-3 bg-error-subtle border border-error-border rounded">
                    <p className="text-sm text-error">
                        If you see this border, null rendering works
                    </p>
                </div>
                <FormHeader />
            </div>

            {/* Test 9: Custom className */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 9: Custom ClassName</h3>
                <FormHeader title="Custom Styling" className="p-4 bg-primary-subtle rounded-md" />
            </div>

            {/* Test 10: ReactNode as submitStatus */}
            <div className="mb-8 p-4 bg-surface rounded-md">
                <h3 className="text-lg font-semibold mb-3">Test 10: ReactNode Status</h3>
                <FormHeader
                    title="Advanced Status"
                    submitStatus={
                        <span className="text-success font-semibold">✓ All changes saved</span>
                    }
                />
            </div>
        </div>
    );
};

export default FormHeaderTest;
