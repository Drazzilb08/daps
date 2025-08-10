import React, { useRef, useState, useEffect, useCallback } from 'react';
import DashboardCard from '../components/DashboardCard';
import { getIcon, splitIntoColumns } from '../utils/tools';
import { useToast } from '../components/providers/ToastProvider';
import { runGDriveAdhocSync, fetchConfig, fetchJobDetail, retryJob } from '../utils/api';
import '../css/pages/dashboard.css';
import '../css/pages/poster-manage.css';

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
                // Clean up any existing pollers
                Object.values(jobPollers.current).forEach(clearInterval);
                jobPollers.current = {};
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
        // Reset all selected drives to running state
        setPillProgress(() =>
            Object.fromEntries(
                selectedGDrives.map(n => [
                    n,
                    {
                        progress: 0,
                        status: 'running',
                        jobId: null,
                        error: null,
                    },
                ])
            )
        );

        try {
            // Start jobs in parallel
            await Promise.all(
                selectedGDrives.map(async driveName => {
                    try {
                        const jobResp = await runGDriveAdhocSync([driveName]);
                        if (!jobResp.job_id) throw new Error('No job ID returned');

                        // Update with job ID
                        setPillProgress(prv => ({
                            ...prv,
                            [driveName]: {
                                ...prv[driveName],
                                jobId: jobResp.job_id,
                                progress: 5, // Show some initial progress
                            },
                        }));

                        // Start polling job progress
                        startJobPolling(driveName, jobResp.job_id);
                        return { name: driveName, jobId: jobResp.job_id };
                    } catch (err) {
                        setPillProgress(prv => ({
                            ...prv,
                            [driveName]: {
                                progress: null,
                                status: 'error',
                                error: err.message,
                                jobId: null,
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
        console.log(`Starting polling for ${driveName}, job ${jobId}`);

        // Clear existing poller
        if (jobPollers.current[driveName]) {
            clearInterval(jobPollers.current[driveName]);
        }

        jobPollers.current[driveName] = setInterval(async () => {
            try {
                const response = await fetchJobDetail(jobId);
                console.log(`Job ${jobId} status:`, response);

                // Handle the response structure - fetchJobDetail returns the job object directly
                const job = response.job || response;

                // Map database status values to our UI states
                const dbStatus = job.status;
                let uiStatus = 'running';
                let isFinished = false;

                if (dbStatus === 'success') {
                    uiStatus = 'success';
                    isFinished = true;
                } else if (dbStatus === 'error') {
                    uiStatus = 'error';
                    isFinished = true;
                } else if (dbStatus === 'running') {
                    uiStatus = 'running';
                } else if (dbStatus === 'pending') {
                    uiStatus = 'running'; // Show as running for pending jobs
                }

                // Update progress state
                setPillProgress(prv => ({
                    ...prv,
                    [driveName]: {
                        ...prv[driveName],
                        progress: job.progress ?? prv[driveName]?.progress ?? null,
                        status: uiStatus,
                        error: job.error || null,
                    },
                }));

                // Stop polling if finished
                if (isFinished) {
                    console.log(`Job ${jobId} finished with status: ${uiStatus}`);
                    clearInterval(jobPollers.current[driveName]);
                    delete jobPollers.current[driveName];

                    // Show completion notification
                    if (uiStatus === 'success') {
                        toast.success(`GDrive sync completed for ${driveName}`);
                    } else if (uiStatus === 'error') {
                        toast.error(
                            `GDrive sync failed for ${driveName}: ${job.error || 'Unknown error'}`
                        );
                    }
                }
            } catch (e) {
                console.error(`Error polling job ${jobId}:`, e);
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
                delete jobPollers.current[driveName];
            }
        }, 1000); // Poll every 1 second for better responsiveness
    };

    // Retry a failed job
    const handleRetryJob = async driveName => {
        const pill = pillProgress[driveName];
        if (!pill?.jobId) {
            toast.error('No job ID to retry');
            return;
        }

        try {
            // Reset pill to running state
            setPillProgress(prv => ({
                ...prv,
                [driveName]: {
                    ...prv[driveName],
                    status: 'running',
                    progress: 0,
                    error: null,
                },
            }));

            // Call retry API
            await retryJob(pill.jobId);
            toast.info(`Retrying sync for ${driveName}...`);

            // Restart polling
            startJobPolling(driveName, pill.jobId);
        } catch (error) {
            setPillProgress(prv => ({
                ...prv,
                [driveName]: {
                    ...prv[driveName],
                    status: 'error',
                    error: error.message,
                },
            }));
            toast.error(`Failed to retry ${driveName}: ${error.message}`);
        }
    };

    // Columns
    const [leftCol, rightCol] = splitIntoColumns(POSTER_MANAGE_CARDS, renderedOpen);

    // Check if any jobs are running
    const hasRunningJobs = Object.values(pillProgress).some(p => p.status === 'running');

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
            cardProps.onRetry = handleRetryJob;
            cardProps.pillProgress = pillProgress;
            cardProps.loading = hasRunningJobs;
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
