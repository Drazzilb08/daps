import React, { useRef, useState, useEffect, useCallback } from 'react';
import DashboardCard from '../components/DashboardCard';
import { getIcon, splitIntoColumns } from '../utils/tools';
import { useToast } from '../components/providers/ToastProvider';
import { runGDriveAdhocSync, fetchConfig, fetchJobDetail } from '../utils/api';
import '../css/dashboard.css';
import '../css/poster_manage.css';

import GDriveAdhocContent from '../components/poster_management/GDriveAdhocContent';

const POSTER_MANAGE_CARDS = [
    {
        key: 'gdrive_adhoc',
        icon: getIcon('mi:cloud_sync'),
        title: 'GDrive Sync Manual Run',
        content: GDriveAdhocContent,
        fetcher: fetchConfig,
    },
];

export default function PosterManagement() {
    const toast = useToast();
    const cardRefs = useRef({});
    const toggleRefs = useRef({});
    const [selectedGDrives, setSelectedGDrives] = useState([]);
    const [openCards, setOpenCards] = useState(
        Object.fromEntries(POSTER_MANAGE_CARDS.map(card => [card.key, true]))
    );
    const [renderedOpen, setRenderedOpen] = useState(
        Object.fromEntries(POSTER_MANAGE_CARDS.map(card => [card.key, true]))
    );
    const [hoveredToggle, setHoveredToggle] = useState(null);

    // Card data state
    const [cardState, setCardState] = useState(
        Object.fromEntries(
            POSTER_MANAGE_CARDS.map(card => [card.key, { data: null, loading: true, error: null }])
        )
    );

    // Pill progress state
    const [pillProgress, setPillProgress] = useState({});
    // Track job polling intervals for cleanup
    const jobPollers = useRef({});

    const handleToggleGDrive = useCallback(name => {
        setSelectedGDrives(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    }, []);

    // Fetch card data
    const fetchCardData = useCallback(
        async card => {
            if (card.key === 'gdrive_adhoc') {
                setSelectedGDrives([]);
                setPillProgress({});
            }
            setCardState(s => ({
                ...s,
                [card.key]: { ...s[card.key], loading: true, error: null },
            }));
            try {
                const data = await card.fetcher();
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
                        error: e.message || 'Failed to fetch data.',
                    },
                }));
                toast.error(`Failed to load ${card.title}`);
            }
        },
        [toast]
    );

    // On mount, fetch all cards
    useEffect(() => {
        POSTER_MANAGE_CARDS.forEach(fetchCardData);
        const pollersAtMount = jobPollers.current;
        return () => {
            Object.values(pollersAtMount).forEach(clearInterval);
        };
    }, [fetchCardData]);

    // Refreshers per card
    const refreshers = Object.fromEntries(
        POSTER_MANAGE_CARDS.map(card => [card.key, () => fetchCardData(card)])
    );

    // GDrive Sync Handler (runs one job per selected drive, shows progress per-pill)
    const handleGDriveRun = async () => {
        setPillProgress(() =>
            Object.fromEntries(
                selectedGDrives.map(n => [n, { progress: 0, status: 'running', jobId: null }])
            )
        );
        try {
            // Start jobs in parallel
            await Promise.all(
                selectedGDrives.map(async driveName => {
                    try {
                        // runGDriveAdhocSync expects array; you could also POST one at a time if needed
                        const jobResp = await runGDriveAdhocSync([driveName]);
                        if (!jobResp.job_id) throw new Error('No job ID returned');
                        // Track jobId per drive
                        setPillProgress(prv => ({
                            ...prv,
                            [driveName]: { ...prv[driveName], jobId: jobResp.job_id },
                        }));
                        // Start polling job progress
                        startJobPolling(driveName, jobResp.job_id);
                        return { name: driveName, jobId: jobResp.job_id };
                    } catch (err) {
                        setPillProgress(prv => ({
                            ...prv,
                            [driveName]: {
                                ...prv[driveName],
                                status: 'error',
                                progress: null,
                                error: err.message,
                            },
                        }));
                        toast.error(`Failed to start sync for ${driveName}: ${err.message}`);
                        return { name: driveName, error: err.message };
                    }
                })
            );
        } catch (e) {
            toast.error(`Failed to start jobs: ${e.message}`);
        }
    };

    // Poll job progress for a drive
    const startJobPolling = (driveName, jobId) => {
        if (jobPollers.current[driveName]) clearInterval(jobPollers.current[driveName]);
        jobPollers.current[driveName] = setInterval(async () => {
            try {
                const job = await fetchJobDetail(jobId);
                // You may want to check job.status or job.progress, depending on your schema
                const finished =
                    job.status &&
                    ['done', 'success', 'failed', 'error', 'canceled'].includes(job.status);
                setPillProgress(prv => ({
                    ...prv,
                    [driveName]: {
                        ...prv[driveName],
                        progress: job.progress ?? null,
                        status: job.status || (finished ? 'done' : 'running'),
                        error: job.error || null,
                    },
                }));
                if (finished) {
                    clearInterval(jobPollers.current[driveName]);
                }
            } catch (e) {
                setPillProgress(prv => ({
                    ...prv,
                    [driveName]: {
                        ...prv[driveName],
                        status: 'error',
                        progress: null,
                        error: e.message,
                    },
                }));
                clearInterval(jobPollers.current[driveName]);
            }
        }, 1200); // poll every ~1s
    };

    // Columns
    const [leftCol, rightCol] = splitIntoColumns(POSTER_MANAGE_CARDS, renderedOpen);

    // Render a card: parent prepares exactly the props for the content component
    const renderCard = card => {
        const CardContent = card.content;
        const state = cardState[card.key] || {};
        let cardProps = { ...state, refresh: refreshers[card.key] };

        if (card.key === 'gdrive_adhoc') {
            cardProps.items = state.data?.sync_gdrive?.gdrive_list || [];
            cardProps.selected = selectedGDrives;
            cardProps.onToggleSelect = handleToggleGDrive;
            cardProps.onRun = handleGDriveRun;
            cardProps.pillProgress = pillProgress;
            cardProps.loading = Object.values(pillProgress).some(p => p.status === 'running');
        }

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
                {renderedOpen[card.key] && <CardContent {...cardProps} />}
            </DashboardCard>
        );
    };

    return (
        <div className="dashboard-dashboard">
            <div className="dashboard-header">
                <h2 className="dashboard-title">Poster Management</h2>
            </div>
            <div className="dashboard-grid dashboard-grid--columns">
                <div className="dashboard-col">{leftCol.map(renderCard)}</div>
                <div className="dashboard-col">{rightCol.map(renderCard)}</div>
            </div>
        </div>
    );
}
