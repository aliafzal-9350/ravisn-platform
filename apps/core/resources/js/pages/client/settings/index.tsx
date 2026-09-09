import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    ExternalLink,
    FileText,
    Globe,
    Lock,
    Scale,
    Settings as SettingsIcon,
    Shield,
    Trash2,
    User,
} from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsIndex() {
    return (
        <>
            <Head title="Platform Settings & Compliance" />

            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-1 py-2 text-left">
                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                            <SettingsIcon className="h-4 w-4" />
                            <span>System Settings &amp; Governance</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                            Platform Settings &amp; Legal Compliance
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Manage your organization profile, security credentials, customer chat encryption, and enterprise compliance terms.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs font-semibold">
                            <Link href="/settings/profile">
                                <User className="h-4 w-4" />
                                <span>Profile &amp; Security</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Compliance, Data Protection & Legal Terms */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <h2 className="text-sm font-bold text-foreground">
                                Compliance, Data Protection &amp; Legal Terms
                            </h2>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px] whitespace-nowrap shrink-0 inline-flex items-center w-fit">
                            GDPR &bull; CCPA &bull; Meta v21.0 Certified
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Card 1: Privacy Policy & Customer Chat Data Encryption */}
                        <Card className="border-border/80 bg-card shadow-xs flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                                        <Lock className="h-4 w-4" />
                                        <span>Data Privacy</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 inline-flex items-center">
                                        AES-256 + TLS 1.3
                                    </Badge>
                                </div>
                                <CardTitle className="mt-2 text-sm font-bold text-foreground">
                                    Customer Chat Data Encryption &amp; Privacy
                                </CardTitle>
                                <CardDescription className="text-[11px] leading-relaxed">
                                    How customer transcripts, media payloads, and AI conversation vectors are stored, encrypted, and isolated.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-3 text-xs flex-1 justify-between">
                                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">At Rest:</strong> AES-256 database encryption across all PostgreSQL messages, contact identities, and credentials.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">In Transit:</strong> Cryptographic TLS 1.3 transport across browser sessions, Meta Graph webhooks, and Redis Stream workers.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Tenant Isolation:</strong> pgvector HNSW embeddings are strictly segregated by tenant ID with zero cross-tenant data leakage.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Zero Model Training:</strong> Your conversations and knowledge docs are never used to train public LLMs or third-party AI models.
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button variant="outline" size="sm" asChild className="w-full justify-between text-xs font-semibold hover:border-emerald-500/50 hover:bg-emerald-500/5">
                                        <Link href="/dashboard/privacy">
                                            <span className="flex items-center gap-1.5">
                                                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                                                <span>Read Full Privacy Policy</span>
                                            </span>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: Terms of Service */}
                        <Card className="border-border/80 bg-card shadow-xs flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                                        <Scale className="h-4 w-4" />
                                        <span>Platform Terms</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0 inline-flex items-center">
                                        Meta v21.0 SLA
                                    </Badge>
                                </div>
                                <CardTitle className="mt-2 text-sm font-bold text-foreground">
                                    Enterprise Terms of Service
                                </CardTitle>
                                <CardDescription className="text-[11px] leading-relaxed">
                                    Legal rules governing autonomous AI agent operation, WhatsApp broadcast compliance, and uptime commitments.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-3 text-xs flex-1 justify-between">
                                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Meta Policy Alignment:</strong> Mandatory compliance with WhatsApp Business Messaging Policies, opt-in guidelines, and template restrictions.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Autonomous Safety Switch:</strong> Human agent takeover rules enforce instantaneous bot deactivation whenever human staff intervenes.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Anti-Spam &amp; Fair Usage:</strong> Rate-limiting queues prevent unsolicited messaging bursts and safeguard your phone tier rating.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">High Availability SLA:</strong> Multi-AI cascading guarantees sub-second failover across Groq, Gemini, and OpenAI.
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button variant="outline" size="sm" asChild className="w-full justify-between text-xs font-semibold hover:border-blue-500/50 hover:bg-blue-500/5">
                                        <Link href="/dashboard/terms">
                                            <span className="flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                                <span>Read Terms of Service</span>
                                            </span>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3: Data Deletion Instructions */}
                        <Card className="border-border/80 bg-card shadow-xs flex flex-col justify-between">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
                                        <Trash2 className="h-4 w-4" />
                                        <span>Data Rights</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400 whitespace-nowrap shrink-0 inline-flex items-center">
                                        GDPR / CCPA / Meta
                                    </Badge>
                                </div>
                                <CardTitle className="mt-2 text-sm font-bold text-foreground">
                                    Data Deletion &amp; User Autonomy
                                </CardTitle>
                                <CardDescription className="text-[11px] leading-relaxed">
                                    Protocols for purging tenant records, customer chats, and Meta App data deletion callback handling.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex flex-col gap-3 text-xs flex-1 justify-between">
                                <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Self-Service Purge:</strong> Tenant admins can permanently delete contacts, conversation threads, and knowledge bases at any time.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Meta Deletion Callback:</strong> Signed requests dispatched by Meta Facebook/WhatsApp login instantly trigger de-authorization and credential revocation.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">Vector Index Scrubbing:</strong> Deleting knowledge articles automatically drops high-dimensional vectors from pgvector tables.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground leading-snug">
                                            <strong className="text-foreground font-semibold">48-Hour Hard Deletion:</strong> Token revocation occurs in &lt;48h; database cascades execute within 30 days.
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button variant="outline" size="sm" asChild className="w-full justify-between text-xs font-semibold hover:border-amber-500/50 hover:bg-amber-500/5">
                                        <Link href="/dashboard/data-deletion">
                                            <span className="flex items-center gap-1.5">
                                                <Trash2 className="h-3.5 w-3.5 text-amber-600" />
                                                <span>Data Deletion Instructions</span>
                                            </span>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Redirect link to main company website (ravisn.com) */}
                    <div className="mt-2 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 backdrop-blur-xs">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                                    <Globe className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-foreground">
                                            RAVISN Technologies &bull; Official Company Website
                                        </h3>
                                        <Badge className="bg-emerald-600 text-white text-[10px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center">
                                            ravisn.com
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Explore company announcements, product roadmaps, enterprise SLAs, case studies, and official partner documentation on our main platform website.
                                    </p>
                                </div>
                            </div>

                            <Button asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs font-semibold gap-2">
                                <a href="https://ravisn.com" target="_blank" rel="noopener noreferrer">
                                    <span>Visit ravisn.com</span>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
