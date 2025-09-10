# Error Boundary Components Usage

This directory contains three error boundary components for graceful error handling in the DAPS React application.

## Components Overview

### 1. `ErrorBoundary.jsx` - Generic Error Boundary

- **Purpose**: General-purpose error boundary for any component tree
- **Integration**: Connects to existing GlobalErrorProvider system
- **Features**: Customizable fallback UI, retry mechanisms, error reporting

### 2. `PageErrorBoundary.jsx` - Page-Level Protection

- **Purpose**: Wrap entire page routes to prevent page-level crashes
- **Integration**: Works with existing RouteErrorProvider patterns
- **Features**: Page-specific recovery options, navigation controls, detailed error display

### 3. `FeatureErrorBoundary.jsx` - Feature-Specific Protection

- **Purpose**: Isolate critical features (search, forms, navigation) from crashes
- **Integration**: Supports degraded mode and feature disabling
- **Features**: Critical vs non-critical feature handling, graceful degradation

## Usage Examples

### Basic Error Boundary

```jsx
import ErrorBoundary from './ErrorBoundary';

// Wrap any component tree
<ErrorBoundary context="MediaCard">
  <MediaCard data={media} />
</ErrorBoundary>

// With custom error handler
<ErrorBoundary
  context="SearchResults"
  onError={(error) => trackError('search', error)}
>
  <SearchResults />
</ErrorBoundary>
```

### Page Error Boundary

```jsx
import PageErrorBoundary from './PageErrorBoundary';

// Wrap page routes
<PageErrorBoundary
  pageName="Search"
  pageDescription="Media search and filtering interface"
>
  <SearchPage />
</PageErrorBoundary>

// With custom navigation
<PageErrorBoundary
  pageName="Settings"
  onNavigateHome={() => navigate('/')}
  onNavigateBack={() => navigate(-1)}
>
  <SettingsPage />
</PageErrorBoundary>
```

### Feature Error Boundary

```jsx
import FeatureErrorBoundary from './FeatureErrorBoundary';

// Critical feature with degraded mode
<FeatureErrorBoundary
  featureName="Search Interface"
  critical={true}
  degradedMode={<SearchPlaceholder />}
>
  <SearchComponent />
</FeatureErrorBoundary>

// Non-critical feature that can be disabled
<FeatureErrorBoundary
  featureName="Advanced Filters"
  critical={false}
  allowDegradation={true}
  onFeatureDisabled={(name) => showNotification(`${name} temporarily unavailable`)}
>
  <AdvancedFilters />
</FeatureErrorBoundary>
```

## Integration with Existing Error System

All three components integrate with the existing DAPS error handling:

1. **GlobalErrorProvider**: All errors are reported to the global error context
2. **Design System**: Uses DAPS CSS tokens and theme system
3. **Mobile-First**: Responsive design optimized for mobile viewports
4. **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels

## CSS Styles

Error boundary styles are defined in:

- `ui/src/css/components/error-boundary.css`

The CSS includes:

- Mobile-first responsive design
- Design token compliance (no hardcoded values)
- Accessibility features (focus management, contrast)
- Reduced motion support
- Touch-optimized controls

## Implementation Strategy

### Phase 1: Critical Path Protection

```jsx
// Protect main application routes
<PageErrorBoundary pageName="Application">
    <Router>
        <Routes>{/* Route definitions */}</Routes>
    </Router>
</PageErrorBoundary>
```

### Phase 2: Feature Isolation

```jsx
// Protect critical features
<FeatureErrorBoundary featureName="Navigation" critical={true}>
  <MainNavigation />
</FeatureErrorBoundary>

<FeatureErrorBoundary featureName="Search" critical={true}>
  <SearchInterface />
</FeatureErrorBoundary>
```

### Phase 3: Component-Level Protection

```jsx
// Protect individual components that tend to fail
<ErrorBoundary context="MediaGrid">
    <MediaGrid />
</ErrorBoundary>
```

## Error Recovery Patterns

### Automatic Recovery

- Retry buttons with exponential backoff
- Graceful degradation to simpler UI
- Feature disabling for non-critical components

### User-Initiated Recovery

- Manual retry controls
- Navigation to safe pages
- Application reload as last resort

### Developer Tools

- Comprehensive error logging
- Debug information capture
- Integration with existing error tracking

## Best Practices

1. **Granular Protection**: Use FeatureErrorBoundary for specific features, not entire pages
2. **Critical vs Non-Critical**: Mark essential features as critical, allow others to degrade
3. **User Experience**: Provide clear error messages and recovery options
4. **Performance**: Error boundaries should not impact normal operation performance
5. **Testing**: Test error scenarios to ensure graceful degradation works

This error boundary system provides comprehensive protection while maintaining the existing DAPS architecture and design standards.
