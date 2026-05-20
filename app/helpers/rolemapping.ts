export type RoleDto = {
    name?: string;
} | string;

export const normalizeRoleName = (role: RoleDto): string => {
    if (typeof role === "string") {
        return role;
    }
    return role?.name ?? "";
};

export const mapRolesToString = (roles?: RoleDto[] | null): string => {
    return (roles || [])
        .map(normalizeRoleName)
        .filter(Boolean)
        .join(", ");
};
