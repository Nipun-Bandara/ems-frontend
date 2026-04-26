import { cn } from "@/app/lib/utils";
import {
  LayoutDashboard,
  UserCog,
  GitBranch,
  FolderKanban,
  Clock3,
  CalendarCheck2,
  FileText,
  Users,
} from "lucide-react";

export const Features = () => {
  const features = [
    {
      title: "Personalized Dashboard",
      description:
        "Start each day with greetings, motivational quotes, goals, to-dos, star points, and event highlights.",
      icon: <LayoutDashboard />,
    },
    {
      title: "Employee Management",
      description:
        "View and maintain complete employee profiles including personal info, experience, education, and skills.",
      icon: <UserCog />,
    },
    {
      title: "Organization Visibility",
      description:
        "Understand team structure with an interactive org chart and department-level breakdowns.",
      icon: <GitBranch />,
    },
    {
      title: "Project Management",
      description:
        "Browse projects, track details, and align the right people to the right delivery teams.",
      icon: <FolderKanban />,
    },
    {
      title: "Timesheets & Approvals",
      description:
        "Submit daily or weekly work logs with project-wise breakdowns and streamlined approval flows.",
      icon: <Clock3 />,
    },
    {
      title: "Leave & Claims",
      description:
        "Apply for leave, track balances, and submit expense or medical claims from one place.",
      icon: <CalendarCheck2 />,
    },
    {
      title: "Letters & Referrals",
      description:
        "Request official letters and refer candidates for open positions with full request history.",
      icon: <FileText />,
    },
    {
      title: "Events & Gamification",
      description:
        "Join company events, earn star points, complete goals, and celebrate milestones with badges.",
      icon: <Users />,
    },
  ];

  return (
    <div className="pt-4 px-4 sm:px-6 md:px-12 lg:px-12 w-full max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-textPrimary mb-4">
          Built for Teams at Creative Software
        </h2>
        <p className="text-xl text-textSecondary max-w-2xl mx-auto">
          Everything internal users need to manage work, people, and progress in
          one EMS platform
        </p>
      </div>

      <div className="grid grid-cols-1 min-[450px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 relative z-10">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </div>
    </div>
  );
};

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-borderPrimary",
        (index === 0 || index === 4) && "lg:border-l border-borderPrimary",
        index < 4 && "lg:border-b border-borderPrimary",
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-hoverPrimary pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-hoverPrimary pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-textPrimary">{icon}</div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-slate-300  group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-textPrimary">
          {title}
        </span>
      </div>
      <p className="text-sm text-textSecondary max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
