const SEARCH_QUERIES = [
  {
    name: 'Core MD',
    query: '("muscle dysmorphia"[Title/Abstract] OR "muscle dysmorphic disorder"[Title/Abstract] OR bigorexia[Title/Abstract] OR "reverse anorexia"[Title/Abstract])'
  },
  {
    name: 'Drive for Muscularity + ED',
    query: '("drive for muscularity"[Title/Abstract] AND ("eating disorder*"[Title/Abstract] OR "disordered eating"[Title/Abstract] OR orthorexia[Title/Abstract]))'
  },
  {
    name: 'BDD + Muscularity',
    query: '("body dysmorphic disorder"[Title/Abstract] AND (muscle*[Title/Abstract] OR muscularity[Title/Abstract] OR bodybuilding[Title/Abstract]))'
  },
  {
    name: 'AAS + Body Image',
    query: '(("anabolic-androgenic steroid*"[Title/Abstract] OR AAS[Title/Abstract] OR IPED[Title/Abstract] OR APED[Title/Abstract]) AND ("body image"[Title/Abstract] OR "body dissatisfaction"[Title/Abstract] OR "muscle dysmorphia"[Title/Abstract]))'
  },
  {
    name: 'Exercise Addiction',
    query: '(("exercise addiction"[Title/Abstract] OR "exercise dependence"[Title/Abstract] OR "compulsive exercise"[Title/Abstract]) AND ("body image"[Title/Abstract] OR "muscle dysmorphia"[Title/Abstract] OR "drive for muscularity"[Title/Abstract]))'
  },
  {
    name: 'Social Media + Body',
    query: '(("muscle dysmorphia"[Title/Abstract] OR "drive for muscularity"[Title/Abstract] OR "male body image"[Title/Abstract]) AND ("social media"[Title/Abstract] OR Instagram[Title/Abstract] OR TikTok[Title/Abstract] OR fitspiration[Title/Abstract]))'
  },
  {
    name: 'MD + Treatment',
    query: '(("muscle dysmorphia"[Title/Abstract] OR bigorexia[Title/Abstract]) AND (treatment[Title/Abstract] OR CBT[Title/Abstract] OR intervention[Title/Abstract] OR therapy[Title/Abstract]))'
  },
  {
    name: 'MD + Supplements',
    query: '(("muscle dysmorphia"[Title/Abstract] OR "drive for muscularity"[Title/Abstract] OR bodybuilding[Title/Abstract]) AND (nutrition[Title/Abstract] OR "dietary supplement*"[Title/Abstract] OR protein[Title/Abstract] OR creatine[Title/Abstract]))'
  },
  {
    name: 'MD Psychometrics',
    query: '(("muscle dysmorphia"[Title/Abstract] OR "drive for muscularity"[Title/Abstract]) AND (MDDI[Title/Abstract] OR "Muscle Dysmorphic Disorder Inventory"[Title/Abstract] OR "Drive for Muscularity Scale"[Title/Abstract] OR psychometric*[Title/Abstract] OR validation[Title/Abstract]))'
  },
  {
    name: 'Adolescent MD',
    query: '(("muscle dysmorphia"[Title/Abstract] OR "drive for muscularity"[Title/Abstract] OR "muscularity-oriented"[Title/Abstract]) AND (adolescent*[Title/Abstract] OR youth[Title/Abstract] OR "young adult*"[Title/Abstract] OR boys[Title/Abstract]))'
  }
];

const AI_MODELS = ['glm-5-turbo', 'glm-4.7', 'glm-4.7-flash'];

const AI_CONFIG = {
  apiUrl: 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions',
  maxTokens: 50000,
  timeout: 480000,
  temperature: 0.3
};

const SITE_CONFIG = {
  title: 'Muscle Dysmorphia Research',
  titleZh: '肌肉畸形恐懼症文獻日報',
  emoji: '\u{1F4AA}',
  accent: '#8c4f2b',
  bg: '#f6f1e8',
  surface: '#fffaf2',
  line: '#d8c5ab',
  text: '#2b2118',
  muted: '#766453',
  accentSoft: '#ead2bf',
  footerLinks: [
    { text: '\u{1F3E5} 李政洋身心診所首頁', url: 'https://www.leepsyclinic.com/' },
    { text: '\u{1F4E8} 訂閱電子報', url: 'https://blog.leepsyclinic.com/' },
    { text: '\u2615 Buy me a coffee', url: 'https://buymeacoffee.com/CYlee' }
  ]
};

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const DAYS_TO_FETCH = 7;

export { SEARCH_QUERIES, AI_MODELS, AI_CONFIG, SITE_CONFIG, PUBMED_BASE, DAYS_TO_FETCH };
