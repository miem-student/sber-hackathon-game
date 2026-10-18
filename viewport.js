'use strict';

// Some Android WebViews report zero for vh/dvh despite a visible native viewport.
// Measure the actual visible area, including changes after the opening animation.
(() => {
  const sync = () => {
    const height = window.visualViewport?.height || window.innerHeight;
    if (Number.isFinite(height) && height > 0) {
      document.documentElement.style.setProperty('--game-height', `${height}px`);
    }
  };
  sync();
  requestAnimationFrame(sync);
  window.addEventListener('resize', sync);
  window.addEventListener('pageshow', sync);
  window.visualViewport?.addEventListener('resize', sync);
})();
