import Claims from "./claims";
import { claimPageAllowed } from "./server";
export default async function ClaimsPage() {
 if (!(await claimPageAllowed(false))) return <p className="p-6" role="alert">An active employee profile is required to access claims.</p>;
 return <Claims />;
}
