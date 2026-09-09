import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
    {
        title: 'Platform & Meta APIs',
        href: '/dashboard/settings',
        icon: null,
    },
];

const legalNavItems = [
    {
        title: 'Privacy Policy',
        href: '/dashboard/privacy',
    },
    {
        title: 'Terms of Service',
        href: '/dashboard/terms',
    },
    {
        title: 'Data Deletion',
        href: '/dashboard/data-deletion',
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6">
            <Heading
                title="Settings"
                description="Manage your profile, security, platform infrastructure, and legal compliance"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-56">
                    <nav
                        className="flex flex-col space-y-1 space-x-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start text-xs font-medium', {
                                    'bg-muted font-semibold': isCurrentOrParentUrl(item.href),
                                })}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4 mr-1.5" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}

                        <div className="pt-4 pb-1">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3">
                                Legal &amp; Compliance
                            </span>
                        </div>

                        {legalNavItems.map((item, index) => (
                            <Button
                                key={`legal-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white', {
                                    'bg-muted font-semibold text-emerald-700 dark:text-emerald-400': isCurrentOrParentUrl(item.href),
                                })}
                            >
                                <Link href={item.href}>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}

                        <div className="pt-4 px-2">
                            <a
                                href="https://ravisn.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-between rounded-xl border border-teal-200/80 bg-teal-50/50 p-2.5 text-xs font-semibold text-teal-800 transition-all hover:bg-teal-100/60 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-900/40"
                            >
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400">Company Portal</span>
                                    <span className="font-bold">ravisn.com</span>
                                </div>
                                <span className="transform transition-transform group-hover:translate-x-0.5">↗</span>
                            </a>
                        </div>
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 min-w-0 md:max-w-4xl">
                    <section className="space-y-10">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
