import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Globe,
    Lock,
    Mail,
    Scale,
    Shield,
    UserCheck,
} from 'lucide-react';
import * as React from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsTerms() {
    return (
        <>
            <Head title="Terms of Service" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
                    <div>
                        <Heading
                            title="Terms of Service"
                            description="Platform usage rules, Meta WhatsApp Business Cloud API terms, and service level commitments."
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Effective Date: July 30, 2026 &bull; Meta WhatsApp Cloud API v21.0 Compliant
                        </p>
                    </div>
                    <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center w-fit">
                        Enterprise Terms &bull; Meta SLA
                    </Badge>
                </div>

                {/* Section 1: Meta Policy & Permitted Use */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            <Scale className="h-4 w-4" />
                            <span>Operational Guidelines</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Permitted Use &amp; WhatsApp Business Compliance
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Legal standards required for operating WhatsApp, Instagram, and Messenger automations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs leading-relaxed">
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-2">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Meta Graph API v21.0 Compliance:</span>{' '}
                                    <span className="text-muted-foreground">
                                        All messaging campaigns, interactive template dispatches, and AI agent dialogues must comply strictly with Meta's Commercial Terms, WhatsApp Business Messaging Policy, and opt-in consent regulations.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Autonomous Human Takeover Switch:</span>{' '}
                                    <span className="text-muted-foreground">
                                        When a human agent sends a manual response or marks a customer thread as takeover, the platform immediately deactivates automated AI responses to preserve conversational safety.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Anti-Spam &amp; Tier Rate Limiting:</span>{' '}
                                    <span className="text-muted-foreground">
                                        Users agree not to utilize RAVISN for bulk unsolicited spam, harassment, or distribution of prohibited content. Outbound queues strictly observe Meta Phone Number Tier limits (1K, 10K, 100K, Unlimited).
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Account Security & Ownership */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <Lock className="h-4 w-4" />
                            <span>Account Sovereignty</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Account Responsibilities &amp; Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <p>
                            You are responsible for maintaining the confidentiality of your credentials, system access tokens, and webhook secrets. You agree to notify RAVISN immediately at <a href="mailto:ravisn.uk@gmail.com" className="text-emerald-600 font-semibold underline">ravisn.uk@gmail.com</a> if you detect any unauthorized access.
                        </p>
                        <p>
                            You retain 100% intellectual property ownership of your customer lists, broadcast copy, uploaded documents, and company knowledge materials.
                        </p>
                    </CardContent>
                </Card>

                {/* Section 3: High Availability & SLAs */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            <Shield className="h-4 w-4" />
                            <span>Platform Availability</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Service Reliability &amp; Failover Guarantees
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <p>
                            RAVISN guarantees enterprise-grade message queuing through our high-speed Redis Stream pipeline. Webhook ingress is architected for &lt;150ms responses to guarantee zero message loss during peak traffic bursts.
                        </p>
                    </CardContent>
                </Card>

                {/* Section 4: Contact */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-foreground">Legal &amp; Terms Support</h4>
                                <p className="text-[11px] text-muted-foreground font-mono">ravisn.uk@gmail.com</p>
                            </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                            <a href="mailto:ravisn.uk@gmail.com?subject=Terms%20Inquiry">
                                <Mail className="h-3.5 w-3.5" />
                                <span>Contact Legal Team</span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
