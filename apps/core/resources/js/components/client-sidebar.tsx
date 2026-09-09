import { Link } from '@inertiajs/react';
import {
    ArrowLeftRight,
    BookOpen,
    Calendar,
    FileText,
    LayoutDashboard,
    Megaphone,
    MessageSquare,
    Settings,
    Sliders,
    Terminal,
    Users,
    Workflow,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

const navItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Connect',
        href: '/dashboard/connect',
        icon: ArrowLeftRight,
    },
    {
        title: 'Inbox',
        href: '/dashboard/inbox',
        icon: MessageSquare,
    },
    {
        title: 'Contacts',
        href: '/dashboard/contacts',
        icon: Users,
    },
    {
        title: 'Campaigns',
        href: '/dashboard/campaigns',
        icon: Megaphone,
    },
    {
        title: 'Automations',
        href: '/dashboard/automations',
        icon: Workflow,
    },
    {
        title: 'Templates',
        href: '/dashboard/templates',
        icon: FileText,
    },
    {
        title: 'Bookings',
        href: '/dashboard/bookings',
        icon: Calendar,
    },
    {
        title: 'Knowledge Base',
        href: '/dashboard/knowledge',
        icon: BookOpen,
    },
    {
        title: 'System Prompt Tuning',
        href: '/dashboard/prompt-tuning',
        icon: Sliders,
    },
    {
        title: 'Developer API',
        href: '/dashboard/developer',
        icon: Terminal,
    },
    {
        title: 'Settings',
        href: '/settings/profile',
        icon: Settings,
    },
];

export function ClientSidebar() {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <Sidebar collapsible="icon" variant="inset" className="border-r border-sidebar-border">
            <SidebarHeader className="pt-3 pb-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                            <Link href="/dashboard" prefetch className="flex items-center gap-2.5">
                                <AppLogo className="h-7 w-auto" />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 py-1 overflow-x-hidden">
                <SidebarGroup className="p-0">
                    <SidebarMenu className="gap-0.5">
                        {navItems.map((item) => {
                            const active = isCurrentUrl(item.href);
                            const Icon = item.icon;
                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={active}
                                        tooltip={{ children: item.title }}
                                        className={`h-8.5 rounded-lg px-2.5 text-[12px] font-medium transition-all duration-150 ${
                                            active
                                                ? 'border border-emerald-500/20 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400 shadow-2xs'
                                                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                                        }`}
                                    >
                                        <Link href={item.href} prefetch className="flex items-center gap-2.5">
                                            {Icon && (
                                                <Icon
                                                    className={`h-4 w-4 shrink-0 ${
                                                        active ? 'text-emerald-600 dark:text-emerald-400' : ''
                                                    }`}
                                                />
                                            )}
                                            <span className="truncate">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/80 py-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
