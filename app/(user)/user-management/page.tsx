"use client";

import {useMemo, useState} from "react";
import {Users, UserCheck} from "lucide-react";
import type {ColumnDef} from "@tanstack/react-table";

import UserTableTab, {type UserRow} from "./_components/UserTableTab";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/app/components/ui/Tabs";

type TabKey = "all" | "unassigned";

type ColumnWithVisibility = ColumnDef<UserRow> & {
    show?: boolean;
    visibleIn: TabKey[];
};

const userManagementColumns: ColumnWithVisibility[] = [
    {accessorKey: "username", header: "Username", minSize: 100, show: true, visibleIn: ["all", "unassigned"]},
    {accessorKey: "email", header: "Email", minSize: 150, show: true, visibleIn: ["all", "unassigned"]},
    {accessorKey: "departmentName", header: "Department", minSize: 160, show: true, visibleIn: ["all"]},
    {
        accessorKey: "isAssigned",
        header: "Assigned",
        minSize: 120,
        show: true,
        visibleIn: ["all"],
        cell: ({getValue}) => {
            const value = getValue<boolean | null | undefined>();
            return (
                <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${value ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                >
				{value ? "Yes" : "No"}
			</span>
            );
        },
    },
    {accessorKey: "roles", header: "Roles", minSize: 160, show: true, visibleIn: ["all"]},
    {
        accessorKey: "isBanned",
        header: "Banned",
        minSize: 100,
        show: true,
        visibleIn: ["all"],
        cell: ({getValue}) => {
            const value = getValue<boolean | null | undefined>();
            return (
                <span className={value ? "text-red-600" : ""}>
				{value ? "Yes" : "No"}
			</span>
            );
        },
    },
    {
        accessorKey: "requestedRole",
        header: "Requested Role",
        minSize: 160,
        show: true,
        visibleIn: ["unassigned"]
    },
    {accessorKey: "joinedOn", header: "Joined On", minSize: 140, show: true, visibleIn: ["unassigned"]},
];

const getColumnsForTab = (tab: TabKey): ColumnDef<UserRow>[] =>
    userManagementColumns
        .filter((column) => column.show !== false && column.visibleIn.includes(tab))
        .map((column) => column);

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
