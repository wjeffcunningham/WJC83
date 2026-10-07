# Tracker revisions

Pending changes are collected here and shipped together.

## Revision r1 (pending, not yet pushed)

**Content**
- **t02 Applicant cash.** Renamed "Applicant cash contribution: settle the figure and how it is presented". Changed from M to S, no longer a blocker, owner Jeff, due Nov 20 (with the budget tables). Rationale: per the conversation with BCHDP this isn't expected to be a problem, and in the worst case the family provides the cash as a stopgap. The open question is only how it's presented. The rule stays in the details: at least 50% of the request ($7,500 on $15,000), confirmed by Jan 30, 2027.
- **All 50 tasks** get a short description and a source (guideline section and page, CCA portal screen, or team decision), shown under a "Details" fold.

**Mechanics**
- `index.html`: the Details fold, Details/Source fields in the edit box, and the revision mechanism. Each revision is applied to the shared sheet once and is then never reapplied, so edits made on the page survive.
- `Code.gs`: adds `details` and `source` columns to the sheet automatically, and a `Meta` tab that records which revisions have been applied.

**To ship (order matters)**
1. Apps Script: paste in the new `Code.gs`, click Save, then Deploy → Manage deployments → Edit → Version: New version → Deploy. The URL is unchanged.
2. Push `tracker/index.html`, then open the page once. The revision applies itself.
