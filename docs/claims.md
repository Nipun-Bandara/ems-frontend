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

## Receipt attachments — feat/claim-receipts (2026-10-29)

### PR description and compatibility

Draft owners can attach receipts directly from the browser to private
`ems-attachments` storage, finalize verified metadata, preview/download receipts,
and remove draft receipts. **Proposed receipt policy implemented: every new claim
submission requires at least one finalized receipt.** The API returns HTTP 400 with
`Receipt policy: at least one finalized receipt is required before submission`.
The UI disables submission until a finalized receipt is loaded. Existing submitted
claims remain readable and submit retries keep their prior behavior; existing drafts
must add a receipt before submitting. Receipt mutations do not change the claim's
line-edit version; all mutations share the claim row lock with submission.

Both repositories' `feat/claim-receipts` branches started at their current local
`development` heads (backend `3cf92f7`, frontend `48cb350`). Inspected item 24's
EmployeeCvService, item 34's StorageService/StorageAutoConfiguration/BucketBootstrap,
EmployeeAvatarService and useFileUpload, plus claim security/local scope and outbox.
Reuses their exact-length, create-only presigned PUT, HEAD verification, cookie BFF
and query conventions. No Java/BFF binary proxy, shared-database reads, deployments,
new packages or new dependency versions. GenericContainer uses the already installed
Testcontainers stack and the same digest-pinned MinIO test image as employee-service.

Flyway V3 adds claim-owned receipt/intent metadata: generated UUID and object key,
claim and owner, filename, MIME type, byte size, expiry, finalized/deleted flags and
creation time. Claim responses and existing outbox event payloads stay compatible;
receipt metadata has separate authorized endpoints. Claim deletion detaches receipt
rows for compensation. Existing common storage code and other services are unchanged.
The optional receipt-intent extension to useFileUpload preserves avatar/CV request
shapes. Generated frontend types come from `claim-service/api/openapi.json`:

```bash
# From ems-frontend, using installed tooling
npx openapi-typescript ../ems-backend/claim-service/api/openapi.json -o 'app/(user)/claims/contract.d.ts'
```

### Receipt API and security

- POST `/api/claims/{claim}/receipts/upload-intents` accepts `filename`,
  `contentType`, `size`; returns `intentId`, `uploadUrl`, required `headers`,
  `maxSize` and `expiresAt`. Only the active draft owner can request an intent.
  Keys are server-generated under `claims/{owner}/{claim}/{uuid}`. Supported MIME
  types: PDF, JPEG, PNG, WebP; positive size, maximum **10 MiB (10,485,760 bytes)**;
  upload intent and signed PUT expire in five minutes.
- Browser PUTs the raw file directly to storage with the returned Content-Type and
  If-None-Match headers. Content-Length is signed and supplied by the browser.
  Create-only writes prevent replacement of a verified receipt.
- PUT `/api/claims/{claim}/receipts/{intentId}/finalize` accepts no object key.
  It checks draft ownership, claim/intent association, expiry and storage HEAD's
  actual byte length and MIME metadata against the intent before marking finalized.
  Oversized/type-mismatched objects fail even if client validation was bypassed.
  Expired unfinished intents return 410; missing objects return 400; transient
  verification failures return 503. A finalized intent retry returns the same
  receipt, with no duplicate attachment record. MIME metadata validation follows
  existing storage conventions; it does not decode or virus-scan file contents.
- GET `/api/claims/{claim}/receipts` returns finalized metadata only.
  GET `/api/claims/{claim}/receipts/{id}/download` issues a five-minute signed GET.
  Owner access requires active employee scope. Reviewers use the same current local
  reporting-manager/HR eligibility as claim review and cannot read drafts. Another
  employee cannot attach/finalize a foreign intent or obtain its download URL.
  Signed URLs are temporary bearer capabilities; do not log or share them.
- DELETE `/api/claims/{claim}/receipts/{id}` permits draft-owner removal/cancellation
  only. Submitted, approved, rejected and withdrawn claims retain receipts.
  Removing a receipt hides it immediately and retains a cleanup tombstone.

The cleanup worker runs every 60 seconds (override `ems.claims.receipt-cleanup-ms`),
processing up to 100 expired unfinished/cancelled/orphaned intents per run, after a
10-minute grace beyond upload expiry. It locks claim then intent, rechecks state,
uses SKIP LOCKED for competing workers, and retries storage failures without losing
metadata. Finalized receipts attached to any retained claim are excluded regardless
of upload expiry. Deleted-draft orphan objects are eligible. Storage deletion is
idempotent; rollback after storage deletion is safe to retry. Avoid a blanket bucket
lifecycle rule deleting `claims/` keys, which would also remove retained receipts.

UI progress reports the direct PUT; a completed PUT is retained in the hook while
finalization retries reuse its intent. A lost successful PUT response (412 on retry)
proceeds to server verification. After intent expiry, retry creates a new intent.
Reopening/reloading shows only finalized records. Preview/download URLs are fetched
on demand; select preview again to renew an expired link.

### External setup and reproduction

