#!/usr/bin/env node
/**
 * Open Doors — data fetch script
 *
 * Pulls every number the site needs directly from NYC Open Data's live
 * School Quality Reports Data endpoint (dnpx-dfnc) and writes a single
 * static JSON file the site reads at runtime. This runs at build time /
 * on a schedule (see .github/workflows/refresh-data.yml), NOT in the
 * visitor's browser on every page load — the dataset only updates
 * annually, so there's no reason to hit Socrata on every visit.
 *
 * Zero dependencies. Requires Node 18+ (for global fetch).
 *
 * Usage:
 *   node scripts/fetch-data.mjs
 *   npm run fetch-data
 *
 * Optional: set NYC_OPEN_DATA_APP_TOKEN in your environment (or .env,
 * loaded by your shell/CI) to move off the shared anonymous rate limit.
 * Not required — this is a public dataset and works without a token.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "open-doors-data.json");

const BASE = "https://data.cityofnewyork.us/resource/dnpx-dfnc.json";
const APP_TOKEN = process.env.NYC_OPEN_DATA_APP_TOKEN || "";

// Bump this each fall once the new school year's data lands.
const REPORT_YEAR = 2025;
const SCHOOL_YEAR_LABEL = "2024–25";

const ACCESS_METRIC = "pct_accel_try_mth_all"; // % of 8th graders taking accelerated math
const PASS_METRIC = "pct_accel_p_mth_all"; // % of those who took it who passed
const PROFICIENCY_METRIC = "rating_mean_mth_all"; // used only for the benchmark-gap comparison

const BOROUGH_NAMES = {
  M: "Manhattan",
  X: "Bronx",
  K: "Brooklyn",
  Q: "Queens",
  R: "Staten Island",
};

const BANDS = [
  { key: "zero", range: "0%", label: "No accelerated-math participation reported" },
  { key: "low", range: "1–20%", label: "Limited participation" },
  { key: "mid", range: "21–50%", label: "Some students are participating" },
  { key: "high", range: "51–80%", label: "Broad participation" },
  { key: "top", range: "81–100%", label: "Accelerated math reaches most eighth graders" },
];

const MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Socrata's shared anonymous endpoint occasionally drops connections
// (ECONNRESET) or returns 503/429 under load. Those are worth a retry;
// a 4xx means the query itself is wrong and retrying won't help.
async function soql(params) {
  const url = `${BASE}?${new URLSearchParams(params).toString()}`;
  const headers = APP_TOKEN ? { "X-App-Token": APP_TOKEN } : {};

  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers });
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
      continue;
    }
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw new Error(`Socrata request failed (${res.status}): ${url}`);
    }
    await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
  }
}

function pct(wsum, n) {
  if (!n) return null;
  return Math.round((Number(wsum || 0) / Number(n)) * 1000) / 10; // one decimal
}

async function getCitywideRate(metric, year) {
  const rows = await soql({
    $select: "sum(metric_value*number_of_students) as wsum, sum(number_of_students) as n",
    $where: `metric_variable_name='${metric}' AND report_year=${year}`,
  });
  const row = rows[0] || {};
  return pct(row.wsum, row.n);
}

async function getSchoolCount(year) {
  const rows = await soql({
    $select: "count(*) as n",
    $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year}`,
  });
  return Number(rows[0]?.n || 0);
}

async function getBoroughs(year) {
  const rows = await soql({
    $select:
      "substring(dbn,3,1) as code, sum(metric_value*number_of_students) as wsum, sum(number_of_students) as n",
    $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year}`,
    $group: "substring(dbn,3,1)",
  });
  return rows
    .map((r) => ({
      code: r.code,
      name: BOROUGH_NAMES[r.code] || r.code,
      pct: pct(r.wsum, r.n),
    }))
    .filter((b) => b.pct !== null)
    .sort((a, b) => b.pct - a.pct);
}

async function getCharterVsDistrict(year) {
  const [charterRows, districtRows, charterCount, districtCount] = await Promise.all([
    soql({
      $select: "sum(metric_value*number_of_students) as wsum, sum(number_of_students) as n",
      $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND starts_with(dbn,'84')`,
    }),
    soql({
      $select: "sum(metric_value*number_of_students) as wsum, sum(number_of_students) as n",
      $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND NOT starts_with(dbn,'84')`,
    }),
    soql({
      $select: "count(*) as n",
      $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND starts_with(dbn,'84')`,
    }),
    soql({
      $select: "count(*) as n",
      $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND NOT starts_with(dbn,'84')`,
    }),
  ]);
  return {
    charter: { pct: pct(charterRows[0]?.wsum, charterRows[0]?.n), schoolCount: Number(charterCount[0]?.n || 0) },
    district: { pct: pct(districtRows[0]?.wsum, districtRows[0]?.n), schoolCount: Number(districtCount[0]?.n || 0) },
  };
}

async function getTrend(fromYear, toYear) {
  const rows = await soql({
    $select: "report_year, sum(metric_value*number_of_students) as wsum, sum(number_of_students) as n",
    $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year between ${fromYear} and ${toYear}`,
    $group: "report_year",
    $order: "report_year",
  });
  const byYear = new Map(rows.map((r) => [Number(r.report_year), pct(r.wsum, r.n)]));
  const out = [];
  for (let y = fromYear; y <= toYear; y++) {
    // report_year is the SECOND year of the school-year range (report_year 2025 = school year 2024-25)
    const label = `${y - 1}–${String(y).slice(2)}`;
    out.push({ reportYear: y, schoolYear: label, pct: byYear.has(y) ? byYear.get(y) : null });
  }
  return out;
}

async function getBoroughTrend(fromYear, toYear) {
  const rows = await soql({
    $select:
      "report_year, substring(dbn,3,1) as code, sum(metric_value*number_of_students) as wsum, sum(number_of_students) as n",
    $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year between ${fromYear} and ${toYear}`,
    $group: "report_year, substring(dbn,3,1)",
    $order: "report_year",
  });

  const byBoroughYear = new Map(); // code -> Map(year -> pct)
  for (const r of rows) {
    if (!byBoroughYear.has(r.code)) byBoroughYear.set(r.code, new Map());
    byBoroughYear.get(r.code).set(Number(r.report_year), pct(r.wsum, r.n));
  }

  return Object.entries(BOROUGH_NAMES).map(([code, name]) => {
    const yearMap = byBoroughYear.get(code) || new Map();
    const trend = [];
    for (let y = fromYear; y <= toYear; y++) {
      const label = `${y - 1}–${String(y).slice(2)}`;
      trend.push({ reportYear: y, schoolYear: label, pct: yearMap.has(y) ? yearMap.get(y) : null });
    }
    return { code, name, trend };
  });
}

async function getBands(year) {
  const [total, zero, upTo20, upTo50, upTo80, top] = await Promise.all([
    soql({ $select: "count(*) as n", $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year}` }),
    soql({ $select: "count(*) as n", $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND metric_value=0` }),
    soql({ $select: "count(*) as n", $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND metric_value between 0.001 and 0.2` }),
    soql({ $select: "count(*) as n", $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND metric_value between 0.201 and 0.5` }),
    soql({ $select: "count(*) as n", $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND metric_value between 0.501 and 0.799` }),
    soql({ $select: "count(*) as n", $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year} AND metric_value>=0.8` }),
  ]);
  const counts = {
    zero: Number(zero[0]?.n || 0),
    low: Number(upTo20[0]?.n || 0),
    mid: Number(upTo50[0]?.n || 0),
    high: Number(upTo80[0]?.n || 0),
    top: Number(top[0]?.n || 0),
  };
  return {
    total: Number(total[0]?.n || 0),
    bands: BANDS.map((b) => ({ ...b, count: counts[b.key] })),
  };
}

async function getBenchmarkGap(year) {
  const [accessRows, proficiencyRows] = await Promise.all([
    soql({
      $select: "count(*) as total, count(comparison_group_average) as withBenchmark",
      $where: `metric_variable_name in('${ACCESS_METRIC}','${PASS_METRIC}')`,
    }),
    soql({
      $select: "count(*) as total, count(comparison_group_average) as withBenchmark",
      $where: `metric_variable_name='${PROFICIENCY_METRIC}' AND report_year=${year}`,
    }),
  ]);
  return {
    access: {
      totalRecords: Number(accessRows[0]?.total || 0),
      withBenchmark: Number(accessRows[0]?.withBenchmark || 0),
    },
    proficiency: {
      totalRecords: Number(proficiencyRows[0]?.total || 0),
      withBenchmark: Number(proficiencyRows[0]?.withBenchmark || 0),
    },
  };
}

async function fetchAllRows(baseParams, pageSize = 1000) {
  let offset = 0;
  const out = [];
  // Loop defensively in case a result set ever exceeds one page.
  while (true) {
    const rows = await soql({ ...baseParams, $limit: String(pageSize), $offset: String(offset) });
    out.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

function toPct(metricValue) {
  return metricValue !== undefined && metricValue !== null ? Math.round(Number(metricValue) * 1000) / 10 : null;
}

async function getFullDirectory(year) {
  // Access rate is one row per school (the directory backbone). Pass rate
  // only exists for schools that had students take accelerated math, so
  // it's fetched separately and joined by dbn rather than assumed present.
  const [accessRows, passRows] = await Promise.all([
    fetchAllRows({
      $select: "dbn, school_name, school_type, number_of_students, metric_value",
      $where: `metric_variable_name='${ACCESS_METRIC}' AND report_year=${year}`,
      $order: "dbn",
    }),
    fetchAllRows({
      $select: "dbn, metric_value",
      $where: `metric_variable_name='${PASS_METRIC}' AND report_year=${year}`,
      $order: "dbn",
    }),
  ]);

  const passByDbn = new Map(passRows.map((r) => [r.dbn, toPct(r.metric_value)]));

  return accessRows.map((r) => ({
    dbn: r.dbn,
    name: r.school_name,
    type: r.school_type,
    borough: BOROUGH_NAMES[r.dbn?.[2]] || null,
    district: Number(r.dbn?.slice(0, 2)) || null,
    students: r.number_of_students ? Number(r.number_of_students) : null,
    pct: toPct(r.metric_value),
    passPct: passByDbn.has(r.dbn) ? passByDbn.get(r.dbn) : null,
  }));
}

async function main() {
  console.log(`Fetching Open Doors data for report year ${REPORT_YEAR}...`);

  const [
    accessPct,
    passPct,
    schoolCount,
    boroughs,
    charterVsDistrict,
    trend,
    boroughTrend,
    bandData,
    benchmarkGap,
    schools,
  ] = await Promise.all([
    getCitywideRate(ACCESS_METRIC, REPORT_YEAR),
    getCitywideRate(PASS_METRIC, REPORT_YEAR),
    getSchoolCount(REPORT_YEAR),
    getBoroughs(REPORT_YEAR),
    getCharterVsDistrict(REPORT_YEAR),
    getTrend(2018, REPORT_YEAR),
    getBoroughTrend(2018, REPORT_YEAR),
    getBands(REPORT_YEAR),
    getBenchmarkGap(REPORT_YEAR),
    getFullDirectory(REPORT_YEAR),
  ]);

  const data = {
    meta: {
      generatedAt: new Date().toISOString(),
      reportYear: REPORT_YEAR,
      schoolYearLabel: SCHOOL_YEAR_LABEL,
      source: BASE,
      dataset: "NYC DOE School Quality Reports Data (dnpx-dfnc)",
    },
    citywide: { accessPct, passPct, schoolCount },
    boroughs,
    charterVsDistrict,
    trend,
    boroughTrend,
    bandsTotal: bandData.total,
    bands: bandData.bands,
    benchmarkGap,
    schools,
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Wrote ${schools.length} schools and all aggregates to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("fetch-data failed:", err);
  process.exitCode = 1;
});
