import type { Team } from "@/app/services/teams";
import type { DepartmentOption } from "./TeamEditor";

export default function OrgChart({ departments, teams, userLabel, onOpen }: {
  departments: DepartmentOption[]; teams: Team[]; userLabel: (id: number) => string; onOpen: (id: number) => void;
}) {
  return <section aria-label="Organization chart" className="rounded-2xl border border-borderPrimary bg-backgroundSecondary p-5">
    <h2 className="mb-5 text-lg font-semibold">Organization chart</h2>
    <ul className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {departments.map((department) => {
        const children = teams.filter((team) => team.departmentId === department.id);
        return <li key={department.id}>
          <h3 className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 font-semibold text-primary">{department.name}</h3>
          <ul className="ml-4 border-l-2 border-borderPrimary pl-4">
            {children.map((team) => <li key={team.id} className="relative pt-4 before:absolute before:-left-4 before:top-8 before:w-4 before:border-t-2 before:border-borderPrimary">
              <button className="rounded-lg border border-borderPrimary px-3 py-2 text-left font-medium hover:bg-hoverPrimary" onClick={() => onOpen(team.id)}>{team.name}</button>
              <ul className="ml-3 mt-2 space-y-2 border-l border-borderPrimary pl-4 text-sm text-textSecondary">
                {team.members.map((m) => <li key={m.userId}>{userLabel(m.userId)}{m.userId === team.leadUserId ? " · Lead" : ""}</li>)}
                {!team.members.length && <li>No members yet</li>}
              </ul>
            </li>)}
            {!children.length && <li className="pt-3 text-sm text-textSecondary">No teams yet</li>}
          </ul>
        </li>;
      })}
    </ul>
    {!departments.length && <p className="text-textSecondary">No departments to display.</p>}
  </section>;
}
