// src/components/NotFound.jsx
export default function NotFound({
    code = '404',
    animation = true,
    headline,
    desc,
    detail,
    button = {},
}) {
    const _headline = headline || (animation ? 'Whoops! Lost in Space' : 'Not Found');
    const _desc =
        desc ||
        (animation
            ? 'We couldn\'t find this page. <span class="emoji">🚀</span>'
            : 'This resource could not be loaded.');
    const _detail = detail ? (
        <div className="not-found-detail" dangerouslySetInnerHTML={{ __html: detail }} />
    ) : null;
    const btnHref = button.href || '/';
    const btnLabel = button.label || 'Return to Home';

    if (animation) {
        return (
            <div className="not-found-outer">
                <div className="not-found-animation">
                    <div className="stars"></div>
                    <div className="planet"></div>
                    <div className="astronaut">
                        <div className="helmet">
                            <div className="glow"></div>
                        </div>
                        <div className="backpack"></div>
                        <div className="body"></div>
                        <div className="arm left"></div>
                        <div className="arm right"></div>
                        <div className="leg left"></div>
                        <div className="leg right"></div>
                        <div className="tether"></div>
                    </div>
                    <div className={`not-found-${code}-bounce`}>{code}</div>
                    <div className="not-found-planet-shadow"></div>
                </div>
                <div className="not-found-msg">
                    <div className="not-found-headline">{_headline}</div>
                    <div className="not-found-desc" dangerouslySetInnerHTML={{ __html: _desc }} />
                    {_detail}
                    <a className="not-found-home-btn" href={btnHref}>
                        {btnLabel}
                    </a>
                </div>
            </div>
        );
    }

    // Simple fallback (no animation)
    return (
        <div className="not-found-outer simple">
            <div className="not-found-msg">
                <div className="not-found-headline">{_headline}</div>
                <div className="not-found-desc" dangerouslySetInnerHTML={{ __html: _desc }} />
                {_detail}
                <a className="not-found-home-btn" href={btnHref}>
                    {btnLabel}
                </a>
            </div>
        </div>
    );
}
