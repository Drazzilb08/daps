import { useState, useRef, useCallback } from 'react';

/**
 * useUploadState - Manage 3-click upload workflow state machine
 *
 * State machine:
 * 1. No upload → Click: Upload log to dpaste → State 2
 * 2. Upload exists, link not opened → Click: Open link in new tab → State 3
 * 3. Upload exists, link opened → Click: Copy URL to clipboard → State 1 (reset)
 *
 * @param {string} logText - Current log text
 * @returns {Object} Upload state and actions
 * @property {string|null} lastUrl - Last uploaded URL
 * @property {boolean} uploading - Upload in progress
 * @property {boolean} linkOpened - Link opened in new tab
 * @property {Function} handleUpload - Upload/open/copy action based on current state
 * @property {string} buttonIcon - Material icon name for current state
 * @property {string} tooltipText - Tooltip for current state
 */
export function useUploadState(logText) {
    const [lastUrl, setLastUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [linkOpened, setLinkOpened] = useState(false);
    const lastUploadTime = useRef(null);
    const lastUploadText = useRef(null);

    /**
     * Handle upload/open/copy action based on current state
     */
    const handleUpload = useCallback(async () => {
        // State 3: Copy URL to clipboard
        if (lastUrl && linkOpened) {
            try {
                await navigator.clipboard.writeText(lastUrl);
                // Reset to state 1
                setLastUrl(null);
                setLinkOpened(false);
                lastUploadTime.current = null;
                lastUploadText.current = null;
            } catch (error) {
                console.error('Failed to copy URL to clipboard:', error);
            }
            return;
        }

        // State 2: Open link in new tab
        if (lastUrl && !linkOpened) {
            window.open(lastUrl, '_blank', 'noopener,noreferrer');
            setLinkOpened(true);
            return;
        }

        // State 1: Upload log to dpaste
        // Check for duplicate upload (60-second window)
        const now = Date.now();
        const isDuplicate =
            lastUploadTime.current &&
            lastUploadText.current === logText &&
            now - lastUploadTime.current < 60000;

        if (isDuplicate) {
            // Skip duplicate upload, use cached URL
            return;
        }

        // Perform upload
        setUploading(true);
        try {
            const response = await fetch('https://dpaste.com/api/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    content: logText,
                    syntax: 'text',
                    expiry_days: 7,
                }),
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const url = response.url;
            setLastUrl(url);
            setLinkOpened(false);
            lastUploadTime.current = now;
            lastUploadText.current = logText;
        } catch (error) {
            console.error('Failed to upload log:', error);
            // Reset state on error
            setLastUrl(null);
            setLinkOpened(false);
        } finally {
            setUploading(false);
        }
    }, [lastUrl, linkOpened, logText]);

    /**
     * Determine button icon based on current state
     */
    const buttonIcon = uploading
        ? null // Spinner displayed instead
        : lastUrl
          ? linkOpened
              ? 'content_copy' // State 3: Copy icon
              : 'open_in_new' // State 2: Open link icon
          : 'upload'; // State 1: Upload icon

    /**
     * Determine tooltip text based on current state
     */
    const tooltipText = uploading
        ? 'Uploading...'
        : lastUrl
          ? linkOpened
              ? 'Copy URL to clipboard'
              : 'Open uploaded log link'
          : 'Upload log to dpaste';

    return {
        lastUrl,
        uploading,
        linkOpened,
        handleUpload,
        buttonIcon,
        tooltipText,
    };
}
