import { fetchAllArticles } from './pubmed.mjs';
import { analyzeArticles } from './ai.mjs';
import { loadTracking, saveTracking, filterNewArticles, updateTracking } from './dedup.mjs';
import { writeHtmlReport } from './html.mjs';

async function main() {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    console.error('❌ ZHIPU_API_KEY environment variable is required');
    process.exit(1);
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${SITE_CONFIG_EMOJI} Muscle Dysmorphia Research Daily Digest`);
  console.log(`Date: ${dateStr}`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('📥 Step 1: Fetching articles from PubMed...');
  const allArticles = await fetchAllArticles();
  console.log(`   Total articles fetched: ${allArticles.length}`);

  console.log('\n🔍 Step 2: Deduplicating...');
  const tracking = await loadTracking();
  console.log(`   Previously summarized: ${tracking.summarizedPmids.length} PMIDs`);
  const newArticles = filterNewArticles(allArticles, tracking);
  console.log(`   New articles to analyze: ${newArticles.length}`);

  if (newArticles.length === 0) {
    console.log('\n✅ No new articles found. Updating index and exiting.');
    const { generateIndex } = await import('./html.mjs');
    const { writeFile } = await import('node:fs/promises');
    const indexHtml = generateIndex(tracking);
    await writeFile('docs/index.html', indexHtml, 'utf-8');
    console.log('📝 Updated index.html');
    return;
  }

  console.log('\n🤖 Step 3: Analyzing with AI...');
  const analysis = await analyzeArticles(newArticles, apiKey);
  console.log(`   Analyzed ${analysis.articles.length} articles`);

  console.log('\n📄 Step 4: Generating HTML report...');
  const newPmids = analysis.articles.map(a => a.pmid).filter(Boolean);
  const updatedTracking = updateTracking(tracking, newPmids, dateStr, `md-${dateStr}.html`, analysis.articles.length);
  const fileName = await writeHtmlReport(dateStr, analysis, updatedTracking);

  console.log('\n💾 Step 5: Saving tracking data...');
  await saveTracking(updatedTracking);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Daily digest complete: ${fileName}`);
  console.log(`   Articles: ${analysis.articles.length}`);
  console.log(`   Keywords: ${analysis.keywords.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);
}

const SITE_CONFIG_EMOJI = '\u{1F4AA}';

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
