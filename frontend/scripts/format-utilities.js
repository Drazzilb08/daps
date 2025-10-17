#!/usr/bin/env node

/**
 * Formats utility CSS files to single-line format for rules with single declarations
 * Run from test-ui directory: node scripts/format-utilities.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get script directory and calculate paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testUiRoot = join(__dirname, '..');
const utilitiesDir = join(testUiRoot, 'src', 'css', 'utilities');

const files = readdirSync(utilitiesDir).filter(f => f.endsWith('.css'));

files.forEach(filename => {
    const file = join(utilitiesDir, filename);
    let content = readFileSync(file, 'utf-8');

    // Convert single-declaration rules to single-line format
    // Very conservative: only matches simple patterns to avoid breaking edge cases
    // Pattern: .selector {\n    property: value;\n    }
    const lines = content.split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Check if this line starts a CSS rule
        const selectorMatch = line.match(/^(\s*)(\.[a-zA-Z0-9_:\\\/\-]+)\s*\{\s*$/);

        if (selectorMatch && i + 2 < lines.length) {
            const indent = selectorMatch[1];
            const selector = selectorMatch[2];
            const nextLine = lines[i + 1];
            const closingLine = lines[i + 2];

            // Check if next line is a single declaration
            const declarationMatch = nextLine.match(/^\s+([a-z-]+:\s*[^;]+;)\s*$/);
            // Check if line after that is just a closing brace (with optional comment)
            const closingMatch = closingLine.match(/^\s*\}\s*(\/\*[^*]*\*\/)?\s*$/);

            if (declarationMatch && closingMatch) {
                // Convert to single-line format
                const declaration = declarationMatch[1].trim();
                const comment = closingMatch[1] ? ` ${closingMatch[1].trim()}` : '';
                result.push(`${indent}${selector} { ${declaration} }${comment}`);
                i += 3; // Skip the next 2 lines
                continue;
            }
        }

        // Not a match, keep the line as-is
        result.push(line);
        i++;
    }

    writeFileSync(file, result.join('\n'), 'utf-8');
});

console.log(`✓ Formatted ${files.length} utility CSS files to single-line format`);
