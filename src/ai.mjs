import { AI_MODELS, AI_CONFIG } from './config.mjs';

const SYSTEM_PROMPT = `你是一位肌肉畸形恐懼症（Muscle Dysmorphia）研究領域的專業文獻分析師。
你的任務是分析學術文獻，提供繁體中文摘要與分類。
你必須嚴格按照指定的 JSON 格式回應，不要添加任何 markdown 格式、代碼塊標記（如 \`\`\`json）或其他非 JSON 內容。
直接輸出純 JSON 字串。`;

function buildUserPrompt(articles) {
  const articleList = articles.map((a, i) => {
    return `[${i + 1}] PMID: ${a.pmid}
標題: ${a.title}
期刊: ${a.journal}
作者: ${a.authors.join(', ')}
${a.abstract ? `摘要: ${a.abstract.substring(0, 800)}` : '(無摘要)'}
DOI: ${a.doi || 'N/A'}`;
  }).join('\n\n---\n\n');

  return `請分析以下 ${articles.length} 篇近期發表的學術文獻，這些都與肌肉畸形恐懼症相關領域有關。

${articleList}

請嚴格按照以下 JSON 格式回應（直接輸出 JSON，不要任何其他文字或格式標記）：
{
  "dailySummary": "200字以內的今日文獻趨勢總結（繁體中文）",
  "articles": [
    {
      "pmid": "PMID字串",
      "titleZh": "繁體中文標題翻譯",
      "titleEn": "英文原標題",
      "journal": "期刊名稱",
      "summary": "100-150字繁體中文摘要，包含研究重點與臨床意義",
      "category": "分類（從以下選一個：診斷與分類、身體意象、飲食行為、運動與訓練、物質使用、心理機制、社會文化、營養與補充品、測量與評估、治療與預防）",
      "utility": "high 或 mid 或 low（臨床實用性）",
      "pico": {
        "population": "研究對象",
        "intervention": "介入措施或研究焦點",
        "comparison": "對照組或參考基準",
        "outcome": "研究結果或測量指標"
      },
      "tags": ["標籤1", "標籤2", "標籤3"],
      "isTopPick": true或false（是否為今日精選）
    }
  ],
  "topicDistribution": {
    "主題名稱": 數量
  },
  "keywords": ["關鍵字1", "關鍵字2", "關鍵字3"]
}

重要規則：
1. 所有中文內容使用繁體中文（台灣用語）
2. isTopPick 只能標記最多 5 篇
3. 每篇文章的 tags 最多 4 個
4. keywords 最多 10 個
5. topicDistribution 的主題必須使用繁體中文
6. 確保輸出是合法 JSON，所有字串正確轉義`;
}

function robustJsonParse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('⚠️ Direct JSON parse failed, attempting repair...');
  }

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
    } catch (e) {
      console.log('⚠️ Substring JSON parse failed, attempting aggressive repair...');
    }
  }

  cleaned = cleaned
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    .replace(/\t/g, ' ')
    .replace(/[\x00-\x1f]/g, c => c === '\n' || c === '\r' || c === '\t' ? '' : '');

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('❌ All JSON repair attempts failed');
    return null;
  }
}

