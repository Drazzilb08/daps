import { useNavigate } from 'react-router-dom';
import '../css/pages/404Page.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="not-found-page">
            <div className="not-found-content">
                <div className="not-found-icon">404</div>
                <h1 className="not-found-title">Page Not Found</h1>
                <p className="not-found-description">
                    The page you&apos;re looking for doesn&apos;t exist.
                </p>
                <div className="not-found-actions">
                    <button onClick={() => navigate('/')} className="btn btn--primary">
                        Go Home
                    </button>
                    <button onClick={() => navigate(-1)} className="btn btn--secondary">
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
