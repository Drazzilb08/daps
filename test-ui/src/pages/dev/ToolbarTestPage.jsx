import React from 'react';
import ToolBar from '../../components/ToolBar/ToolBar.jsx';
import Section from '../../components/ToolBar/Section.jsx';
import Button from '../../components/ToolBar/Button.jsx';
import Separator from '../../components/ToolBar/Separator.jsx';

/**
 * Toolbar Test Page - Demonstrates overflow behavior
 * 
 * Used to test the Section component's overflow calculation
 * and responsive button handling at different viewport sizes.
 */
const ToolbarTestPage = () => {
  const handleButtonClick = (buttonName) => {
    console.log(`${buttonName} button clicked`);
  };

  return (
    <div className="content-layout">
      <h1>Toolbar Overflow Test</h1>
      <p>Resize your browser window to test the responsive overflow behavior.</p>
      <p>Buttons should move to an overflow "More" menu instead of getting compressed.</p>
      
      <div style={{ marginTop: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <ToolBar>
          <Section alignContent="left">
            <Button
              label="Search"
              iconName="search"
              onPress={() => handleButtonClick('Search')}
            />
            <Button
              label="Add"
              iconName="add"
              onPress={() => handleButtonClick('Add')}
            />
            <Button
              label="Edit"
              iconName="edit"
              onPress={() => handleButtonClick('Edit')}
            />
            <Separator />
            <Button
              label="Delete"
              iconName="delete"
              onPress={() => handleButtonClick('Delete')}
            />
            <Button
              label="Settings"
              iconName="settings"
              onPress={() => handleButtonClick('Settings')}
            />
            <Button
              label="Refresh"
              iconName="refresh"
              onPress={() => handleButtonClick('Refresh')}
            />
            <Button
              label="Download"
              iconName="download"
              onPress={() => handleButtonClick('Download')}
            />
            <Button
              label="Upload"
              iconName="upload"
              onPress={() => handleButtonClick('Upload')}
            />
          </Section>
          
          <Section alignContent="right">
            <Button
              label="Help"
              iconName="help"
              onPress={() => handleButtonClick('Help')}
            />
            <Button
              label="Info"
              iconName="info"
              onPress={() => handleButtonClick('Info')}
            />
          </Section>
        </ToolBar>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test Instructions:</h2>
        <ol>
          <li>Start with a wide browser window - all buttons should be visible</li>
          <li>Gradually narrow the window</li>
          <li>Watch for buttons to move to a "More" dropdown instead of getting compressed</li>
          <li>The buttons should maintain their proper size and not have truncated text</li>
          <li>Expand the window again - buttons should move back out of the overflow menu</li>
        </ol>
      </div>
    </div>
  );
};

export default ToolbarTestPage;