function validateAnalysis(analysis, articles) {
  if (!analysis || !Array.isArray(analysis.articles)) {
    console.log('⚠️ Invalid analysis structure, creating fallback');
    return createFallbackAnalysis(articles);
  }

  analysis.articles = analysis.articles.map((a, i) => {
    const original = articles[i];
    return {
      pmid: a.pmid || (original ? original.pmid : `unknown-${i}`),
      titleZh: a.titleZh || (original ? original.title : 'Unknown'),
      titleEn: a.titleEn || (original ? original.title : 'Unknown'),
      journal: a.journal || (original ? original.journal : 'Unknown'),
      summary: a.summary || '無法取得摘要',
      category: a.category || '未分類',
      utility: ['high', 'mid', 'low'].includes(a.utility) ? a.utility : 'mid',
      pico: a.pico || { population: 'N/A', intervention: 'N/A', comparison: 'N/A', outcome: 'N/A' },
      tags: Array.isArray(a.tags) ? a.tags.slice(0, 4) : ['研究'],
      isTopPick: !!a.isTopPick,
      doi: original ? original.doi : ''
    };
  });

  const topPicks = analysis.articles.filter(a => a.isTopPick);
  if (topPicks.length > 5) {
    analysis.articles.forEach(a => { a.isTopPick = false; });
    analysis.articles.slice(0, 5).forEach(a => { a.isTopPick = true; });
  }

  if (!analysis.dailySummary) {
    analysis.dailySummary = `今日共 ${analysis.articles.length} 篇肌肉畸形恐懼症相關文獻。`;
  }
  if (!analysis.topicDistribution || typeof analysis.topicDistribution !== 'object') {
    analysis.topicDistribution = { '未分類': analysis.articles.length };
  }
  if (!Array.isArray(analysis.keywords)) {
    analysis.keywords = ['肌肉畸形恐懼症', '身體意象'];
  }
  analysis.keywords = analysis.keywords.slice(0, 10);

  return analysis;
}

function createFallbackAnalysis(articles) {
  return {
    dailySummary: `今日共 ${articles.length} 篇肌肉畸形恐懼症相關文獻。AI 分析暫時不可用，以下為基本資訊。`,
    articles: articles.map((a, i) => ({
      pmid: a.pmid,
      titleZh: a.title,
      titleEn: a.title,
      journal: a.journal,
      summary: a.abstract ? a.abstract.substring(0, 200) + '...' : '無摘要',
      category: '未分類',
      utility: 'mid',
      pico: { population: 'N/A', intervention: 'N/A', comparison: 'N/A', outcome: 'N/A' },
      tags: ['研究'],
      isTopPick: i < 3,
      doi: a.doi
    })),
    topicDistribution: { '未分類': articles.length },
    keywords: ['肌肉畸形恐懼症']
  };
}

async function callZhipuAPI(apiKey, model, messages) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

  try {
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid API response structure');
    }
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeArticles(articles, apiKey) {
  if (articles.length === 0) {
    return { dailySummary: '今日沒有新的文獻。', articles: [], topicDistribution: {}, keywords: [] };
  }

  const batchSize = 15;
  const allAnalyzed = [];
  let dailySummary = '';
  let topicDistribution = {};
  let keywords = [];

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`🤖 Analyzing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)} (${batch.length} articles)`);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(batch) }
    ];

    let result = null;
    let usedModel = '';

    for (const model of AI_MODELS) {
      try {
        console.log(`   Trying model: ${model}`);
        const raw = await callZhipuAPI(apiKey, model, messages);
        result = robustJsonParse(raw);
        if (result) {
          usedModel = model;
          console.log(`   ✅ Success with ${model}`);
          break;
        }
      } catch (err) {
        console.log(`   ❌ ${model} failed: ${err.message}`);
      }
    }

    const validated = validateAnalysis(result, batch);
    allAnalyzed.push(...validated.articles);
    if (!dailySummary && validated.dailySummary) dailySummary = validated.dailySummary;
    if (validated.topicDistribution) {
      for (const [k, v] of Object.entries(validated.topicDistribution)) {
        topicDistribution[k] = (topicDistribution[k] || 0) + v;
      }
    }
    if (validated.keywords) {
      for (const kw of validated.keywords) {
        if (!keywords.includes(kw)) keywords.push(kw);
      }
    }

    if (i + batchSize < articles.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return {
    dailySummary: dailySummary || `今日共 ${allAnalyzed.length} 篇肌肉畸形恐懼症相關文獻。`,
    articles: allAnalyzed,
    topicDistribution,
    keywords: keywords.slice(0, 10)
  };
}
