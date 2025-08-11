import React from 'react';

const PRESETS_URL =
    'https://raw.githubusercontent.com/Drazzilb08/daps-gdrive-presets/CL2K/presets.json';

export function GdrivePresetsField({ field, value, onChange, onPresetSelected, moduleConfig }) {
    const [presets, setPresets] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetch(PRESETS_URL)
            .then(r => r.json())
            .then(data => {
                let arr = Array.isArray(data)
                    ? data
                    : Object.entries(data).map(([name, v]) =>
                          typeof v === 'object' ? { name, ...v } : { name, id: v }
                      );
                if (mounted) setPresets(arr);
            })
            .catch(() => mounted && setPresets([]))
            .finally(() => setLoading(false));
        return () => {
            mounted = false;
        };
    }, []);

    // Extract already used IDs from moduleConfig.gdrive_list (fallback safe)
    const alreadyAddedIds = React.useMemo(() => {
        // Use the explicit alreadyAddedIds from moduleConfig if available
        if (Array.isArray(moduleConfig?.alreadyAddedIds)) {
            return moduleConfig.alreadyAddedIds;
        }
        // fallback to gdrive_list IDs if not present
        if (Array.isArray(moduleConfig?.gdrive_list)) {
            return moduleConfig.gdrive_list.map(entry => entry.id).filter(Boolean);
        }
        return [];
    }, [moduleConfig]);

    const selected = presets.find(p => p.id === value);

    // IDs excluding current selection so current can remain enabled
    const usedIdsExceptSelected = React.useMemo(() => {
        return alreadyAddedIds.filter(id => id !== value);
    }, [alreadyAddedIds, value]);
    return (
        <div className="settings-field-row">
            <div className="settings-field-labelcol">
                <label>{field.label || 'Gdrive Presets'}</label>
            </div>
            <div className="settings-field-inputwrap">
                <select
                    className="select gdrive-preset-select"
                    value={value ?? ''}
                    disabled={loading}
                    onChange={e => {
                    onChange(e.target.value);
                    if (onPresetSelected) {
                    const selectedPreset = presets.find(p => p.id === e.target.value);
                    if (selectedPreset) {
                    onPresetSelected({
                    [field.key]: e.target.value,
                    name: selectedPreset.name,
                    id: selectedPreset.id,
                    ...selectedPreset,
                    });
                    }
                    }
                    }}
                >
                    <option value="">— No Preset —</option>
                    {presets.map(preset => {
                        const alreadyAdded = usedIdsExceptSelected.includes(preset.id);
                        return (
                            <option key={preset.id} value={preset.id} disabled={alreadyAdded}>
                                {preset.name + (alreadyAdded ? ' (Already Added)' : '')}
                            </option>
                        );
                    })}
                </select>
                {field.description && <div className="field-help-text">{field.description}</div>}

                {selected && (
                    <div className="gdrive-preset-card" style={{ marginTop: '0.8em' }}>
                        {Object.entries(selected)
                            .filter(([k]) => k !== 'id')
                            .map(([k, v]) => (
                                <div className="gdrive-preset-card-row" key={k}>
                                    <span className="gdrive-preset-card-label">
                                        {k.charAt(0).toUpperCase() + k.slice(1)}:
                                    </span>
                                    <span
                                        className="gdrive-preset-card-value"
                                        style={{ marginLeft: 8 }}
                                    >
                                        {Array.isArray(v) ? (
                                            <ul>
                                                {v.map((vv, i) => (
                                                    <li key={i}>{String(vv)}</li>
                                                ))}
                                            </ul>
                                        ) : typeof v === 'object' && v !== null ? (
                                            <pre>{JSON.stringify(v, null, 2)}</pre>
                                        ) : (
                                            String(v)
                                        )}
                                    </span>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
