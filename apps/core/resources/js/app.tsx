import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeEcho } from '@/echo';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import ClientLayout from '@/layouts/client-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'RAVISN';

initializeEcho();

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [ClientLayout, SettingsLayout];
            case name.startsWith('Chat/'):
            case name.startsWith('chat/'):
            case name.startsWith('client/inbox/'):
                return (page) => page;
            case name.startsWith('client/'):
            case name.startsWith('errors/'):
            case name.startsWith('Channels/'):
            case name.startsWith('channels/'):
            case name === 'Dashboard':
            case name === 'dashboard':
                return ClientLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#10b981',
    },
});

// This will set light / dark mode on load...
initializeTheme();
