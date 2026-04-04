// BGB Content Intelligence — Background Service Worker (Chrome MV3)

const LINKEDIN_URL = 'https://www.linkedin.com/analytics/creator/content/?timeRange=past_7_days';
const APP_URL = 'https://my-app-gilt-eight-89.vercel.app';

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scrape_linkedin') {
    scrapeLinkedIn().then(r => sendResponse({ success: true, result: r }))
                    .catch(e => sendResponse({ success: false, error: e.message }));
    return true; // async
  }
  if (msg.action === 'send_to_app') {
    sendToApp().then(() => sendResponse({ success: true }))
               .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (msg.action === 'get_stored') {
    chrome.storage.local.get('bgb_import').then(d => sendResponse({ data: d.bgb_import || null }));
    return true;
  }
  if (msg.action === 'clear_stored') {
    chrome.storage.local.remove('bgb_import').then(() => sendResponse({ success: true }));
    return true;
  }
});

// ─── SCRAPE LINKEDIN ─────────────────────────────────────────────────────────
async function scrapeLinkedIn() {
  notify('opening', 'Opening LinkedIn Analytics...');

  // Find or create the analytics tab
  const existing = await chrome.tabs.query({ url: 'https://www.linkedin.com/analytics/*' });
  let tabId;
  if (existing.length > 0) {
    tabId = existing[0].id;
    await chrome.tabs.update(tabId, { url: LINKEDIN_URL, active: true });
    // Brief pause then check — if already loaded, waitForLoad will return immediately
    await sleep(300);
  } else {
    const tab = await chrome.tabs.create({ url: LINKEDIN_URL, active: true });
    tabId = tab.id;
  }

  notify('loading', 'Waiting for LinkedIn to load...');
  await waitForLoad(tabId);

  // Check what page actually loaded (catches login redirects)
  const tabInfo = await chrome.tabs.get(tabId);
  if (tabInfo.url && tabInfo.url.includes('login')) {
    throw new Error('LinkedIn redirected to login. Please log in to LinkedIn first, then try again.');
  }
  if (tabInfo.url && !tabInfo.url.includes('analytics')) {
    throw new Error(`Unexpected page: ${tabInfo.url}. Make sure you are logged in to LinkedIn.`);
  }

  // LinkedIn analytics renders data asynchronously — give it time
  notify('loading', 'Waiting for analytics data to render...');
  await sleep(5000);

  notify('scraping', 'Extracting post data...');
  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId },
      func: linkedinScraperFn
    });
  } catch(e) {
    throw new Error('Could not run scraper: ' + e.message + '. Check you are logged in to LinkedIn.');
  }

  const data = results?.[0]?.result;
  if (!data) throw new Error('Scraper returned no data. Try clicking Pull LinkedIn again.');

  // If 0 posts found, try waiting longer and scraping again
  if (data.posts?.length === 0) {
    notify('loading', 'No posts found yet — waiting longer for page to render...');
    await sleep(4000);
    const retry = await chrome.scripting.executeScript({ target: { tabId }, func: linkedinScraperFn });
    const retryData = retry?.[0]?.result;
    if (retryData?.posts?.length > 0) {
      const importData = { ...retryData, receivedAt: new Date().toISOString() };
      await chrome.storage.local.set({ bgb_import: importData });
      notify('done', `Done — ${retryData.posts.length} posts scraped`, importData);
      return importData;
    }
    throw new Error(data.error || 'No posts found. Make sure your LinkedIn Analytics page is fully loaded and shows posts in the list.');
  }

  const importData = { ...data, receivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ bgb_import: importData });

  notify('done', `Done — ${data.posts.length} posts scraped`, importData);
  return importData;
}

// ─── SEND TO APP ─────────────────────────────────────────────────────────────
async function sendToApp() {
  const stored = await chrome.storage.local.get('bgb_import');
  const data = stored.bgb_import;
  if (!data) throw new Error('No analytics data found. Run the scrape first.');

  // Find or open the BGB app tab
  const appTabs = await chrome.tabs.query({ url: `${APP_URL}/*` });
  let tabId;
  if (appTabs.length > 0) {
    tabId = appTabs[0].id;
    await chrome.tabs.update(tabId, { active: true });
    await sleep(400);
  } else {
    const tab = await chrome.tabs.create({ url: APP_URL, active: true });
    tabId = tab.id;
    await waitForLoad(tabId);
    await sleep(2000); // wait for React to mount
  }

  // Inject bridge — fires CustomEvent in the BGB app
  await chrome.scripting.executeScript({
    target: { tabId },
    func: bridgeFn,
    args: [data]
  });
}

