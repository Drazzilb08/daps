import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/card/Card';

/**
 * SettingsSplash - Settings landing page with navigation cards
 *
 * Provides visual navigation to all settings subsections via Card primitive composition.
 * Each card uses Link wrapper for navigation with Card.Body for content composition.
 *
 * Mobile-first: Single column on mobile, 2-column grid on desktop
 * Composition: Card primitive + React Router Link + Material Icons (CDN)
 * No custom CSS: 100% utility class composition
 *
 * @returns {JSX.Element} Settings splash page with navigation cards
 */
export const SettingsSplash = React.memo(() => {
    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <h1 className="text-xl md:text-2xl font-semibold mb-2 text-primary">Settings</h1>
            <p className="text-sm md:text-base text-secondary mb-6">
                Configure DAPS application settings and preferences
            </p>

            {/* Navigation Cards Grid - Mobile-first responsive */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Schedule Configuration Card */}
                <Link to="/settings/schedule" className="no-underline">
                    <Card hoverable clickable>
                        <Card.Body>
                            <div className="flex flex-col items-center text-center gap-3 py-4">
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontSize: '48px' }}
                                    aria-hidden="true"
                                >
                                    schedule
                                </span>
                                <h2 className="text-lg font-semibold text-primary m-0">
                                    Schedule Configuration
                                </h2>
                                <p className="text-sm text-secondary m-0">
                                    Set up automated module execution schedules
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Link>

                {/* Service Instances Card */}
                <Link to="/settings/instances" className="no-underline">
                    <Card hoverable clickable>
                        <Card.Body>
                            <div className="flex flex-col items-center text-center gap-3 py-4">
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontSize: '48px' }}
                                    aria-hidden="true"
                                >
                                    dns
                                </span>
                                <h2 className="text-lg font-semibold text-primary m-0">
                                    Service Instances
                                </h2>
                                <p className="text-sm text-secondary m-0">
                                    Manage Radarr, Sonarr, and Plex connections
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Link>

                {/* Notifications Card */}
                <Link to="/settings/notifications" className="no-underline">
                    <Card hoverable clickable>
                        <Card.Body>
                            <div className="flex flex-col items-center text-center gap-3 py-4">
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontSize: '48px' }}
                                    aria-hidden="true"
                                >
                                    notifications
                                </span>
                                <h2 className="text-lg font-semibold text-primary m-0">
                                    Notifications
                                </h2>
                                <p className="text-sm text-secondary m-0">
                                    Configure notification services and alerts
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Link>

                {/* Modules Card */}
                <Link to="/settings/modules" className="no-underline">
                    <Card hoverable clickable>
                        <Card.Body>
                            <div className="flex flex-col items-center text-center gap-3 py-4">
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontSize: '48px' }}
                                    aria-hidden="true"
                                >
                                    extension
                                </span>
                                <h2 className="text-lg font-semibold text-primary m-0">
                                    Module Settings
                                </h2>
                                <p className="text-sm text-secondary m-0">
                                    Configure individual module settings and options
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Link>

                {/* Interface Settings Card */}
                <Link to="/settings/interface" className="no-underline">
                    <Card hoverable clickable>
                        <Card.Body>
                            <div className="flex flex-col items-center text-center gap-3 py-4">
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontSize: '48px' }}
                                    aria-hidden="true"
                                >
                                    palette
                                </span>
                                <h2 className="text-lg font-semibold text-primary m-0">
                                    Interface Settings
                                </h2>
                                <p className="text-sm text-secondary m-0">
                                    Customize UI appearance and behavior
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Link>

                {/* General Settings Card */}
                <Link to="/settings/general" className="no-underline">
                    <Card hoverable clickable>
                        <Card.Body>
                            <div className="flex flex-col items-center text-center gap-3 py-4">
                                <span
                                    className="material-symbols-outlined text-primary"
                                    style={{ fontSize: '48px' }}
                                    aria-hidden="true"
                                >
                                    settings
                                </span>
                                <h2 className="text-lg font-semibold text-primary m-0">
                                    General Settings
                                </h2>
                                <p className="text-sm text-secondary m-0">
                                    Configure global application settings and preferences
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Link>
            </div>
        </div>
    );
});

SettingsSplash.displayName = 'SettingsSplash';

export default SettingsSplash;
