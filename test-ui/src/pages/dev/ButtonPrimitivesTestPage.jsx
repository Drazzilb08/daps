import React, { useState } from 'react';
import { PageHeader } from '../../components/ui';
import { Card } from '../../components/ui/card/Card';
import { Button } from '../../components/ui/button/Button';
import { IconButton } from '../../components/ui/button/IconButton';
import { LoadingButton } from '../../components/ui/button/LoadingButton';
import { ButtonGroup } from '../../components/ui/button/ButtonGroup';
import { SplitButton } from '../../components/ui/button/SplitButton';

/**
 * ButtonPrimitivesTestPage - Comprehensive test page for Button System
 *
 * Demonstrates:
 * - All 4 button primitives independently
 * - All 5 button composers
 * - All variant types (primary, secondary, success, danger, ghost)
 * - All size variants (small, medium, large)
 * - State demonstrations (disabled, loading, hover, focus)
 * - Before/after migration examples
 * - Architecture explanation
 */
export const ButtonPrimitivesTestPage = () => {
    const [variant, setVariant] = useState('primary');
    const [size, setSize] = useState('medium');
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadingDemo = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <PageHeader
                title="Button System - Primitive Composition"
                subtitle="Comprehensive test page for button primitives and composers"
            />

            {/* Configuration Controls */}
            <Card>
                <Card.Header title="Configuration" />
                <Card.Body>
                    <div className="flex flex-wrap gap-4">
                        <label className="flex flex-col gap-1">
                            <span className="text-sm text-secondary">Button Variant</span>
                            <select
                                value={variant}
                                onChange={e => setVariant(e.target.value)}
                                className="min-h-11 px-3 rounded-md border border-default bg-surface"
                            >
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                                <option value="success">Success</option>
                                <option value="danger">Danger</option>
                                <option value="ghost">Ghost</option>
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-sm text-secondary">Button Size</span>
                            <select
                                value={size}
                                onChange={e => setSize(e.target.value)}
                                className="min-h-11 px-3 rounded-md border border-default bg-surface"
                            >
                                <option value="small">Small (36px)</option>
                                <option value="medium">Medium (44px - WCAG)</option>
                                <option value="large">Large (48px)</option>
                            </select>
                        </label>
                    </div>
                </Card.Body>
            </Card>

            {/* Primitive Demonstrations */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    Primitive Composition Pattern
                </h2>
                <Card>
                    <Card.Body>
                        <div className="text-sm text-secondary space-y-2">
                            <p>
                                <strong>4 Atomic Primitives:</strong>
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>
                                    <strong>ButtonBase:</strong> Core button element with variants,
                                    sizes, states
                                </li>
                                <li>
                                    <strong>ButtonIcon:</strong> Material Symbols icon rendering
                                </li>
                                <li>
                                    <strong>ButtonText:</strong> Text label with truncation support
                                </li>
                                <li>
                                    <strong>ButtonSpinner:</strong> Loading indicator with reduced
                                    motion
                                </li>
                            </ul>
                            <p className="pt-2">
                                <strong>5 Button Composers:</strong> Button, IconButton,
                                LoadingButton, ButtonGroup, SplitButton
                            </p>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* Button Composer - Standard Button */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    Button Composer (Base + Icon + Text)
                </h2>
                <Card>
                    <Card.Body>
                        <div className="flex flex-wrap gap-3">
                            <Button variant={variant} size={size}>
                                Basic Button
                            </Button>
                            <Button variant={variant} size={size} icon="save">
                                With Icon Left
                            </Button>
                            <Button
                                variant={variant}
                                size={size}
                                icon="arrow_forward"
                                iconPosition="right"
                            >
                                With Icon Right
                            </Button>
                            <Button variant={variant} size={size} disabled>
                                Disabled
                            </Button>
                            <Button variant={variant} size={size} fullWidth>
                                Full Width
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* All Variants Demonstration */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">All Button Variants</h2>
                <Card>
                    <Card.Body>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="primary" size={size} icon="check">
                                Primary
                            </Button>
                            <Button variant="secondary" size={size} icon="info">
                                Secondary
                            </Button>
                            <Button variant="success" size={size} icon="check_circle">
                                Success
                            </Button>
                            <Button variant="danger" size={size} icon="delete">
                                Danger
                            </Button>
                            <Button variant="ghost" size={size} icon="close">
                                Ghost
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* All Sizes Demonstration */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">All Button Sizes</h2>
                <Card>
                    <Card.Body>
                        <div className="flex flex-wrap items-end gap-3">
                            <Button variant={variant} size="small" icon="add">
                                Small (36px)
                            </Button>
                            <Button variant={variant} size="medium" icon="save">
                                Medium (44px - WCAG)
                            </Button>
                            <Button variant={variant} size="large" icon="upload">
                                Large (48px)
                            </Button>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* IconButton Composer */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    IconButton Composer (Base + Icon)
                </h2>
                <Card>
                    <Card.Body>
                        <div className="flex flex-wrap gap-3">
                            <IconButton
                                icon="close"
                                variant={variant}
                                size={size}
                                aria-label="Close"
                            />
                            <IconButton
                                icon="edit"
                                variant="primary"
                                size={size}
                                aria-label="Edit"
                            />
                            <IconButton
                                icon="delete"
                                variant="danger"
                                size={size}
                                aria-label="Delete"
                            />
                            <IconButton
                                icon="favorite"
                                variant="ghost"
                                size={size}
                                aria-label="Favorite"
                            />
                            <IconButton
                                icon="search"
                                variant="secondary"
                                size={size}
                                disabled
                                aria-label="Search"
                            />
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* LoadingButton Composer */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    LoadingButton Composer (Base + Text + Spinner)
                </h2>
                <Card>
                    <Card.Body>
                        <div className="flex flex-wrap gap-3">
                            <LoadingButton
                                variant={variant}
                                size={size}
                                loading={isLoading}
                                onClick={handleLoadingDemo}
                            >
                                Click to Load
                            </LoadingButton>
                            <LoadingButton
                                variant="success"
                                size={size}
                                loading={isLoading}
                                loadingText="Saving..."
                                icon="save"
                            >
                                Save Changes
                            </LoadingButton>
                            <LoadingButton
                                variant="danger"
                                size={size}
                                loading={false}
                                loadingText="Deleting..."
                                icon="delete"
                            >
                                Delete Item
                            </LoadingButton>
                        </div>
                        <p className="text-sm text-secondary">
                            Click &ldquo;Click to Load&rdquo; to see loading state demonstration (2
                            second delay)
                        </p>
                    </Card.Body>
                </Card>
            </section>

            {/* ButtonGroup Composer */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    ButtonGroup Composer (Horizontal Layout)
                </h2>
                <Card>
                    <Card.Body>
                        <div>
                            <p className="text-sm text-secondary mb-3">Horizontal Group</p>
                            <ButtonGroup orientation="horizontal" spacing="medium">
                                <Button variant="secondary" size={size}>
                                    Cancel
                                </Button>
                                <Button variant="primary" size={size}>
                                    Save
                                </Button>
                            </ButtonGroup>
                        </div>
                        <div>
                            <p className="text-sm text-secondary mb-3">Vertical Group</p>
                            <ButtonGroup orientation="vertical" spacing="small">
                                <Button variant={variant} size={size} icon="edit">
                                    Edit
                                </Button>
                                <Button variant="danger" size={size} icon="delete">
                                    Delete
                                </Button>
                                <Button variant="secondary" size={size} icon="share">
                                    Share
                                </Button>
                            </ButtonGroup>
                        </div>
                        <div>
                            <p className="text-sm text-secondary mb-3">Large Spacing</p>
                            <ButtonGroup orientation="horizontal" spacing="large">
                                <Button variant={variant} size={size} icon="arrow_back">
                                    Previous
                                </Button>
                                <Button
                                    variant={variant}
                                    size={size}
                                    icon="arrow_forward"
                                    iconPosition="right"
                                >
                                    Next
                                </Button>
                            </ButtonGroup>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* SplitButton Composer */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    SplitButton Composer (Button + IconButton + Dropdown)
                </h2>
                <Card>
                    <Card.Body>
                        <div className="flex flex-wrap gap-3">
                            <SplitButton
                                variant={variant}
                                size={size}
                                onClick={() => alert('Primary action')}
                                options={[
                                    {
                                        label: 'Save as Draft',
                                        icon: 'draft',
                                        onClick: () => alert('Save as draft'),
                                    },
                                    {
                                        label: 'Save and Publish',
                                        icon: 'publish',
                                        onClick: () => alert('Save and publish'),
                                    },
                                ]}
                            >
                                Save
                            </SplitButton>
                            <SplitButton
                                variant="success"
                                size={size}
                                icon="upload"
                                onClick={() => alert('Upload single')}
                                options={[
                                    {
                                        label: 'Upload Multiple',
                                        icon: 'upload_file',
                                        onClick: () => alert('Upload multiple'),
                                    },
                                    {
                                        label: 'Upload from URL',
                                        icon: 'link',
                                        onClick: () => alert('Upload from URL'),
                                    },
                                ]}
                            >
                                Upload File
                            </SplitButton>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* State Demonstrations */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    Interactive State Demonstrations
                </h2>
                <Card>
                    <Card.Body>
                        <div>
                            <p className="text-sm text-secondary mb-3">Hover States</p>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary" size={size}>
                                    Hover Me
                                </Button>
                                <Button variant="success" size={size} icon="check">
                                    With Icon
                                </Button>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-secondary mb-3">
                                Focus States (Tab Navigation)
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary" size={size}>
                                    Tab to Focus
                                </Button>
                                <IconButton
                                    icon="search"
                                    variant="primary"
                                    size={size}
                                    aria-label="Search"
                                />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-secondary mb-3">Disabled States</p>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary" size={size} disabled>
                                    Disabled Button
                                </Button>
                                <IconButton
                                    icon="close"
                                    variant="danger"
                                    size={size}
                                    disabled
                                    aria-label="Close"
                                />
                                <LoadingButton variant="success" size={size} disabled>
                                    Disabled Loading
                                </LoadingButton>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* Migration Examples */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">Migration Guide</h2>
                <Card>
                    <Card.Body>
                        <div className="text-sm text-secondary space-y-3">
                            <div>
                                <p className="font-semibold text-primary mb-2">
                                    Old Button API (Deprecated):
                                </p>
                                <pre className="bg-surface-alt p-3 rounded-md overflow-x-auto">
                                    <code>{`<Button color="primary">Save</Button>`}</code>
                                </pre>
                            </div>
                            <div>
                                <p className="font-semibold text-primary mb-2">
                                    New Button API (Primitive Composition):
                                </p>
                                <pre className="bg-surface-alt p-3 rounded-md overflow-x-auto">
                                    <code>{`<Button variant="primary">Save</Button>`}</code>
                                </pre>
                            </div>
                            <div className="pt-2">
                                <p className="font-semibold text-primary mb-2">Key Changes:</p>
                                <ul className="list-disc pl-6 space-y-1">
                                    <li>
                                        <code className="text-accent">color</code> prop renamed to{' '}
                                        <code className="text-accent">variant</code>
                                    </li>
                                    <li>
                                        No inline styles - uses utility classes for theme colors
                                    </li>
                                    <li>useState for hover removed - CSS handles hover states</li>
                                    <li>All composers use same primitive base</li>
                                </ul>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </section>

            {/* Architecture Documentation */}
            <Card>
                <Card.Header title="Architecture Documentation" />
                <Card.Body>
                    <div className="text-sm text-secondary space-y-2">
                        <p>
                            <strong>Primitive Composition:</strong> Every button is built by
                            composing:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>ButtonBase primitive (core button element)</li>
                            <li>ButtonIcon primitive (Material Symbols icons)</li>
                            <li>ButtonText primitive (text label)</li>
                            <li>ButtonSpinner primitive (loading indicator)</li>
                        </ul>
                        <p className="pt-2">
                            <strong>Zero Duplication:</strong> All button logic exists only in
                            primitives
                        </p>
                        <p>
                            <strong>Five Composers:</strong> Button, IconButton, LoadingButton,
                            ButtonGroup, SplitButton
                        </p>
                        <p>
                            <strong>Fully Reusable:</strong> Each composer can be used anywhere, not
                            just in specific contexts
                        </p>
                        <p className="pt-2">
                            <strong>Accessibility:</strong> WCAG 2.1 AA compliant - 44px minimum
                            touch targets, proper ARIA labels, keyboard navigation
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default ButtonPrimitivesTestPage;
