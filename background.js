// Fetches and caches the set of appids shared with the user through their Steam Family.
// The access token comes from the content script, which reads it same-origin on the store
// (so the user's Steam login cookies are used without this worker needing them).

const CACHE_KEY = 'familyShare';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const API = 'https://api.steampowered.com/IFamilyGroupsService';

function steamIdFromToken(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload)).sub;
}

async function callApi(method, params) {
  const url = `${API}/${method}/v1/?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${method} failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.response || {};
}

async function fetchSharedApps(token) {
  const steamid = steamIdFromToken(token);

  const group = await callApi('GetFamilyGroupForUser', { access_token: token, steamid });
  if (!group.family_groupid) {
    return { steamid, appids: [], fetchedAt: Date.now(), noFamily: true };
  }

  const lib = await callApi('GetSharedLibraryApps', {
    access_token: token,
    steamid,
    family_groupid: group.family_groupid,
    include_own: 'true',
    include_excluded: 'false',
    include_free: 'false',
    include_non_games: 'false',
  });

  // Skip games the user owns themselves; Steam already marks those "In Library".
  const appids = (lib.apps || [])
    .filter((app) => !app.exclude_reason)
    .filter((app) => !(app.owner_steamids || []).includes(steamid))
    .map((app) => app.appid);

  return { steamid, appids, fetchedAt: Date.now() };
}

async function getSharedApps({ token, force }) {
  const { [CACHE_KEY]: cached } = await chrome.storage.local.get(CACHE_KEY);
  const sameUser = cached && token && cached.steamid === steamIdFromToken(token);
  const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  if (cached && fresh && !force && (!token || sameUser)) return cached;
  if (!token) return cached || null;

  const data = await fetchSharedApps(token);
  await chrome.storage.local.set({ [CACHE_KEY]: data });
  return data;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'getSharedApps') {
    getSharedApps(msg)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (msg.type === 'getStatus') {
    chrome.storage.local.get(CACHE_KEY).then((r) => sendResponse(r[CACHE_KEY] || null));
    return true;
  }
  if (msg.type === 'clearCache') {
    chrome.storage.local.remove(CACHE_KEY).then(() => sendResponse(true));
    return true;
  }
});
