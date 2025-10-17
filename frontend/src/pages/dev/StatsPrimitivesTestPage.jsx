import React, { useState } from 'react';
import { PageHeader } from '../../components/ui';
import { StatCard } from '../../components/ui';
import { StatGrid, StatList, StatInline } from '../../components/statistics';
import { Card } from '../../components/ui/card/Card';

/**
 * StatsPrimitivesTestPage - Comprehensive test page for Statistics System
 *
 * Demonstrates:
 * - All primitive compositions
 * - All layout variants (Grid, List, Inline)
 * - All Card variants
 * - All value color variants
 * - Change indicators (positive, negative, inverse)
 * - Custom formatting
 * - Interactive controls
 */
export const StatsPrimitivesTestPage = () => {
    const [columns, setColumns] = useState(3);
    const [gap, setGap] = useState('4');
    const [variant, setVariant] = useState('standard');

    return (
        <div className="flex flex-col gap-6 p-6">
            <PageHeader
                title="Statistics System - Primitive Composition"
                subtitle="Comprehensive test page for StatCard primitive and layout composers"
            />

            {/* Configuration Controls */}
            <Card>
                <Card.Header title="Configuration" />
                <Card.Body>
                    <div className="flex flex-wrap gap-4">
                        <label className="flex flex-col gap-1">
                            <span className="text-sm text-secondary">Grid Columns</span>
                            <select
                                value={columns}
                                onChange={e => setColumns(Number(e.target.value))}
                                className="min-h-11 px-3 rounded-md border border-default bg-surface"
                            >
                                <option value={2}>2 columns</option>
                                <option value={3}>3 columns</option>
                                <option value={4}>4 columns</option>
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-sm text-secondary">Gap Size</span>
                            <select
                                value={gap}
                                onChange={e => setGap(e.target.value)}
                                className="min-h-11 px-3 rounded-md border border-default bg-surface"
                            >
                                <option value="2">Small (gap-2)</option>
                                <option value="3">Medium (gap-3)</option>
                                <option value="4">Large (gap-4)</option>
                                <option value="6">Extra Large (gap-6)</option>
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-sm text-secondary">Card Variant</span>
                            <select
                                value={variant}
                                onChange={e => setVariant(e.target.value)}
                                className="min-h-11 px-3 rounded-md border border-default bg-surface"
                            >
                                <option value="standard">Standard</option>
                                <option value="compact">Compact</option>
                                <option value="bordered">Bordered</option>
                                <option value="minimal">Minimal</option>
                            </select>
                        </label>
                    </div>
                </Card.Body>
            </Card>

            {/* StatGrid Layout - Basic Usage */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">StatGrid Layout (Basic)</h2>
                <StatGrid columns={columns} gap={gap}>
                    <StatCard label="Total Users" value={1234} icon="👥" variant={variant} />
                    <StatCard
                        label="Revenue"
                        value={42000}
                        icon="💰"
                        variant={variant}
                        valueColor="success"
                        valueFormat={v => `$${v.toLocaleString()}`}
                    />
                    <StatCard label="Orders" value={567} icon="📦" variant={variant} />
                </StatGrid>
            </section>

            {/* StatGrid with Change Indicators */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    StatGrid with Trend Indicators
                </h2>
                <StatGrid columns={columns} gap={gap}>
                    <StatCard
                        label="Active Users"
                        value={8432}
                        icon="👤"
                        change={{ value: 12.5, direction: 'up' }}
                        valueColor="primary"
                        variant={variant}
                    />
                    <StatCard
                        label="Response Time"
                        value={125}
                        icon="⚡"
                        subtext="milliseconds"
                        change={{ value: -15, direction: 'down', inverse: true }}
                        valueColor="success"
                        variant={variant}
                    />
                    <StatCard
                        label="Error Rate"
                        value="0.8%"
                        icon="❌"
                        change={{ value: 0.3, direction: 'up' }}
                        valueColor="error"
                        variant={variant}
                    />
                    <StatCard
                        label="Conversion Rate"
                        value="3.2%"
                        icon="🎯"
                        change={{ value: -0.5, direction: 'down' }}
                        valueColor="warning"
                        variant={variant}
                    />
                </StatGrid>
            </section>

            {/* StatList Layout */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">StatList Layout (Vertical)</h2>
                <StatList gap="3">
                    <StatCard
                        label="Total Revenue"
                        value={125000}
                        icon="💵"
                        variant="compact"
                        valueColor="success"
                        valueFormat={v => `$${v.toLocaleString()}`}
                        change={{ value: 8.2, direction: 'up' }}
                    />
                    <StatCard
                        label="New Customers"
                        value={89}
                        icon="🆕"
                        variant="compact"
                        valueColor="primary"
                        change={{ value: 5, direction: 'up' }}
                    />
                    <StatCard
                        label="Churn Rate"
                        value="2.1%"
                        icon="📉"
                        variant="compact"
                        valueColor="warning"
                        change={{ value: -0.3, direction: 'down', inverse: true }}
                    />
                </StatList>
            </section>

            {/* StatInline Layout */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    StatInline Layout (Horizontal)
                </h2>
                <StatInline gap="4" wrap={true}>
                    <StatCard label="Views" value={15234} variant="minimal" valueColor="primary" />
                    <StatCard label="Clicks" value={2341} variant="minimal" valueColor="success" />
                    <StatCard label="CTR" value="15.4%" variant="minimal" />
                    <StatCard label="Bounce" value="32%" variant="minimal" valueColor="warning" />
                </StatInline>
            </section>

            {/* All Card Variants Side-by-Side */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">All Card Variants</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Standard"
                        value={1234}
                        icon="📊"
                        variant="standard"
                        subtext="Default variant"
                    />
                    <StatCard
                        label="Compact"
                        value={5678}
                        icon="📈"
                        variant="compact"
                        subtext="Smaller spacing"
                    />
                    <StatCard
                        label="Bordered"
                        value={9012}
                        icon="📉"
                        variant="bordered"
                        subtext="Primary border"
                    />
                    <StatCard
                        label="Minimal"
                        value={3456}
                        icon="📋"
                        variant="minimal"
                        subtext="Minimal styling"
                    />
                </div>
            </section>

            {/* All Value Colors */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">All Value Color Variants</h2>
                <StatGrid columns={4} gap="4">
                    <StatCard label="Default" value={1000} variant="compact" />
                    <StatCard label="Primary" value={2000} valueColor="primary" variant="compact" />
                    <StatCard label="Success" value={3000} valueColor="success" variant="compact" />
                    <StatCard label="Warning" value={4000} valueColor="warning" variant="compact" />
                    <StatCard label="Error" value={5000} valueColor="error" variant="compact" />
                </StatGrid>
            </section>

            {/* Complex Example: Dashboard Summary */}
            <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold text-primary">
                    Complex Example: Dashboard Summary
                </h2>
                <Card variant="bordered">
                    <Card.Header title="Sales Dashboard" />
                    <Card.Body>
                        <StatGrid columns={4} gap="3">
                            <StatCard
                                label="Today's Sales"
                                value={4250}
                                icon="💰"
                                variant="compact"
                                valueColor="success"
                                valueFormat={v => `$${v.toLocaleString()}`}
                                change={{ value: 12.5, direction: 'up' }}
                            />
                            <StatCard
                                label="Orders"
                                value={42}
                                icon="📦"
                                variant="compact"
                                valueColor="primary"
                                change={{ value: 3, direction: 'up' }}
                            />
                            <StatCard
                                label="Avg Order Value"
                                value={101.19}
                                icon="💵"
                                variant="compact"
                                valueFormat={v => `$${v.toFixed(2)}`}
                                change={{ value: 8.3, direction: 'up' }}
                            />
                            <StatCard
                                label="Conversion"
                                value="3.2%"
                                icon="🎯"
                                variant="compact"
                                valueColor="warning"
                                change={{ value: -0.5, direction: 'down' }}
                            />
                        </StatGrid>
                    </Card.Body>
                </Card>
            </section>

            {/* Composition Documentation */}
            <Card>
                <Card.Header title="Architecture Documentation" />
                <Card.Body>
                    <div className="text-sm text-secondary space-y-2">
                        <p>
                            <strong>Primitive Composition:</strong> Every StatCard is built by
                            composing:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Card primitive (base structure)</li>
                            <li>StatIcon primitive (icon display)</li>
                            <li>StatLabel primitive (label text)</li>
                            <li>StatValue primitive (value display)</li>
                            <li>StatChange primitive (trend indicator)</li>
                        </ul>
                        <p className="pt-2">
                            <strong>Zero Duplication:</strong> Card structure reused, not
                            reimplemented
                        </p>
                        <p>
                            <strong>Three Layout Variants:</strong> StatGrid, StatList, StatInline
                        </p>
                        <p>
                            <strong>Fully Reusable:</strong> StatCard can be used anywhere, not just
                            in layouts
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default StatsPrimitivesTestPage;
