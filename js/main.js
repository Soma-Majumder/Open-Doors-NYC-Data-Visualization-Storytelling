let DATA = null;

async function loadData(){
  // Step 1: fetch and parse the data file. Only THIS step's failures
  // should show the "couldn't load the data file" message.
  let data;
  try{
    const res = await fetch('./data/open-doors-data.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
  }catch(err){
    console.error('Failed to load open-doors-data.json', err);
    document.getElementById('loadState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    return;
  }

  // Step 2: the data loaded fine — show the page no matter what happens
  // next. A rendering problem (e.g. a blocked third-party script) should
  // never hide real content that already loaded successfully.
  DATA = data;
  document.getElementById('loadState').style.display = 'none';
  document.getElementById('siteContent').style.display = 'block';
  try{
    renderAll(data);
  }catch(err){
    console.error('Error while rendering the page', err);
  }
}

// Wraps a Chart.js call so a blocked/failed charting library (common with
// ad blockers, since Chart.js loads from a third-party CDN) degrades to a
// plain-text note instead of breaking the rest of the page.
function safeChart(canvasId, config){
  const canvas = document.getElementById(canvasId);
  if(typeof Chart === 'undefined'){
    canvas.outerHTML = '<div class="chart-fallback">Chart couldn\'t load — this is usually a content/ad blocker blocking the charting library from its CDN. The numbers on this page are accurate either way.</div>';
    return;
  }
  try{
    new Chart(canvas, config);
  }catch(err){
    console.error('Chart render failed for', canvasId, err);
    canvas.outerHTML = '<div class="chart-fallback">This chart couldn\'t render, but the numbers elsewhere on this page are accurate.</div>';
  }
}

function fmtPct(n){
  return (n === null || n === undefined) ? '—' : n.toFixed(1).replace(/\.0$/, '') + '%';
}

function renderAll(data){
  // Hero facts
  document.getElementById('factSchools').textContent = data.citywide.schoolCount;
  document.getElementById('factAccess').textContent = fmtPct(data.citywide.accessPct);
  document.getElementById('factYearA').textContent = data.meta.schoolYearLabel;
  document.getElementById('boroughYearNote').textContent = data.meta.schoolYearLabel;

  // Search
  const note = document.getElementById('searchDemoNote');
  if(data.schools.length < data.citywide.schoolCount){
    note.textContent = `Searching ${data.schools.length} of ${data.citywide.schoolCount} schools — the live directory hasn't been fully synced yet. Run "npm run fetch-data" with real network access to pull all schools.`;
  } else {
    note.textContent = `Searching all ${data.schools.length} reporting schools.`;
  }

  // Bands
  const bandsBox = document.getElementById('bandsContainer');
  const maxCount = Math.max(...data.bands.map(b => b.count), 1);
  bandsBox.innerHTML = data.bands.map(b => `
    <div class="band-row">
      <div class="range">${b.range}</div>
      <div class="label">${b.label}</div>
      <div class="count-wrap">
        <div class="count-bar-outer"><div class="count-bar-inner" style="width:${Math.round((b.count/maxCount)*100)}%;${b.key==='zero'?'background:var(--coral-dark);':''}"></div></div>
        <div class="count-num">${b.count} schools</div>
      </div>
    </div>
  `).join('');
  const zeroBand = data.bands.find(b => b.key === 'zero');
  const topBand = data.bands.find(b => b.key === 'top');
  document.getElementById('zeroCallout').innerHTML =
    `<b>${Math.round((zeroBand.count/data.bandsTotal)*100)}% of NYC middle schools</b> — ${zeroBand.count} out of ${data.bandsTotal} — reported zero eighth graders taking accelerated math in ${data.meta.schoolYearLabel}. Only <b>${Math.round((topBand.count/data.bandsTotal)*100)}%</b> reached the 81–100% band.`;

  // Opportunity gap
  document.getElementById('gapEntry').textContent = fmtPct(data.citywide.accessPct);
  document.getElementById('gapOutcome').textContent = fmtPct(data.citywide.passPct);

  // Borough chart
  safeChart('boroughChart', {
    type: 'bar',
    data: {
      labels: data.boroughs.map(b => b.name),
      datasets: [{
        data: data.boroughs.map(b => b.pct),
        backgroundColor: data.boroughs.map(b => b.name === 'Bronx' ? '#e2775a' : '#4f8d76'),
        borderRadius: 6,
        barThickness: 28
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.parsed.x + '%' } } },
      scales: { x: { max: 50, ticks: { callback: v => v + '%' } }, y: { grid: { display: false } } }
    }
  });

  // Charter vs district
  const cd = data.charterVsDistrict;
  document.getElementById('charterSub').textContent =
    `Charter schools average ${fmtPct(cd.charter.pct)} accelerated-math participation. District schools average ${fmtPct(cd.district.pct)} — more than double.`;
  safeChart('charterChart', {
    type: 'bar',
    data: {
      labels: [`Charter schools (${cd.charter.schoolCount} schools)`, `District schools (${cd.district.schoolCount} schools)`],
      datasets: [{
        data: [cd.charter.pct, cd.district.pct],
        backgroundColor: ['#e2775a', '#4f8d76'],
        borderRadius: 6,
        barThickness: 44
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.parsed.y + '%' } } },
      scales: { y: { max: 45, ticks: { callback: v => v + '%' } } }
    }
  });

  // Trend
  const firstYear = data.trend[0]?.schoolYear;
  const lastYear = data.trend[data.trend.length - 1];
  document.getElementById('trendSub').textContent =
    `Citywide participation was ${fmtPct(data.trend[0]?.pct)} in ${firstYear}. It collapsed during remote learning, rebounded to a peak, and has fallen since — to ${fmtPct(lastYear?.pct)} in ${lastYear?.schoolYear}.`;
  safeChart('trendChart', {
    type: 'line',
    data: {
      labels: data.trend.map(t => t.schoolYear),
      datasets: [{
        data: data.trend.map(t => t.pct),
        borderColor: '#4f8d76',
        backgroundColor: 'rgba(79,141,118,0.12)',
        pointBackgroundColor: data.trend.map(t => t.pct !== null && t.pct < 15 ? '#e2775a' : '#4f8d76'),
        pointRadius: 6,
        spanGaps: false,
        fill: true,
        tension: 0.25
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.parsed.y === null ? 'No data (COVID disruption)' : c.parsed.y + '%' } } },
      scales: { y: { min: 0, max: 45, ticks: { callback: v => v + '%' } } }
    }
  });

  // Case study — pull two known Brooklyn schools by DBN out of the live directory
  const caseDbns = ['13K113', '15K442'];
  const caseSchools = caseDbns.map(dbn => data.schools.find(s => s.dbn === dbn)).filter(Boolean);
  document.getElementById('caseStudyPair').innerHTML = caseSchools.map(s => `
    <div class="pcard ${s.pct === 0 ? 'zero' : 'high'}">
      <div class="tag">District ${s.district} · ${s.borough}</div>
      <h3>${s.name}</h3>
      <div class="meta">${s.students} eighth graders reported</div>
      <div class="bignum">${fmtPct(s.pct)}</div>
      <div class="sub">took accelerated math in ${data.meta.schoolYearLabel}</div>
    </div>
  `).join('');

  // Benchmark gap
  const bg = data.benchmarkGap;
  document.getElementById('benchProf').textContent = fmtPct((bg.proficiency.withBenchmark / bg.proficiency.totalRecords) * 100);
  document.getElementById('benchAccess').textContent = fmtPct((bg.access.withBenchmark / bg.access.totalRecords) * 100);
  document.getElementById('benchAccessTotal').textContent = bg.access.totalRecords.toLocaleString();

  // Footer
  const generated = new Date(data.meta.generatedAt);
  document.getElementById('footerMeta').innerHTML =
    `Source: <a href="${data.meta.source}" target="_blank">${data.meta.dataset}</a><br>
     Most recent report year: ${data.meta.schoolYearLabel} · Data last refreshed ${generated.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function doSearch(){
  if(!DATA) return;
  const q = document.getElementById('schoolSearch').value.toLowerCase().trim();
  const box = document.getElementById('searchResults');
  box.innerHTML = '';
  if(q.length < 2) return;
  const matches = DATA.schools.filter(s =>
    (s.name && s.name.toLowerCase().includes(q)) || (s.dbn && s.dbn.toLowerCase().includes(q))
  ).slice(0, 8);
  matches.forEach(s => {
    const el = document.createElement('div');
    el.className = 'school-card';
    const plain = s.pct === null ? 'No data reported for this school.'
      : s.pct === 0 ? 'No eighth graders took accelerated math here.'
      : `About ${Math.round(s.pct/10)} in 10 eighth graders here took accelerated math.`;
    el.innerHTML = `<div class="sname">${s.name || s.dbn}</div><div class="smeta">District ${s.district} · ${s.borough || ''} · ${s.students ?? '—'} eighth graders</div><div class="spct">${fmtPct(s.pct)}</div><div class="splain">${plain}</div>`;
    box.appendChild(el);
  });
  if(matches.length === 0){
    box.innerHTML = `<div class="demo-note">No match in the ${DATA.schools.length}-school directory currently loaded.</div>`;
  }
}

function showBorough(code){
  if(!DATA) return;
  document.querySelectorAll('.btile').forEach(t => t.classList.remove('active'));
  document.getElementById('tile-' + code).classList.add('active');
  const b = DATA.boroughs.find(x => x.code === code);
  if(!b) return;
  const band = DATA.bands.find(bd => {
    if(bd.key === 'zero') return b.pct === 0;
    if(bd.key === 'low') return b.pct > 0 && b.pct <= 20;
    if(bd.key === 'mid') return b.pct > 20 && b.pct <= 50;
    if(bd.key === 'high') return b.pct > 50 && b.pct <= 80;
    return b.pct > 80;
  });
  document.getElementById('snapTitle').textContent = b.name + ' — ' + fmtPct(b.pct);
  document.getElementById('snapBar').style.width = b.pct + '%';
  document.getElementById('snapPlain').textContent = (band ? band.range + ': ' + band.label + '. ' : '') +
    `About ${Math.round(b.pct/10)} in 10 eighth graders in ${b.name} get a shot at accelerated math.`;
}

loadData();
