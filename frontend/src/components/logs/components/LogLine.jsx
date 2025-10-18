import React, { useMemo } from 'react';
import {
    LogLevel,
    LogDateTime,
    LogFilePath,
    LogNumber,
    LogQuoted,
    LogHighlight,
    LogUrl,
    LogFileRef,
} from '../primitives';

// Pre-compiled regex patterns (outside component for performance)
const PATTERNS = {
    htmlEscape: /[&<>]/g,
    quotedString: /(['"])(.*?)\1/g,
    combined:
        /\b\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} (?:AM|PM)\b|\b(CRITICAL|ERROR|WARNING|INFO|DEBUG)\b|https?:\/\/[^\s<>"{}|\\^`\]]+|\[[^\]]+\.(py|js|jsx|ts|tsx|json|yml|yaml|md|txt|log)\]|\b[\w_]+(\.[\w_]+)+\b|\b\d+(\.\d+)?\b|__QUOTED_PLACEHOLDER_\d+__/g,
    datetime: /^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} (?:AM|PM)$/,
    level: /^(CRITICAL|ERROR|WARNING|INFO|DEBUG)$/,
    placeholder: /^__QUOTED_PLACEHOLDER_(\d+)__$/,
    url: /^https?:\/\//,
    fileref: /^\[[^\]]+\.(py|js|jsx|ts|tsx|json|yml|yaml|md|txt|log)\]$/,
    filepath: /^[\w_]+(\.[\w_]+)+$/,
    number: /^\d+(\.\d+)?$/,
};

// HTML escape map for performance
const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

// Optimized HTML escape function
const escapeHtml = text => text.replace(PATTERNS.htmlEscape, char => HTML_ESCAPE_MAP[char]);

/**
 * LogLine - Render log line with syntax highlighting using Phase 1 primitives
 * @param {Object} props
 * @param {string} props.line - Log line text
 * @param {string} props.searchTerm - Search term for highlighting
 * @returns {JSX.Element}
 */
export const LogLine = React.memo(
    ({ line, searchTerm }) => {
        // Memoize expensive parsing - only re-parse when line changes
        const segments = useMemo(() => {
            let escaped = escapeHtml(line);
            const result = [];

            // 1. Extract quoted strings
            const quotedMatches = [];
            escaped = escaped.replace(PATTERNS.quotedString, match => {
                quotedMatches.push(match);
                return `__QUOTED_PLACEHOLDER_${quotedMatches.length - 1}__`;
            });

            let currentIndex = 0;

            // 2. Parse using pre-compiled combined pattern
            let match;
            // Reset regex lastIndex for reuse
            PATTERNS.combined.lastIndex = 0;

            while ((match = PATTERNS.combined.exec(escaped)) !== null) {
                // Add text before match
                if (match.index > currentIndex) {
                    const text = escaped.slice(currentIndex, match.index);
                    if (text) result.push({ type: 'text', content: text });
                }

                const matchedText = match[0];

                // Determine type using pre-compiled patterns (order matters for specificity)
                if (PATTERNS.datetime.test(matchedText)) {
                    result.push({ type: 'datetime', content: matchedText });
                } else if (PATTERNS.level.test(matchedText)) {
                    result.push({ type: 'level', content: matchedText });
                } else if (PATTERNS.url.test(matchedText)) {
                    result.push({ type: 'url', content: matchedText });
                } else if (PATTERNS.fileref.test(matchedText)) {
                    result.push({ type: 'fileref', content: matchedText });
                } else if (PATTERNS.placeholder.test(matchedText)) {
                    const placeholderMatch = matchedText.match(PATTERNS.placeholder);
                    const idx = parseInt(placeholderMatch[1], 10);
                    result.push({ type: 'quoted', content: quotedMatches[idx] });
                } else if (PATTERNS.filepath.test(matchedText)) {
                    result.push({ type: 'filepath', content: matchedText });
                } else if (PATTERNS.number.test(matchedText)) {
                    result.push({ type: 'number', content: matchedText });
                } else {
                    result.push({ type: 'text', content: matchedText });
                }

                currentIndex = match.index + matchedText.length;
            }

            // Add remaining text
            if (currentIndex < escaped.length) {
                const text = escaped.slice(currentIndex);
                if (text) result.push({ type: 'text', content: text });
            }

            return result;
        }, [line]); // Only re-parse when line changes

        // Render segments - searchTerm only affects highlighting, not parsing
        const renderedSegments = useMemo(() => {
            const normalizedSearchTerm = searchTerm?.trim().toLowerCase() || '';
            const hasSearch = normalizedSearchTerm.length > 0;

            return segments.map((segment, idx) => {
                const key = `seg-${idx}`;
                const content = segment.content;

                // Only apply highlight if segment contains search term
                const shouldHighlight =
                    hasSearch && content.toLowerCase().includes(normalizedSearchTerm);

                let element;
                switch (segment.type) {
                    case 'datetime':
                        element = <LogDateTime key={key}>{content}</LogDateTime>;
                        break;
                    case 'level':
                        element = (
                            <LogLevel key={key} level={content}>
                                {content}
                            </LogLevel>
                        );
                        break;
                    case 'url':
                        element = <LogUrl key={key}>{content}</LogUrl>;
                        break;
                    case 'fileref':
                        element = <LogFileRef key={key}>{content}</LogFileRef>;
                        break;
                    case 'filepath':
                        element = <LogFilePath key={key}>{content}</LogFilePath>;
                        break;
                    case 'number':
                        element = <LogNumber key={key}>{content}</LogNumber>;
                        break;
                    case 'quoted':
                        element = <LogQuoted key={key}>{content}</LogQuoted>;
                        break;
                    case 'text':
                    default:
                        element = <span key={key}>{content}</span>;
                }

                return shouldHighlight ? (
                    <LogHighlight key={key} searchTerm={normalizedSearchTerm}>
                        {element}
                    </LogHighlight>
                ) : (
                    element
                );
            });
        }, [segments, searchTerm]);

        return <div className="log-line">{renderedSegments}</div>;
    },
    // Custom comparison: only re-render if line or searchTerm changed
    (prevProps, nextProps) => {
        return prevProps.line === nextProps.line && prevProps.searchTerm === nextProps.searchTerm;
    }
);

LogLine.displayName = 'LogLine';
