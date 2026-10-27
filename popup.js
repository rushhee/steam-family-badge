const statusEl = document.getElementById('status');

async function showStatus() {
  const data = await chrome.runtime.sendMessage({ type: 'getStatus' });
  if (!data) {
    statusEl.textContent = 'No data yet. Open the Steam store while logged in.';
  } else if (data.noFamily) {
    statusEl.textContent = 'Your account is not in a Steam Family.';
  } else {
    const when = new Date(data.fetchedAt).toLocaleString();
    statusEl.textContent = `${data.appids.length} shared games. Updated ${when}.`;
  }
}

document.getElementById('refresh').addEventListener('click', async () => {
  statusEl.textContent = 'Refreshing…';
  const tabs = await chrome.tabs.query({ url: 'https://store.steampowered.com/*' });
  if (!tabs.length) {
    await chrome.runtime.sendMessage({ type: 'clearCache' });
    statusEl.textContent = 'Cache cleared. Open the Steam store to reload.';
    return;
  }
  tabs.forEach((t) => chrome.tabs.sendMessage(t.id, { type: 'refresh' }));
  setTimeout(showStatus, 2500);
});

showStatus();
