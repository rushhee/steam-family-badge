// Adds a "Family Share" badge to search result rows whose app is in the family library.

const BADGE_CLASS = 'sfs-badge';
// Two adults with a child in front, matching the store page's family library banner.
const FAMILY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="6.5" cy="6" r="3"/><path d="M1 17c0-3.6 2.2-6 5.5-6 1.4 0 2.6.4 3.5 1.2A6.4 6.4 0 0 0 8 17H1z"/>
  <circle cx="17.5" cy="6" r="3"/><path d="M23 17c0-3.6-2.2-6-5.5-6-1.4 0-2.6.4-3.5 1.2A6.4 6.4 0 0 1 16 17h7z"/>
  <circle cx="12" cy="11" r="2.6"/><path d="M7.5 21c0-3 1.8-5 4.5-5s4.5 2 4.5 5h-9z"/>
</svg>`;
let sharedAppids = null;

async function getToken() {
  const res = await fetch('/pointssummary/ajaxgetasyncconfig', { credentials: 'include' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.webapi_token || null;
}

async function loadSharedApps(force = false) {
  const token = await getToken().catch(() => null);
  const res = await chrome.runtime.sendMessage({ type: 'getSharedApps', token, force });
  if (!res?.ok) {
    console.warn('[Family Share Badge]', res?.error);
    return null;
  }
  return res.data ? new Set(res.data.appids) : null;
}

function badgeRow(row) {
  if (row.querySelector(`.${BADGE_CLASS}`)) return;
  // Bundles list several appids; only badge single-app rows.
  const appid = Number(row.dataset.dsAppid);
  if (!appid || !sharedAppids.has(appid)) return;

  const badge = document.createElement('span');
  badge.className = BADGE_CLASS;
  badge.innerHTML = FAMILY_ICON;
  badge.append('In Steam Family Library');
  const name = row.querySelector('.search_name');
  if (name) name.after(badge);
  else row.append(badge);
}

function badgeAll(root = document) {
  if (!sharedAppids) return;
  root.querySelectorAll('a.search_result_row[data-ds-appid]').forEach(badgeRow);
}

async function init(force = false) {
  sharedAppids = await loadSharedApps(force);
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((b) => b.remove());
  badgeAll();
}

// Results load in as you scroll and are replaced when filters change.
new MutationObserver(() => badgeAll()).observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'refresh') init(true);
});

init();
