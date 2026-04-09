// BGB Content Intelligence — Background Service Worker (Chrome MV3)

const LINKEDIN_URL = 'https://www.linkedin.com/analytics/creator/content/?timeRange=past_7_days';
const APP_URL = 'https://bgb.coach';

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

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Find a button/tab by text content — resilient to LinkedIn's obfuscated classes
  function findByText(texts) {
    const els = Array.from(document.querySelectorAll('button,[role="button"],[role="tab"],a'));
    for (const text of texts) {
      const found = els.find(el => {
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        return t === text.toLowerCase() || t.startsWith(text.toLowerCase());
      });
      if (found) return found;
    }
    return null;
  }

  async function clickAndWait(texts, ms=2500) {
    const el = findByText(texts);
    if (el) { el.scrollIntoView({ block:'center' }); el.click(); await sleep(ms); return true; }
    return false;
  }

  // Grab visible page text (capped)
  function pageText(limit=15000) {
    return (document.body.innerText || '').trim().slice(0, limit);
  }

  // Collect post URLs visible on page
  function postLinks() {
    return Array.from(document.querySelectorAll('a[href*="/posts/"],a[href*="/feed/update/"]'))
      .map(a => a.href).filter((v,i,arr) => arr.indexOf(v)===i).slice(0, 30);
  }

  // Scroll down step by step so LinkedIn's virtual list renders rows
  async function scrollDown() {
    const positions = [400, 900, 1600, 2500, 3500,
      document.body.scrollHeight * 0.5,
      document.body.scrollHeight * 0.75,
      document.body.scrollHeight];
    for (const pos of positions) {
      window.scrollTo({ top: pos, behavior: 'smooth' });
      await sleep(800);
    }
  }

  // Full capture sequence for one metric view:
  // scroll → click Show More → wait → capture text
  async function captureView() {
    await scrollDown();
    await clickAndWait(['Show more', 'Show more posts', 'Load more', 'show more'], 2500);
    await sleep(1000);
    return pageText(15000);
  }

  // ── MAIN SEQUENCE ──────────────────────────────────────────────────────────
  return new Promise((resolve) => {
    const step = async () => {
      // 1. Default view = Impressions — scroll + expand
      const impressionsRaw = await captureView();

      // 2. Switch to Clicks metric — scroll back up, click tab, re-capture
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await sleep(1000);
      await clickAndWait(['Clicks', 'Click'], 2500);
      const clicksRaw = await captureView();

      // 3. Switch to Engagement metric
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await sleep(1000);
      await clickAndWait(['Engagement rate', 'Engagement', 'Reactions', 'Reaction'], 2500);
      const engagementRaw = await captureView();

      resolve({
        platform: 'LinkedIn',
        scrapedAt: new Date().toISOString(),
        url: location.href,
        impressionsRaw,
        clicksRaw,
        engagementRaw,
        rawText: impressionsRaw, // backward compat
        postLinks: postLinks(),
        summary: { totalImpressions: 0, followerChange: 0 },
        posts: []
      });
    };
    step();
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
