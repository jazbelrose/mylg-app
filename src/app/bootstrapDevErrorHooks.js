window.addEventListener('error', (e) => {
  console.error('[window error]', e.error || e.message || e);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason || e);
});
