import React from 'react';
import { useLogControls } from '../context/LogControlsContext';
import { useUploadState } from '../hooks/useUploadState';
import Spinner from '../../ui/Spinner';

/**
 * ActionButtons - Download and upload action buttons
 *
 * Renders download button and upload button with 3-click state machine.
 * Download button always enabled, upload button shows loading spinner
 * during upload and cycles through upload/open/copy states.
 *
 * @param {Object} props
 * @param {string} props.logText - Current log text (for upload)
 * @returns {JSX.Element}
 */
export const ActionButtons = ({ logText }) => {
    const { onDownload } = useLogControls();
    const uploadState = useUploadState(logText);

    return (
        <div className="flex items-center gap-2">
            {/* Download button */}
            <button
                type="button"
                onClick={onDownload}
                className="flex items-center justify-center p-2 rounded-md border border-divider bg-input text-primary hover:bg-surface-alt transition-colors min-h-11 min-w-11"
                title="Download log"
                aria-label="Download log"
            >
                <span className="material-symbols-outlined text-xl">download</span>
            </button>

            {/* Upload button with 3-click state machine */}
            <button
                type="button"
                onClick={uploadState.handleUpload}
                disabled={uploadState.uploading}
                className="flex items-center justify-center p-2 rounded-md border border-divider bg-input text-primary hover:bg-surface-alt transition-colors min-h-11 min-w-11 disabled:opacity-50 disabled:cursor-not-allowed"
                title={uploadState.tooltipText}
                aria-label={uploadState.tooltipText}
            >
                {uploadState.uploading ? (
                    <Spinner size="small" />
                ) : (
                    <span className="material-symbols-outlined text-xl">
                        {uploadState.buttonIcon}
                    </span>
                )}
            </button>
        </div>
    );
};
