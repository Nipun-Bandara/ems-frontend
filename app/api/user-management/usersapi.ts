import axios from "@/app/lib/axios";
import { API_PATHS } from "@/app/lib/apipaths";

export type UserDto = {
  userId: number;
  username: string;
  email: string;
  departmentId?: number | null;
  departmentName?: string | null;
  isAssigned?: boolean;
  roles?: string[];
  isBanned?: boolean;
};

export async function getAllUsers(status?: string): Promise<UserDto[]> {
  const res = await axios.get(API_PATHS.USERS.GETALL, {
    params: status ? { status } : undefined,
  });
  return res.data;
}

export async function assignUser(
  userId: number | string,
  payload: { role?: string; departmentId?: number | null }
): Promise<any> {
  const path = API_PATHS.USERS.USER_ASSIGNMENT.replace("{id}", String(userId));
  const res = await axios.patch(path, payload);
  return res.data;
}

export default {
  getAllUsers,
  assignUser,
};
