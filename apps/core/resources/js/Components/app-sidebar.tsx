import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, ShieldCheck, FileText, Trash2 } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Website',
        href: 'https://ravisn.com',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://ravisn.com/docs',
        icon: BookOpen,
    },
    {
        title: 'Privacy',
        href: '/privacy',
        icon: ShieldCheck,
    },
    {
        title: 'Terms',
        href: '/terms',
        icon: FileText,
    },
    {
        title: 'Data Deletion',
        href: '/data-deletion',
        icon: Trash2,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo className="h-9 w-auto" />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
            </SidebarFooter>
        </Sidebar>
    );
}
