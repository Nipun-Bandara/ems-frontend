import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REFRESH_TOKEN_COOKIE } from "@/app/lib/session";
import Review from "./review";

export default async function ReviewPage() {
  if (!(await cookies()).has(REFRESH_TOKEN_COOKIE)) redirect("/auth?from=/timesheets/review");
  // Every read and action is scoped by timesheet-service through the authenticated cookie BFF.
  return <Review />;
}
