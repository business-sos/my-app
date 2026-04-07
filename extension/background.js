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

  // Raw text approach — success is measured by text length, not post count
  // (posts are extracted by Claude in the app, not here)
  if (!data.rawText || data.rawText.length < 200) {
    throw new Error('Page text too short — LinkedIn may not have loaded. Try again in a few seconds.');
  }

  const importData = { ...data, receivedAt: new Date().toISOString() };
  await chrome.storage.local.set({ bgb_import: importData });

  const charCount = Math.round(data.rawText.length / 1000);
  notify('done', `Captured — ${charCount}K chars of analytics data`, importData);
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
  // Rather than brittle DOM selectors, grab the raw visible text from the page
  // and let Claude interpret it. Much more resilient to LinkedIn DOM changes.

  function extractData() {
    // Grab all visible text chunks from the page body
    const rawText = (document.body.innerText || '').trim();

    // Also try to grab post URLs from the page
    const postLinks = Array.from(document.querySelectorAll('a[href*="/posts/"], a[href*="/feed/update/"]'))
      .map(a => a.href)
      .filter((v, i, arr) => arr.indexOf(v) === i) // unique
      .slice(0, 20);

    // Try to detect any media thumbnails (rough post type hints)
    const hasVideo = document.querySelector('video, [class*="video-player"], [aria-label*="video"]') !== null;
    const imgCount = document.querySelectorAll('img[src*="media"], img[src*="dms"]').length;

    return {
      platform: 'LinkedIn',
      scrapedAt: new Date().toISOString(),
      url: location.href,
      rawText: rawText.slice(0, 12000), // Claude will parse this
      postLinks,
      hints: { hasVideo, imgCount },
      summary: { totalImpressions: 0, followerChange: 0 },
      posts: [] // populated by Claude in the app
    };
  }

  // ── SCROLL THEN EXTRACT ────────────────────────────────────────────────────
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
