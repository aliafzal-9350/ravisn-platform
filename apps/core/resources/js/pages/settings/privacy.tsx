import { Head } from '@inertiajs/react';
import {
    CheckCircle2,
    Database,
    FileText,
    Globe,
    Lock,
    Mail,
    Server,
    Shield,
    Trash2,
} from 'lucide-react';
import * as React from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPrivacy() {
    return (
        <>
            <Head title="Privacy Policy" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
                    <div>
                        <Heading
                            title="Privacy Policy"
                            description="Customer chat data storage, AES-256 encryption, pgvector isolation, and data governance."
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Effective Date: July 30, 2026 &bull; Meta WhatsApp Cloud API v21.0 Compliant
                        </p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center w-fit">
                        GDPR &bull; CCPA &bull; Meta Compliant
                    </Badge>
                </div>

                {/* Section 1: Data Security & Encryption Architecture */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <Lock className="h-4 w-4" />
                            <span>Security &amp; Encryption Standards</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Customer Chat Data Encryption &amp; Storage Architecture
                        </CardTitle>
                        <CardDescription className="text-xs">
                            How customer messages, contact profiles, and AI conversation vectors are stored and encrypted.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs leading-relaxed">
                        <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 space-y-2">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Encryption at Rest (AES-256):</span>{' '}
                                    <span className="text-muted-foreground">
                                        All customer chat messages, phone numbers, conversation transcripts, and Meta access tokens are encrypted at rest in PostgreSQL 16 using AES-256 encryption.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Encryption in Transit (TLS 1.3):</span>{' '}
                                    <span className="text-muted-foreground">
                                        All network traffic between client browsers, our webhook gateways, Meta Graph API v21.0 endpoints, and internal background workers operates exclusively over TLS 1.3 with HMAC SHA-256 signature verification.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Multi-Tenant Vector Isolation (pgvector):</span>{' '}
                                    <span className="text-muted-foreground">
                                        Embeddings generated for RAG knowledge bases are stored in a 1536-dimensional HNSW index (<code className="font-mono text-[11px]">vector_cosine_ops</code>). Queries are strictly scoped to the authenticated tenant ID, ensuring zero cross-tenant vector contamination.
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">Zero Third-Party Model Training:</span>{' '}
                                    <span className="text-muted-foreground">
                                        Your customer communications and proprietary knowledge documents are processed strictly ephemerally for real-time inference and retrieval. They are never used to train or fine-tune public foundation AI models.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Data Collection & Usage */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            <Database className="h-4 w-4" />
                            <span>Data Collection Scope</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Information Processed by RAVISN
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <p>
                            To deliver WhatsApp automation, campaign scheduling, and real-time live inbox functionality, the platform processes:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong className="text-foreground">Meta WABA Assets:</strong> WhatsApp Business Account ID, Phone Number ID, display names, and Meta Cloud API tokens.</li>
                            <li><strong className="text-foreground">Contact &amp; Campaign Records:</strong> Customer phone numbers, custom CRM attributes, and broadcast recipient lists.</li>
                            <li><strong className="text-foreground">Message Transcripts &amp; Webhooks:</strong> Inbound user chats, outbound agent responses, delivery status receipts (sent, delivered, read), and audio voice notes.</li>
                        </ul>
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-900 dark:text-emerald-200">
                            <span className="font-semibold">No Sale of Personal Data:</span> RAVISN does not sell, rent, or trade user data or customer message histories to any third-party advertisers or data brokers.
                        </div>
                    </CardContent>
                </Card>

                {/* Section 3: Data Deletion & User Rights */}
                <Card className="border-border/80 bg-card shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            <Trash2 className="h-4 w-4" />
                            <span>User Sovereignty</span>
                        </div>
                        <CardTitle className="text-base font-bold text-foreground">
                            Data Deletion &amp; Retention Protocols
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <p>
                            In full compliance with Meta Platform Terms, GDPR, and CCPA, you retain full ownership of your data:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong className="text-foreground">Self-Service Deletion:</strong> You can delete connected phone numbers, contact records, and knowledge base files directly from the dashboard.</li>
                            <li><strong className="text-foreground">Token Revocation:</strong> Revoked credentials and API tokens are erased from active memory in &lt;48 hours.</li>
                            <li><strong className="text-foreground">Full Account Purge:</strong> Contact our team at <a href="mailto:ravisn.uk@gmail.com" className="text-emerald-600 font-semibold underline">ravisn.uk@gmail.com</a> for complete tenant data purge requests.</li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Section 4: Official Contact */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-foreground">Data Protection &amp; Legal Support</h4>
                                <p className="text-[11px] text-muted-foreground font-mono">ravisn.uk@gmail.com</p>
                            </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                            <a href="mailto:ravisn.uk@gmail.com?subject=Privacy%20Inquiry">
                                <Mail className="h-3.5 w-3.5" />
                                <span>Contact Privacy Team</span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
