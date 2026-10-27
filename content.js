// Adds an "In Steam Family Library" badge to store search rows and game tiles whose app
// is in the family library.

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

// Older store markup carries data-ds-appid; newer React tiles only have the /app/<id> link.
// Bundles list several appids in data-ds-appid, which parses to NaN and is skipped.
function appidOf(link) {
  if (link.dataset.dsAppid) return Number(link.dataset.dsAppid);
  const match = link.pathname.match(/^\/app\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function makeBadge(extraClass) {
  const badge = document.createElement('span');
  badge.className = extraClass ? `${BADGE_CLASS} ${extraClass}` : BADGE_CLASS;
  badge.innerHTML = FAMILY_ICON;
  badge.append('In Steam Family Library');
  return badge;
}

function badgeRow(row) {
  if (row.querySelector(`.${BADGE_CLASS}`)) return;
  if (!sharedAppids.has(appidOf(row))) return;

  const badge = makeBadge();
  const name = row.querySelector('.search_name');
  if (name) name.after(badge);
  else row.append(badge);
}

// Capsule tiles (home page carousels, sale capsules, tab lists, etc.) get the badge
// overlaid on the top-left corner of the tile.
function badgeTile(link) {
  if (link.querySelector(`.${BADGE_CLASS}`)) return;
  if (!link.querySelector('img')) return;
  // Full-page background ads behind the home page link to an app but aren't tiles.
  if (link.matches('.home_page_takeover_sizer, .home_page_takeunder')) return;
  if (!sharedAppids.has(appidOf(link))) return;

  if (getComputedStyle(link).position === 'static') link.style.position = 'relative';
  link.append(makeBadge('sfs-tile-badge'));
}

function badgeAll() {
  if (!sharedAppids) return;
  document.querySelectorAll('a.search_result_row[data-ds-appid]').forEach(badgeRow);
  document
    .querySelectorAll('a[data-ds-appid]:not(.search_result_row), a[href*="/app/"]:not(.search_result_row)')
    .forEach(badgeTile);
}

let scanQueued = false;
function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  setTimeout(() => {
    scanQueued = false;
    badgeAll();
  }, 200);
}

async function init(force = false) {
  sharedAppids = await loadSharedApps(force);
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((b) => b.remove());
  badgeAll();
}

// Search results and home page sections load in as you scroll and re-render on changes.
new MutationObserver(queueScan).observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'refresh') init(true);
});

init();
