# useApiData Hook Documentation

## Overview

The `useApiData` hook provides standardized data fetching, caching, and error handling for DAPS components. It integrates seamlessly with the existing ToastProvider and API utilities to deliver a consistent developer experience across the application.

## Key Features

- ✅ **Automatic Loading States** - Built-in loading state management
- ✅ **Error Handling** - Standardized error handling with ToastProvider integration
- ✅ **Caching Integration** - Leverages existing API cache layer from `utils/api.js`
- ✅ **Retry Logic** - Configurable retry attempts with delays
- ✅ **Data Transformation** - Transform API responses on-the-fly
- ✅ **Multiple Queries** - Coordinate multiple API calls easily
- ✅ **Request Cancellation** - Automatic cleanup prevents memory leaks
- ✅ **Dependency Tracking** - Re-execute when dependencies change
- ✅ **Toast Notifications** - Success/error messages via ToastProvider

## Hook Variants

### 1. `useApiData` - Main Hook

For data fetching operations (GET requests, reading data).

```jsx
import { useApiData } from '../hooks/useApiData';
import { fetchConfig } from '../utils/api';

function MyComponent() {
    const { data, isLoading, error } = useApiData({
        apiFunction: fetchConfig,
        params: ['instances'],
        options: {
            errorMessage: 'Failed to load configuration',
        },
    });

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return <div>{JSON.stringify(data)}</div>;
}
```

### 2. `useApiMutation` - Mutation Hook

For data mutation operations (POST, PUT, DELETE requests).

```jsx
import { useApiMutation } from '../hooks/useApiData';
import { postConfig } from '../utils/api';

function SettingsForm() {
    const { mutate: saveSettings, isLoading } = useApiMutation(postConfig, {
        successMessage: 'Settings saved!',
        onSuccess: () => {
            // Handle success, e.g., redirect or refresh data
        },
    });

    const handleSave = async formData => {
        await saveSettings(formData);
    };

    return (
        <button onClick={() => handleSave(data)} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
        </button>
    );
}
```

### 3. `useApiQueries` - Multiple Queries Hook

For loading multiple data sources simultaneously.

```jsx
import { useApiQueries } from '../hooks/useApiData';
import { fetchConfig, fetchInstances, fetchJobStats } from '../utils/api';

function Dashboard() {
    const { data, isAnyLoading, errors } = useApiQueries({
        config: { apiFunction: fetchConfig },
        instances: { apiFunction: fetchInstances },
        stats: { apiFunction: fetchJobStats },
    });

    if (isAnyLoading) return <div>Loading dashboard...</div>;

    return (
        <div>
            <div>Config: {Object.keys(data.config || {}).length} sections</div>
            <div>Instances: {Object.keys(data.instances || {}).length} services</div>
            <div>Jobs: {data.stats?.total || 0} total</div>
        </div>
    );
}
```

## Configuration Options

### useApiData Options

| Option                     | Type       | Default      | Description                            |
| -------------------------- | ---------- | ------------ | -------------------------------------- |
| `apiFunction`              | `Function` | **required** | API function from `utils/api.js`       |
| `params`                   | `Array`    | `[]`         | Parameters to pass to API function     |
| `dependencies`             | `Array`    | `[]`         | Dependencies that trigger re-execution |
| `options.immediate`        | `boolean`  | `true`       | Execute immediately on mount           |
| `options.transform`        | `Function` | `null`       | Transform response data                |
| `options.showErrorToast`   | `boolean`  | `true`       | Show error notifications               |
| `options.showSuccessToast` | `boolean`  | `false`      | Show success notifications             |
| `options.successMessage`   | `string`   | `null`       | Custom success message                 |
| `options.errorMessage`     | `string`   | `null`       | Custom error message                   |
| `options.retryAttempts`    | `number`   | `0`          | Number of retry attempts               |
| `options.retryDelay`       | `number`   | `1000`       | Delay between retries (ms)             |

### Return Values

| Property      | Type          | Description                                    |
| ------------- | ------------- | ---------------------------------------------- |
| `data`        | `any`         | Current data from API                          |
| `isLoading`   | `boolean`     | Loading state indicator                        |
| `error`       | `Error\|null` | Current error state                            |
| `execute`     | `Function`    | Manual execution function                      |
| `retry`       | `Function`    | Retry last failed request                      |
| `reset`       | `Function`    | Reset all state to initial values              |
| `hasExecuted` | `boolean`     | Whether API has been called at least once      |
| `isSuccess`   | `boolean`     | Whether request completed successfully         |
| `isEmpty`     | `boolean`     | Whether data is empty after successful request |

## Usage Examples

### Basic Auto-Loading

```jsx
const {
    data: config,
    isLoading,
    error,
} = useApiData({
    apiFunction: fetchConfig,
});
```

### Manual Execution

