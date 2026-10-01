export function setupOffline(preserveFields: () => void) {
  const status = document.getElementById('offline-status')!;
  const notice = document.getElementById('update-notice')!;
  const message = document.getElementById('update-message')!;
  const button = document.querySelector<HTMLButtonElement>('#update-button')!;

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    status.textContent = 'Calculator ready';
    return;
  }

  let waitingWorker: ServiceWorker | null = null;
  let reloading = false;
  let hasController = Boolean(navigator.serviceWorker.controller);

  const showUpdate = (worker: ServiceWorker) => {
    waitingWorker = worker;
    notice.hidden = false;
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) {
      hasController = true;
      status.textContent = 'Available offline';
      return;
    }
    if (reloading) return;
    try {
      preserveFields();
      reloading = true;
      window.location.reload();
    } catch {
      message.textContent = 'Updated. Reload when you are ready.';
      button.hidden = true;
      notice.hidden = false;
    }
  });

  button.addEventListener('click', () => {
    if (!waitingWorker) return;
    try {
      preserveFields();
    } catch {
      message.textContent = 'Could not save your fields. Finish your calculations and reload later.';
      return;
    }
    button.disabled = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }).then(registration => {
    if (registration.active) status.textContent = 'Available offline';
    if (registration.waiting) showUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed') {
          if (navigator.serviceWorker.controller) showUpdate(installing);
          else status.textContent = 'Available offline';
        }
        if (installing.state === 'redundant' && !registration.active) {
          status.textContent = 'Offline access unavailable';
        }
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update().catch(() => {});
    });
  }).catch(() => {
    status.textContent = 'Offline access unavailable';
  });
}
