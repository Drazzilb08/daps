import { useNavigate } from 'react-router-dom';
import { getIcon } from '../utils/tools';
import '../css/pages/404Page.css';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="not-found-page">
            <div className="not-found-content">
                <div className="not-found-hero">
                    <div className="not-found-code">404</div>
                </div>

                <div className="not-found-text">
                    <h1 className="not-found-title">Page Not Found</h1>
                    <p className="not-found-description">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                    <p className="not-found-subdescription">
                        Don&apos;t worry, it happens to the best of us.
                    </p>
                </div>

                <div className="not-found-actions">
                    <button
                        onClick={() => navigate('/')}
                        className="btn btn--primary not-found-btn"
                    >
                        {getIcon('mi:home', { className: 'btn-icon' })}
                        Go Home
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn--secondary not-found-btn"
                    >
                        {getIcon('mi:arrow_back', { className: 'btn-icon' })}
                        Go Back
                    </button>
                </div>

                <div className="not-found-decoration">
                    <div className="decoration-dot"></div>
                    <div className="decoration-dot"></div>
                    <div className="decoration-dot"></div>
                </div>
            </div>
        </div>
    );
}
