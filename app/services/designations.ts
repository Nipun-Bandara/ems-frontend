import axios from "@/app/lib/axios";
import {API_PATHS} from "@/app/lib/apipaths";

export type Designation = {
    id: number;
    name: string;
    departmentId: number;
    description: string | null;
    createdAt: string;
};

export type DesignationPayload = {
    name: string;
    departmentId: number;
    description?: string | null;
};

export type PaginatedDesignations = {
    designations: Designation[];
    hasNext: boolean;
    hasPrevious: boolean;
};

export type GetDesignationsParams = {
    departmentId?: number;
    page: number;
    limit: number;
};

export async function getDesignations(params: GetDesignationsParams): Promise<PaginatedDesignations> {
    const response = await axios.get(API_PATHS.DESIGNATIONS.BASE, {params});
    return response.data as PaginatedDesignations;
}

export async function getDesignation(id: number): Promise<Designation> {
    const response = await axios.get(API_PATHS.DESIGNATIONS.BY_ID.replace("{id}", String(id)));
    return response.data as Designation;
}

export async function createDesignation(payload: DesignationPayload): Promise<Designation> {
    const response = await axios.post(API_PATHS.DESIGNATIONS.BASE, payload);
    return response.data as Designation;
}

export async function updateDesignation(id: number, payload: DesignationPayload): Promise<Designation> {
    const response = await axios.put(API_PATHS.DESIGNATIONS.BY_ID.replace("{id}", String(id)), payload);
    return response.data as Designation;
}

export async function deleteDesignation(id: number): Promise<void> {
    await axios.delete(API_PATHS.DESIGNATIONS.BY_ID.replace("{id}", String(id)));
}
