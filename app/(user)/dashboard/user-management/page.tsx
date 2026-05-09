"use client";

import { useState } from "react";
import { Users, UserCheck } from "lucide-react";

import AllUsersTab from "./_components/AllUsersTab";
import UnassignedUsersTab from "./_components/UnassignedUsersTab";
import { Button } from "@/app/components/ui/Button";
export default function UserManagementPage() {
	const [activeTab, setActiveTab] = useState<"all" | "unassigned">("all");

	return (
		<div className="flex h-full min-h-0 w-full bg-backgroundPrimary">
			<div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-5">
				<div className="shrink-0 border-b border-borderPrimary px-5 py-4 sm:px-6">
					<h1 className="text-2xl font-semibold tracking-tight text-textPrimary">
						User Management
					</h1>
				</div>

				<div className="shrink-0 flex flex-wrap gap-2 px-5 py-4 sm:px-6">
					<button
						type="button"
						onClick={() => setActiveTab("all")}
						className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === "all"
								? "bg-primary text-white shadow-sm"
								: "bg-secondary text-white"
							}`}
					>
						<Users size={16} />
						All Users
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("unassigned")}
						className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === "unassigned"
								? "bg-primary text-white shadow-sm"
								: "bg-secondary text-white"
							}`}
					>
						<UserCheck size={16} />
						Unassigned Users
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-hidden px-5 pb-6 sm:px-6">
					{activeTab === "all" ? <AllUsersTab /> : <UnassignedUsersTab />}
				</div>
			</div>
		</div>
	);
}
