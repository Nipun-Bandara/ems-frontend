# Passing CI before merging

PR titles must follow `<type>(<scope>): <subject>`. The check reads the **PR title**,
not the branch name or the commit messages. Editing an open PR title reruns the
title check automatically. A title such as `Enhance profile management` is rejected
because it has no Conventional Commit prefix.

Examples:

- `feat(employee): add CV sections to employee profiles`
- `fix(ci): restore integration test image availability`
- `feat(leave): add leave request approval`

Allowed scopes: `auth`, `users`, `ui`, `org`, `employee`, `leave`, `timesheet`, `claim`, `recruitment`, `engagement`, `document`, `notification`, `dashboard`, `build`, `ci`, `deploy`, `docs`.

Run `npm ci`, `npx eslint .`, `npx tsc --noEmit` and `npm run build`
from the frontend root. These are separate checks: a passing build alone does not
prove typecheck passes. CI currently uses Node 22.

## Handling existing failed runs

A code/workflow fix needs a new commit on an open PR; rerunning an old commit uses
its old files. Fix an invalid title on an open PR, wait for all required checks,
then merge. Already-merged failed PR checks remain historical evidence; validate
the current development tree with the corrective PR instead.

Configure branch protection/rulesets on `development` to require the exact
`PR title` and build-check names currently shown by Actions, require PRs, and
restrict bypass permissions. This repository change does not configure GitHub
branch protection automatically.
