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

// Fixed hand-set rotation/lift per note so the board reads as scattered
// paper, not a grid — cycles if there are ever more than 5 boroughs.
const NOTE_TILT = ['-4deg', '3deg', '-2deg', '4deg', '-3deg'];
const NOTE_LIFT = ['4px', '-6px', '8px', '-2px', '6px'];

function renderBoroughRows() {
  const box = document.getElementById('boroughRows');
  box.innerHTML = BOROUGHS.map((b, i) => `
    <div class="sticky-note" style="--r:${NOTE_TILT[i % NOTE_TILT.length]};--y:${NOTE_LIFT[i % NOTE_LIFT.length]}" onclick="selectBorough(${i})">
      <div class="pin"></div>
      <div class="name">${b.name}</div>
      <div class="rate">${fmtPct(b.pct)}</div>
    </div>
  `).join('');
}

function selectBorough(idx) {
  selectedBoroughIdx = idx;
  document.querySelectorAll('.sticky-note').forEach((el, i) => el.classList.toggle('selected', i === idx));
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

  document.getElementById('startSplit').classList.add('has-selection');
  renderSchoolList(b.name);
}

function renderSchoolList(boroughName) {
  const schools = DATA.schools
    .filter(s => s.borough === boroughName)
    .slice()
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  document.getElementById('schoolListBorough').textContent = boroughName;
  document.getElementById('schoolListCount').textContent = schools.length;

  document.getElementById('schoolList').innerHTML = schools.map((s, i) => {
    const tier = tierFor(s.pct);
    const color = tier === null ? 'var(--muted)' : RAMP_TEXT[tier];
    return `
    <div class="result-row" onclick="openSchoolDetail('${s.dbn}')">
      <div class="rleft">
        <div class="rrank">${i + 1}</div>
        <div>
          <div class="rname">${s.name || s.dbn}</div>
          <div class="rmeta">${s.dbn}${s.type ? ' · ' + s.type : ''}</div>
        </div>
      </div>
      <div class="rrate" style="color:${color}">${fmtPct(s.pct)}</div>
    </div>
  `;
  }).join('');
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
    <div class="result-row" onclick="openSchoolDetail('${s.dbn}')">
      <div>
        <div class="rname">${s.name || s.dbn}</div>
        <div class="rmeta">${s.dbn} · ${s.borough || '—'}</div>
      </div>
      <div class="rrate" style="color:${color}">${fmtPct(s.pct)}</div>
    </div>
  `;
  }).join('');
}

// Rough per-student swing: with N eighth graders, one kid is worth 100/N
// percentage points. Below ~20 students that swing gets large enough that
// the headline rate can jump around year to year without much changing.
const SMALL_GRADE_THRESHOLD = 20;

function schoolAccessSentence(s) {
  if (s.pct === null || s.pct === undefined) {
    return `We don't have an accelerated-math number on file for ${s.name} yet.`;
  }
  if (s.pct === 0) {
    return `No eighth graders at ${s.name} took accelerated math in ${DATA.meta.schoolYearLabel} — the course wasn't reaching any students here, at least not through this path.`;
  }
  const inTen = Math.max(1, Math.round(s.pct / 10));
  return `About ${inTen} in 10 eighth graders at ${s.name} got the chance to take accelerated math (Algebra I, a year ahead of schedule) in ${DATA.meta.schoolYearLabel}.`;
}

function schoolPassSentence(s) {
  if (s.pct === 0 || s.pct === null || s.pct === undefined) {
    return `There's no pass rate to show, because effectively no one here got the chance to take it.`;
  }
  if (s.passPct === null || s.passPct === undefined) {
    return `We don't have a reliable pass rate for this school yet — usually because too few students took the course to report one.`;
  }
  return `Of the students who did get in, ${fmtPct(s.passPct)} passed. That's in line with the citywide pass rate of ${fmtPct(DATA.citywide.passPct)} — once kids get access, most of them succeed.`;
}

function schoolCompareSentence(s) {
  const cityPct = DATA.citywide.accessPct;
  const boroughMeta = BOROUGHS.find(b => b.name === s.borough);
  const parts = [];
  if (s.pct !== null && s.pct !== undefined) {
    const diff = Math.round(s.pct - cityPct);
    if (Math.abs(diff) < 2) {
      parts.push(`That's about even with the citywide average of ${fmtPct(cityPct)}.`);
    } else if (diff > 0) {
      parts.push(`That's ${diff} points above the citywide average of ${fmtPct(cityPct)}.`);
    } else {
      parts.push(`That's ${Math.abs(diff)} points below the citywide average of ${fmtPct(cityPct)}.`);
    }
  }
  if (boroughMeta) {
    parts.push(`In ${s.borough} overall, about ${fmtPct(boroughMeta.pct)} of eighth graders get this opportunity (rank ${boroughMeta.rank} of NYC's 5 boroughs).`);
  }
  return parts.join(' ');
}

function openSchoolDetail(dbn) {
  if (!DATA) return;
  const s = DATA.schools.find(x => x.dbn === dbn);
  if (!s) return;

  const tier = tierFor(s.pct);
  const band = tier === null ? null : BAND_DEFS[tier];
  const swatch = tier === null ? 'var(--nodata)' : RAMP[tier];
  const textColor = tier === null ? 'var(--muted)' : RAMP_TEXT[tier];

  const smallGradeNote = (s.students !== null && s.students !== undefined && s.students < SMALL_GRADE_THRESHOLD)
    ? `<div class="modal-note">Heads up: this is a small grade (around ${s.students} eighth graders), so one or two students can swing the percentage a lot. Treat the exact number loosely.</div>`
    : '';

  document.getElementById('schoolModalBody').innerHTML = `
    <div class="modal-tag">${s.dbn} · ${(s.borough || '—').toUpperCase()} · ${(s.type || '—').toUpperCase()}${s.district ? ' · DISTRICT ' + s.district : ''}</div>
    <h3 id="schoolModalName">${s.name || s.dbn}</h3>

    <div class="modal-headline-row">
      <div class="modal-headline-num" style="color:${textColor}">${fmtPct(s.pct)}</div>
      <div class="modal-headline-sub">of eighth graders got a shot at accelerated math${band ? `<div class="modal-band" style="color:${textColor}">${band.name}</div>` : ''}</div>
    </div>
    <div class="modal-track"><div class="modal-fill" style="width:${barPct(s.pct || 0)};background:${swatch}"></div></div>

    <div class="modal-plain-label">What this means for a parent</div>
    <p class="modal-plain">${schoolAccessSentence(s)}</p>
    <p class="modal-plain">${schoolPassSentence(s)}</p>
    <p class="modal-plain">${schoolCompareSentence(s)}</p>
    ${smallGradeNote}

    <div class="modal-stats">
      <div><div class="k">Took accelerated math</div><div class="v">${fmtPct(s.pct)}</div></div>
      <div><div class="k">Passed it (of those who took it)</div><div class="v">${fmtPct(s.passPct)}</div></div>
      <div><div class="k">8th graders reported</div><div class="v">${s.students ?? '—'}</div></div>
    </div>

    <div class="modal-footnote">"Accelerated math" means an 8th grader taking a high-school-credit math course (usually Algebra I) a year ahead of standard grade-8 math — the first step on a path that can lead to calculus by senior year. Source: NYC DOE School Quality Reports Data, ${DATA.meta.schoolYearLabel}.</div>
  `;

  document.getElementById('schoolModalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSchoolDetail() {
  document.getElementById('schoolModalOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSchoolDetail();
});

loadData();
