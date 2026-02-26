// fileName: PropertyDescription.jsx
// Renders property description with proper spacing, optional bullet lists, and XSS-safe markdown.

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import './PropertyDescription.css';

const MAX_LINE_LENGTH_FOR_BULLETS = 100;
const MIN_LINES_FOR_BULLETS = 2;

/**
 * Normalize plain text: consistent line breaks, trim, collapse excess blanks.
 */
function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    let t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    t = t.replace(/\n{3,}/g, '\n\n');
    t = t.replace(/[ \t]{2,}/g, ' ');
    t = t.split('\n').map((line) => line.trim()).join('\n');
    return t.trim().replace(/^\n+|\n+$/g, '');
}

/**
 * If description has multiple short lines, convert to markdown bullet list for readability.
 * Otherwise return as-is so paragraphs (double newline) render correctly.
 */
function toDisplayMarkdown(description) {
    const normalized = normalizeText(description);
    if (!normalized) return '';

    const lines = normalized.split('\n').filter((line) => line.length > 0);
    if (lines.length < MIN_LINES_FOR_BULLETS) {
        return normalized;
    }

    const shortLines = lines.filter((line) => line.length <= MAX_LINE_LENGTH_FOR_BULLETS);
    const majorityShort = shortLines.length >= Math.ceil(lines.length * 0.6);
    if (!majorityShort) {
        return normalized;
    }

    return lines.map((line) => `- ${line}`).join('\n');
}

/**
 * PropertyDescription – safe, readable rendering of property description.
 * @param {string} content - Plain text description from the database
 * @param {string} [className] - Optional wrapper class for layout (e.g. description-section)
 */
function PropertyDescription({ content, className = '' }) {
    const markdown = useMemo(() => toDisplayMarkdown(content || ''), [content]);

    if (!markdown) {
        return (
            <div className={`property-description ${className}`.trim()}>
                <p className="property-description__empty">No description provided.</p>
            </div>
        );
    }

    return (
        <div className={`property-description property-description--markdown ${className}`.trim()}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {markdown}
            </ReactMarkdown>
        </div>
    );
}

export default PropertyDescription;