Storage is now enabled by default in claim-service. Use `claim-service/.env.example`
to configure MinIO locally, including endpoint/public endpoint, region, path-style
access and credentials supplied outside Git. For S3 leave endpoints/credentials empty
to use the configured region and workload/default credential chain. Storage bootstrap
uses the existing common private bucket creation and CORS behavior and fails startup
on connectivity/authentication errors. The existing bootstrap also checks avatar and
document buckets; the claim workload needs the corresponding existing bootstrap
permissions as well as receipt PUT/HEAD/GET/DELETE. Provision object storage/CORS before
starting the new service version. `STORAGE_ENABLED=false` permits metadata reads but
upload/download require storage and new submissions still require a receipt.

Allow the frontend origin and PUT/GET/HEAD with Content-Type and If-None-Match in
storage CORS. Public endpoint must be reachable by the browser without rewriting
signed hosts. No live storage, deployment or live-data deletion is performed by these
tests. Real S3 IAM/CORS, production credentials, live RS256 sign-in and real account
scope synchronization remain external prerequisites.

```bash
# From ems-backend; Docker required, all containers disposable
mvn -B -ntp -pl claim-service -am verify
mvn -B -ntp -pl claim-service -am -Dtest=ReceiptIntegrationTest -Dsurefire.failIfNoSpecifiedTests=false verify
# Optional browser backend (PostgreSQL + RabbitMQ + MinIO)
CLAIM_BROWSER_FIXTURE=true mvn -pl claim-service -am -Dtest=ClaimBrowserFixtureTest -Dsurefire.failIfNoSpecifiedTests=false test
node claim-service/browser-fixture/gateway.mjs
# From ems-frontend (production build first)
GATEWAY_INTERNAL_URL=http://127.0.0.1:18087 npm start -- --hostname 127.0.0.1 --port 3008
```

Use employee/manager/other/unrelated/hr at `example.test` and any test password in
this synthetic identity fixture only. Write `claim-service/target/browser-fixture/stop`
to stop its disposable containers. Never connect a deployment to the fixture.

### Receipt verification evidence — 2026-10-29, Asia/Colombo

- Initial restricted backend baseline could not access Docker. With Docker access,
  final `mvn -B -ntp -pl claim-service -am verify` passed: common 15 reported
  (14 executed, one storage opt-in skip), claims 10 reported (nine executed,
  one browser-fixture opt-in skip), **23 executed, no failures/errors**.
- Final focused `mvn -B -ntp -pl claim-service -am -Dtest=ReceiptIntegrationTest
  -Dsurefire.failIfNoSpecifiedTests=false verify` passed: **three tests, no failures,
  errors or skips**, after adding storage SDK error handling, overwrite prevention
  and cleanup outage recovery checks.
- Tests use disposable PostgreSQL 17 and MinIO. Actual presigned PUT -> HEAD ->
  finalize -> submit -> signed GET for PDF/PNG; owner and manager downloads;
  unrelated employee denied; private drafts; foreign claim/intent association
  rejected; arbitrary body objectKey ignored; repeated finalization gives one row;
  create-only overwrite returns 412; oversized (>10 MiB) and wrong MIME objects
  inserted using privileged test-only S3 access fail finalization; expired unfinished
  intent returns 410; cleanup deletes abandoned/deleted-draft objects and preserves
  submitted finalized receipts after expiry. A simulated storage deletion outage
  retains the cleanup row, then a subsequent worker pass succeeds.
- Frontend `npm run lint` passed with six existing warnings, no errors.
  `npx tsc --noEmit` passed. Restricted production build failed fetching existing
  Google Fonts; final `npm run build` with network access passed. No dependencies
  or font settings were changed.
- Browser: production frontend on loopback 3008, existing cookie BFF, synthetic
  identity gateway 18087, actual claim-service and disposable PostgreSQL/RabbitMQ/
  MinIO. Saved a LKR 2.00 line; submission disabled without a receipt. PDF upload
  displayed progress and an injected 503 after successful finalization; Retry
  completed with exactly one PDF attachment. PNG upload also succeeded; submission
  retained both receipts and removed edit/upload/delete controls. Owner's signed
  PNG preview loaded from MinIO. Manager's scoped inbox displayed the submitted
  claim and both receipt controls; its PDF download SHA-256 exactly matched the
  uploaded PDF. Another employee's direct cookie-BFF download request returned
  HTTP 403. Final build's PDF preview control was inspected; inline PDF rendering
  depends on browser support, with the open/download link available separately.
- To reproduce the lost-confirmation browser test, start the fixture gateway with
  `CLAIM_RECEIPT_FAIL_FINALIZE_ONCE=true node claim-service/browser-fixture/gateway.mjs`.
  Only its first successful finalize response is replaced with a test 503; storage
  and database work already completed, so retry exercises idempotent finalization.
- Live RS256 sessions, actual source-account reconciliation, real S3 IAM/CORS and
  external production storage were not exercised. Synthetic identity is explicitly
  a local test fixture. No production deployment or live-data deletion occurred.
