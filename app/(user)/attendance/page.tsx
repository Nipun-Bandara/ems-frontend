import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { REFRESH_TOKEN_COOKIE } from "@/app/lib/session";
import Attendance from "./attendance";

export default async function AttendancePage() {
  if (!(await cookies()).has(REFRESH_TOKEN_COOKIE)) redirect("/auth?from=/attendance");
  return <Attendance />;
}
