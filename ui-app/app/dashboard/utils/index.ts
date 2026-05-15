export function docTypeBadgeClass(type: string): string {
  if (type === 'fx_ndf') return 'bg-emerald-100 text-emerald-700';
  if (type === 'cds') return 'bg-amber-100 text-amber-700';
  if (type === 'equity_trs') return 'bg-teal-100 text-teal-700';
  return 'bg-indigo-100 text-indigo-700';
}

export function docTypeName(type: string): string {
  if (type === 'fx_ndf') return 'FX NDF';
  if (type === 'cds') return 'CDS';
  if (type === 'equity_trs') return 'EQ TRS';
  return 'IRS';
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inTable = false;
  let tableHeaderDone = false;
  let inList = false;

  const styleBadge = (cell: string) =>
    cell
      .replace(/✅/g, '<span class="vr-badge vr-pass">✅</span>')
      .replace(/⚠️/g, '<span class="vr-badge vr-warn">⚠️</span>')
      .replace(/❌/g, '<span class="vr-badge vr-fail">❌</span>');

  const styleInline = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="vr-code">$1</code>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Table detection ──
    if (line.trim().startsWith('|')) {
      const cols = line.split('|').slice(1, -1).map(c => c.trim());
      const isSeparator = cols.every(c => /^[-: ]+$/.test(c));

      if (!inTable) {
        out.push('<div class="vr-table-wrap"><table class="vr-table"><thead><tr>');
        inTable = true;
        tableHeaderDone = false;
        if (inList) { out.push('</ul>'); inList = false; }
      }

      if (isSeparator) {
        out.push('</tr></thead><tbody>');
        tableHeaderDone = true;
      } else if (!tableHeaderDone) {
        cols.forEach(c => out.push(`<th>${styleInline(styleBadge(c))}</th>`));
      } else {
        out.push('<tr>');
        cols.forEach(c => out.push(`<td>${styleInline(styleBadge(c))}</td>`));
        out.push('</tr>');
      }
      continue;
    } else if (inTable) {
      out.push('</tbody></table></div>');
      inTable = false;
    }

    // ── Headings ──
    if (/^### (.+)$/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h4 class="vr-h4">${styleInline(line.replace(/^### /, ''))}</h4>`);
    } else if (/^## (.+)$/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3 class="vr-h3">${styleBadge(styleInline(line.replace(/^## /, '')))}</h3>`);
    } else if (/^# (.+)$/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2 class="vr-h2">${styleInline(line.replace(/^# /, ''))}</h2>`);

    // ── List items ──
    } else if (/^[-*] (.+)$/.test(line) || /^\d+\. (.+)$/.test(line)) {
      if (!inList) { out.push('<ul class="vr-list">'); inList = true; }
      const text = line.replace(/^[-*] /, '').replace(/^\d+\. /, '');
      out.push(`<li>${styleBadge(styleInline(text))}</li>`);

    // ── Blank line ──
    } else if (line.trim() === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<div class="vr-spacer"></div>');

    // ── Normal paragraph ──
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<p class="vr-p">${styleBadge(styleInline(line))}</p>`);
    }
  }

  if (inTable) out.push('</tbody></table></div>');
  if (inList) out.push('</ul>');

  return `<style>
    .vr-h2{font-size:1rem;font-weight:800;margin:1rem 0 .4rem;color:#1a1d2e}
    .vr-h3{font-size:.875rem;font-weight:700;margin:.9rem 0 .35rem;color:#4f46e5;display:flex;align-items:center;gap:.4rem}
    .vr-h4{font-size:.8rem;font-weight:600;margin:.7rem 0 .25rem;color:#374151}
    .vr-p{margin:.2rem 0;font-size:.8rem;color:#374151;line-height:1.55}
    .vr-spacer{height:.5rem}
    .vr-code{background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:.72rem;font-family:monospace}
    .vr-list{margin:.3rem 0 .3rem 1rem;padding:0;list-style:disc;font-size:.8rem;color:#374151;line-height:1.6}
    .vr-list li{margin:.1rem 0}
    .vr-table-wrap{overflow-x:auto;margin:.6rem 0;border-radius:8px;border:1px solid #e5e7eb}
    .vr-table{width:100%;border-collapse:collapse;font-size:.72rem}
    .vr-table th{background:#f8f9fc;padding:7px 10px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;white-space:nowrap}
    .vr-table td{padding:6px 10px;border-bottom:1px solid #f1f1f4;color:#1a1d2e;vertical-align:top;line-height:1.45}
    .vr-table tr:last-child td{border-bottom:none}
    .vr-table tr:hover td{background:#fafbff}
    .vr-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:4px;padding:2px 5px;font-size:.75rem}
    .vr-pass{background:#d1fae5;color:#065f46}
    .vr-warn{background:#fef3c7;color:#92400e}
    .vr-fail{background:#fee2e2;color:#991b1b}
  </style>` + out.join('');
}
