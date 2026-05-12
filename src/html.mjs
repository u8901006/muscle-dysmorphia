import { SITE_CONFIG } from './config.mjs';
import { writeFile } from 'node:fs/promises';

const DAY_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function formatDateZh(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dayName = DAY_NAMES[d.getDay()];
  return `${y}年${m}月${day}日（${dayName}）`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCategoryIcon(category) {
  const icons = {
    '診斷與分類': '\u{1F4CB}',
    '身體意象': '\u{1F9CD}',
    '飲食行為': '\u{1F37D}\u{FE0F}',
    '運動與訓練': '\u{1F3CB}\u{FE0F}',
    '物質使用': '\u{1F48A}',
    '心理機制': '\u{1F9E0}',
    '社會文化': '\u{1F4F1}',
    '營養與補充品': '\u{1F96A}',
    '測量與評估': '\u{1F4CA}',
    '治療與預防': '\u{1F3E5}',
    '未分類': '\u{1F4D6}'
  };
  return icons[category] || '\u{1F4D6}';
}

function getUtilityBadge(utility) {
  const map = {
    high: { class: 'utility-high', text: '高實用性' },
    mid: { class: 'utility-mid', text: '中實用性' },
    low: { class: 'utility-low', text: '低實用性' }
  };
  const u = map[utility] || map.mid;
  return `<span class="${u.class}">${u.text}</span>`;
}

function generateSharedCSS() {
  return `
  :root { --bg: ${SITE_CONFIG.bg}; --surface: ${SITE_CONFIG.surface}; --line: ${SITE_CONFIG.line}; --text: ${SITE_CONFIG.text}; --muted: ${SITE_CONFIG.muted}; --accent: ${SITE_CONFIG.accent}; --accent-soft: ${SITE_CONFIG.accentSoft}; --card-bg: color-mix(in srgb, var(--surface) 92%, white); }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: radial-gradient(circle at top, #fff6ea 0, var(--bg) 55%, #ead8c6 100%); color: var(--text); font-family: "Noto Sans TC", "PingFang TC", "Helvetica Neue", Arial, sans-serif; min-height: 100vh; }
  .container { position: relative; z-index: 1; max-width: 880px; margin: 0 auto; padding: 60px 32px 80px; }`;
}

function generateFooterLinksHtml() {
  return SITE_CONFIG.footerLinks.map(link =>
    `<a href="${escapeHtml(link.url)}" class="clinic-link" target="_blank" rel="noopener noreferrer">
      <span class="clinic-name">${escapeHtml(link.text)}</span>
      <span class="clinic-arrow">\u2192</span>
    </a>`
  ).join('\n    ');
}

function generateTopPickCard(article, rank) {
  const icon = getCategoryIcon(article.category);
  const pubmedUrl = article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : '#';
  const picoHtml = article.pico ? `
    <div class="pico-grid">
      <div class="pico-item"><span class="pico-label">P</span><span class="pico-text">${escapeHtml(article.pico.population || 'N/A')}</span></div>
      <div class="pico-item"><span class="pico-label">I</span><span class="pico-text">${escapeHtml(article.pico.intervention || 'N/A')}</span></div>
      <div class="pico-item"><span class="pico-label">C</span><span class="pico-text">${escapeHtml(article.pico.comparison || 'N/A')}</span></div>
      <div class="pico-item"><span class="pico-label">O</span><span class="pico-text">${escapeHtml(article.pico.outcome || 'N/A')}</span></div>
    </div>` : '';

  return `
    <div class="news-card featured">
      <div class="card-header">
        <span class="rank-badge">#${rank}</span>
        <span class="emoji-icon">${icon}</span>
        ${getUtilityBadge(article.utility)}
      </div>
      <h3>${escapeHtml(article.titleZh)}</h3>
      <p class="journal-source">${escapeHtml(article.journal)} &middot; ${escapeHtml(article.titleEn)}</p>
      <p>${escapeHtml(article.summary)}</p>
      ${picoHtml}
      <div class="card-footer">
        ${article.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        <a href="${pubmedUrl}" target="_blank" rel="noopener noreferrer">\u{95B1}\u{8B80}\u{539F}\u{6587} \u2192</a>
      </div>
    </div>`;
}

function generateRegularCard(article) {
  const icon = getCategoryIcon(article.category);
  const pubmedUrl = article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : '#';

  return `
    <div class="news-card">
      <div class="card-header-row">
        <span class="emoji-sm">${icon}</span>
        <span class="${article.utility === 'high' ? 'utility-high' : article.utility === 'low' ? 'utility-low' : 'utility-mid'} utility-sm">${article.utility === 'high' ? '\u9AD8' : article.utility === 'low' ? '\u4F4E' : '\u4E2D'}</span>
      </div>
      <h3>${escapeHtml(article.titleZh)}</h3>
      <p class="journal-source">${escapeHtml(article.journal)}</p>
      <p>${escapeHtml(article.summary)}</p>
      <div class="card-footer">
        ${article.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        <a href="${pubmedUrl}" target="_blank" rel="noopener noreferrer">PubMed \u2192</a>
      </div>
    </div>`;
}

export function generateDailyReport(analysis, dateStr) {
  const topPicks = analysis.articles.filter(a => a.isTopPick);
  const others = analysis.articles.filter(a => !a.isTopPick);

  const topicMax = Math.max(...Object.values(analysis.topicDistribution), 1);
  const topicBarsHtml = Object.entries(analysis.topicDistribution)
    .map(([name, count]) => {
      const pct = Math.round((count / topicMax) * 100);
      return `<div class="topic-row">
        <span class="topic-name">${escapeHtml(name)}</span>
        <div class="topic-bar-bg"><div class="topic-bar" style="width:${pct}%"></div></div>
        <span class="topic-count">${count}</span>
      </div>`;
    }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${SITE_CONFIG.title} &middot; ${SITE_CONFIG.titleZh} &middot; ${formatDateZh(dateStr)}</title>
<meta name="description" content="${formatDateZh(dateStr)} ${SITE_CONFIG.titleZh}\uFF0C\u7531 AI \u81EA\u52D5\u5F59\u6574 PubMed \u6700\u65B0\u8AD6\u6587"/>
<style>
  ${generateSharedCSS()}
  header { display: flex; align-items: center; gap: 16px; margin-bottom: 52px; animation: fadeDown 0.6s ease both; }
  .logo { width: 48px; height: 48px; border-radius: 14px; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; box-shadow: 0 4px 20px rgba(140,79,43,0.25); }
  .header-text h1 { font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
  .header-meta { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; align-items: center; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; letter-spacing: 0.3px; }
  .badge-date { background: var(--accent-soft); border: 1px solid var(--line); color: var(--accent); }
  .badge-count { background: rgba(140,79,43,0.06); border: 1px solid var(--line); color: var(--muted); }
  .badge-source { background: transparent; color: var(--muted); font-size: 11px; padding: 0 4px; }
  .summary-card { background: var(--card-bg); border: 1px solid var(--line); border-radius: 24px; padding: 28px 32px; margin-bottom: 32px; box-shadow: 0 20px 60px rgba(61,36,15,0.06); animation: fadeUp 0.5s ease 0.1s both; }
  .summary-card h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; color: var(--accent); margin-bottom: 16px; }
  .summary-text { font-size: 15px; line-height: 1.8; color: var(--text); }
  .section { margin-bottom: 36px; animation: fadeUp 0.5s ease both; }
  .section-title { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  .section-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; background: var(--accent-soft); }
  .news-card { background: var(--card-bg); border: 1px solid var(--line); border-radius: 24px; padding: 22px 26px; margin-bottom: 12px; box-shadow: 0 8px 30px rgba(61,36,15,0.04); transition: background 0.2s, border-color 0.2s, transform 0.2s; }
  .news-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(61,36,15,0.08); }
  .news-card.featured { border-left: 3px solid var(--accent); }
  .news-card.featured:hover { border-color: var(--accent); }
  .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .rank-badge { background: var(--accent); color: #fff7f0; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 6px; }
  .emoji-icon { font-size: 18px; }
  .card-header-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .emoji-sm { font-size: 14px; }
  .news-card h3 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 8px; line-height: 1.5; }
  .journal-source { font-size: 12px; color: var(--accent); margin-bottom: 8px; opacity: 0.8; }
  .news-card p { font-size: 13.5px; line-height: 1.75; color: var(--muted); }
  .card-footer { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tag { padding: 2px 9px; background: var(--accent-soft); border-radius: 999px; font-size: 11px; color: var(--accent); }
  .news-card a { font-size: 12px; color: var(--accent); text-decoration: none; opacity: 0.7; margin-left: auto; }
  .news-card a:hover { opacity: 1; }
  .utility-high { color: #5a7a3a; font-size: 11px; font-weight: 600; padding: 2px 8px; background: rgba(90,122,58,0.1); border-radius: 4px; }
  .utility-mid { color: #9f7a2e; font-size: 11px; font-weight: 600; padding: 2px 8px; background: rgba(159,122,46,0.1); border-radius: 4px; }
  .utility-low { color: var(--muted); font-size: 11px; font-weight: 600; padding: 2px 8px; background: rgba(118,100,83,0.08); border-radius: 4px; }
  .utility-sm { font-size: 10px; }
  .pico-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; padding: 12px; background: rgba(255,253,249,0.8); border-radius: 14px; border: 1px solid var(--line); }
  .pico-item { display: flex; gap: 8px; align-items: baseline; }
  .pico-label { font-size: 10px; font-weight: 700; color: #fff7f0; background: var(--accent); padding: 2px 6px; border-radius: 4px; flex-shrink: 0; }
  .pico-text { font-size: 12px; color: var(--muted); line-height: 1.4; }
  .keywords-section { margin-bottom: 36px; }
  .keywords { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .keyword { padding: 5px 14px; background: var(--accent-soft); border: 1px solid var(--line); border-radius: 20px; font-size: 12px; color: var(--accent); cursor: default; transition: background 0.2s; }
  .keyword:hover { background: rgba(140,79,43,0.18); }
  .topic-section { margin-bottom: 36px; }
  .topic-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .topic-name { font-size: 13px; color: var(--muted); width: 100px; flex-shrink: 0; text-align: right; }
  .topic-bar-bg { flex: 1; height: 8px; background: var(--line); border-radius: 4px; overflow: hidden; }
  .topic-bar { height: 100%; background: linear-gradient(90deg, var(--accent), #c47a4a); border-radius: 4px; transition: width 0.6s ease; }
  .topic-count { font-size: 12px; color: var(--accent); width: 24px; }
  .clinic-banner { margin-top: 48px; display: flex; flex-direction: column; gap: 12px; animation: fadeUp 0.5s ease 0.4s both; }
  .clinic-link { display: flex; align-items: center; gap: 14px; padding: 18px 24px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 24px; text-decoration: none; color: var(--text); transition: all 0.2s; box-shadow: 0 8px 30px rgba(61,36,15,0.04); }
  .clinic-link:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 12px 40px rgba(61,36,15,0.08); }
  .clinic-name { font-size: 15px; font-weight: 700; color: var(--text); flex: 1; }
  .clinic-arrow { font-size: 18px; color: var(--accent); font-weight: 700; }
  footer { margin-top: 32px; padding-top: 22px; border-top: 1px solid var(--line); font-size: 11.5px; color: var(--muted); display: flex; justify-content: space-between; animation: fadeUp 0.5s ease 0.5s both; }
  footer a { color: var(--muted); text-decoration: none; }
  footer a:hover { color: var(--accent); }
  .back-link { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--accent-soft); border-radius: 20px; font-size: 13px; color: var(--accent); text-decoration: none; margin-bottom: 24px; transition: all 0.2s; }
  .back-link:hover { background: rgba(140,79,43,0.18); transform: translateX(-4px); }
  @keyframes fadeDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 600px) { .container { padding: 36px 18px 60px; } .summary-card, .news-card { padding: 20px 18px; } .pico-grid { grid-template-columns: 1fr; } footer { flex-direction: column; gap: 6px; text-align: center; } .topic-name { width: 70px; font-size: 11px; } }
</style>
</head>
<body>
<div class="container">
  <a href="index.html" class="back-link">\u2190 \u8FD4\u56DE\u9996\u9801</a>
  <header>
    <div class="logo">${SITE_CONFIG.emoji}</div>
    <div class="header-text">
      <h1>${SITE_CONFIG.title} &middot; ${SITE_CONFIG.titleZh}</h1>
      <div class="header-meta">
        <span class="badge badge-date">\u{1F4C5} ${formatDateZh(dateStr)}</span>
        <span class="badge badge-count">\u{1F4CA} ${analysis.articles.length} \u7BC7\u6587\u737B</span>
        <span class="badge badge-source">Powered by PubMed + Zhipu AI</span>
      </div>
    </div>
  </header>

  <div class="summary-card">
    <h2>\u{1F4CB} \u4ECA\u65E5\u6587\u737B\u8DA8\u52E2</h2>
    <p class="summary-text">${escapeHtml(analysis.dailySummary)}</p>
  </div>

${topPicks.length > 0 ? `  <div class='section'><div class='section-title'><span class='section-icon'>\u2B50</span>\u4ECA\u65E5\u7CBE\u9078 TOP Picks</div>
${topPicks.map((a, i) => generateTopPickCard(a, i + 1)).join('\n')}  </div>` : ''}

${others.length > 0 ? `  <div class='section'><div class='section-title'><span class='section-icon'>\u{1F4DA}</span>\u5176\u4ED6\u503C\u5F97\u95DC\u6CE8\u7684\u6587\u737B</div>
${others.map(a => generateRegularCard(a)).join('\n')}  </div>` : ''}

${Object.keys(analysis.topicDistribution).length > 0 ? `  <div class='topic-section section'><div class='section-title'><span class='section-icon'>\u{1F4CA}</span>\u4E3B\u984C\u5206\u4F48</div>
${topicBarsHtml}  </div>` : ''}

${analysis.keywords.length > 0 ? `  <div class='keywords-section section'><div class='section-title'><span class='section-icon'>\u{1F3F7}\uFE0F</span>\u95DC\u9375\u5B57</div><div class='keywords'>${analysis.keywords.map(k => `<span class="keyword">${escapeHtml(k)}</span>`).join('')}</div></div>` : ''}

  <div class="clinic-banner">
    ${generateFooterLinksHtml()}
  </div>

  <footer>
    <span>\u8CC7\u6599\u4F86\u6E90\uFF1APubMed &middot; \u5206\u6790\u6A21\u578B\uFF1AZhipu AI</span>
    <span><a href="https://github.com/u8901006/muscle-dysmorphia">GitHub</a></span>
  </footer>
</div>
</body>
</html>`;
}

export function generateIndex(tracking) {
  const reports = tracking.dailyReports || [];
  const totalReports = reports.length;
  const listHtml = reports.map(r => {
    return `<li><a href="${escapeHtml(r.file)}">\u{1F4C5} ${formatDateZh(r.date)}${r.count ? ` \u2014 ${r.count} \u7BC7` : ''}</a></li>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${SITE_CONFIG.title} \u00B7 ${SITE_CONFIG.titleZh}</title>
<meta name="description" content="${SITE_CONFIG.titleZh}\uFF0C\u6BCF\u65E5\u81EA\u52D5\u66F4\u65B0\u808C\u8089\u7578\u5F62\u6050\u61FC\u75C7\u76F8\u95DC\u7814\u7A76\u6587\u737B"/>
<style>
  ${generateSharedCSS()}
  .container { max-width: 640px; padding: 80px 24px; }
  .logo { font-size: 48px; text-align: center; margin-bottom: 16px; }
  h1 { text-align: center; font-size: 24px; color: var(--text); margin-bottom: 8px; }
  .subtitle { text-align: center; color: var(--accent); font-size: 14px; margin-bottom: 48px; }
  .count { text-align: center; color: var(--muted); font-size: 13px; margin-bottom: 32px; }
  ul { list-style: none; }
  li { margin-bottom: 8px; }
  a { color: var(--text); text-decoration: none; display: block; padding: 14px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; transition: all 0.2s; font-size: 15px; }
  a:hover { background: var(--accent-soft); border-color: var(--accent); transform: translateX(4px); }
  .clinic-banner { margin-top: 48px; display: flex; flex-direction: column; gap: 12px; }
  .clinic-link { display: flex; align-items: center; gap: 14px; padding: 18px 24px; background: var(--surface); border: 1px solid var(--line); border-radius: 24px; text-decoration: none; color: var(--text); transition: all 0.2s; box-shadow: 0 8px 30px rgba(61,36,15,0.04); }
  .clinic-link:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 12px 40px rgba(61,36,15,0.08); }
  .clinic-name { font-size: 15px; font-weight: 700; color: var(--text); flex: 1; }
  .clinic-arrow { font-size: 18px; color: var(--accent); font-weight: 700; }
  footer { margin-top: 56px; text-align: center; font-size: 12px; color: var(--muted); }
  footer a { display: inline; padding: 0; background: none; border: none; color: var(--muted); }
  footer a:hover { color: var(--accent); }
</style>
</head>
<body>
<div class="container">
  <div class="logo">${SITE_CONFIG.emoji}</div>
  <h1>${SITE_CONFIG.title}</h1>
  <p class="subtitle">${SITE_CONFIG.titleZh} \u00B7 \u6BCF\u65E5\u81EA\u52D5\u66F4\u65B0</p>
  <p class="count">\u5171 ${totalReports} \u671F\u65E5\u5831</p>
  <ul>${listHtml}</ul>
  <div class="clinic-banner">
    ${generateFooterLinksHtml()}
  </div>
  <footer>
    <p>Powered by PubMed + Zhipu AI \u00B7 <a href="https://github.com/u8901006/muscle-dysmorphia">GitHub</a></p>
  </footer>
</div>
</body>
</html>`;
}

export async function writeHtmlReport(dateStr, analysis, tracking) {
  const fileName = `md-${dateStr}.html`;
  const dailyHtml = generateDailyReport(analysis, dateStr);
  await writeFile(`docs/${fileName}`, dailyHtml, 'utf-8');
  console.log(`📝 Written daily report: docs/${fileName}`);

  const indexHtml = generateIndex(tracking);
  await writeFile('docs/index.html', indexHtml, 'utf-8');
  console.log('📝 Written index: docs/index.html');

  return fileName;
}
