// Standalone reference page — lists every CSS custom property declared in
// css/styles.css:root. Hex values here are for display only; the source of
// truth is the stylesheet itself, so if a token's value ever drifts from
// what's shown here, trust the CSS file, not this list.
const PALETTE_GROUPS = [
  {
    name: 'Neutrals & surfaces',
    note: 'Page background, text, hairlines',
    colors: [
      ['--page', '#FDF3EE', 'Page background'],
      ['--surface', '#FFFFFF', 'Card / input surface'],
      ['--ink', '#3A211C', 'Primary text'],
      ['--muted', '#6B534C', 'Secondary text'],
      ['--muted-soft', '#8A6B62', 'Softer secondary text'],
      ['--faint', '#A88C82', 'Captions, faint labels'],
      ['--rule', '#F0DFD7', 'Hairline borders'],
      ['--rule-soft', '#F6EAE4', 'Softer hairline borders'],
    ]
  },
  {
    name: 'Primary & accent',
    note: 'Brand red, links, highlight states',
    colors: [
      ['--primary', '#C4463F', 'Brand red — CTAs, links, accents'],
      ['--primary-hover', '#A9322E', 'Primary hover state'],
      ['--link-hover', '#7E2723', 'Link hover'],
      ['--apricot', '#E8A08D', '"About this data" rail accent'],
      ['--pastel', '#F2CFC4', 'Pastel fill'],
      ['--pastel-soft', '#F6E3DB', 'Softer pastel fill'],
      ['--input-border', '#E0BEB2', 'Form input borders'],
      ['--flag', '#E8615A', 'Flagged / highlight state'],
    ]
  },
  {
    name: 'Track & no-data',
    note: 'Progress tracks, missing-data indicators',
    colors: [
      ['--track', '#F7EDE8', 'Progress-bar track background'],
      ['--nodata', '#E0CFC6', 'Missing-data marker'],
    ]
  },
  {
    name: 'Access-tier ramp',
    note: 'Low → high accelerated-math access, 0 to 4',
    colors: [
      ['--ramp-0', '#EFC9B9', 'Tier 0 (barely ajar)'],
      ['--ramp-1', '#E8AC98', 'Tier 1 (narrow)'],
      ['--ramp-2', '#DE8C7A', 'Tier 2 (ajar)'],
      ['--ramp-3', '#CF6155', 'Tier 3 (open)'],
      ['--ramp-4', '#A9322E', 'Tier 4 (wide open)'],
      ['--ramp-text-0', '#C4463F', 'Text-safe pairing for tier 0'],
      ['--ramp-text-1', '#C4463F', 'Text-safe pairing for tier 1'],
      ['--ramp-text-2', '#B8503F', 'Text-safe pairing for tier 2'],
      ['--ramp-text-3', '#CF6155', 'Text-safe pairing for tier 3'],
      ['--ramp-text-4', '#A9322E', 'Text-safe pairing for tier 4'],
    ]
  },
  {
    name: 'Terracotta Dawn — borough map',
    note: 'One hue per borough, plus its darker map-stroke variant',
    colors: [
      ['--water', '#F5E9E0', 'Map background / water'],
      ['--manhattan', '#BC4B37', 'Manhattan — terracotta'],
      ['--bronx', '#7F2F69', 'The Bronx — plum'],
      ['--queens', '#DD7B2B', 'Queens — burnt orange'],
      ['--brooklyn', '#931F37', 'Brooklyn — deep sienna'],
      ['--staten', '#DF8797', 'Staten Island — dusty rose'],
      ['--manhattan-text', '#7C0000', 'Manhattan map-shape stroke'],
      ['--bronx-text', '#4D003C', 'Bronx map-shape stroke'],
      ['--queens-text', '#902E00', 'Queens map-shape stroke'],
      ['--brooklyn-text', '#5E000E', 'Brooklyn map-shape stroke'],
      ['--staten-text', '#91314A', 'Staten Island map-shape stroke'],
    ]
  },
  {
    name: 'Trend chart specials',
    note: "Fixed colors that don't follow the borough toggle",
    colors: [
      ['--disrupted-marker', '#4A87B5', 'Light blue — 2019–20 dot, every line'],
      ['--trend-all', '#2F6B45', 'Green — "All boroughs" line + toggle dot'],
    ]
  },
];

document.getElementById('paletteGroups').innerHTML = PALETTE_GROUPS.map(g => `
  <div class="palette-group">
    <div class="palette-group-head">
      <div class="palette-group-name">${g.name}</div>
      <div class="palette-group-note">${g.note}</div>
    </div>
    <div class="palette-grid">
      ${g.colors.map(([name, hex, use]) => `
        <div class="palette-swatch">
          <div class="palette-swatch-color" style="background:${hex}"></div>
          <div class="palette-swatch-info">
            <div class="palette-swatch-var">${name}</div>
            <div class="palette-swatch-hex">${hex}</div>
            <div class="palette-swatch-use">${use}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
`).join('');
