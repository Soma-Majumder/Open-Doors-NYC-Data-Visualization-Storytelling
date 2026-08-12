let DATA = null;
let BOROUGHS = [];
let selectedBoroughIdx = 0;

// 5-step data ramp (low -> high access) and text-safe equivalents for type on white.
const RAMP = ['var(--ramp-0)', 'var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)'];
const RAMP_TEXT = ['var(--ramp-text-0)', 'var(--ramp-text-1)', 'var(--ramp-text-2)', 'var(--ramp-text-3)', 'var(--ramp-text-4)'];

// Band definitions (range/name/desc) are fixed content per the design spec.
// School counts per band are computed from the real data — see renderBands().
const BAND_DEFS = [
  { range: '0–5%', name: 'Barely ajar', desc: 'Almost no eighth grader here enters accelerated math.' },
  { range: '5–15%', name: 'Narrow', desc: 'A small selected group gets in; most students do not.' },
  { range: '15–30%', name: 'Ajar', desc: 'Roughly a quarter of the grade has a path in.' },
  { range: '30–50%', name: 'Open', desc: 'Accelerated math is a normal option, not an exception.' },
  { range: '50%+', name: 'Wide open', desc: 'Most eighth graders take accelerated math here.' }
];

// Shared scale ceiling for every percentage-based bar/column on the page, so a
// given rate always occupies the same visual proportion wherever it appears.
const AXIS_MAX = 45;

// "Why this matters" salary ladder — the research gives percentage effects, not
// salaries. We apply them to one illustrative baseline so the payoff is legible
// in dollars; everything below recomputes from BASELINE, not from the data feed.
const EARN_BASELINE = 65000;
const EARN_ALGEBRA_GEO_PCT = 0.08;
const EARN_CALCULUS_PCT = 0.195;
const EARN_TEN_YEAR_YEARS = 10;
const roundTo = (n, step) => Math.round(n / step) * step;
const fmtUSD = n => '$' + Math.round(n).toLocaleString('en-US');

function tierFor(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct < 5) return 0;
  if (pct < 15) return 1;
  if (pct < 30) return 2;
  if (pct < 50) return 3;
  return 4;
}

function barPct(pct) {
  return Math.max(0, Math.min(100, Math.round((pct / AXIS_MAX) * 100))) + '%';
}

function fmtPct(n) {
  return (n === null || n === undefined) ? '—' : n.toFixed(1).replace(/\.0$/, '') + '%';
}

