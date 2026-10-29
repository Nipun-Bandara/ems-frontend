import Claims from "../claims";
import { claimPageAllowed } from "../server";
export default async function ClaimReviewPage() {
 if (!(await claimPageAllowed(true))) return <p className="p-6" role="alert">Claim review is restricted to your reporting scope or HR. Self-review is forbidden.</p>;
 return <Claims review />;
}
