// ui/src/pages/AssetsSearch.jsx
// Assets search page using the new SearchEngine system

import { AssetsSearchEngine } from '../components/search/SearchEngineFactory';
import { useToast } from '../components/providers/ToastProvider';

export default function AssetsSearch() {
    const toast = useToast();

    const handleResultDelete = () => {
        toast('Asset updated in database', 'success');
    };

    const handleError = error => {
        console.error('Assets search error:', error);
        toast('Search error occurred', 'error');
    };

    return <AssetsSearchEngine onResultDelete={handleResultDelete} onError={handleError} />;
}
