import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Database,
    Globe,
    Mail,
    Shield,
    Trash2,
} from 'lucide-react';
import * as React from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsDataDeletion() {
    return (
        <>
            <Head title="Data Deletion Instructions" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
                    <div>
                        <Heading
                            title="Data Deletion Instructions"
                            description="Procedures for self-service record deletion, Meta App Deletion Callbacks, and complete tenant data erasure."
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Effective Date: July 30, 2026 &bull; Meta Developer Policy &amp; GDPR / CCPA Compliant
                        </p>
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center w-fit">
                        GDPR Article 17 &bull; Right to Erasure
                    </Badge>
                </div>

                {/* Section 1: Self-Service Deletion */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            <Trash2 className="h-4 w-4" />
                            <span>Self-Service Erasure</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Instant In-App Data Management &amp; Purging
                        </CardTitle>
                        <CardDescription className="text-xs">
                            How you can remove connected channels, customer data, and knowledge documents instantly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs leading-relaxed">
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-2">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Disconnect WhatsApp/Instagram Channels:</span>{' '}
                                    <span className="text-muted-foreground">
                                        Navigate to the Channels Connect hub and click &quot;Disconnect&quot;. All stored OAuth access tokens and webhook subscriptions are revoked immediately.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Contact &amp; Thread Deletion:</span>{' '}
                                    <span className="text-muted-foreground">
                                        In the Contacts and Live Inbox views, select individual contacts or conversations to purge them permanently from PostgreSQL tables.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Knowledge Base Vector Purge:</span>{' '}
                                    <span className="text-muted-foreground">
                                        Deleting documents from the Knowledge Base manager automatically deletes associated 1536-dimensional vectors from the pgvector database index.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Meta App Deletion Callback */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            <Database className="h-4 w-4" />
                            <span>Meta Platform Callback</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Meta User Data Deletion Callback Integration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <p>
                            When a user uninstalls the RAVISN application via their Facebook or Meta Business Settings, Meta dispatches a signed HTTP POST request containing a confirmation code.
                        </p>
                        <p>
                            Upon receipt, our webhook gateway automatically de-authorizes the tenant, disables background polling, and provides Meta with a confirmation URL tracking the status of data scrubbing.
                        </p>
                    </CardContent>
                </Card>

                {/* Section 3: Request Full Tenant Eradication */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                            <Clock className="h-4 w-4" />
                            <span>Complete Account Erasure</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Formal Erasure Protocol &amp; SLA
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <p>
                            To request complete, irreversible deletion of your entire tenant organization, database tables, and backup traces:
                        </p>
                        <blockquote className="rounded-lg border-l-4 border-amber-600 bg-amber-500/10 p-3 text-xs font-medium text-foreground">
                            Email <a href="mailto:ravisn.uk@gmail.com" className="text-emerald-600 font-bold underline">ravisn.uk@gmail.com</a> with the subject line &quot;Data Deletion Request&quot; from your registered organization email address.
                        </blockquote>
                        <div className="space-y-1 pl-1">
                            <p>&bull; <strong className="text-foreground">Within 48 hours:</strong> All API credentials, access tokens, and background queues will be terminated.</p>
                            <p>&bull; <strong className="text-foreground">Within 30 days:</strong> All historical messages, contact lists, and vector embeddings will be completely purged from all databases and disaster recovery archives.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 4: Contact */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-foreground">Data Erasure Department</h4>
                                <p className="text-[11px] text-muted-foreground font-mono">ravisn.uk@gmail.com</p>
                            </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                            <a href="mailto:ravisn.uk@gmail.com?subject=Data%20Deletion%20Request">
                                <Mail className="h-3.5 w-3.5" />
                                <span>Submit Deletion Request</span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
