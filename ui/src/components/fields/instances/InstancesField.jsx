import React, { useCallback, useMemo } from 'react';
import { fetchPlexLibraries } from '../../../utils/api';
import { useToast } from '../../providers/ToastProvider';
import { humanize } from '../../../utils/tools';

// --- Subcomponents --- //
function PlexInstanceCard({
    name,
    selected,
    libraries,
    onSelect,
    onLibsChange,
    addPosters,
    onAddPosters,
    showAddPosters = true,
    toast,
}) {
    const [libList, setLibList] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (selected) {
            setLoading(true);
            fetchPlexLibraries(name)
                .then(data => {
                    setLibList(data);
                    if (data.length === 0) {
                        toast('No libraries found for this instance.', 'info');
                    }
                })
                .catch(e => {
                    toast('Error loading libraries: ' + e.message, 'error');
                    setLibList([]);
                })
                .finally(() => setLoading(false));
        }
    }, [selected, name, toast]);

    return (
        <div className="plex-instance-card">
            <div className="instance-type-label">
                <label className={`instance-checkbox-container${selected ? ' checked' : ''}`}>
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={e => onSelect(e.target.checked)}
                        tabIndex={0}
                    />
                    <svg viewBox="0 0 64 64" height={24} width={24}>
                        <path
                            d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16"
                            pathLength="575.0541381835938"
                            className="instance-checkbox-path"
                        />
                    </svg>
                </label>
                <span className="instance-label">{humanize(name)}</span>
                {showAddPosters && typeof addPosters === 'boolean' && (
                    <button
                        type="button"
                        className={`add-posters-text-btn${addPosters ? ' active' : ''}`}
                        aria-pressed={addPosters}
                        disabled={!selected}
                        onClick={onAddPosters}
                    >
                        Upload Posters: {addPosters ? 'ON' : 'OFF'}
                    </button>
                )}
            </div>
            <div className={`instance-library-list${selected ? ' expanded' : ''}`}>
                {loading
                    ? 'Loading libraries...'
                    : libList.length
                      ? libList.map(lib => (
                            <label
                                key={lib}
                                className={`instance-pill${libraries.includes(lib) ? ' checked' : ''}`}
                                tabIndex={0}
                            >
                                <input
                                    type="checkbox"
                                    checked={libraries.includes(lib)}
                                    onChange={e => {
                                        const nextLibs = e.target.checked
                                            ? [...libraries, lib].filter(
                                                  (v, i, arr) => arr.indexOf(v) === i
                                              )
                                            : libraries.filter(l => l !== lib);
                                        onLibsChange(nextLibs);
                                    }}
                                />
                                <span className="pill-label">{lib}</span>
                            </label>
                        ))
                      : 'No libraries found for this instance.'}
            </div>
        </div>
    );
}

function InstanceTypeColumn({ type, instances, selected, onToggle }) {
    return (
        <div className="instance-type-col">
            <div className="instance-type-label">
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            {instances.map(instName => {
                const isChecked = selected.includes(instName);
                return (
                    <label
                        key={instName}
                        className={`instance-pill${isChecked ? ' checked' : ''}`}
                        style={{ cursor: 'pointer' }}
                    >
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => onToggle(instName, e.target.checked)}
                        />
                        <span className="pill-label">{instName}</span>
                    </label>
                );
            })}
        </div>
    );
}

