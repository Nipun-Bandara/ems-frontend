"use client";

import ProjectsView from "@/app/components/projects/ProjectsView";
import {useAuth} from "@/app/context/AuthContext";

export default function ProjectManagementPage() {
    const {user, isLoading} = useAuth();
    if (isLoading) return <p className="p-6">Loading…</p>;
    if (!user?.roles.some(role => role === "SYSTEM_ADMIN" || role === "DEPARTMENT_HEAD")) {
        return <p role="alert" className="p-6">You do not have permission to manage projects.</p>;
    }
    return <ProjectsView management/>;
}
