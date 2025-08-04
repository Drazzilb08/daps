import React, { useRef, useState } from 'react';
import GDriveStatsCard from '../components/statistics/GDriveStatsCard';
import MatchedPostersCard from '../components/statistics/MatchedPostersCard';
import UnmatchedAssetsCard from '../components/statistics/UnmatchedAssetsCard';
import { getIcon } from '../utils/tools';
import TooltipFactory from '../components/Tooltip';
import '../css/statistics.css';

// Initial cards
const STAT_CARDS = [
    {
        key: 'gdrive',
        icon: getIcon('mi:cloud_download'),
        title: 'Google Drive',
        Component: GDriveStatsCard,
    },
    {
        key: 'matched_posters',
        icon: getIcon('mi:equalizer'),
        title: 'Matched Posters',
        Component: MatchedPostersCard,
    },
    {
        key: 'unmatched_assets',
        icon: getIcon('mi:image'),
        title: 'Unmatched Assets',
        Component: UnmatchedAssetsCard,
    },
];

// Split cards into columns by "weight" (open = 2, closed = 1)
function splitIntoColumns(cards, renderedOpen) {
    const left = [];
    const right = [];
    let leftHeight = 0;
    let rightHeight = 0;
    cards.forEach(card => {
        const weight = renderedOpen[card.key] ? 2 : 1;
        if (leftHeight <= rightHeight) {
            left.push(card);
            leftHeight += weight;
        } else {
            right.push(card);
            rightHeight += weight;
        }
    });
    return [left, right];
}

export default function Statistics() {
    const cardRefs = useRef({});
    const toggleRefs = useRef({});
    const [cards] = useState(STAT_CARDS);

    const [openCards, setOpenCards] = useState(() =>
        Object.fromEntries(STAT_CARDS.map(card => [card.key, true]))
    );
    const [renderedOpen, setRenderedOpen] = useState(() =>
        Object.fromEntries(STAT_CARDS.map(card => [card.key, true]))
    );
    const [hoveredToggle, setHoveredToggle] = useState(null);

    const toggleCard = key => {
        if (openCards[key]) {
            const cardElem = cardRefs.current[key];
            if (cardElem) {
                cardElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            setOpenCards(open => ({ ...open, [key]: false }));
            setTimeout(() => {
                setRenderedOpen(open => ({ ...open, [key]: false }));
            }, 440);
        } else {
            setRenderedOpen(open => ({ ...open, [key]: true }));
            setTimeout(() => {
                setOpenCards(open => ({ ...open, [key]: true }));
                setTimeout(() => {
                    const cardElem = cardRefs.current[key];
                    if (cardElem) {
                        cardElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 350);
            }, 10);
        }
    };

    const [leftCol, rightCol] = splitIntoColumns(cards, renderedOpen);

    const renderCard = ({ key, icon, title, Component }) => (
        <div className="stat-card-wrapper" key={key} ref={el => (cardRefs.current[key] = el)}>
            <div className="stat-card">
                <div className="stat-card-header">
                    <button
                        ref={el => (toggleRefs.current[key] = el)}
                        className={`collapse-toggle${openCards[key] ? ' open' : ''}`}
                        aria-expanded={openCards[key]}
                        aria-label={openCards[key] ? `Collapse ${title}` : `Expand ${title}`}
                        onClick={() => toggleCard(key)}
                        tabIndex={0}
                        type="button"
                        onMouseEnter={() => setHoveredToggle(key)}
                        onMouseLeave={() => setHoveredToggle(null)}
                        onFocus={() => setHoveredToggle(key)}
                        onBlur={() => setHoveredToggle(null)}
                    >
                        <span className="collapse-chevron">
                            {getIcon('mi:keyboard_arrow_down')}
                        </span>
                        <TooltipFactory
                            anchor={toggleRefs.current[key]}
                            text={openCards[key] ? `Collapse ${title}` : `Expand ${title}`}
                            show={hoveredToggle === key}
                            position="top"
                        />
                    </button>
                    <span className="stat-card-title">
                        {icon}
                        {title}
                    </span>
                </div>
                <div
                    className={`stat-card-content-outer${openCards[key] ? ' stat-card-content-outer--open' : ''}`}
                >
                    <div className="stat-card-content">
                        {renderedOpen[key] ? <Component /> : null}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="statistics-dashboard">
            <div className="statistics-header">
                <h2 className="statistics-title">Statistics</h2>
            </div>
            <div className="statistics-grid statistics-grid--columns">
                <div className="statistics-col">{leftCol.map(renderCard)}</div>
                <div className="statistics-col">{rightCol.map(renderCard)}</div>
            </div>
        </div>
    );
}
