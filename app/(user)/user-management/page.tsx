"use client";

import {useMemo, useState} from "react";
import {Users, UserCheck} from "lucide-react";
import {GridColDef} from "@mui/x-data-grid";

import UserTableTab from "./_components/UserTableTab";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/app/components/ui/Tabs";

type TabKey = "all" | "unassigned";

type ColumnWithVisibility = GridColDef & {
    show?: boolean;
    visibleIn: TabKey[];
};

const userManagementColumns: ColumnWithVisibility[] = [
    {field: "username", headerName: "Username", flex: 1, minWidth: 100, show: true, visibleIn: ["all", "unassigned"]},
    {field: "email", headerName: "Email", flex: 1, minWidth: 150, show: true, visibleIn: ["all", "unassigned"]},
    {field: "departmentName", headerName: "Department", flex: 1, minWidth: 160, show: true, visibleIn: ["all"]},
    {
        field: "isAssigned",
        headerName: "Assigned",
        flex: 0.6,
        minWidth: 120,
        show: true,
        visibleIn: ["all"],
        renderCell: (params) => (
            <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${params.value ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
            >
				{params.value ? "Yes" : "No"}
			</span>
        ),
    },
    {field: "roles", headerName: "Roles", flex: 1, minWidth: 160, show: true, visibleIn: ["all"]},
    {
        field: "isBanned",
        headerName: "Banned",
        flex: 0.6,
        minWidth: 100,
        show: true,
        visibleIn: ["all"],
        renderCell: (params) => (
            <span className={params.value ? "text-red-600" : ""}>
				{params.value ? "Yes" : "No"}
			</span>
        ),
    },
    {
        field: "requestedRole",
        headerName: "Requested Role",
        flex: 1,
        minWidth: 160,
        show: true,
        visibleIn: ["unassigned"]
    },
    {field: "joinedOn", headerName: "Joined On", flex: 1, minWidth: 140, show: true, visibleIn: ["unassigned"]},
];

const getColumnsForTab = (tab: TabKey): GridColDef[] =>
    userManagementColumns
        .filter((column) => column.show !== false && column.visibleIn.includes(tab))
        .map(({show, visibleIn, ...column}) => column);

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("all");

    const allUsersColumns = useMemo(() => getColumnsForTab("all"), []);
    const unassignedUsersColumns = useMemo(() => getColumnsForTab("unassigned"), []);

    return (
        <div className="flex h-full min-h-0 w-full bg-background">
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-5">
                <div className="shrink-0 border-b border-borderPrimary px-5 py-4 sm:px-6">
                    <h1 className="text-2xl font-semibold tracking-tight text-textPrimary">User Management</h1>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden px-5 py-4 sm:px-6">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}
                          className="h-full w-full flex-col gap-4">
                        <TabsList className="w-fit bg-transparent p-0">
                            <TabsTrigger value="all" className="gap-2 rounded-full px-4 py-2 text-sm font-medium">
                                <Users size={16}/>
                                All Users
                            </TabsTrigger>
                            <TabsTrigger value="unassigned"
                                         className="gap-2 rounded-full px-4 py-2 text-sm font-medium">
                                <UserCheck size={16}/>
                                Unassigned Users
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="min-h-0 flex-1">
                            <UserTableTab status="all" columns={allUsersColumns}/>
                        </TabsContent>

                        <TabsContent value="unassigned" className="min-h-0 flex-1">
                            <UserTableTab status="unassigned" columns={unassignedUsersColumns}/>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

