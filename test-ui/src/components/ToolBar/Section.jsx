import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import Button from './Button.jsx';

/**
 * Responsive toolbar section component
 * 
 * Calculates which buttons fit and moves overflow to menu.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Toolbar buttons and separators
 * @param {string} [props.alignContent='left'] - Content alignment ('left', 'center', 'right')
 * @param {boolean} [props.collapseButtons=true] - Enable button collapse/overflow
 */
const Section = ({
  children,
  alignContent = 'left',
  collapseButtons = true
}) => {
  const sectionRef = useRef(null);
  const [sectionWidth, setSectionWidth] = useState(0);

  const isMeasured = sectionWidth > 0;

  // Measure section width
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (sectionRef.current) {
        const newWidth = sectionRef.current.offsetWidth;
        setSectionWidth(newWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Force recalculation when children change
  useLayoutEffect(() => {
    if (sectionRef.current) {
      setSectionWidth(sectionRef.current.offsetWidth);
    }
  }, [children]);


  // Constants for responsive calculation
  const MIN_BUTTON_WIDTH = 72; // Estimated minimum button width (56px + padding + text)
  const MORE_BUTTON_WIDTH = 64; // Width reserved for "More" button
  const SEPARATOR_MARGIN = 4; // Separator margin
  const SEPARATOR_WIDTH = 2 * SEPARATOR_MARGIN + 1; // Total separator width

  const { visibleButtons, overflowItems, buttonCount } = useMemo(() => {
    if (!collapseButtons) {
      const childArray = React.Children.toArray(children);
      const buttonCount = childArray.filter(child => 
        React.isValidElement(child) && 
        !(child.type === 'div' && child.props.className?.includes('separator')) &&
        Object.keys(child.props).length > 0
      ).length;
      
      return {
        visibleButtons: childArray,
        overflowItems: [],
        buttonCount: buttonCount
      };
    }

    // If not measured yet, show all children initially (allows DOM to be created)
    if (!isMeasured) {
      const childArray = React.Children.toArray(children);
      const buttonCount = childArray.filter(child => 
        React.isValidElement(child) && 
        !(child.type === 'div' && child.props.className?.includes('separator')) &&
        Object.keys(child.props).length > 0
      ).length;
      
      return {
        visibleButtons: childArray,
        overflowItems: [],
        buttonCount: buttonCount
      };
    }

    let buttonCount = 0;
    let separatorCount = 0;
    const validChildren = [];

    React.Children.forEach(children, (child) => {
      if (!child) {
        return;
      }

      if (React.isValidElement(child)) {
        const isSeparator = child.type === 'div' && child.props.className?.includes('separator');
        if (isSeparator || Object.keys(child.props).length === 0) {
          separatorCount++;
        } else {
          buttonCount++;
        }
        validChildren.push(child);
      }
    });

    // Calculate total width needed with more realistic estimates
    const buttonsWidth = buttonCount * MIN_BUTTON_WIDTH;
    const separatorsWidth = separatorCount * SEPARATOR_WIDTH;
    const totalWidth = buttonsWidth + separatorsWidth;

    // If everything fits, return all children
    if (totalWidth <= sectionWidth) {
      return {
        visibleButtons: validChildren,
        overflowItems: [],
        buttonCount: buttonCount
      };
    }

    // Calculate max buttons that can fit, accounting for "More" button
    const availableWidth = sectionWidth - separatorsWidth - MORE_BUTTON_WIDTH;
    const maxButtons = Math.max(
      Math.floor(availableWidth / MIN_BUTTON_WIDTH),
      1
    );

    if (buttonCount - 1 === maxButtons) {
      const buttonsWithoutSeparators = validChildren.filter(
        (child) => {
          const isSeparator = child.type === 'div' && child.props.className?.includes('separator');
          return !isSeparator && Object.keys(child.props).length > 0;
        }
      );

      return {
        visibleButtons: buttonsWithoutSeparators,
        overflowItems: [],
        buttonCount: buttonCount
      };
    }

    // Split buttons between visible and overflow
    const buttons = [];
    const overflowItems = [];
    let actualButtons = 0;

    validChildren.forEach((child) => {
      const isSeparator = child.type === 'div' && child.props.className?.includes('separator');
      const isEmpty = Object.keys(child.props).length === 0;

      if (actualButtons < maxButtons) {
        if (!isSeparator && !isEmpty) {
          buttons.push(child);
          actualButtons++;
        } else {
          // Always include separators in visible
          buttons.push(child);
        }
      } else {
        // Move remaining buttons to overflow
        if (!isSeparator && !isEmpty) {
          overflowItems.push(child.props);
        }
      }
    });

    return {
      visibleButtons: buttons,
      overflowItems: overflowItems,
      buttonCount: buttonCount
    };
  }, [children, isMeasured, sectionWidth, collapseButtons]);

  // buttonCount is already available from the useMemo destructuring above

  const getJustifyClass = () => {
    switch (alignContent) {
      case 'left': return 'justify-start flex-1';
      case 'center': return 'justify-center flex-1';  
      case 'right': return 'justify-end';
      default: return 'justify-start flex-1';
    }
  };

  const sectionClassName = [
    'page-toolbar-section',
    getJustifyClass()
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={sectionRef} 
      className={sectionClassName}
      style={{ flexGrow: alignContent === 'right' ? 0 : buttonCount }}
    >
      <div className="page-toolbar-section-buttons">
        {visibleButtons}
        {overflowItems.length > 0 && (
          <Button 
            label={`More (${overflowItems.length})`}
            iconName="more_horiz"
          />
        )}
      </div>
    </div>
  );
};

Section.propTypes = {
  children: PropTypes.node.isRequired,
  alignContent: PropTypes.oneOf(['left', 'center', 'right']),
  collapseButtons: PropTypes.bool
};

export default Section;