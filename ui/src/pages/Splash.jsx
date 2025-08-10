import { useEffect, useRef } from 'react';
import '../css/pages/splash.css';

export default function Splash() {
    const titleRef = useRef();

    useEffect(() => {
        const title = titleRef.current;
        if (!title) return;
        const text = title.dataset.text;
        title.textContent = '';
        let idx = 0;
        const typer = setInterval(() => {
            title.textContent += text[idx++];
            if (idx === text.length) {
                clearInterval(typer);
                title.classList.add('splash-typing');
            }
        }, 75);
        return () => clearInterval(typer);
    }, []);

    return (
        <div className="splash-container">
            <div className="splash-card">
                <div className="splash-icon">🚀</div>
                <h1
                    ref={titleRef}
                    className="splash-title"
                    data-text="Welcome to DAPS"
                    style={{ textAlign: 'center' }}
                >
                    Welcome to DAPS
                </h1>
                <p>Select one of the options on the side to get started.</p>
            </div>
        </div>
    );
}
