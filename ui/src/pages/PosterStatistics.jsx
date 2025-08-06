// src/pages/PosterStatistics.jsx

import React, { useState, useEffect, useRef } from 'react';
import DashboardCard from '../components/DashboardCard';
import GDriveStatsContent from '../components/poster_statistics/GDriveStatsContent';
import MatchedPostersContent from '../components/poster_statistics/MatchedPostersContent';
import UnmatchedAssetsContent from '../components/poster_statistics/UnmatchedAssetsContent';
import { getIcon, splitIntoColumns } from '../utils/tools';
import { fetchGDriveStats, fetchMatchedPosterStats, fetchUnmatchedStats } from '../utils/api';
import { useToast } from '../components/providers/ToastProvider';
import '../css/dashboard.css';
import '../css/statistics.css';

// Each Content defines its *content* and its *fetcher*
const STAT_CARDS = [
    {
        key: 'gdrive',
        icon: getIcon('mi:cloud_download'),
        title: 'Google Drive',
        content: GDriveStatsContent,
        fetcher: fetchGDriveStats,
    },
    {
        key: 'matched_posters',
        icon: getIcon('mi:equalizer'),
        title: 'Matched Posters',
        content: MatchedPostersContent,
        fetcher: fetchMatchedPosterStats,
    },
    {
        key: 'unmatched_assets',
        icon: getIcon('mi:image'),
        title: 'Unmatched Assets',
        content: UnmatchedAssetsContent,
        fetcher: fetchUnmatchedStats,
    },
];

export default function PosterStatistics() {
    const toast = useToast();
    const cardRefs = useRef({});
    const toggleRefs = useRef({});
    const [openCards, setOpenCards] = useState(
        Object.fromEntries(STAT_CARDS.map(card => [card.key, true]))
    );
    const [renderedOpen, setRenderedOpen] = useState(
        Object.fromEntries(STAT_CARDS.map(card => [card.key, true]))
    );
    const [hoveredToggle, setHoveredToggle] = useState(null);

    // State for each card (data, loading, error, etc.)
    const [cardState, setCardState] = useState(
        Object.fromEntries(
            STAT_CARDS.map(card => [
                card.key,
                {
                    data: null,
                    loading: true,
                    error: null,
                },
            ])
        )
    );

    // Card fetchers
    const fetchCardData = async card => {
        setCardState(s => ({
            ...s,
            [card.key]: { ...s[card.key], loading: true, error: null },
        }));
        try {
            const result = await card.fetcher();
            let data;
            // Normalize response per card
            if (card.key === 'gdrive') data = result?.gdrive_stats ?? result ?? [];
            else if (card.key === 'matched_posters')
                data = result?.matched_posters_stats ?? result ?? [];
            else if (card.key === 'unmatched_assets') data = result?.summary ?? result ?? {};
            else data = result;
            setCardState(s => ({
                ...s,
                [card.key]: { ...s[card.key], loading: false, data },
            }));
        } catch (e) {
            setCardState(s => ({
                ...s,
                [card.key]: {
                    ...s[card.key],
                    loading: false,
                    error: e.message || 'Failed to fetch stats.',
                },
            }));
            toast.error(`Failed to load ${card.title} stats`);
        }
    };

    useEffect(() => {
        STAT_CARDS.forEach(fetchCardData);
        // eslint-disable-next-line
    }, []);

    // For cards with refresh buttons, expose the refetch
    const refreshers = Object.fromEntries(
        STAT_CARDS.map(card => [card.key, () => fetchCardData(card)])
    );

    // Columns
    const [leftCol, rightCol] = splitIntoColumns(STAT_CARDS, renderedOpen);

    // Render a card
    const renderCard = card => {
        const Card = card.content;
        const state = cardState[card.key] || {};
        return (
            <DashboardCard
                key={card.key}
                icon={card.icon}
                title={card.title}
                open={openCards[card.key]}
                onToggle={() => {
                    if (openCards[card.key]) {
                        setOpenCards(open => ({ ...open, [card.key]: false }));
                        setTimeout(
                            () => setRenderedOpen(open => ({ ...open, [card.key]: false })),
                            440
                        );
                    } else {
                        setRenderedOpen(open => ({ ...open, [card.key]: true }));
                        setTimeout(() => setOpenCards(open => ({ ...open, [card.key]: true })), 10);
                    }
                }}
                cardRef={el => (cardRefs.current[card.key] = el)}
                toggleRef={el => (toggleRefs.current[card.key] = el)}
                hoveredToggle={hoveredToggle === card.key}
                setHoveredToggle={() => setHoveredToggle(card.key)}
            >
                {renderedOpen[card.key] && <Card {...state} refresh={refreshers[card.key]} />}
            </DashboardCard>
        );
    };

    return (
        <div className="dashboard-dashboard">
            <div className="dashboard-header">
                <h2 className="dashboard-title">Statistics</h2>
            </div>
            <div className="dashboard-grid dashboard-grid--columns">
                <div className="dashboard-col">{leftCol.map(renderCard)}</div>
                <div className="dashboard-col">{rightCol.map(renderCard)}</div>
            </div>
        </div>
    );
}
