import { usePage, router } from '@inertiajs/react';
import {
    Bell,
    Expand,
    Shrink,
    Sun,
    Moon,
    AlertTriangle,
    ShieldAlert,
    Check,
    Info as InfoIcon,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const page = usePage();
    const { auth, notifications = [], unshownToasts = [] } = page.props as any;
    const getInitials = useInitials();
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    React.useEffect(() => {
        if (unshownToasts && unshownToasts.length > 0) {
            unshownToasts.forEach((toastItem: any) => {
                const message = `${toastItem.title}: ${toastItem.message}`;

                if (toastItem.type === 'error') {
                    toast.error(message, { duration: 8000 });
                } else if (toastItem.type === 'warning') {
                    toast.warning(message, { duration: 6000 });
                } else {
                    toast.info(message, { duration: 5000 });
                }
            });
        }
    }, [unshownToasts]);

    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange,
            );
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(err);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const toggleAppearance = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className="flex h-24 shrink-0 items-center justify-between gap-4 px-6 transition-[width,height] ease-linear md:px-10">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm dark:bg-card">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    onClick={toggleFullscreen}
                >
                    {isFullscreen ? (
                        <Shrink className="size-5" />
                    ) : (
                        <Expand className="size-5" />
                    )}
                    <span className="sr-only">Fullscreen</span>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full"
                    onClick={toggleAppearance}
                >
                    {resolvedAppearance === 'dark' ? (
                        <Sun className="size-5" />
                    ) : (
                        <Moon className="size-5" />
                    )}
                    <span className="sr-only">Appearance</span>
                </Button>
                {/* Notifications Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative size-9 cursor-pointer rounded-full"
                        >
                            <Bell className="size-5" />
                            {notifications.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white">
                                    {notifications.length}
                                </span>
                            )}
                            <span className="sr-only">Notifications</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-80 p-2 text-left"
                        align="end"
                    >
                        <div className="mb-2 flex items-center justify-between border-b px-2 pb-2">
                            <span className="text-xs font-bold text-foreground">
                                System Notifications
                            </span>
                            {notifications.length > 0 && (
                                <button
                                    onClick={() =>
                                        router.post(
                                            '/dashboard/notifications/read-all',
                                        )
                                    }
                                    className="text-[10px] font-semibold text-primary hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map((n: any) => (
                                    <div
                                        key={n.id}
                                        className="group relative flex items-start gap-2.5 rounded-lg border border-transparent p-2 transition hover:border-neutral-200/50 hover:bg-neutral-50 dark:hover:border-neutral-800/30 dark:hover:bg-neutral-900"
                                    >
                                        {n.type === 'error' ? (
                                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                                        ) : n.type === 'warning' ? (
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                        ) : (
                                            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                                        )}
                                        <div className="min-w-0 flex-1 pr-6">
                                            <h5 className="truncate text-[11px] font-bold text-foreground">
                                                {n.title}
                                            </h5>
                                            <p className="mt-0.5 text-[10px] leading-normal text-muted-foreground">
                                                {n.message}
                                            </p>
                                            <span className="mt-1 block text-[9px] text-zinc-400">
                                                {n.created_at}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() =>
                                                router.post(
                                                    `/dashboard/notifications/${n.id}/read`,
                                                )
                                            }
                                            className="absolute top-2 right-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                                            title="Mark read"
                                        >
                                            <Check className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    No new notifications
                                </div>
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu Dropdown */}
                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex cursor-pointer items-center justify-center rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Avatar className="size-8 ring-4 ring-slate-100 dark:ring-slate-800">
                                    <AvatarImage
                                        src={auth.user.avatar}
                                        alt={auth.user.name}
                                    />
                                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
