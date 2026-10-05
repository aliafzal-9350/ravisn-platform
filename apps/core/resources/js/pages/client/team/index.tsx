import { Head, router, useForm } from '@inertiajs/react';
import { Mail, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import * as React from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

type Role = 'admin' | 'agent';

interface Member {
    id: number;
    name: string;
    email: string;
    role: Role;
    is_you: boolean;
    joined_at: string | null;
}

interface Invitation {
    id: number;
    email: string;
    role: Role;
    invited_by: string | null;
    expires_at: string;
    expired: boolean;
}

interface TeamIndexProps {
    members: Member[];
    invitations: Invitation[];
}

const roleLabel: Record<Role, string> = {
    admin: 'Admin',
    agent: 'Agent',
};

const formatDate = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
          })
        : '—';

function RoleSelect({
    value,
    onChange,
    disabled,
}: {
    value: Role;
    onChange: (role: Role) => void;
    disabled?: boolean;
}) {
    return (
        <Select value={value} onValueChange={(v) => onChange(v as Role)} disabled={disabled}>
            <SelectTrigger className="h-9 w-32">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
            </SelectContent>
        </Select>
    );
}

export default function TeamIndex({ members, invitations }: TeamIndexProps) {
    const form = useForm<{ email: string; role: Role }>({
        email: '',
        role: 'agent',
    });

    const [memberError, setMemberError] = React.useState<string | null>(null);

    const submitInvite = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/dashboard/team/invitations', {
            preserveScroll: true,
            onSuccess: () => form.reset('email'),
        });
    };

    const changeRole = (member: Member, role: Role) => {
        setMemberError(null);
        router.patch(
            `/dashboard/team/members/${member.id}`,
            { role },
            {
                preserveScroll: true,
                onError: (errors) => setMemberError(errors.role ?? null),
            },
        );
    };

    const removeMember = (member: Member) => {
        if (!confirm(`Remove ${member.name} from this workspace? They will lose access immediately.`)) {
            return;
        }
        setMemberError(null);
        router.delete(`/dashboard/team/members/${member.id}`, {
            preserveScroll: true,
            onError: (errors) => setMemberError(errors.member ?? null),
        });
    };

    return (
        <>
            <Head title="Team" />

            <div className="mx-auto flex max-w-5xl flex-col gap-6 text-left">
                <div className="border-b pb-4">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <Users className="h-6 w-6 text-emerald-600" />
                        <span>Team</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Invite colleagues to work the shared inbox. Agents can
                        handle conversations and contacts; admins also manage
                        channels, campaigns, automations and billing-sensitive
                        settings.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserPlus className="h-4 w-4 text-emerald-600" />
                            Invite a teammate
                        </CardTitle>
                        <CardDescription>
                            They receive an email with a link (valid for 7
                            days) to set their name and password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={submitInvite}
                            className="flex flex-col gap-3 sm:flex-row sm:items-start"
                        >
                            <div className="grid flex-1 gap-1.5">
                                <Label htmlFor="invite-email" className="sr-only">
                                    Email address
                                </Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="colleague@company.com"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={form.errors.email} />
                            </div>
                            <div className="grid gap-1.5">
                                <RoleSelect
                                    value={form.data.role}
                                    onChange={(role) => form.setData('role', role)}
                                />
                                <InputError message={form.errors.role} />
                            </div>
                            <Button type="submit" disabled={form.processing} className="gap-1.5">
                                {form.processing ? <Spinner /> : <Mail className="h-4 w-4" />}
                                Send invitation
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Members ({members.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                        {memberError && <InputError message={memberError} className="mb-2" />}
                        {members.map((member) => (
                            <div
                                key={member.id}
                                className="flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                                        {member.name}
                                        {member.is_you && (
                                            <Badge variant="secondary">You</Badge>
                                        )}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {member.email} · Joined {formatDate(member.joined_at)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <RoleSelect
                                        value={member.role}
                                        onChange={(role) => changeRole(member, role)}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={member.is_you}
                                        onClick={() => removeMember(member)}
                                        title={member.is_you ? 'You cannot remove yourself' : 'Remove from workspace'}
                                        aria-label={`Remove ${member.name}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            Pending invitations ({invitations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                        {invitations.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No pending invitations.
                            </p>
                        )}
                        {invitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{invitation.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {roleLabel[invitation.role]}
                                        {invitation.invited_by ? ` · invited by ${invitation.invited_by}` : ''}
                                        {' · '}
                                        {invitation.expired
                                            ? 'Expired'
                                            : `Expires ${formatDate(invitation.expires_at)}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() =>
                                            router.post(
                                                `/dashboard/team/invitations/${invitation.id}/resend`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Resend
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Revoke invitation for ${invitation.email}`}
                                        onClick={() =>
                                            router.delete(
                                                `/dashboard/team/invitations/${invitation.id}`,
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
