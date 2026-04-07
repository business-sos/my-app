// BGB Content Intelligence — Popup Controller

let progressTimer;

document.addEventListener('DOMContentLoaded', async () => {
  // Check for existing stored data
  const stored = await chrome.runtime.sendMessage({ action: 'get_stored' });
  if (stored?.data) showImport(stored.data);

  // Pull LinkedIn button
  document.getElementById('btn-linkedin').addEventListener('click', async () => {
    setBtn('loading');
    setStatus('<span class="spinner"></span>Opening LinkedIn Analytics...');
    startProgress();
    try {
      const res = await chrome.runtime.sendMessage({ action: 'scrape_linkedin' });
      stopProgress();
      if (res?.success) {
        const charK = Math.round((res.result.rawText?.length || 0) / 1000);
        setStatus(`<span class="success-mark">✓</span>Captured ${charK}K chars — click Send to BGB App`);
        showImport(res.result);
      } else {
        setStatus(res?.error || 'Unknown error', 'error');
      }
    } catch (e) {
      stopProgress();
      setStatus(e.message || 'Failed to connect to extension', 'error');
    } finally {
      setBtn('idle');
    }
  });

  // Send to BGB App
  document.getElementById('btn-send').addEventListener('click', async () => {
    const btn = document.getElementById('btn-send');
    btn.textContent = 'Sending...'; btn.disabled = true;
    try {
      const res = await chrome.runtime.sendMessage({ action: 'send_to_app' });
      if (res?.success) {
        btn.textContent = '✓ Sent — BGB App is ready';
        btn.style.background = '#4A6741'; btn.style.color = 'white';
        setTimeout(() => window.close(), 1800);
      } else {
        btn.textContent = 'Send to BGB App →'; btn.disabled = false;
        setStatus(res?.error || 'Send failed', 'error');
      }
    } catch (e) {
      btn.textContent = 'Send to BGB App →'; btn.disabled = false;
      setStatus(e.message, 'error');
    }
  });

  // Clear
  document.getElementById('btn-clear').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'clear_stored' });
    document.getElementById('import-section').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    setStatus('');
  });

  // Listen for live status updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'status_update') {
      setStatus(`<span class="spinner"></span>${msg.message}`);
      if (msg.status === 'done' && msg.data) {
        stopProgress();
        showImport(msg.data);
        const charK = Math.round((msg.data.rawText?.length || 0) / 1000);
        setStatus(`<span class="success-mark">✓</span>Captured ${charK}K chars — click Send to BGB App`);
      }
    }
  });
});

function showImport(data) {
  const posts = data.posts || [];
  const totalImp = data.summary?.totalImpressions || posts.reduce((s, p) => s + (p.impressions || 0), 0);
  const topPost = [...posts].sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0];
  const when = data.scrapedAt
    ? new Date(data.scrapedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const hasRaw = data.rawText && data.rawText.length > 100;
  document.getElementById('import-summary').innerHTML = `
    <div><span class="hl">${hasRaw ? 'Page captured' : posts.length + ' posts'}</span> &nbsp;·&nbsp; ${when}</div>
    ${hasRaw ? `<div style="color:rgba(245,240,232,0.45);font-size:10px;margin-top:3px">${Math.round(data.rawText.length/1000)}K chars · Claude will extract posts in the app</div>` : `<div><span class="hl">${totalImp >= 1000 ? (totalImp / 1000).toFixed(1) + 'K' : totalImp}</span> total impressions</div>`}
    ${topPost?.hook ? `<div class="hook-preview">"${topPost.hook.slice(0, 60)}${topPost.hook.length > 60 ? '...' : ''}"</div>` : ''}
  `;
  document.getElementById('import-section').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
}

function setBtn(state) {
  const btn = document.getElementById('btn-linkedin');
  btn.disabled = state === 'loading';
  btn.innerHTML = state === 'loading'
    ? '<span class="spinner"></span>Scraping...'
    : '<span class="platform-icon">in</span>Pull LinkedIn';
}

function setStatus(html, type) {
  const el = document.getElementById('status-bar');
  el.innerHTML = html;
  el.className = 'status-bar' + (type ? ' ' + type : '');
}

function startProgress() {
  let w = 5;
  document.getElementById('progress-wrap').style.display = 'block';
  document.getElementById('progress-fill').style.width = '5%';
  progressTimer = setInterval(() => {
    w = Math.min(w + Math.random() * 7 + 2, 88);
    document.getElementById('progress-fill').style.width = w + '%';
  }, 500);
}

function stopProgress() {
  clearInterval(progressTimer);
  const fill = document.getElementById('progress-fill');
  if (fill) { fill.style.width = '100%'; }
  setTimeout(() => {
    const wrap = document.getElementById('progress-wrap');
    if (wrap) wrap.style.display = 'none';
  }, 700);
}
