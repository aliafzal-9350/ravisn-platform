import { Head, Link } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Forbidden({ message }: { message?: string | null }) {
    return (
        <>
            <Head title="Access restricted" />

            <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <ShieldAlert className="h-6 w-6 text-emerald-600" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">Access restricted</h1>
                <p className="text-sm text-muted-foreground">
                    {message ||
                        'Your role does not include this area. Ask a workspace admin if you need access.'}
                </p>
                <Button asChild>
                    <Link href="/dashboard/inbox">Back to the inbox</Link>
                </Button>
            </div>
        </>
    );
}
