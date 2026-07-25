/**
 * Minimal, dependency-free Markdown renderer shared by the topic surfaces.
 * The full-run research report and the Discover tab's angle cards both render
 * skill-authored Markdown, so the block/inline/table rendering lives here
 * instead of being duplicated per component. No new Markdown dependency is
 * introduced — this is the app's existing renderer, extracted for reuse.
 */
export function renderTopicMarkdown(report: string): string {
  const markdown = report.replace(
    /\n?```whp-summary[^\S\r\n]*\r?\n[\s\S]*?\r?\n```[^\S\r\n]*(?:\r?\n[^\S\r\n]*)*$/u,
    '',
  );
  const blocks = markdown.trim().split(/\r?\n\r?\n+/u);
  return blocks.map((block) => renderMarkdownBlock(block)).join('');
}

function renderMarkdownBlock(block: string): string {
  const heading = /^(#{1,3})[ \t]+(.+)$/u.exec(block);
  if (heading) {
    const level = heading[1]!.length;
    return `<h${level}>${renderInlineMarkdown(heading[2]!)}</h${level}>`;
  }

  const lines = block.split(/\r?\n/u);
  const table = renderMarkdownTable(lines);
  if (table !== null) return table;
  if (lines.every((line) => /^[-*][ \t]+/u.test(line))) {
    const items = lines.map((line) =>
      `<li>${renderInlineMarkdown(line.replace(/^[-*][ \t]+/u, ''))}</li>`);
    return `<ul>${items.join('')}</ul>`;
  }
  if (lines.every((line) => /^\d+\.[ \t]+/u.test(line))) {
    const items = lines.map((line) =>
      `<li>${renderInlineMarkdown(line.replace(/^\d+\.[ \t]+/u, ''))}</li>`);
    return `<ol>${items.join('')}</ol>`;
  }
  if (lines.every((line) => /^>[ \t]?/u.test(line))) {
    return `<blockquote>${renderInlineMarkdown(
      lines.map((line) => line.replace(/^>[ \t]?/u, '')).join(' '),
    )}</blockquote>`;
  }
  if (lines.length === 1 && /^-{3,}$/u.test(lines[0]!.trim())) {
    return '<hr>';
  }
  return `<p>${lines.map(renderInlineMarkdown).join('<br>')}</p>`;
}

function renderInlineMarkdown(value: string): string {
  const links: string[] = [];
  const withLinkPlaceholders = value.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gu,
    (_match, label: string, href: string) => {
      const index = links.length;
      links.push(
        `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
      );
      return `\u0000LINK${index}\u0000`;
    },
  );
  return escapeHtml(withLinkPlaceholders)
    .replace(/`([^`]+)`/gu, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/gu, '<em>$1</em>')
    .replace(/\u0000LINK(\d+)\u0000/gu, (_match, index: string) =>
      links[Number(index)] ?? '');
}

function renderMarkdownTable(lines: string[]): string | null {
  if (lines.length < 2) return null;
  const headers = tableCells(lines[0]!);
  const divider = tableCells(lines[1]!);
  if (
    headers === null
    || divider === null
    || headers.length !== divider.length
    || !divider.every((cell) => /^:?-{3,}:?$/u.test(cell))
  ) {
    return null;
  }

  const rows: string[][] = [];
  for (const line of lines.slice(2)) {
    const cells = tableCells(line);
    if (cells === null || cells.length !== headers.length) return null;
    rows.push(cells);
  }
  return [
    '<table><thead><tr>',
    ...headers.map((cell) => `<th scope="col">${renderInlineMarkdown(cell)}</th>`),
    '</tr></thead><tbody>',
    ...rows.map((row) =>
      `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`),
    '</tbody></table>',
  ].join('');
}

function tableCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return null;
  const withoutEdges = trimmed
    .replace(/^\|/u, '')
    .replace(/\|$/u, '');
  return withoutEdges.split('|').map((cell) => cell.trim());
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
