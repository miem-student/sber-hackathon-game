'use strict';
const Artwork = (() => {
  const icon = (name, cls = '') => {
    const paths = {
      shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
      heart:'<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
      spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
      bird:'<path d="m3 13 5-2-2-7 9 6 3-4 3 2-2 3c0 6-6 10-12 8l-4-6Z"/>',
      arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
      back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      close:'<path d="m6 6 12 12M6 18 18 6"/>',
      search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
      mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/>',
      crown:'<path d="m3 7 5 5 4-8 4 8 5-5-2 13H5Z"/>',
      home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>'
    };
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  };
  return {icon};
})();