// --- Main Field --- //
export default function InstancesField({
    field,
    value,
    onChange,
    rootConfig,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const toast = useToast();
    // Defensive, but keeps hooks stable:
    const selectedArr = useMemo(() => (Array.isArray(value) ? value : []), [value]);

    // Compute allowed instance types only once per field
    const instanceTypes = useMemo(
        () =>
            Array.isArray(field?.instance_types) && field.instance_types.length > 0
                ? field.instance_types
                : ['radarr', 'sonarr', 'plex'],
        [field]
    );

    // Only compute basicInstances when deps change
    const basicTypes = useMemo(
        () => instanceTypes.filter(t => t === 'radarr' || t === 'sonarr'),
        [instanceTypes]
    );
    const basicInstances = useMemo(() => {
        const result = {};
        basicTypes.forEach(type => {
            result[type] = rootConfig.instances?.[type]
                ? Object.keys(rootConfig.instances[type])
                : [];
        });
        return result;
    }, [basicTypes, rootConfig.instances]);

    const plexInstances = useMemo(
        () =>
            instanceTypes.includes('plex') && rootConfig.instances?.plex
                ? Object.keys(rootConfig.instances.plex)
                : [],
        [instanceTypes, rootConfig.instances]
    );

    // Select helpers (memoize so useCallback sees stable refs)
    const getBasicSelected = useCallback(
        () => selectedArr.filter(x => typeof x === 'string'),
        [selectedArr]
    );
    const getPlexSelected = useCallback(
        () => selectedArr.filter(x => typeof x === 'object' && x !== null && Object.keys(x)[0]),
        [selectedArr]
    );

    // --- Callbacks ---
    const handleBasicToggle = useCallback(
        (instName, checked) => {
            let basicSelected = getBasicSelected();
            if (checked && !basicSelected.includes(instName)) {
                basicSelected = [...basicSelected, instName];
            } else if (!checked) {
                basicSelected = basicSelected.filter(x => x !== instName);
            }
            const plexSelected = getPlexSelected();
            if (onChange) onChange([...basicSelected, ...plexSelected]);
        },
        [onChange, getBasicSelected, getPlexSelected]
    );

    const handlePlexToggle = useCallback(
        (instName, checked) => {
            const basicSelected = getBasicSelected();
            let plexSelected = getPlexSelected();
            const idx = plexSelected.findIndex(x => Object.keys(x)[0] === instName);
            if (checked && idx === -1) {
                plexSelected = [
                    ...plexSelected,
                    { [instName]: { library_names: [], add_posters: false } },
                ];
            } else if (!checked && idx !== -1) {
                plexSelected = plexSelected.filter((x, i) => i !== idx);
            }
            if (onChange) onChange([...basicSelected, ...plexSelected]);
        },
        [onChange, getBasicSelected, getPlexSelected]
    );

    const handlePlexLibs = useCallback(
        (instName, libs) => {
            const arr = getBasicSelected();
            let plex = getPlexSelected().map(obj => {
                if (Object.keys(obj)[0] === instName) {
                    return {
                        ...obj,
                        [instName]: {
                            ...obj[instName],
                            library_names: libs,
                        },
                    };
                }
                return obj;
            });
            if (onChange) onChange([...arr, ...plex]);
        },
        [onChange, getBasicSelected, getPlexSelected]
    );

    const handlePlexPosters = useCallback(
        instName => {
            const arr = getBasicSelected();
            let plex = getPlexSelected().map(obj => {
                if (Object.keys(obj)[0] === instName) {
                    return {
                        ...obj,
                        [instName]: {
                            ...obj[instName],
                            add_posters: !obj[instName].add_posters,
                        },
                    };
                }
                return obj;
            });
            if (onChange) onChange([...arr, ...plex]);
        },
        [onChange, getBasicSelected, getPlexSelected]
    );

    // Render logic flags (no side effects)
    const hasBasicRadarr = basicTypes.includes('radarr') && basicInstances.radarr?.length > 0;
    const hasBasicSonarr = basicTypes.includes('sonarr') && basicInstances.sonarr?.length > 0;
    const hasPlex = instanceTypes.includes('plex') && plexInstances.length > 0;

    // --- Render ---
    return (
        <div className={`settings-field-row${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label>{field.label || 'Instances'}</label>
            </div>
            <div className="settings-field-inputwrap">
                {(hasBasicRadarr || hasBasicSonarr) && (
                    <div className="instance-block">
                        <div className="instances-multicol">
                            {hasBasicRadarr && (
                                <InstanceTypeColumn
                                    type="radarr"
                                    instances={basicInstances.radarr}
                                    selected={getBasicSelected()}
                                    onToggle={handleBasicToggle}
                                />
                            )}
                            {hasBasicSonarr && (
                                <InstanceTypeColumn
                                    type="sonarr"
                                    instances={basicInstances.sonarr}
                                    selected={getBasicSelected()}
                                    onToggle={handleBasicToggle}
                                />
                            )}
                        </div>
                    </div>
                )}
                {hasPlex &&
                    plexInstances.map(instName => {
                        const entry = getPlexSelected().find(x => Object.keys(x)[0] === instName);
                        const selected = !!entry;
                        const libraries = entry ? entry[instName].library_names : [];
                        const addPosters = entry ? entry[instName].add_posters : false;
                        return (
                            <PlexInstanceCard
                                key={instName}
                                name={instName}
                                selected={selected}
                                libraries={libraries}
                                addPosters={addPosters}
                                onSelect={checked => handlePlexToggle(instName, checked)}
                                onLibsChange={libs => handlePlexLibs(instName, libs)}
                                onAddPosters={() => handlePlexPosters(instName)}
                                showAddPosters={field.add_posters_option !== false}
                                toast={toast}
                            />
                        );
                    })}
                {/* Empty states based on what's requested */}
                {!hasBasicRadarr && !hasBasicSonarr && !hasPlex && (
                    <div className="instances-empty-message">
                        No instances found for the selected instance types.
                    </div>
                )}
            </div>
            {highlightInvalid && errorMessage && (
                <div className="field-error-text">{errorMessage}</div>
            )}
        </div>
    );
}
