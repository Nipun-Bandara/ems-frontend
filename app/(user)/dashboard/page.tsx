import AttendanceClock from "./attendance-clock";

export default function DashboardPage() {
    return (
        <div className="flex h-full min-h-0 bg-background overflow-auto">
            <div className="w-full p-5 space-y-5">
                <h1 className="text-3xl font-bold text-textPrimary">Welcome to the Dashboard</h1>
                <AttendanceClock />
            </div>
        </div>
    )
}
