import React, { useState } from 'react';
import { ToolBar } from '../../components/ToolBar';

/**
 * ToolbarCompoundTest - Development test page for ToolBar compound pattern
 *
 * Tests:
 * - Compound component composition (ToolBar.Section, ToolBar.Button, ToolBar.Separator, ToolBar.Overflow)
 * - Context-based responsive behavior and overflow calculation
 * - Button primitive integration
 * - Mobile responsive layout
 * - Overflow menu functionality (automatic and manual)
 * - Separator visibility on mobile
 * - Keyboard navigation (Arrow Left/Right, Home/End, Escape)
 */
const ToolbarCompoundTest = () => {
    const [actionLog, setActionLog] = useState([]);

    /**
     * Log action to console and state
     */
    const logAction = action => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${action}`;
        console.log(logEntry);
        setActionLog(prev => [logEntry, ...prev].slice(0, 10));
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-screen-xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">ToolBar Compound Pattern Test</h1>
                <p className="text-secondary">
                    Testing compound component pattern with context-based state management,
                    responsive behavior, and Button primitive integration.
                </p>
            </div>

            <div className="flex flex-col gap-8">
                {/* Test 1: Basic Toolbar with Compound Pattern */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Test 1: Basic Compound Toolbar</h2>
                    <p className="text-secondary text-sm">
                        Simple toolbar using compound pattern with ToolBar.Section, ToolBar.Button,
                        and ToolBar.Separator.
                    </p>
                    <div className="flex flex-col gap-3">
                        <ToolBar>
                            <ToolBar.Section alignContent="left">
                                <ToolBar.Button
                                    label="Refresh"
                                    iconName="refresh"
                                    onPress={() => logAction('Refresh clicked')}
                                />
                                <ToolBar.Button
                                    label="Save"
                                    iconName="save"
                                    onPress={() => logAction('Save clicked')}
                                />
                            </ToolBar.Section>
                            <ToolBar.Separator />
                            <ToolBar.Section alignContent="right">
                                <ToolBar.Button
                                    label="Settings"
                                    iconName="settings"
                                    onPress={() => logAction('Settings clicked')}
                                />
                            </ToolBar.Section>
                        </ToolBar>
                    </div>
                    <div className="p-3 bg-bg-secondary rounded border border-default">
                        <strong>Expected behavior:</strong>
                        <ul>
                            <li>Sections align left and right</li>
                            <li>Separator visible between sections</li>
                            <li>Buttons use Phase 2 Button primitives</li>
                            <li>Clicks logged in Action Log below</li>
                        </ul>
                    </div>
                </section>

                {/* Test 2: Multi-Section Toolbar */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Test 2: Multi-Section Layout</h2>
                    <p className="text-secondary text-sm">
                        Toolbar with left, center, and right sections demonstrating flexible layout.
                    </p>
                    <div className="flex flex-col gap-3">
                        <ToolBar>
                            <ToolBar.Section alignContent="left">
                                <ToolBar.Button
                                    label="Undo"
                                    iconName="undo"
                                    onPress={() => logAction('Undo clicked')}
                                />
                                <ToolBar.Button
                                    label="Redo"
                                    iconName="redo"
                                    onPress={() => logAction('Redo clicked')}
                                />
                            </ToolBar.Section>

                            <ToolBar.Separator />

                            <ToolBar.Section alignContent="center">
                                <ToolBar.Button
                                    label="Bold"
                                    iconName="format_bold"
                                    onPress={() => logAction('Bold clicked')}
                                />
                                <ToolBar.Button
                                    label="Italic"
                                    iconName="format_italic"
                                    onPress={() => logAction('Italic clicked')}
                                />
                            </ToolBar.Section>

                            <ToolBar.Separator />

                            <ToolBar.Section alignContent="right">
                                <ToolBar.Button
                                    label="Help"
                                    iconName="help"
                                    onPress={() => logAction('Help clicked')}
                                />
                            </ToolBar.Section>
                        </ToolBar>
                    </div>
                    <div className="p-3 bg-bg-secondary rounded border border-default">
                        <strong>Test instructions:</strong>
                        <ol>
                            <li>Resize browser window to test responsive behavior</li>
                            <li>On mobile (&lt;768px), separators should disappear</li>
                            <li>Sections should maintain alignment at all breakpoints</li>
                        </ol>
                    </div>
                </section>

                {/* Test 3: Overflow Menu Behavior */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Test 3: Overflow Menu</h2>
                    <p className="text-secondary text-sm">
                        Toolbar with many buttons demonstrating overflow menu behavior (Section
                        handles overflow internally).
                    </p>
                    <div className="flex flex-col gap-3">
                        <ToolBar>
                            <ToolBar.Section alignContent="left" collapseButtons={true}>
                                <ToolBar.Button
                                    label="Action 1"
                                    iconName="star"
                                    onPress={() => logAction('Action 1 clicked')}
                                />
                                <ToolBar.Button
                                    label="Action 2"
                                    iconName="favorite"
                                    onPress={() => logAction('Action 2 clicked')}
                                />
                                <ToolBar.Button
                                    label="Action 3"
                                    iconName="bookmark"
                                    onPress={() => logAction('Action 3 clicked')}
                                />
                                <ToolBar.Button
                                    label="Action 4"
                                    iconName="grade"
                                    onPress={() => logAction('Action 4 clicked')}
                                />
                                <ToolBar.Button
                                    label="Action 5"
                                    iconName="workspace_premium"
                                    onPress={() => logAction('Action 5 clicked')}
                                />
                                <ToolBar.Button
                                    label="Action 6"
                                    iconName="verified"
                                    onPress={() => logAction('Action 6 clicked')}
                                />
                            </ToolBar.Section>
                        </ToolBar>
                    </div>
                    <div className="p-3 bg-bg-secondary rounded border border-default">
                        <strong>Expected behavior:</strong>
                        <ul>
                            <li>
                                At narrow widths, some buttons move to &quot;More&quot; overflow
                                menu
                            </li>
                            <li>Overflow menu shows count of hidden buttons</li>
                            <li>Clicking overflow buttons closes menu and executes action</li>
                        </ul>
                    </div>
                </section>

                {/* Test 4: Disabled Buttons */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Test 4: Disabled State</h2>
                    <p className="text-secondary text-sm">
                        Testing disabled button behavior and accessibility.
                    </p>
                    <div className="flex flex-col gap-3">
                        <ToolBar>
                            <ToolBar.Section alignContent="left">
                                <ToolBar.Button
                                    label="Enabled"
                                    iconName="check_circle"
                                    onPress={() => logAction('Enabled button clicked')}
                                />
                                <ToolBar.Button
                                    label="Disabled"
                                    iconName="cancel"
                                    onPress={() => logAction('Disabled clicked (should not fire)')}
                                    isDisabled={true}
                                />
                                <ToolBar.Button
                                    label="Enabled"
                                    iconName="check_circle"
                                    onPress={() => logAction('Second enabled clicked')}
                                />
                            </ToolBar.Section>
                        </ToolBar>
                    </div>
                    <div className="p-3 bg-bg-secondary rounded border border-default">
                        <strong>Test validation:</strong>
                        <ul>
                            <li>Disabled button should have reduced opacity</li>
                            <li>Disabled button should not respond to clicks</li>
                            <li>Keyboard navigation should skip disabled button</li>
                        </ul>
                    </div>
                </section>

                {/* Test 5: Loading State */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Test 5: Loading/Spinning State</h2>
                    <p className="text-secondary text-sm">
                        Testing button loading spinner integration.
                    </p>
                    <div className="flex flex-col gap-3">
                        <ToolBar>
                            <ToolBar.Section alignContent="left">
                                <ToolBar.Button
                                    label="Normal"
                                    iconName="cloud"
                                    onPress={() => logAction('Normal clicked')}
                                />
                                <ToolBar.Button
                                    label="Loading"
                                    iconName="cloud_sync"
                                    isSpinning={true}
                                    onPress={() =>
                                        logAction('Loading clicked (disabled during spin)')
                                    }
                                />
                                <ToolBar.Button
                                    label="Normal"
                                    iconName="cloud_done"
                                    onPress={() => logAction('Normal 2 clicked')}
                                />
                            </ToolBar.Section>
                        </ToolBar>
                    </div>
                    <div className="p-3 bg-bg-secondary rounded border border-default">
                        <strong>Expected behavior:</strong>
                        <ul>
                            <li>Loading button shows spinner instead of icon</li>
                            <li>Loading button is disabled (cannot click)</li>
                            <li>Spinner animates continuously</li>
                        </ul>
                    </div>
                </section>

                {/* Test 6: Context Integration */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Test 6: Context-Aware Separator</h2>
                    <p className="text-secondary text-sm">
                        Testing Separator component&apos;s context-aware responsive behavior.
                    </p>
                    <div className="flex flex-col gap-3">
                        <ToolBar>
                            <ToolBar.Section alignContent="left">
                                <ToolBar.Button
                                    label="Left 1"
                                    iconName="arrow_back"
                                    onPress={() => logAction('Left 1 clicked')}
                                />
                                <ToolBar.Button
                                    label="Left 2"
                                    iconName="arrow_forward"
                                    onPress={() => logAction('Left 2 clicked')}
                                />
                            </ToolBar.Section>
                            <ToolBar.Separator />
                            <ToolBar.Section alignContent="right">
                                <ToolBar.Button
                                    label="Right 1"
                                    iconName="arrow_upward"
                                    onPress={() => logAction('Right 1 clicked')}
                                />
                                <ToolBar.Button
                                    label="Right 2"
                                    iconName="arrow_downward"
                                    onPress={() => logAction('Right 2 clicked')}
                                />
                            </ToolBar.Section>
                        </ToolBar>
                    </div>
                    <div className="p-3 bg-bg-secondary rounded border border-default">
                        <strong>Test instructions:</strong>
                        <ol>
                            <li>At desktop width, separator should be visible between sections</li>
                            <li>Resize to mobile (&lt;768px), separator should disappear</li>
                            <li>Separator uses context to detect viewport size</li>
                        </ol>
                    </div>
                </section>

                {/* Test 7: ToolBar.Overflow Component */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Test 7: ToolBar.Overflow Component</h2>
                    <p className="text-secondary text-sm">
                        Testing dedicated Overflow component with manual overflow buttons.
                    </p>
                    <div className="flex flex-col gap-3">
                        <ToolBar>
                            <ToolBar.Section alignContent="left">
                                <ToolBar.Button
                                    label="Action 1"
                                    iconName="star"
                                    onPress={() => logAction('Action 1 clicked')}
                                />
                                <ToolBar.Button
                                    label="Action 2"
                                    iconName="favorite"
                                    onPress={() => logAction('Action 2 clicked')}
                                />
                            </ToolBar.Section>
                            <ToolBar.Separator />
                            <ToolBar.Section alignContent="right">
                                <ToolBar.Overflow
                                    position="right"
                                    menuIcon="more_vert"
                                    overflowButtons={[
                                        {
                                            key: 'overflow1',
                                            label: 'Overflow Action 1',
                                            iconName: 'settings',
                                            onPress: () => logAction('Overflow Action 1 clicked'),
                                        },
                                        {
                                            key: 'overflow2',
                                            label: 'Overflow Action 2',
                                            iconName: 'help',
                                            onPress: () => logAction('Overflow Action 2 clicked'),
                                        },
                                        {
                                            key: 'overflow3',
                                            label: 'Overflow Action 3',
                                            iconName: 'info',
                                            onPress: () => logAction('Overflow Action 3 clicked'),
                                        },
                                    ]}
                                />
                            </ToolBar.Section>
                        </ToolBar>
                    </div>
                    <div className="p-3 bg-bg-secondary rounded border border-default">
                        <strong>Expected behavior:</strong>
                        <ul>
                            <li>Overflow button shows &quot;More (3)&quot; at desktop</li>
                            <li>Clicking overflow button opens dropdown menu</li>
                            <li>Menu closes on: item click, outside click, Escape key</li>
                            <li>
                                Mobile: Shows &quot;Menu&quot; label instead of &quot;More (3)&quot;
                            </li>
                            <li>Keyboard navigation: Escape closes menu</li>
                        </ul>
                    </div>
                </section>

                {/* Action Log */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Action Log</h2>
                    <div className="p-4 bg-bg-secondary rounded-lg border border-default">
                        {actionLog.length === 0 ? (
                            <p className="text-secondary text-center py-4">
                                No actions yet. Click buttons above to see logs.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {actionLog.map((log, index) => (
                                    <li
                                        key={index}
                                        className="text-sm font-mono p-2 bg-surface rounded border border-default"
                                    >
                                        {log}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                {/* Architecture Notes */}
                <section className="flex flex-col gap-3 p-4 border border-default rounded-lg bg-surface">
                    <h2 className="text-xl font-semibold">Architecture Notes</h2>
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-semibold mb-2">Compound Pattern Benefits</h3>
                        <ul className="list-disc pl-6 mb-4">
                            <li>
                                <strong>Context-based state:</strong> Responsive behavior managed by
                                ToolBarContext
                            </li>
                            <li>
                                <strong>Button primitive reuse:</strong> ToolBar.Button wraps Phase
                                2 Button primitives
                            </li>
                            <li>
                                <strong>Automatic responsive:</strong> Separator hides on mobile via
                                context
                            </li>
                            <li>
                                <strong>Overflow handling:</strong> Section component manages
                                overflow internally
                            </li>
                            <li>
                                <strong>Zero duplication:</strong> Single source of truth for
                                toolbar behavior
                            </li>
                        </ul>

                        <h3 className="text-lg font-semibold mb-2">
                            Current Implementation Status
                        </h3>
                        <ul className="list-disc pl-6 mb-4">
                            <li>✅ ToolBarContext provides responsive state</li>
                            <li>
                                ✅ Compound pattern: ToolBar.Section, ToolBar.Button,
                                ToolBar.Separator, ToolBar.Overflow
                            </li>
                            <li>✅ Button primitive integration complete</li>
                            <li>✅ Context-aware Separator (hides on mobile)</li>
                            <li>
                                ✅ Overflow calculation moved to ToolBarContext (Section consumes
                                context)
                            </li>
                            <li>✅ Keyboard navigation (Arrow Left/Right, Home/End, Escape)</li>
                            <li>✅ ToolBar.Overflow component with Escape key support</li>
                            <li>✅ SearchToolbar migrated to compound pattern</li>
                        </ul>

                        <h3 className="text-lg font-semibold mb-2">Future Enhancements</h3>
                        <ul className="list-disc pl-6">
                            <li>Implement priority-based button overflow</li>
                            <li>Create dedicated mobile menu component with gestures</li>
                            <li>Add Arrow Up/Down navigation in overflow menu</li>
                            <li>Add focus trap in overflow menu</li>
                            <li>Animate section width transitions</li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ToolbarCompoundTest;
