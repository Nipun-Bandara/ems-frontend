import axios from "@/app/lib/axios";
import {API_PATHS} from "@/app/lib/apipaths";
import {RoleDto} from "@/app/helpers/rolemapping";

export type UserResponse = {
    userId: number;
    username: string;
    email: string;
    departmentId?: number | null;
    departmentName?: string | null;
    isAssigned?: boolean | null;
    roles?: RoleDto[] | null;
    isBanned?: boolean | null;
};

export type PaginatedUsersResponse = {
    users: UserResponse[];
    hasNext: boolean;
    hasPrevious: boolean;
};

export type GetUsersParams = {
    assigned?: boolean;
    page: number;
    limit: number;
};

export async function getAllUsers(params: GetUsersParams): Promise<PaginatedUsersResponse> {
    const res = await axios.get(API_PATHS.USERS.GETALL, {
        params: {
            assigned: params.assigned,
            page: params.page,
            limit: params.limit,
        },
    });
    return res.data as PaginatedUsersResponse;
}

export async function assignUser(
    userId: number | string,
    payload: { role?: string; departmentId?: number | null }
): Promise<any> {
    const path = API_PATHS.USERS.USER_ASSIGNMENT.replace("{id}", String(userId));
    const res = await axios.put(path, payload);
    return res.data;
}

export default {
    getAllUsers,
    assignUser,
};
