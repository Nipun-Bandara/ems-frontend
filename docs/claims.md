# Expense claims — frontend PR notes

Branch `feat/claim-service` starts at local development `dd5ce52`. Adds `/claims`
(employee drafts, expense lines, configured currency, exact totals, submission,
pending withdrawal, status and review history/rejection reasons) and `/claims/review`
(scoped manager/HR inbox and approve/reject with reason). Approval is labeled
**for reimbursement**. The permitted navigation entry opens claims; the review
link is available only when service permissions allow it.

Uses the installed Next.js 16.2.4 guidance, React Hook Form/Zod, React Query,
existing UI Button and the cookie-based API client/BFF. Server pages check session
and backend permissions. Every API read/action is independently enforced by
claim-service; UI visibility grants no permission. No frontend dependency was added.
Money stays in decimal strings from the backend contract and integer minor units
in the draft preview. Submitted claims are read-only. Save before submitting;
mutation errors retain local edits and expose reload for stale versions.

`app/(user)/claims/contract.d.ts` is generated, not handwritten:

```bash
npx openapi-typescript ../ems-backend/claim-service/api/openapi.json -o 'app/(user)/claims/contract.d.ts'
```

Verification on 2026-10-29: lint passed with six pre-existing warnings and zero
errors; `npx tsc --noEmit` passed; production build passed with network access for
existing Google Fonts. Sandbox-only builds initially failed fetching those fonts.
The production build's browser workflow used the real claim backend and disposable
PostgreSQL/RabbitMQ with a synthetic identity gateway. Verified two-line save and
`0.10 + 0.20 = 0.30`, frozen submission, denied employee reviewer access, manager
inbox/approval, employee-approved result, required rejection reason and its history,
and pending withdrawal becoming WITHDRAWN. Backend integration tests additionally
cover self-review, unauthorized API access, conflicting decisions and deduplication.

Full backend setup, API/events, bootstrap ordering, dependency compatibility,
verification commands and external prerequisites are in the companion backend
`docs/claims.md`. Live identity/SMTP and real employee bootstrap were not exercised;
no deployed service or live account/data was used.
