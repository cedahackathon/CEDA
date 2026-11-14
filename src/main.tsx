import './index.css';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { auth } from './config/firebase';

const MIN_BOOT_DISPLAY_MS = 400;
const MAX_BOOT_WAIT_MS = 6000;
const FADE_OUT_DURATION_MS = 250;

const rootEl = document.getElementById('root')!;
const loaderEl = document.getElementById('app-boot-loader');

// Preserve the first-paint overlay above the viewport while React mounts into #root.
if (loaderEl && loaderEl.parentElement === rootEl) {
  document.body.appendChild(loaderEl);
}

const getNow = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const bootStart =
  typeof (window as Window & { __CEDA_BOOT_START__?: number }).__CEDA_BOOT_START__ === 'number'
    ? (window as Window & { __CEDA_BOOT_START__?: number }).__CEDA_BOOT_START__!
    : getNow();

let resolveReactMounted: () => void = () => {};
const reactMountedPromise = new Promise<void>((resolve) => {
  resolveReactMounted = resolve;
});

function BootRoot() {
  useEffect(() => {
    resolveReactMounted();
  }, []);

  return <App />;
}

const fontsReadyPromise: Promise<unknown> =
  typeof document !== 'undefined' && document.fonts?.ready
    ? document.fonts.ready.catch(() => undefined)
    : Promise.resolve();

const windowLoadPromise = new Promise<void>((resolve) => {
  if (document.readyState === 'complete') {
    resolve();
    return;
  }
  window.addEventListener('load', () => resolve(), { once: true });
});

const authReadyPromise: Promise<unknown> =
  auth && typeof auth.authStateReady === 'function'
    ? auth.authStateReady().catch(() => undefined)
    : Promise.resolve();

const minDelayPromise = new Promise<void>((resolve) => {
  const remaining = Math.max(0, MIN_BOOT_DISPLAY_MS - (getNow() - bootStart));
  window.setTimeout(resolve, remaining);
});

const maxTimeoutPromise = new Promise<void>((resolve) => {
  const remaining = Math.max(0, MAX_BOOT_WAIT_MS - (getNow() - bootStart));
  window.setTimeout(resolve, remaining);
});

let dismissed = false;
function dismissBootLoader() {
  if (dismissed) return;
  dismissed = true;

  document.documentElement.classList.remove('app-boot-loading');

  const loader = document.getElementById('app-boot-loader');
  if (!loader) {
    document.getElementById('app-boot-styles')?.remove();
    return;
  }

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    loader.remove();
    document.getElementById('app-boot-styles')?.remove();
  };

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  loader.addEventListener(
    'transitionend',
    (event) => {
      if (event.target === loader && event.propertyName === 'opacity') {
        cleanup();
      }
    },
    { once: true }
  );

  // Force style flush so the 250ms opacity transition runs cleanly after any DOM move.
  void loader.offsetWidth;
  loader.classList.add('is-fading');
  window.setTimeout(cleanup, prefersReducedMotion ? 50 : FADE_OUT_DURATION_MS + 30);
}

createRoot(rootEl).render(<BootRoot />);

Promise.race([
  Promise.all([
    reactMountedPromise,
    fontsReadyPromise,
    windowLoadPromise,
    authReadyPromise,
    minDelayPromise,
  ]),
  maxTimeoutPromise,
]).then(dismissBootLoader);

