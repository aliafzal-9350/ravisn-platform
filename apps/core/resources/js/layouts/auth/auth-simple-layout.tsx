import { Link } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col bg-background">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col items-center gap-4">
                            <Link
                                href={home()}
                                className="flex flex-col items-center gap-2 font-medium"
                            >
                                <AppLogo className="h-14 w-auto" />
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="space-y-2 text-center">
                                <h1 className="text-xl font-medium">{title}</h1>
                                <p className="text-center text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </div>

            <footer className="w-full border-t px-6 py-4 md:px-10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
                    <p>Copyright &copy; {new Date().getFullYear()} RAVISN. All rights reserved.</p>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/privacy"
                            className="transition-colors hover:text-foreground hover:underline"
                        >
                            Privacy Policy
                        </Link>
                        <span className="text-muted-foreground/40">|</span>
                        <Link
                            href="/terms"
                            className="transition-colors hover:text-foreground hover:underline"
                        >
                            Terms & Conditions
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
