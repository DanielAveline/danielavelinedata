# SQL Content Style Guide

## Naming & Slugs
- Week slug: `week-XX-<theme>` (e.g., `week-01-retail`).
- Puzzle slug: `week-XX-<theme>-easy|med|hard`.
- Dataset filenames: `retail.sqlite`, `movies.sqlite`, `hr.sqlite`.

## Difficulties
- Exactly three per week: `easy`, `medium`, `hard`.
- Titles should be action-oriented and specific (e.g., "High-Value Repeat Buyers (2024)").

## Goals
- One clear sentence describing the output (columns + constraints). Declare ordering in `expected.order_by`.

## Verification
- Primary: `expected.resultset_hash` of the canonicalized result (sort rows, enforce column order, trim text, round numbers to 4 decimals).
- Optional assertions for special acceptance:
  - Rowcount: `{"type":"rowcount","op":"=","value":5}`
  - Column constraint: `{"type":"column","name":"orders_2024","op":">=","value":3}`

## Lessons
- Each step defines `starter_sql` and a `verify` block (`rowcount` or `resultset_hash`).

## No Hints
- Puzzles carry **no hints**. Lessons may include hints (set to `null` if unused).

## Copy
- Avoid jargon. State year filters and sorting explicitly.
- Keep tables list short and relevant.
