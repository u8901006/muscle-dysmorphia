import { SEARCH_QUERIES, PUBMED_BASE, DAYS_TO_FETCH } from './config.mjs';

function getDateRange() {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - DAYS_TO_FETCH);
  const fmt = d => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return { mindate: fmt(startDate), maxdate: fmt(now) };
}

async function pubmedGet(endpoint, params) {
  const url = new URL(`${PUBMED_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'MuscleDysmorphiaDigest/1.0 (mailto:research@example.com)' }
  });
  if (!res.ok) throw new Error(`PubMed ${endpoint} failed: ${res.status}`);
  return res.text();
}

async function searchPapers(query, dateRange) {
  const xml = await pubmedGet('esearch.fcgi', {
    db: 'pubmed',
    term: `${query} AND "${dateRange.mindate}"[EDAT] : "${dateRange.maxdate}"[EDAT]`,
    retmax: '50',
    retmode: 'xml',
    sort: 'date'
  });
  const ids = [];
  const idRegex = /<Id>(\d+)<\/Id>/g;
  let match;
  while ((match = idRegex.exec(xml)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

async function fetchArticleDetails(pmids) {
  if (pmids.length === 0) return [];
  const xml = await pubmedGet('efetch.fcgi', {
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract'
  });

  const articles = [];
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let articleMatch;
  while ((articleMatch = articleRegex.exec(xml)) !== null) {
    const block = articleMatch[1];
    const pmid = extractTag(block, 'PMID') || '';
    const title = extractTag(block, 'ArticleTitle') || 'No title';
    const abstract = extractAbstract(block);
    const journal = extractTag(block, 'Title') || '';
    const doi = extractDOI(block) || '';
    const pubDate = extractPubDate(block);
    const authors = extractAuthors(block);

    articles.push({ pmid, title, abstract, journal, doi, pubDate, authors });
  }
  return articles;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = regex.exec(xml);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

function extractAbstract(xml) {
  const abstractTexts = [];
  const regex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const labelMatch = match[0].match(/Label="([^"]+)"/);
    const label = labelMatch ? `${labelMatch[1]}: ` : '';
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) abstractTexts.push(label + text);
  }
  return abstractTexts.join(' ');
}

function extractDOI(xml) {
  const match = xml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
  return match ? match[1] : '';
}

function extractPubDate(xml) {
  const y = extractTag(xml, 'Year') || extractTag(xml, 'MedlineDate') || '';
  const m = extractTag(xml, 'Month') || '';
  const d = extractTag(xml, 'Day') || '';
  if (!y) return '';
  return `${y}${m ? '-' + m : ''}${d ? '-' + d : ''}`;
}

function extractAuthors(xml) {
  const authors = [];
  const regex = /<Author[^>]*>([\s\S]*?)<\/Author>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const lastName = extractTag(match[1], 'LastName') || '';
    const foreName = extractTag(match[1], 'ForeName') || '';
    if (lastName) authors.push(`${lastName} ${foreName}`.trim());
  }
  return authors.slice(0, 5);
}

export async function fetchAllArticles() {
  const dateRange = getDateRange();
  console.log(`📅 Fetching articles from ${dateRange.mindate} to ${dateRange.maxdate}`);

  const allPmids = new Set();
  for (const sq of SEARCH_QUERIES) {
    console.log(`🔍 Searching: ${sq.name}`);
    try {
      const ids = await searchPapers(sq.query, dateRange);
      ids.forEach(id => allPmids.add(id));
      console.log(`   Found ${ids.length} articles`);
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`   ❌ Search failed for ${sq.name}: ${err.message}`);
    }
  }

  console.log(`📊 Total unique PMIDs: ${allPmids.size}`);
  const pmidArray = [...allPmids];
  const allArticles = [];
  const batchSize = 100;
  for (let i = 0; i < pmidArray.length; i += batchSize) {
    const batch = pmidArray.slice(i, i + batchSize);
    console.log(`📥 Fetching details batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pmidArray.length / batchSize)}`);
    try {
      const articles = await fetchArticleDetails(batch);
      allArticles.push(...articles);
    } catch (err) {
      console.error(`   ❌ Fetch failed: ${err.message}`);
    }
    if (i + batchSize < pmidArray.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log(`✅ Fetched ${allArticles.length} articles with details`);
  return allArticles;
}
