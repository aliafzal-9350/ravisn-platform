import { Link } from '@inertiajs/react';
import {
    FileText,
    LayoutGrid,
    Megaphone,
    Smartphone,
    MessageSquare,
    Users,
    Workflow,
    Terminal,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'WhatsApp Numbers',
        href: '/dashboard/whatsapp-accounts',
        icon: Smartphone,
    },
    {
        title: 'Inbox',
        href: '/dashboard/inbox',
        icon: MessageSquare,
    },
    {
        title: 'Automations',
        href: '/dashboard/automations',
        icon: Workflow,
    },
    {
        title: 'Contacts',
        href: '/dashboard/contacts',
        icon: Users,
    },
    {
        title: 'Templates',
        href: '/dashboard/templates',
        icon: FileText,
    },
    {
        title: 'Campaigns',
        href: '/dashboard/campaigns',
        icon: Megaphone,
    },
    {
        title: 'Developer API',
        href: '/dashboard/developer',
        icon: Terminal,
    },
];

export function ClientSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo className="h-9 w-auto" />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>
        </Sidebar>
    );
}
