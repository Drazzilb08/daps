import React from 'react';
import { ToolBar } from '../../components/ToolBar';

const ToolbarTestPage = () => {
    const handleButtonClick = buttonName => {
        console.log(`${buttonName} button clicked`);
    };

    return (
        <div className="grid gap-12 max-w-full">
            <h1>Toolbar Overflow Test</h1>
            <p>Resize your browser window to test the responsive overflow behavior.</p>
            <p>
                Buttons should move to an overflow &quot;More&quot; menu instead of getting
                compressed.
            </p>

            <div style={{ marginTop: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <ToolBar>
                    <ToolBar.Section alignContent="left">
                        <ToolBar.Button
                            label="Search"
                            iconName="search"
                            onPress={() => handleButtonClick('Search')}
                        />
                        <ToolBar.Button
                            label="Add"
                            iconName="add"
                            onPress={() => handleButtonClick('Add')}
                        />
                        <ToolBar.Button
                            label="Edit"
                            iconName="edit"
                            onPress={() => handleButtonClick('Edit')}
                        />
                        <ToolBar.Separator />
                        <ToolBar.Button
                            label="Delete"
                            iconName="delete"
                            onPress={() => handleButtonClick('Delete')}
                        />
                        <ToolBar.Button
                            label="Settings"
                            iconName="settings"
                            onPress={() => handleButtonClick('Settings')}
                        />
                        <ToolBar.Button
                            label="Refresh"
                            iconName="refresh"
                            onPress={() => handleButtonClick('Refresh')}
                        />
                        <ToolBar.Button
                            label="Download"
                            iconName="download"
                            onPress={() => handleButtonClick('Download')}
                        />
                        <ToolBar.Button
                            label="Upload"
                            iconName="upload"
                            onPress={() => handleButtonClick('Upload')}
                        />
                    </ToolBar.Section>

                    <ToolBar.Section alignContent="right">
                        <ToolBar.Button
                            label="Help"
                            iconName="help"
                            onPress={() => handleButtonClick('Help')}
                        />
                        <ToolBar.Button
                            label="Info"
                            iconName="info"
                            onPress={() => handleButtonClick('Info')}
                        />
                    </ToolBar.Section>
                </ToolBar>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h2>Test Instructions:</h2>
                <ol>
                    <li>Start with a wide browser window - all buttons should be visible</li>
                    <li>Gradually narrow the window</li>
                    <li>
                        Watch for buttons to move to a &quot;More&quot; dropdown instead of getting
                        compressed
                    </li>
                    <li>
                        The buttons should maintain their proper size and not have truncated text
                    </li>
                    <li>
                        Expand the window again - buttons should move back out of the overflow menu
                    </li>
                </ol>

                <h2>Dropdown Scroll Position Test:</h2>
                <p>
                    <strong>Critical Test:</strong> This page is designed to be scrollable to test
                    dropdown positioning.
                </p>
                <ol>
                    <li>Narrow the browser window to trigger the &quot;More&quot; dropdown</li>
                    <li>Click the &quot;More&quot; button to open the dropdown</li>
                    <li>Scroll the page up and down</li>
                    <li>
                        <strong>Expected behavior:</strong> Dropdown should stay fixed to its anchor
                        button, not scroll with the page
                    </li>
                    <li>
                        <strong>Bug behavior:</strong> Dropdown would move away from button when
                        scrolling
                    </li>
                </ol>
            </div>

            {/* Add substantial content to make page scrollable */}
            <div style={{ marginTop: '40px' }}>
                <h2>Scrollable Test Content</h2>
                <p>
                    This content makes the page scrollable so we can test dropdown positioning
                    during scroll.
                </p>

                {Array.from({ length: 20 }, (_, i) => (
                    <div
                        key={i}
                        style={{
                            margin: '20px 0',
                            padding: '20px',
                            background: `linear-gradient(135deg, rgba(255,115,0,0.1), rgba(62,123,250,0.1))`,
                            borderRadius: '8px',
                            border: '1px solid rgba(255,115,0,0.2)',
                        }}
                    >
                        <h3>Test Section {i + 1}</h3>
                        <p>
                            This is test content section {i + 1}. Lorem ipsum dolor sit amet,
                            consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                            et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                        <p>
                            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
                            dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
                            proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                        </p>
                        <ul>
                            <li>Test item A for section {i + 1}</li>
                            <li>Test item B for section {i + 1}</li>
                            <li>Test item C for section {i + 1}</li>
                        </ul>
                    </div>
                ))}

                <div
                    style={{
                        margin: '40px 0',
                        padding: '30px',
                        background: 'rgba(255,115,0,0.15)',
                        borderRadius: '12px',
                        border: '2px solid rgba(255,115,0,0.3)',
                        textAlign: 'center',
                    }}
                >
                    <h3>🎯 End of Scrollable Content</h3>
                    <p>
                        If you can see this, the page is properly scrollable for testing dropdown
                        positioning.
                    </p>
                    <p>
                        <strong>Now scroll back up and test the dropdown behavior!</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ToolbarTestPage;
