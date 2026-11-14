/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface TocHeading {
  id: string;
  text: string;
}

export interface ParsedLegalDocument {
  title: string;
  headerLines: string[];
  headings: TocHeading[];
  bodyMarkdown: string;
}

export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return base || 'section';
}

export function parseLegalDocument(raw: string): ParsedLegalDocument {
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  let title = '';
  let idx = 0;

  while (idx < lines.length && lines[idx].trim() === '') {
    idx++;
  }

  if (idx < lines.length && lines[idx].startsWith('# ')) {
    title = lines[idx].slice(2).trim();
    idx++;
  }

  while (idx < lines.length && lines[idx].trim() === '') {
    idx++;
  }

  // Extract initial metadata block (e.g. **CEDA Innovation Management Portal** + Version ... · Last updated ...)
  const headerLines: string[] = [];
  while (
    idx < lines.length &&
    lines[idx].trim() !== '' &&
    !lines[idx].startsWith('#') &&
    !lines[idx].startsWith('>') &&
    !lines[idx].trim().startsWith('- ')
  ) {
    headerLines.push(lines[idx].trim());
    idx++;
  }

  const bodyMarkdown = lines.slice(idx).join('\n').trim();
  const headings: TocHeading[] = [];
  const usedIds = new Map<string, number>();

  for (const line of bodyMarkdown.split('\n')) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      const text = match[1].trim();
      const baseSlug = slugifyHeading(text);
      const count = usedIds.get(baseSlug) || 0;
      usedIds.set(baseSlug, count + 1);
      const id = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
      headings.push({ id, text });
    }
  }

  return { title, headerLines, headings, bodyMarkdown };
}

/**
 * Renders inline markdown: **bold** and [label](url).
 * Leaves bare [SQUARE_BRACKETS] without a following (url) intact as literal text.
 */
export function renderInlineMarkdown(text: string, keyPrefix = 'inl'): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\[[^\]]+\]\((?:https?:\/\/|\/|#)[^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${partIdx++}`} className="font-bold text-[#1c1c19]">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isExternal = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={`${keyPrefix}-a-${partIdx++}`}
            href={href}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-[#a02010] underline font-medium hover:text-[#7c0700] rounded-xs"
          >
            {label}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string; id?: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; lines: string[] };

function parseBlocks(markdown: string, presetH2Headings?: TocHeading[]): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  let h2Cursor = 0;
  const fallbackIds = new Map<string, number>();

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length as 1 | 2 | 3;
      const text = hMatch[2].trim();
      let id: string | undefined;

      if (level === 2) {
        if (presetH2Headings && presetH2Headings[h2Cursor]) {
          id = presetH2Headings[h2Cursor].id;
          h2Cursor++;
        } else {
          const base = slugifyHeading(text);
          const count = fallbackIds.get(base) || 0;
          fallbackIds.set(base, count + 1);
          id = count === 0 ? base : `${base}-${count + 1}`;
        }
      }

      blocks.push({ type: 'heading', level, text, id });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2).trim());
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph (preserve soft line breaks inside a paragraph block)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('- ')
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', lines: paraLines });
  }

  return blocks;
}

interface MarkdownRendererProps {
  markdown: string;
  headings?: TocHeading[];
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown, headings }) => {
  const blocks = React.useMemo(() => parseBlocks(markdown, headings), [markdown, headings]);

  return (
    <div className="space-y-4 text-sm text-[#31302d] leading-relaxed">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h1
                key={`b-${index}`}
                className="font-headline text-2xl sm:text-3xl font-bold text-[#1c1c19] tracking-tight pt-2"
              >
                {renderInlineMarkdown(block.text, `h1-${index}`)}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2
                key={`b-${index}`}
                id={block.id}
                tabIndex={-1}
                className="scroll-mt-24 font-headline text-lg sm:text-xl font-bold text-[#7c0700] pt-5 mt-6 border-t border-[#e8dfd8] first:border-t-0 first:mt-2 first:pt-0 focus:outline-none"
              >
                {renderInlineMarkdown(block.text, `h2-${index}`)}
              </h2>
            );
          }
          return (
            <h3
              key={`b-${index}`}
              className="font-headline text-base font-bold text-[#1c1c19] pt-2"
            >
              {renderInlineMarkdown(block.text, `h3-${index}`)}
            </h3>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={`b-${index}`}
              className="p-4 rounded-xl bg-[#f7f3ee] border-l-4 border-[#a02010] text-xs sm:text-sm text-[#38231d] leading-relaxed"
            >
              {block.lines.map((line, lIdx) => (
                <p key={`q-${index}-${lIdx}`} className={lIdx > 0 ? 'mt-2' : ''}>
                  {renderInlineMarkdown(line, `q-${index}-${lIdx}`)}
                </p>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'list') {
          return (
            <ul
              key={`b-${index}`}
              className="list-disc pl-5 space-y-1.5 text-sm text-[#31302d] marker:text-[#a02010]"
            >
              {block.items.map((item, itemIdx) => (
                <li key={`li-${index}-${itemIdx}`} className="pl-1">
                  {renderInlineMarkdown(item, `li-${index}-${itemIdx}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`b-${index}`} className="text-sm text-[#31302d] leading-relaxed">
            {block.lines.map((line, lIdx) => (
              <React.Fragment key={`p-${index}-${lIdx}`}>
                {lIdx > 0 && <br />}
                {renderInlineMarkdown(line, `p-${index}-${lIdx}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
