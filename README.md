# Open-Doors-NYC-Data-Visualization-Storytelling
This is the final project of where I go and explore NYC Data from schools and see that there is a gap of access to advanced math across 633 middle schools in NYC

## Open Doors App

**NYC middle-school math access guide.** Open Doors turns NYC DOE's public school-report data into a plain-language view of which middle schools give eighth graders a real shot at accelerated math — not just who succeeds after getting in.

---

## What this project is

Advanced ("accelerated") math in NYC middle school means an 8th grader taking a Regents-track, high-school-credit-bearing math course — typically Algebra I — a year ahead of schedule. Getting into that course is the first link in a chain that can lead to calculus by 12th grade, which research connects to STEM degree completion and higher long-term earnings. But access to that first link is not evenly distributed across the city, and NYC's own public data shows it — most people just don't have a plain-language way to see it.

Open Doors is that plain-language layer: a self-service tool where a parent, administrator, journalist, or researcher can look up a school or borough and see, in plain English, how many eighth graders get the opportunity to take accelerated math, without needing a DBN number or a statistics background.

## Who it's for

Open Doors is for NYC students, families, educators, advocates, journalists, and researchers who want to understand whether advanced-math opportunity is available — not just who succeeds after receiving it.

## Data source

**Dataset:** [School Quality Reports Data](https://data.cityofnewyork.us/Education/School-Quality-Reports-Data/dnpx-dfnc) (`dnpx-dfnc`), NYC Open Data
**Publisher:** NYC Department of Education
**Coverage:** ~1.49M rows, one row per school / report year / metric, school years 2015–16 through 2024–25
**Key fields used:**
- `pct_accel_try_mth_all` — % of 8th graders taking accelerated math (the **access** metric used throughout this project)
- `pct_accel_p_mth_all` — % of 8th graders taking accelerated math who passed (conditional **success** metric)
- `pct_accel_mth_all` — % of 8th graders earning high school credit in math (pass + college-ready Regents score; a stricter combined metric, not the primary one used here)
- `comparison_group_average` / `metric_score` — DOE's own peer-benchmarking fields, used to surface the "the city grades outcomes, not access" finding

**What "accelerated math" means here:** an 8th grader enrolled in a high-school-level, Regents-track math course (usually Algebra I / Integrated Algebra) instead of standard grade-8 math. Defined and confirmed against NYC DOE's [Middle School Academic Policy Guide](https://infohub.nyced.org/docs/default-source/default-document-library/acpolicy-middleschoolacademicpolicyguide.pdf) (updated August 25, 2025).

## Key findings

All figures are enrollment-weighted averages for report year 2024–25 (school year 2024–25) unless noted, computed directly against the live Socrata API.

- **Citywide access vs. success:** 31.4% of eighth graders take accelerated math; 97.4% of those who take it pass. Access, not ability, is the bottleneck.
- **The borough gap is structural, not a one-year snapshot:** Queens (40.8%) has posted the highest participation rate every year since 2018; the Bronx (19.2%) has posted the lowest every year since 2018.
- **The charter/district gap is wider than the borough gap:** charter schools average 15.5% access vs. 34.9% at district schools — a 2.25x gap, versus 2.1x between Queens and the Bronx. (Caveat: charters aren't zoned and set their own curricula, so this reflects a reported-data pattern, not a verdict on either system.)
- **For 1 in 4 schools, access isn't low — it's zero:** 144 of 633 reporting schools (22.7%) reported 0% accelerated-math participation in 2024–25. Only 32 schools (5.1%) reached 80%+.
- **The pandemic collapse was uneven, and access still hasn't durably recovered:** citywide access fell from 32.8% (2017–18) to 9.6% (2020–21) — a much steeper relative drop in the Bronx and Brooklyn than in Manhattan. It rebounded to a peak of 38.0% (2022–23), then fell again to 31.4% (2024–25), below the pre-pandemic baseline.
- **DOE benchmarks outcomes, never access:** DOE's peer-comparison field (`comparison_group_average`) is populated for 99.3% of math-proficiency-rating records, but for 0% of the 8,552 accelerated-math access records going back to 2015. The city has the tooling to ask "is this school's access rate normal for a school like it?" and has never pointed it at access.
- **School-level variance is real, not just aggregate noise:** e.g., M.S. 113 Ronald Edmonds Learning Center (Brooklyn, District 13) reported 0% access in 2024–25; M.S. 442 Carroll Gardens School for Innovation (Brooklyn, District 15) reported 83.2% — both real, zoned, district middle schools in the same borough.

See the full research thread for sourcing on the historical context (what "advanced math" meant in NYC in the 1990s–2000s), the policy history behind the current access mechanism (screened admissions removal, 2021–22; NYC Solves curriculum rollout, 2024–), and the external research on why access matters (course-sequence gatekeeping, STEM degree completion, and earnings correlations — sourced separately from NYC's own data, see the prototype's "Why This Matters" section for citations).

## Design direction

Storytelling structure adapted from [City Bites](https://city-bites-blue.vercel.app/) (an NYC restaurant-inspection guide): promise → self-service tool → literacy section → aggregate pattern → named human case → open civic question → audience statement → footer. Visual identity is deliberately distinct from City Bites: warm cream/sage/coral/navy palette (no black background), rounded bold display type (Baloo 2) instead of editorial serif, small icon accents.

## Files in this project

- `README.md` — this file
- `open-doors-site-outline.md` — full 13-section site plan, written before the prototype, with section-by-section copy direction and open build questions
- `open-doors-prototype.html` — working single-file HTML/CSS/JS prototype implementing the outline, with live charts (Chart.js) and real, verified data plugged in throughout

## Open items / not yet built

- The neighborhood/borough picker is currently borough-level tiles, not a real map — true neighborhood-level clicking would require joining an address or district-to-neighborhood dataset not present in `dnpx-dfnc`
- The school search demo is wired to only 2 verified real schools; the live directory would need all 633 schools pulled and cached
- No decision yet on whether to file a real FOIL request around the DOE benchmarking-gap finding, or keep it framed as an open question
- Borough/trend figures were computed with enrollment-weighted averages across Middle + K-8 school types; confirm this methodology before treating any number as final
