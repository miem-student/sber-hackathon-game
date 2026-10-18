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
  function villain(extra = '') {
    // Display the approved mature portrait directly from the original concept sheet.
    return `<svg class="villain ${extra}" viewBox="610 5 455 480" role="img" aria-label="Фуфелкрендель — взрослый изобретатель с синими волосами, сединой и бородкой"><image href="assets/concepts/06-fufel-adult.webp" width="1536" height="1024"/></svg>`;
  }
  function citizen(person) {
    if (person === 'Фуфелкрендель') return villain();
    if (person === 'Пиксель') return `<svg class="citizen" viewBox="0 0 280 210" role="img" aria-label="Пиксель, дружелюбный робот"><ellipse cx="140" cy="199" rx="69" ry="8" fill="#2b3450" opacity=".12"/><path d="M87 195v-36q0-28 53-28t53 28v36" fill="#91b9d1" stroke="#30354e" stroke-width="4"/><rect x="69" y="49" width="142" height="109" rx="31" fill="#aedacb" stroke="#30354e" stroke-width="4"/><path d="M140 49V30" stroke="#30354e" stroke-width="4"/><circle cx="140" cy="23" r="10" fill="#e8b250"/><rect x="86" y="72" width="108" height="61" rx="20" fill="#30354e"/><path d="m104 95 10-5 10 5m31 0 10-5 10 5" fill="none" stroke="#c4edd5" stroke-width="6" stroke-linecap="round"/><path d="M123 114q17 14 34 0" fill="none" stroke="#c4edd5" stroke-width="4"/><circle cx="140" cy="177" r="11" fill="#f3cf76"/><path d="M69 87H57v34h12m142-34h12v34h-12" fill="#91b9d1" stroke="#30354e" stroke-width="4"/></svg>`;
    const mila = person === 'Мила';
    return `<svg class="citizen" viewBox="0 0 280 210" role="img" aria-label="${person}, житель цифрового города"><ellipse cx="140" cy="199" rx="70" ry="8" fill="#2b3450" opacity=".12"/><path d="M69 197q5-58 71-58t71 58" fill="${mila ? '#f5824d' : '#e8b052'}" stroke="#30354e" stroke-width="4"/>${mila ? '<path d="M88 79Q52 65 56 133l36-8m99-46q37-15 33 53l-35-8" fill="#67465a" stroke="#30354e" stroke-width="4"/>' : ''}<ellipse cx="140" cy="101" rx="57" ry="61" fill="${mila ? '#f5d2bc' : '#f2caa4'}" stroke="#30354e" stroke-width="4"/><path d="M83 87q-8-54 53-56 69-3 64 57l-26-28-12 15-23-16q-13 29-56 28" fill="${mila ? '#67465a' : '#775543'}" stroke="#30354e" stroke-width="4"/><circle cx="118" cy="101" r="5" fill="#30354e"/><circle cx="162" cy="101" r="5" fill="#30354e"/><path d="M123 126q17 17 34 0" fill="#fffaf0" stroke="#30354e" stroke-width="3" stroke-linejoin="round"/><circle cx="103" cy="119" r="8" fill="#dc8a80" opacity=".6"/><circle cx="177" cy="119" r="8" fill="#dc8a80" opacity=".6"/><path d="m119 160 21 23 21-23" fill="none" stroke="#fff7e4" stroke-width="8"/>${mila ? '<path d="m180 52 13-13 10 14-13 9Z" fill="#e8b052"/>' : '<path d="M78 61q44-51 108-17l8 20-105 7Z" fill="#75b5a1" stroke="#30354e" stroke-width="4"/>'}</svg>`;
  }

  function landscape() {
    return `<svg class="city-landscape" viewBox="0 0 720 720" preserveAspectRatio="none" aria-hidden="true">
      <rect width="720" height="720" fill="#20295c"/>
      <g stroke="#576ca7" stroke-width="2">
        <rect data-zone="0" x="24" y="25" width="285" height="250" rx="30" fill="#404381"/>
        <rect data-zone="1" x="360" y="25" width="335" height="250" rx="30" fill="#514188"/>
        <rect data-zone="3" x="24" y="325" width="285" height="190" rx="30" fill="#254f70"/>
        <rect data-zone="2" x="360" y="325" width="335" height="190" rx="30" fill="#554a74"/>
        <rect data-zone="4" x="24" y="580" width="670" height="115" rx="30" fill="#23625e"/>
      </g>
      <path d="M335 0V720M0 300H720M0 550H720" stroke="#122344" stroke-width="30"/>
      <path d="M335 0V720M0 300H720" stroke="#55d8df" stroke-width="2" stroke-dasharray="10 13" opacity=".55"/>
      <path d="M-10 556Q150 509 315 558T730 554" fill="none" stroke="#124474" stroke-width="40"/>
      <path d="M-10 556Q150 509 315 558T730 554" fill="none" stroke="#29b1d5" stroke-width="22"/>
      <path d="M320 528H350V590H320Z" fill="#8b9dc0" stroke="#ccf6ff" stroke-width="2"/>
      <g fill="#435184" stroke="#7da9d9" stroke-width="2"><rect x="48" y="48" width="75" height="52" rx="8"/><rect x="212" y="197" width="72" height="52" rx="8"/><rect x="384" y="47" width="78" height="45" rx="8"/><rect x="597" y="201" width="72" height="48" rx="8"/><rect x="46" y="452" width="72" height="41" rx="8"/><rect x="582" y="347" width="88" height="45" rx="8"/></g>
      <g fill="none" stroke-width="4"><path d="M57 57H115" stroke="#38e2d4"/><path d="M220 205H277" stroke="#f4a0fb"/><path d="M392 56H454" stroke="#b6a5ff"/><path d="M606 210H661" stroke="#ffcf61"/><path d="M54 461H110" stroke="#54c9ff"/><path d="M591 356H660" stroke="#ffa1cb"/></g>
      <g fill="#37a58b" stroke="#206c67" stroke-width="3"><circle cx="66" cy="627" r="19"/><circle cx="113" cy="662" r="14"/><circle cx="620" cy="648" r="22"/></g>
    </svg>`;
  }
  return {icon, villain, citizen, landscape};
})();