async function loadData() {
  // Step 1: fetch and parse the data file. Only THIS step's failures
  // should show the "couldn't load the data file" message.
  let data;
  try {
    const res = await fetch('./data/open-doors-data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
  } catch (err) {
    console.error('Failed to load open-doors-data.json', err);
    document.getElementById('loadState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    return;
  }

  // Step 2: the data loaded fine — show the page no matter what happens
  // next. A rendering problem should never hide real content that already
  // loaded successfully.
  DATA = data;
  document.getElementById('loadState').style.display = 'none';
  document.getElementById('siteContent').style.display = 'block';
  try {
    renderAll(data);
  } catch (err) {
    console.error('Error while rendering the page', err);
  }
}

function renderAll(data) {
  renderHero(data);
  renderEarnLadder();
  BOROUGHS = buildBoroughs(data);
  renderBoroughRows();
  selectBorough(0);
  renderBands(data);
  renderGap(data);
  renderBoroughCards();
  renderCompareBars(data);
  renderTrend(data);
  renderCaseStudy(data);
  renderUnknown(data);
  renderFooter(data);
}

function renderHero(data) {
  document.getElementById('factSchools').textContent = data.citywide.schoolCount;
  document.getElementById('factAccess').textContent = fmtPct(data.citywide.accessPct);
}

function renderEarnLadder() {
  const algebraSalary = roundTo(EARN_BASELINE * (1 + EARN_ALGEBRA_GEO_PCT), 100);
  const calcSalary = roundTo(EARN_BASELINE * (1 + EARN_CALCULUS_PCT), 100);
  const tenYearValue = roundTo(EARN_BASELINE * EARN_CALCULUS_PCT * EARN_TEN_YEAR_YEARS, 1000);

  document.getElementById('ladderBaseline').textContent = fmtUSD(EARN_BASELINE);
  document.getElementById('ladderAlgebraFig').textContent = fmtUSD(algebraSalary);
  document.getElementById('ladderAlgebraGain').textContent = '+' + fmtUSD(algebraSalary - EARN_BASELINE) + '/yr';
  document.getElementById('ladderCalcFig').textContent = fmtUSD(calcSalary);
  document.getElementById('ladderCalcGain').textContent = '+' + fmtUSD(calcSalary - EARN_BASELINE) + '/yr';
  document.getElementById('payoffAmount').textContent = fmtUSD(tenYearValue);
}

function buildBoroughs(data) {
  const withMeta = data.boroughs.map(b => {
    const tier = tierFor(b.pct);
    const schoolCount = data.schools.filter(s => s.borough === b.name).length;
    return {
      code: b.code,
      name: b.name,
      pct: b.pct,
      tier,
      swatch: RAMP[tier],
      textColor: RAMP_TEXT[tier],
      band: BAND_DEFS[tier],
      schoolCount
    };
  });
  withMeta.sort((a, b) => b.pct - a.pct);
  withMeta.forEach((b, i) => { b.rank = (i + 1) + ' of ' + withMeta.length; });
  return withMeta;
}

function renderBoroughRows() {
  const box = document.getElementById('boroughRows');
  box.innerHTML = BOROUGHS.map((b, i) => `
    <div class="borough-row" onclick="selectBorough(${i})">
      <div class="left">
        <div class="swatch" style="background:${b.swatch}"></div>
        <div class="name">${b.name}</div>
      </div>
      <div class="right">
        <div class="track"><div class="fill" style="width:${barPct(b.pct)};background:${b.swatch}"></div></div>
        <div class="rate">${fmtPct(b.pct)}</div>
      </div>
    </div>
  `).join('');
}

function selectBorough(idx) {
  selectedBoroughIdx = idx;
  document.querySelectorAll('.borough-row').forEach((el, i) => el.classList.toggle('selected', i === idx));
  const b = BOROUGHS[idx];
  document.getElementById('snapName').textContent = b.name;
  document.getElementById('snapPlain').textContent =
    `About ${Math.round(b.pct / 10)} in 10 eighth graders in ${b.name} get a shot at accelerated math.`;
  document.getElementById('snapRate').textContent = fmtPct(b.pct);
  document.getElementById('snapPass').textContent = fmtPct(DATA.citywide.passPct);
  document.getElementById('snapSchools').textContent = b.schoolCount;
  document.getElementById('snapRank').textContent = b.rank;
  const bandEl = document.getElementById('snapBand');
  bandEl.textContent = b.band.name;
  bandEl.style.color = b.textColor;
}

function renderBands(data) {
  const counts = [0, 0, 0, 0, 0];
  data.schools.forEach(s => {
    const tier = tierFor(s.pct);
    if (tier !== null) counts[tier]++;
  });

  const box = document.getElementById('bandsGrid');
  box.innerHTML = BAND_DEFS.map((band, i) => `
    <div class="band-card">
      <div class="strip" style="background:${RAMP[i]}"></div>
      <div class="body">
        <div class="range">${band.range}</div>
        <div class="label">${band.name}</div>
        <div class="desc">${band.desc}</div>
        <div class="count">${counts[i]} schools</div>
      </div>
    </div>
  `).join('');
}

function renderGap(data) {
  document.getElementById('gapEntry').textContent = fmtPct(data.citywide.accessPct);
  document.getElementById('gapOutcome').textContent = fmtPct(data.citywide.passPct);

  const entryFilled = Math.round(data.citywide.accessPct);
  const passFilled = Math.round(data.citywide.passPct);
  document.getElementById('entryDots').innerHTML = Array.from({ length: 100 }, (_, i) =>
    `<div style="background:${i < entryFilled ? 'var(--primary)' : 'var(--pastel-soft)'}"></div>`
  ).join('');
  document.getElementById('passDots').innerHTML = Array.from({ length: 100 }, (_, i) =>
    `<div style="background:${i < passFilled ? 'var(--ink)' : 'var(--pastel-soft)'}"></div>`
  ).join('');
}

function renderBoroughCards() {
  const box = document.getElementById('boroughCards');
  box.innerHTML = BOROUGHS.map(b => `
    <div class="borough-card">
      <div class="rate">${fmtPct(b.pct)}</div>
      <div class="bar" style="width:${barPct(b.pct)};background:${b.swatch}"></div>
      <div class="name">${b.name}</div>
    </div>
  `).join('');
}

function renderCompareBars(data) {
  const cd = data.charterVsDistrict;
  const rows = [
    { label: 'Charter schools', pct: cd.charter.pct },
    { label: 'District schools', pct: cd.district.pct }
  ];
  document.getElementById('compareBars').innerHTML = rows.map(r => `
    <div class="compare-bar">
      <div class="head"><span>${r.label}</span><span>${fmtPct(r.pct)}</span></div>
      <div class="track"><div class="fill" style="width:${barPct(r.pct)};background:${RAMP[tierFor(r.pct)]}"></div></div>
    </div>
  `).join('');
}

function renderTrend(data) {
  const bars = data.trend.map(t => {
    const disrupted = t.schoolYear === '2019–20';
    if (disrupted) {
      return { year: t.reportYear, label: '—', height: '4%', color: 'var(--nodata)' };
    }
    return {
      year: t.reportYear,
      label: t.pct.toFixed(1).replace(/\.0$/, ''),
      height: Math.max(4, Math.round((t.pct / AXIS_MAX) * 100)) + '%',
      color: RAMP[tierFor(t.pct)]
    };
  });
  document.getElementById('trendBars').innerHTML = bars.map(b => `
    <div class="trend-bar">
      <div class="val">${b.label}</div>
      <div class="col" style="height:${b.height};background:${b.color}"></div>
    </div>
  `).join('');
  document.getElementById('trendYears').innerHTML = bars.map(b => `<div>${b.year}</div>`).join('');
}

function renderCaseStudy(data) {
  const caseDbns = ['13K113', '15K442'];
  const caseSchools = caseDbns
    .map(dbn => data.schools.find(s => s.dbn === dbn))
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);

  document.getElementById('caseStudyPair').innerHTML = caseSchools.map((s, i) => {
    const spotlight = i === 0;
    const tier = tierFor(s.pct);
    return `
    <div class="case-card ${spotlight ? 'spotlight' : 'plain'}">
      <div class="tag">${s.dbn} · ${(s.borough || '').toUpperCase()} · ${(s.type || '').toUpperCase()}</div>
      <h3>${s.name}</h3>
      <div class="rate">${fmtPct(s.pct)}</div>
      <div class="sub">of eighth graders take accelerated math</div>
      <div class="divider"></div>
      <div class="row"><span>Citywide pass rate</span><span>${fmtPct(data.citywide.passPct)}</span></div>
      <div class="row"><span>Access band</span><span>${BAND_DEFS[tier].name}</span></div>
    </div>
  `;
  }).join('');
}

function renderUnknown(data) {
  const bg = data.benchmarkGap;
  document.getElementById('benchProf').textContent = fmtPct((bg.proficiency.withBenchmark / bg.proficiency.totalRecords) * 100);
  document.getElementById('benchAccess').textContent = fmtPct((bg.access.withBenchmark / bg.access.totalRecords) * 100);
  document.getElementById('benchAccessTotal').textContent = bg.access.totalRecords.toLocaleString();
}

function renderFooter(data) {
  const generated = new Date(data.meta.generatedAt);
  document.getElementById('footerMeta').innerHTML =
    `Source: <a href="${data.meta.source}" target="_blank">${data.meta.dataset}</a><br>
     Most recent report year: ${data.meta.schoolYearLabel} · Data last refreshed ${generated.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function doSearch() {
  if (!DATA) return;
  const q = document.getElementById('schoolSearch').value.toLowerCase().trim();
  const box = document.getElementById('searchResults');
  if (q.length < 2) {
    box.classList.remove('show');
    box.innerHTML = '';
    return;
  }
  const matches = DATA.schools.filter(s =>
    (s.name && s.name.toLowerCase().includes(q)) ||
    (s.dbn && s.dbn.toLowerCase().includes(q)) ||
    (s.borough && s.borough.toLowerCase().includes(q))
  ).slice(0, 8);

  if (matches.length === 0) {
    box.classList.remove('show');
    box.innerHTML = '';
    return;
  }

  box.classList.add('show');
  box.innerHTML = matches.map(s => {
    const tier = tierFor(s.pct);
    const color = tier === null ? 'var(--muted)' : RAMP_TEXT[tier];
    return `
    <div class="result-row">
      <div>
        <div class="rname">${s.name || s.dbn}</div>
        <div class="rmeta">${s.dbn} · ${s.borough || '—'}</div>
      </div>
      <div class="rrate" style="color:${color}">${fmtPct(s.pct)}</div>
    </div>
  `;
  }).join('');
}

loadData();
