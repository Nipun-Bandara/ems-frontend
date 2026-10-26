"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/app/components/ui/Sidebar";
import { getNavItemsForRoles, ICONS_MAP } from "@/app/lib/navigation";
import { cn } from "@/app/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { Loader } from "../components/ui/Loader";
import { useEffect } from "react";
import { useEmployeeProfile } from "@/app/hooks/useEmployeeProfile";
import { UserRound } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace("/auth");
        }
    }, [user, isLoading, router]);

    if (!isLoading && !user) {
        return null;
    }

    // compute nav items for the user based on roles
    const rawNav = getNavItemsForRoles(user?.roles || []);

    const links = rawNav.map((item) => {
        const IconComp = ICONS_MAP[item.id] ?? ICONS_MAP.dashboard;
        return {
            label: item.label,
            href: item.href,
            icon: <IconComp className="h-5 w-5 shrink-0 text-textPrimary" />,
        };
    });

    return (
        <div className={cn(
            "flex h-screen w-full max-w-full flex-col overflow-hidden md:flex-row"
        )}>
            <Sidebar>
                <SidebarContent user={user} links={links} />
            </Sidebar>
            <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                {isLoading ? (
                    <div className="flex h-full w-full items-center justify-center">
                        <Loader />
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

interface Link {
    label: string;
    href: string;
    icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContentProps {
    user: ReturnType<typeof useAuth>["user"];
    links: Link[];
}

const SidebarContent = ({ user, links }: SidebarContentProps) => {
    const { open } = useSidebar();
    const { data: profile } = useEmployeeProfile(user?.id);

    return (
        <SidebarBody className="h-full justify-between gap-10">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                {open ? (
                    <Logo />
                ) : (
                    <div className="px-1">
                        <ThemeToggle className="h-5 w-5 rounded-md" />
                    </div>
                )}
                <div className="mt-8 flex flex-col gap-2">
                    {links.map((link) => (
                        <SidebarLink key={link.href} link={link} />
                    ))}
                </div>
            </div>
            <div className="mt-auto pt-6">
                {user && (
                    <SidebarLink
                        link={{
                            label: user.username || "User",
                            href: "/profile",
                            icon: (
                                profile?.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.avatarUrl} className="h-7 w-7 shrink-0 rounded-full object-cover" width={28} height={28} alt="Your profile photo" />
                                ) : <UserRound className="h-7 w-7 shrink-0" aria-label="No profile photo" />
                            ),
                        }}
                    />
                )}
            </div>
        </SidebarBody>
    );
};

const Logo = () => {
    return (
        <div className="flex justify-between items-center gap-2">
            <Link className="font-clash-display" href="/dashboard">
                <Image
                    src="/logo.svg"
                    alt="Shiftly"
                    width={80}
                    height={80}
                />
            </Link>
            <ThemeToggle />
        </div>
    );
};
