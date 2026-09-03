import axios from "@/app/lib/axios";
import { API_PATHS } from "@/app/lib/apipaths";

export type DepartmentDto = {
  departmentId?: number;
  id?: number;
  departmentName?: string;
  name?: string;
};

export async function getAllDepartments(): Promise<DepartmentDto[]> {
  const res = await axios.get(API_PATHS.DEPARTMENTS.GETALL);
  return res.data;
}

export default { getAllDepartments };
