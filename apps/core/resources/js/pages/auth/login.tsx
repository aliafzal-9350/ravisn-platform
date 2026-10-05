import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Log in" />

            <div className="flex flex-col gap-5">
                {/* 1. Google OAuth at the very top */}
                <a
                    href="/auth/google/redirect"
                    className="inline-flex items-center justify-center gap-3 w-full h-11 rounded-xl border border-border/80 bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-xs hover:bg-muted/80 hover:border-emerald-500/40 transition-all"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                    <span>Sign in with Google</span>
                </a>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-[10px] tracking-wider uppercase font-semibold">
                        <span className="bg-card px-3 text-muted-foreground">Or continue with email</span>
                    </div>
                </div>

                {/* Email / Password Form */}
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <div className="grid gap-4 text-left">
                        <div className="grid gap-1.5">
                            <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="email@example.com"
                                className="text-xs"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                                {canResetPassword && (
                                    <TextLink
                                        href="/forgot-password"
                                        className="text-xs text-emerald-600 hover:text-emerald-700"
                                        tabIndex={5}
                                    >
                                        Forgot your password?
                                    </TextLink>
                                )}
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="Password"
                                className="text-xs"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="remember"
                                name="remember"
                                checked={data.remember}
                                onCheckedChange={(checked) => setData('remember', Boolean(checked))}
                                tabIndex={3}
                            />
                            <Label htmlFor="remember" className="text-xs font-normal text-muted-foreground">Remember me</Label>
                        </div>

                        <Button
                            type="submit"
                            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 rounded-xl shadow-xs transition-colors"
                            tabIndex={4}
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            Log in
                        </Button>
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-2">
                        Accounts are by invitation. Ask your workspace administrator for an invite.
                    </p>
                </form>

                {status && (
                    <div className="mb-2 text-center text-xs font-medium text-emerald-600">
                        {status}
                    </div>
                )}
            </div>
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