```jsx
const { execute, isLoading, data } = useApiData({
    apiFunction: fetchJobStats,
    options: {
        immediate: false,
        successMessage: 'Stats loaded!',
    },
});

const handleLoadStats = () => execute();
```

### Data Transformation

```jsx
const { data: instanceCount } = useApiData({
    apiFunction: fetchInstances,
    options: {
        transform: data => Object.keys(data || {}).length,
    },
});
```

### Dependency-Based Re-execution

```jsx
const [refreshTrigger, setRefreshTrigger] = useState(0);

const { data } = useApiData({
    apiFunction: fetchInstances,
    dependencies: [refreshTrigger], // Re-fetch when this changes
});

const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);
```

### Retry Logic

```jsx
const { data, retry } = useApiData({
    apiFunction: fetchJobStats,
    options: {
        retryAttempts: 3,
        retryDelay: 2000,
    },
});
```

### Form Submission

```jsx
const { mutate: saveSettings, isLoading } = useApiMutation(postConfig, {
    successMessage: 'Settings saved successfully!',
    onSuccess: result => {
        // Handle success
        refreshData();
    },
    onError: error => {
        // Handle error
        console.error('Save failed:', error);
    },
});
```

## Migration Guide

### From Direct API Calls

**Before:**

```jsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
    fetchConfig()
        .then(setData)
        .catch(setError)
        .finally(() => setLoading(false));
}, []);
```

**After:**

```jsx
const { data, isLoading, error } = useApiData({
    apiFunction: fetchConfig,
});
```

### From Custom Loading Logic

**Before:**

```jsx
const [saving, setSaving] = useState(false);

const handleSave = async formData => {
    setSaving(true);
    try {
        await postConfig(formData);
        toast.success('Saved!');
    } catch (err) {
        toast.error('Save failed');
    } finally {
        setSaving(false);
    }
};
```

**After:**

```jsx
const { mutate: saveConfig, isLoading: saving } = useApiMutation(postConfig, {
    successMessage: 'Saved!',
    errorMessage: 'Save failed',
});

const handleSave = formData => saveConfig(formData);
```

## Best Practices

### 1. Use Appropriate Hook Variant

- `useApiData` for GET operations and data fetching
- `useApiMutation` for POST/PUT/DELETE operations
- `useApiQueries` for multiple simultaneous requests

### 2. Leverage Data Transformation

```jsx
// Transform API response to what your component needs
const { data: itemCount } = useApiData({
    apiFunction: fetchItems,
    options: {
        transform: response => response.items?.length || 0,
    },
});
```

### 3. Handle Dependencies Properly

```jsx
// Re-fetch when user changes
const { data } = useApiData({
    apiFunction: fetchUserData,
    params: [userId],
    dependencies: [userId], // Important: include in dependencies
});
```

### 4. Provide Meaningful Error Messages

```jsx
const { data } = useApiData({
    apiFunction: fetchCriticalData,
    options: {
        errorMessage: 'Unable to load critical system data. Please contact support.',
    },
});
```

### 5. Use Success Callbacks for Side Effects

```jsx
const { mutate } = useApiMutation(updateUser, {
    onSuccess: updatedUser => {
        // Update local cache
        queryClient.setQueryData(['user', updatedUser.id], updatedUser);
        // Navigate to profile
        navigate('/profile');
    },
});
```

## Testing

The hooks are designed to work seamlessly in test environments:

```jsx
// Mock the API function
jest.mock('../utils/api', () => ({
    fetchConfig: jest.fn(),
}));

// Test the component
test('loads configuration', async () => {
    fetchConfig.mockResolvedValue({ setting: 'value' });

    render(<MyComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => {
        expect(screen.getByText('value')).toBeInTheDocument();
    });
});
```

## Error Handling

The hooks provide multiple layers of error handling:

1. **Automatic Toast Notifications** - Errors shown to users via ToastProvider
2. **Error State** - Components can access error details for custom handling
3. **Console Logging** - All errors logged for debugging
4. **Retry Logic** - Automatic retry for transient failures

## Performance Considerations

- **Request Cancellation** - Automatically cancels requests when components unmount
- **Cache Integration** - Leverages existing API cache layer for performance
- **Memory Management** - Proper cleanup prevents memory leaks
- **Debouncing** - Built-in support for debounced operations

## Integration with DAPS Architecture

The `useApiData` hook is designed to integrate seamlessly with DAPS:

- **API Layer** - Uses existing `utils/api.js` functions
- **ToastProvider** - Automatic error/success notifications
- **Caching** - Leverages API cache layer for performance
- **Error Boundaries** - Works with existing error handling systems
- **Field Registry** - Compatible with form field components

## Live Demo

Visit `/dev/api-data` in the DAPS application to see the hook in action with real API endpoints. The test page demonstrates all hook variants and features working with actual DAPS data.
