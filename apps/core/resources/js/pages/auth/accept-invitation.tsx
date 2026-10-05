import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    token: string;
    invitation: {
        email: string;
        workspace: string;
        role: 'admin' | 'agent';
    } | null;
};

export default function AcceptInvitation({ token, invitation }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    if (!invitation) {
        return (
            <>
                <Head title="Invitation unavailable" />
                <div className="flex flex-col gap-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        This invitation has expired or was already used. Ask a
                        workspace admin to send you a new one.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/login">Go to sign in</Link>
                    </Button>
                </div>
            </>
        );
    }

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(`/invitations/${token}`, {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Join workspace" />

            <form onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={invitation.email} readOnly />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Full name</Label>
                        <Input
                            id="name"
                            autoComplete="name"
                            autoFocus
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="Your name"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <PasswordInput
                            id="password"
                            name="password"
                            autoComplete="new-password"
                            placeholder="Password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm password</Label>
                        <PasswordInput
                            id="password_confirmation"
                            name="password_confirmation"
                            autoComplete="new-password"
                            placeholder="Confirm password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <InputError message={(errors as Record<string, string | undefined>).token} />

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing && <Spinner />}
                        Join {invitation.workspace}
                    </Button>
                </div>
            </form>
        </>
    );
}

AcceptInvitation.layout = {
    title: 'Join your team',
    description: 'Create your account to start working in the shared inbox',
};
