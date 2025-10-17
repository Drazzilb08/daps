import { useState } from 'react';
import { ArrayObjectField } from '../../components/fields/custom/ArrayObjectField';

/**
 * Development page showcasing the unified ArrayObjectField
 * Demonstrates unified object_array field with different schema configurations
 */
export default function ArrayObjectFieldPage() {
    // Sample data for each field type
    const [gdriveData, setGdriveData] = useState([
        {
            preset: 'preset1',
            name: 'Movie Posters Collection',
            id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            location: '/mnt/media/posters/movies',
        },
        {
            preset: 'preset2',
            name: 'TV Show Assets',
            id: '1AbcDef123456789GhijKlmnOpqrStuv',
            location: '/mnt/media/posters/tv',
        },
    ]);

    const [replacerData, setReplacerData] = useState([
        {
            preset: 'christmas',
            name: 'Christmas',
            schedule: {
                start: '2024-12-01',
                end: '2024-12-31',
            },
            colors: ['#C41E3A', '#228B22', '#FFD700'],
        },
        {
            preset: 'halloween',
            name: 'Halloween',
            schedule: {
                start: '2024-10-01',
                end: '2024-10-31',
            },
            colors: ['#FF8C00', '#000000', '#8B4513'],
        },
    ]);

    const [upgradinatorData, setUpgradinatorData] = useState([
        {
            instance: 'radarr-4k',
            count: 10,
            tag_name: 'upgrade-4k',
            ignore_tag: 'no-upgrade',
            unattended: true,
            season_monitored_threshold: 0.8,
        },
        {
            instance: 'sonarr-main',
            count: 5,
            tag_name: 'upgrade-shows',
            ignore_tag: '',
            unattended: false,
            season_monitored_threshold: 0.75,
        },
    ]);

    const [labelarrData, setLabelarrData] = useState([
        {
            app_instance: 'radarr-main',
            labels: 'action,thriller',
            plex_instances: [{ name: 'plex-main', url: 'http://localhost:32400' }],
        },
        {
            app_instance: 'sonarr-main',
            labels: 'drama,series',
            plex_instances: [{ name: 'plex-main', url: 'http://localhost:32400' }],
        },
    ]);

    // Field configurations matching original schemas
    const gdriveField = {
        key: 'gdrive_list',
        label: 'Google Drive List',
        type: 'object_array',
        description: 'Each entry contains id, location, and name.',
        fields: [
            {
                key: 'preset',
                label: 'Gdrive Presets',
                type: 'gdrive_presets',
                required: false,
                exclude_on_save: true,
                description: 'Select a preset configuration for Google Drive.',
                presetHandler: true,
            },
            {
                key: 'name',
                label: 'Name',
                type: 'text',
                required: true,
                description: 'Friendly name for this Google Drive entry.',
            },
            {
                key: 'id',
                label: 'GDrive ID',
                type: 'text',
                required: true,
                description: 'Unique ID of the Google Drive folder or file.',
            },
            {
                key: 'location',
                label: 'Location',
                type: 'dir',
                required: true,
                description: 'Local directory to sync with the specified Google Drive ID.',
            },
        ],
    };

    const replacerField = {
        key: 'holidays',
        label: 'Holidays',
        type: 'object_array',
        description: 'Add holiday color overrides.',
        fields: [
            {
                key: 'preset',
                label: 'Holiday Presets',
                type: 'holiday_presets',
                description: 'Select a preset for holiday color overrides.',
                presetHandler: true,
            },
            {
                key: 'name',
                label: 'Holiday Name',
                type: 'text',
                required: true,
                description: 'Name of the holiday for color override.',
            },
            {
                key: 'schedule',
                label: 'Schedule',
                type: 'holiday_schedule',
                required: false,
                description: 'Schedule for when the holiday override is active.',
            },
            {
                key: 'colors',
                label: 'Colors',
                type: 'color_list',
                preview: 'false',
                required: false,
                description: 'Colors to use for the holiday border override.',
            },
        ],
    };

    const upgradinatorField = {
        key: 'instances_list',
        label: 'Instance Upgrade Mappings',
        type: 'object_array',
        description: 'List of instance configs.',
        fields: [
            {
                key: 'instance',
                label: 'Instance',
                type: 'dropdown',
                options: ['radarr-main', 'radarr-4k', 'sonarr-main', 'sonarr-4k'],
                required: true,
                description: 'Select the instance to upgrade (Radarr or Sonarr).',
            },
            {
                key: 'count',
                label: 'Count',
                type: 'number',
                required: true,
                description: 'Number of items to upgrade per run.',
            },
            {
                key: 'tag_name',
                label: 'Tag Name',
                type: 'text',
                required: true,
                description: 'Tag name to filter items for upgrade.',
            },
            {
                key: 'ignore_tag',
                label: 'Ignore Tag',
                type: 'text',
                description: 'Tag name to exclude from upgrade.',
            },
            {
                key: 'unattended',
                label: 'Unattended',
                type: 'check_box',
                description: 'Run upgrades without user intervention.',
            },
            {
                key: 'season_monitored_threshold',
                label: 'Season Monitored Threshold',
                type: 'float',
                required: true,
                description: 'Minimum percentage of monitored seasons required (Sonarr only).',
            },
        ],
    };

    const labelarrField = {
        key: 'mappings',
        label: 'ARR to Plex Tag Mappings',
        type: 'object_array',
        description: 'Mappings of app_type, app_instance, labels, plex_instances.',
        fields: [
            {
                key: 'app_instance',
                label: 'App Instance',
                type: 'dropdown',
                options: ['radarr-main', 'radarr-4k', 'sonarr-main', 'sonarr-4k'],
                required: true,
                description: 'Select the specific app instance for this mapping.',
            },
            {
                key: 'labels',
                label: 'Labels',
                type: 'text',
                required: true,
                description: 'Labels to assign in this mapping.',
            },
            {
                key: 'plex_instances',
                label: 'Plex Instances',
                type: 'instances',
                required: true,
                description: 'List of Plex instances to apply the labels to.',
            },
        ],
    };

    return (
        <div className="w-full">
            <div className="p-6">
                <header className="mb-6">
                    <h1 className="text-2xl font-semibold text-primary mb-3">
                        Unified ArrayObjectField Mockup
                    </h1>
                    <p className="text-secondary text-base leading-relaxed">
                        This page demonstrates the unified ArrayObjectField component for complex
                        field configurations. The accordion-style interface eliminates modal
                        dependencies while providing a mobile-first experience.
                    </p>
                </header>

                <div className="flex flex-col gap-8">
                    {/* GDrive Custom Replacement */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-medium text-primary">
                                Google Drive Configuration
                            </h2>
                            <p className="text-sm text-secondary mt-1">
                                Schema:{' '}
                                <code className="bg-surface-alt px-2 py-1 rounded text-xs font-mono">
                                    object_array
                                </code>{' '}
                                for Google Drive configuration
                            </p>
                        </div>
                        <div>
                            <ArrayObjectField
                                field={gdriveField}
                                value={gdriveData}
                                onChange={setGdriveData}
                            />
                        </div>
                    </section>

                    {/* Replacerr Custom Replacement */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-medium text-primary">
                                Holiday Border Configuration
                            </h2>
                            <p className="text-sm text-secondary mt-1">
                                Schema:{' '}
                                <code className="bg-surface-alt px-2 py-1 rounded text-xs font-mono">
                                    object_array
                                </code>{' '}
                                for poster replacement configuration
                            </p>
                        </div>
                        <div>
                            <ArrayObjectField
                                field={replacerField}
                                value={replacerData}
                                onChange={setReplacerData}
                            />
                        </div>
                    </section>

                    {/* Upgradinatorr Custom Replacement */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-medium text-primary">
                                Instance Upgrade Mappings
                            </h2>
                            <p className="text-sm text-secondary mt-1">
                                Schema:{' '}
                                <code className="bg-surface-alt px-2 py-1 rounded text-xs font-mono">
                                    object_array
                                </code>{' '}
                                for media upgrade configuration
                            </p>
                        </div>
                        <div>
                            <ArrayObjectField
                                field={upgradinatorField}
                                value={upgradinatorData}
                                onChange={setUpgradinatorData}
                            />
                        </div>
                    </section>

                    {/* Labelarr Custom Replacement */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-medium text-primary">
                                Tag Synchronization Mappings
                            </h2>
                            <p className="text-sm text-secondary mt-1">
                                Schema:{' '}
                                <code className="bg-surface-alt px-2 py-1 rounded text-xs font-mono">
                                    object_array
                                </code>{' '}
                                for labeling configuration
                            </p>
                        </div>
                        <div>
                            <ArrayObjectField
                                field={labelarrField}
                                value={labelarrData}
                                onChange={setLabelarrData}
                            />
                        </div>
                    </section>
                </div>

                {/* Benefits Section */}
                <section className="mt-12 p-6 bg-surface-alt rounded-lg border border-border">
                    <h3 className="text-lg font-medium text-primary mb-4">
                        Benefits of Unified Solution
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium text-primary mb-2">
                                🚫 No Modal Dependencies
                            </h4>
                            <p className="text-sm text-secondary">
                                Accordion-style interface eliminates the need for modal systems,
                                perfect for test-ui environment.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-primary mb-2">
                                📱 Mobile-First Design
                            </h4>
                            <p className="text-sm text-secondary">
                                Touch-optimized with 44px minimum targets, works seamlessly on all
                                device sizes.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-primary mb-2">🎯 Single Component</h4>
                            <p className="text-sm text-secondary">
                                One unified component handles all array-of-objects field types,
                                reducing maintenance overhead.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-primary mb-2">
                                🔧 Configurable Display
                            </h4>
                            <p className="text-sm text-secondary">
                                Display templates adapt to different data types while maintaining
                                consistent interaction patterns.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Schema Transformation Section */}
                <section className="mt-8 p-6 bg-surface rounded-lg border border-border">
                    <h3 className="text-lg font-medium text-primary mb-4">
                        Proposed Schema Transformation
                    </h3>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h4 className="font-medium text-primary mb-2">
                                Current Schema (Legacy)
                            </h4>
                            <pre className="text-xs p-3 bg-surface-alt rounded border overflow-auto">
                                {`{
  key: 'gdrive_list',
  type: 'object_array',  // ← Modern unified field type
  fields: [...]
}`}
                            </pre>
                        </div>
                        <div>
                            <h4 className="font-medium text-primary mb-2">New Schema (Unified)</h4>
                            <pre className="text-xs p-3 bg-accent-bg rounded border overflow-auto">
                                {`{
  key: 'gdrive_list',
  type: 'object_array',        // ← Unified type
  displayType: 'gdrive',       // ← Display template
  fields: [...]                // ← Same field definitions
}`}
                            </pre>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

ArrayObjectFieldPage.displayName = 'ArrayObjectFieldPage';