// ─── LINKEDIN SCRAPER (serialised into page context) ─────────────────────────
// !! Runs in the LinkedIn page context via executeScript — fully self-contained.
// Returns a Promise so Chrome awaits it before returning the result.
function linkedinScraperFn() {

  // ── HELPERS ────────────────────────────────────────────────────────────────

  function parseNum(str) {
    if (!str) return 0;
    str = String(str).trim().replace(/,/g, '').replace(/\s/g, '');
    if (!str || str === '—' || str === '-') return 0;
    if (/^\d+(\.\d+)?[Kk]$/.test(str)) return Math.round(parseFloat(str) * 1000);
    if (/^\d+(\.\d+)?[Mm]$/.test(str)) return Math.round(parseFloat(str) * 1000000);
    const n = parseInt(str);
    return isNaN(n) ? 0 : n;
  }

  function findMetric(container, labels) {
    const els = Array.from(container.querySelectorAll('*'));
    for (const el of els) {
      const t = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (labels.some(l => t === l || t === l + ':')) {
        let sib = el.nextElementSibling;
        for (let i = 0; i < 4 && sib; i++, sib = sib.nextElementSibling) {
          const v = (sib.innerText || sib.textContent || '').trim();
          if (/^[\d,.]+[KkMm]?$/.test(v)) return parseNum(v);
        }
        const parent = el.parentElement;
        if (parent) {
          for (const child of parent.children) {
            if (child !== el) {
              const v = (child.innerText || child.textContent || '').trim();
              if (/^[\d,.]+[KkMm]?$/.test(v)) return parseNum(v);
            }
          }
        }
      }
    }
    return 0;
  }

  function detectType(el) {
    if (el.querySelector('video')) return 'video';
    if (el.querySelector('[class*="video"], [aria-label*="video"]')) return 'video';
    if (el.querySelector('[class*="carousel"], [class*="multi-image"]')) return 'carousel';
    if (el.querySelector('[class*="document"], [data-test-id*="document"]')) return 'document';
    const imgs = Array.from(el.querySelectorAll('img')).filter(img => {
      const src = img.src || img.getAttribute('data-src') || '';
      const w = img.offsetWidth || img.naturalWidth || 0;
      return w > 80 && !src.includes('profile') && !src.includes('ghost') && !src.includes('company-logo');
    });
    if (imgs.length > 0) return 'image';
    return 'text';
  }

  function getHook(text) {
    if (!text) return '';
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 5)[0] || '';
  }

  function isContentLine(line) {
    if (line.length < 12) return false;
    if (/^[\d,.\s]+[KkMm%]?$/.test(line)) return false;
    if (/^(impressions?|reactions?|comments?|reposts?|clicks?|views?|likes?|shares?|followers?|engagement|rate|reach)$/i.test(line)) return false;
    return true;
  }

  // ── EXTRACTION ─────────────────────────────────────────────────────────────

  function extractData() {
    const result = {
      platform: 'LinkedIn',
      scrapedAt: new Date().toISOString(),
      url: location.href,
      summary: { totalImpressions: 0, followerChange: 0 },
      posts: [],
      debug: { strategy: '', containersFound: 0 },
      error: null
    };

    // Try multiple selector strategies
    let containers = [];
    const strategies = [
      '[data-view-name="content-analytics-post-card"]',
      '[class*="analytics-post-card"]',
      '[class*="content-analytics-post"]',
      '[class*="analytics-content-list__item"]',
      '[class*="analytics"][class*="post"][class*="item"]',
      '.scaffold-finite-scroll__content > ul > li',
      '[class*="results-list"] > li',
    ];

    for (const sel of strategies) {
      try {
        const found = Array.from(document.querySelectorAll(sel));
        if (found.length >= 1) { containers = found; result.debug.strategy = sel; break; }
      } catch(e) { /* skip */ }
    }

    // Structural fallback: list items containing numbers and text
    if (!containers.length) {
      result.debug.strategy = 'structural-fallback';
      containers = Array.from(document.querySelectorAll('li, article, [role="listitem"]')).filter(el => {
        const txt = el.innerText || '';
        return /\d{2,}/.test(txt) && txt.length > 60 && !el.closest('nav, header, footer, [role="navigation"]');
      });
    }

    result.debug.containersFound = containers.length;

    if (!containers.length) {
      result.error = 'No post cards found after scrolling. Try scrolling down on the LinkedIn Analytics page manually until posts appear, then click Pull LinkedIn again.';
      return result;
    }

    containers.forEach((container, idx) => {
      try {
        const fullText = (container.innerText || '').trim();
        if (fullText.length < 20) return;

        const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
        const contentLines = lines.filter(isContentLine);
        const numericLines = lines
          .filter(l => /^[\d,.\s]+[KkMm]?$/.test(l.trim()))
          .map(l => parseNum(l.trim()))
          .filter(n => n > 0);

        const postText = contentLines.slice(0, 6).join('\n');
        const hook = getHook(postText);

        const impressions = findMetric(container, ['impressions', 'views', 'reach']) || numericLines[0] || 0;
        const reactions   = findMetric(container, ['reactions', 'likes'])            || numericLines[1] || 0;
        const comments    = findMetric(container, ['comments'])                      || numericLines[2] || 0;
        const reposts     = findMetric(container, ['reposts', 'shares'])             || numericLines[3] || 0;
        const clicks      = findMetric(container, ['clicks', 'link clicks'])         || numericLines[4] || 0;

        const linkEl = container.querySelector('a[href*="/posts/"], a[href*="/feed/update/"]');
        const timeEl = container.querySelector('time, [class*="date"], [class*="timestamp"]');

        if (hook.length > 3 || impressions > 0) {
          result.posts.push({
            id: idx + 1,
            hook,
            text: postText.slice(0, 500),
            postType: detectType(container),
            impressions,
            reactions,
            comments,
            reposts,
            clicks,
            engagementRate: impressions > 0 ? ((reactions + comments + reposts) / impressions * 100).toFixed(2) : '0',
            url: linkEl?.href || '',
            date: timeEl?.getAttribute('datetime') || timeEl?.innerText || ''
          });
        }
      } catch(e) {
        console.warn('[BGB Scraper] Error on post', idx, e.message);
      }
    });

    // Summary: try header first, fallback to summing posts
    const headerEl = document.querySelector('[class*="creator-analytics-header"], [class*="analytics-summary"], [class*="analytics-header"]');
    if (headerEl) {
      const nums = Array.from(headerEl.querySelectorAll('*'))
        .map(el => (el.innerText || '').trim())
        .filter(t => /^[\d,.]+[KkMm]?$/.test(t))
        .map(parseNum).filter(n => n > 0).sort((a, b) => b - a);
      if (nums[0]) result.summary.totalImpressions = nums[0];
    }
    if (!result.summary.totalImpressions) {
      result.summary.totalImpressions = result.posts.reduce((s, p) => s + p.impressions, 0);
    }

    return result;
  }

  // ── SCROLL THEN EXTRACT ────────────────────────────────────────────────────
  // Posts list is below the chart — must scroll to trigger lazy loading
  return new Promise((resolve) => {
    window.scrollTo({ top: 500, behavior: 'smooth' });
    setTimeout(() => {
      window.scrollTo({ top: 1200, behavior: 'smooth' });
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        setTimeout(() => resolve(extractData()), 1500);
      }, 700);
    }, 600);
  });
}

// ─── BRIDGE (serialised into BGB app context) ─────────────────────────────────
// !! Runs in the BGB app tab. data is passed via args[0].
function bridgeFn(data) {
  window.dispatchEvent(new CustomEvent('bgb-analytics-import', { detail: data }));
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForLoad(tabId) {
  // Check if already complete — avoids race condition where tab
  // finishes loading before the onUpdated listener is attached
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') {
      await sleep(200);
      return;
    }
  } catch(e) { /* tab may not exist yet, fall through */ }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(); // resolve on timeout — page may still be usable
    }, 20000);

    function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function notify(status, message, data) {
  chrome.runtime.sendMessage({ type: 'status_update', status, message, data }).catch(() => {});
}
