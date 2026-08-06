---
name: corpus-qa-sweep
description: "Run a QA sweep across an entire corpus instead of one sample: instrument the real output boundary, assert machine-checkable invariants, sweep every item, then triage every flag before believing it. Works on doc sites, generated pages, chart batches, report sets, prose, and formatting. Use when a change to a renderer, template, generator, or shared component affects many outputs, when someone asks to check all the pages or wants no surprises before a release, or when a single-sample pass feels like thin evidence. For judging one rendered artifact against a failure catalog, use render-verify instead."
lastReviewed: 2026-08-06
---

# corpus-qa-sweep: check every page, not one page

## Why this skill exists

One artifact passing is not evidence that the corpus passes. A renderer change
that looks perfect on the page you happened to open will meet content you did
not imagine: a doc that is 90% tables, a heading that ends in the word you used
as a marker, a version number in the middle of a sentence.

The second reason matters more, and is the part people skip. **On a first sweep,
most flags are defects in the harness, not the product.** A sweep that reports
findings without triaging them manufactures work and erodes trust in the next
sweep. The triage step is not optional polish; it is the skill.

## When to invoke

- A change to a renderer, template, generator, stylesheet, or shared component
  affects many outputs at once.
- Someone says "check all the pages", "use more test cases", "make sure there
  are no surprises", or asks for a pre-release regression pass.
- A single-sample verification passed and the evidence feels thin.
- A corpus has grown and nobody knows whether old items still hold.

**Do not use this for a single artifact.** One chart, one figure, one report
goes to [`render-verify`](../render-verify/SKILL.md), which judges a rendered
artifact against a failure catalog using human or model judgment. The two
compose: sweep to find candidates, then judge one.

## Step 1 — instrument the real output boundary

Capture what the system actually emits, at the last point before a human or a
consumer sees it. Never re-run your own logic as the oracle; that only proves
the logic agrees with itself.

| Artifact | Capture at |
| --- | --- |
| Rendered page text | The DOM after render, not the source markdown |
| Spoken or streamed output | The API the product calls, intercepted (`speechSynthesis.speak`, a socket send, a write handler) |
| Chart | Computed style and bounding boxes, not the chart spec |
| Generated document | The emitted file bytes, not the template |
| Formatting and lint | The formatter's own output, not your model of it |

Interception beats reimplementation because it survives refactors and cannot
silently drift from the shipped path.

## Step 2 — write invariants a machine can check

An invariant is a claim that must hold for every item. Prefer claims that fail
loudly over claims that need a human to read them.

| Family | Example |
| --- | --- |
| **Count agreement** | Emitted skip markers equal skippable elements in the page |
| **Bounds** | No emitted chunk exceeds the size budget |
| **Forbidden content** | No raw URL, no contentless fragment, no placeholder-only output |
| **Coverage** | The last block of each document is reached |
| **Non-loss** | No item that should be included is silently dropped |
| **Idempotence** | Running twice produces the same result |

Count agreement is the strongest of these. "Twelve markers for twelve tables"
is checkable; "the output looks reasonable" is not.

## Step 3 — sweep the whole corpus

- Enumerate from the manifest, index, or router, never from a hand-written
  list. A hand-written list drifts and quietly stops covering new items.
- Batch the run to stay under tool and timeout limits.
- **Bound every wait, and report whether the bound was hit.** A truncated run
  looks exactly like a clean run with fewer results. Emit a `guardHit` flag and
  treat it as invalidating, not informational.

## Step 4 — triage every flag before believing it

Treat a flag as a hypothesis about the product, and the harness as the first
suspect. Look at the offending item before filing anything.

| Symptom | Suspect the harness first |
| --- | --- |
| Count mismatch on the largest items only | The run truncated; raise the bound and re-measure |
| Content appears "missing" | The product legitimately transformed it, and you compared raw to transformed |
| One extra match | Your pattern matched real prose that happens to look like a marker |
| A flag that only fires on one item | Read that item; corpora contain legitimate oddities |

Only after the item is in front of you is the finding a defect. Report harness
false positives explicitly. They are evidence about the sweep's own reliability
and they stop the next person re-chasing them.

## Step 5 — compare representation-insensitively

When the product deliberately rewrites content, a raw comparison reports loss
that did not happen. Normalize both sides to the part that must survive.

Letters-only normalization is usually enough: strip everything except `a-z`,
lowercase, then compare a distinctive slice. It tolerates rewrites, whitespace,
and punctuation while still catching genuinely dropped content.

## Step 6 — report clean count and violations separately

State how many items were swept, how many were clean, and what each violation
was. Separate **product defects** from **harness defects** in the report. A
sweep that says "7 violations" when 4 were its own bugs is worse than no sweep.

## Worked example

The sweep that produced this skill, over a documentation shell's read-aloud
feature:

| | Result |
| --- | --- |
| Corpus | 67 documents enumerated from the manifest |
| Captured | 24,583 emitted chunks, by intercepting the speech API |
| Invariants | Count agreement, size bound, forbidden content, coverage, non-loss |
| Product defects found | 2 (meaning-destroying collapse; contentless fragments) |
| Harness false positives | 4 (truncated run, over-broad marker pattern, two raw-vs-transformed comparisons) |

Four of six first-pass findings were the harness. That ratio is the reason
Step 4 exists.

## Anti-patterns

| Anti-pattern | Correction |
| --- | --- |
| Verifying one sample and calling the corpus covered | Sweep the enumerated corpus; the interesting content is in the item you did not open |
| Re-implementing the product's logic as the test oracle | Instrument the real boundary; self-agreement proves nothing |
| Filing every flag as a defect | Triage first. Read the offending item |
| Asserting on internal state instead of emitted output | State can be correct while output is wrong |
| An unbounded or silently bounded wait | Bound it and report whether the bound was hit |
| Comparing raw source to transformed output | Normalize both sides to what must survive |
| Reporting a violation count without separating harness bugs | It inflates the number and discredits the next sweep |

## Related skills

- [`render-verify`](../render-verify/SKILL.md) — judge one rendered artifact
  against a failure catalog. Use it on the items this sweep flags.
- [`docs-shell`](../docs-shell/SKILL.md) — the shell whose manifest enumerates
  the corpus when sweeping a documentation site.
- [`figure-generator`](../figure-generator/SKILL.md) — contract tests pinning
  headline numbers, the same invariant idea applied to one generated figure.

## Would Revise If

Revise this skill by **2026-11-06** (90 days) or sooner if any of the following
fires:

- A sweep run by this method reports violations that are later found to be
  entirely harness defects, meaning Step 4 was performed but did not work.
- A corpus-wide sweep passes and a user still hits a defect of a class the
  invariants in Step 2 were meant to cover.
- The harness-first triage posture causes a real product defect to be dismissed
  as a false positive.
- Enumerating from a manifest proves impossible for a corpus this skill is
  invoked on, and Step 3 needs a discovery fallback.
- Zero sweeps are run by this method in the window, which would mean the skill
  is decorative for its intended audience.
