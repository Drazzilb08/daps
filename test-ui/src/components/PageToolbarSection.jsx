import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import PageToolbarButton from './PageToolbarButton.jsx';
import PageToolbarOverflowMenuItem from './PageToolbarOverflowMenuItem.jsx';

/**
 * PageToolbarSection component with intelligent overflow management
 * 
 * Based on Radarr's architecture for responsive toolbar sections.
 * Dynamically calculates which buttons fit and moves overflow to menu.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Toolbar buttons and separators
 * @param {string} [props.alignContent='left'] - Content alignment
 * @param {boolean} [props.collapseButtons=true] - Enable button collapse
 */
const PageToolbarSection = ({
  children,
  alignContent = 'left',
  collapseButtons = true
}) => {
  const sectionRef = useRef(null);
  const [sectionWidth, setSectionWidth] = useState(0);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  // Measure section width
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (sectionRef.current) {
        setSectionWidth(sectionRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Constants for width calculations (updated for compact buttons)
  const BUTTON_WIDTH = 64; // Button width with padding and text
  const SEPARATOR_WIDTH = 8; // Separator width
  const MORE_BUTTON_WIDTH = 56; // "More" button width

  const { visibleButtons, overflowItems } = useMemo(() => {
    if (!collapseButtons || sectionWidth === 0) {
      return {
        visibleButtons: React.Children.toArray(children),
        overflowItems: []
      };
    }

    const childrenArray = React.Children.toArray(children);
    let buttonCount = 0;
    let separatorCount = 0;

    // Count buttons and separators
    childrenArray.forEach(child => {
      if (React.isValidElement(child)) {
        if (child.type === 'div' && child.props.className?.includes('separator')) {
          separatorCount++;
        } else {
          buttonCount++;
        }
      }
    });

    const buttonsWidth = buttonCount * BUTTON_WIDTH;
    const separatorsWidth = separatorCount * SEPARATOR_WIDTH;
    const totalWidth = buttonsWidth + separatorsWidth;

    // If everything fits, return all children
    if (totalWidth <= sectionWidth) {
      return {
        visibleButtons: childrenArray,
        overflowItems: []
      };
    }

    // Calculate max buttons that can fit (reserve space for "More" button)
    const availableWidth = sectionWidth - MORE_BUTTON_WIDTH - separatorsWidth;
    const maxButtons = Math.max(Math.floor(availableWidth / BUTTON_WIDTH), 1);

    const visible = [];
    const overflow = [];
    let actualButtons = 0;

    childrenArray.forEach(child => {
      if (React.isValidElement(child)) {
        const isSeparator = child.type === 'div' && child.props.className?.includes('separator');
        
        if (isSeparator) {
          if (actualButtons < maxButtons) {
            visible.push(child);
          }
        } else {
          if (actualButtons < maxButtons) {
            visible.push(child);
            actualButtons++;
          } else {
            overflow.push(child.props);
          }
        }
      }
    });

    return {
      visibleButtons: visible,
      overflowItems: overflow
    };
  }, [children, sectionWidth, collapseButtons]);

  const handleMoreClick = () => {
    setIsOverflowOpen(!isOverflowOpen);
  };

  const handleOverflowClose = () => {
    setIsOverflowOpen(false);
  };

  const sectionClassName = [
    'page-toolbar-section',
    `page-toolbar-section--${alignContent}`,
    isOverflowOpen && 'page-toolbar-section--overflow-open'
  ].filter(Boolean).join(' ');

  return (
    <div ref={sectionRef} className={sectionClassName}>
      <div className="page-toolbar-section-buttons">
        {visibleButtons}
        
        {overflowItems.length > 0 && (
          <div className="page-toolbar-section-more">
            <PageToolbarButton
              label="More"
              iconName="more_horiz"
              onPress={handleMoreClick}
            />
            
            {isOverflowOpen && (
              <div 
                className="page-toolbar-section-overflow-menu"
                onMouseLeave={handleOverflowClose}
              >
                {overflowItems.map((itemProps, index) => (
                  <PageToolbarOverflowMenuItem
                    key={index}
                    {...itemProps}
                    onPress={(event) => {
                      if (itemProps.onPress) {
                        itemProps.onPress(event);
                      }
                      handleOverflowClose();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

PageToolbarSection.propTypes = {
  children: PropTypes.node.isRequired,
  alignContent: PropTypes.oneOf(['left', 'center', 'right']),
  collapseButtons: PropTypes.bool
};

export default PageToolbarSection;