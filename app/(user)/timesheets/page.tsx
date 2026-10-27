import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REFRESH_TOKEN_COOKIE } from "@/app/lib/session";
import Timesheets from "./timesheets";

export default async function TimesheetPage() {
  if (!(await cookies()).has(REFRESH_TOKEN_COOKIE)) redirect("/auth?from=/timesheets");
  return <Timesheets />;
}
