"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/app/components/ui/Sidebar";
import { getNavItemsForRoles, ICONS_MAP } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { Loader } from "../../components/ui/Loader";
import { useEffect } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/auth");
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
            "flex min-h-screen w-screen overflow-hidden bg-backgroundPrimary md:flex-row"
        )}>
            <Sidebar>
                <SidebarContent user={user} links={links} />
            </Sidebar>
            <div className="flex min-h-screen min-w-0 flex-1">
                <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col gap-2 bg-white p-2 md:p-10 dark:bg-neutral-900">
                    {isLoading ? (
                        <div className="flex min-h-full w-full items-center justify-center">
                            <Loader />
                        </div>
                    ) : (
                        children
                    )}
                </div>
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
    user: any;
    links: Link[];
}

const SidebarContent = ({ user, links }: SidebarContentProps) => {
    const { open } = useSidebar();

    return (
        <SidebarBody className="h-screen justify-between gap-10">
            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                {open ? (
                    <Logo />
                ) : (
                    <div className="px-1">
                        <ThemeToggle className="h-5 w-5 rounded-md" />
                    </div>
                )}
                <div className="mt-8 flex flex-col gap-2">
                    {links.map((link, idx) => (
                        <SidebarLink key={idx} link={link} />
                    ))}
                </div>
            </div>
            <div className="mt-auto pt-6">
                {user && (
                    <SidebarLink
                        link={{
                            label: user.name || "User",
                            href: "/dashboard/profile",
                            icon: (
                                <img
                                    src={user.avatar || "https://assets.aceternity.com/manu.png"}
                                    className="h-7 w-7 shrink-0 rounded-full"
                                    width={50}
                                    height={50}
                                    alt="Avatar"
                                />
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
            <Link className="font-clash-display" href="/">
                <Image
                    src="/logo.svg"
                    alt="Shiftly"
                    width={80}
                    height={80}
                />
            </Link>
            <ThemeToggle  />
        </div>
    );
};
