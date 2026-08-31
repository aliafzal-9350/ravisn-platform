import { Head, Link } from '@inertiajs/react';
import {
    Shield,
    Lock,
    FileText,
    ArrowLeft,
    Mail,
    Trash2,
    Server,
    CheckCircle2,
    Building2,
    Database,
    Cpu,
    Cookie,
    Eye,
} from 'lucide-react';

export default function Privacy() {
    return (
        <>
            <Head title="Privacy Policy - RAVISN" />
            <div className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
                {/* Top Navigation Header */}
                <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                                        RAVISN
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                        Legal & Compliance
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to Login</span>
                        </Link>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="border-b border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Meta WhatsApp Cloud API Compliant</span>
                        </div>
                        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                            Privacy Policy
                        </h1>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Effective Date: July 30, 2026 &bull; Last Updated: July 30, 2026
                        </p>
                    </div>
                </section>

                {/* Main Content Area */}
                <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                    <div className="space-y-10 text-slate-700 dark:text-slate-300">
                        {/* Section 1 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    1
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Introduction &amp; Overview
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    Welcome to <strong>RAVISN</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). RAVISN provides an enterprise-grade WhatsApp AI Marketing, Campaign Automation, and Conversational Customer Engagement Platform powered by Meta Platforms, Inc. (&quot;Meta&quot;) and the WhatsApp Cloud API.
                                </p>
                                <p>
                                    This Privacy Policy explains how RAVISN collects, uses, processes, discloses, and safeguards personal data when business users and their customers interact with our platform, website, and services. By accessing or using RAVISN, you agree to the practices described in this policy.
                                </p>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    2
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Information We Collect
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 text-sm leading-relaxed">
                                <p>
                                    To provide WhatsApp messaging automation and account management, we collect the following categories of information:
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">Account Credentials:</span>{' '}
                                            User full name, business email address, password hash, organization name, and billing details.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">WhatsApp Business Account (WABA) Data:</span>{' '}
                                            WhatsApp Business Account ID (WABA ID), Phone Number ID, display phone numbers, OAuth access tokens, app IDs, and Meta Embedded Signup payloads.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <Database className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">Contact Lists &amp; Campaign Data:</span>{' '}
                                            Customer recipient phone numbers, tags, custom contact attributes, and broadcast recipient lists uploaded via CSV or created manually.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">Message Logs &amp; Webhook Payloads:</span>{' '}
                                            Inbound and outbound message metadata, message status receipts (sent, delivered, read, failed), approved template messages, and AI automation chat histories.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <Server className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">Technical &amp; Usage Data:</span>{' '}
                                            IP addresses, browser type, operating system, server access logs, and system error diagnostic reports.
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    3
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    How We Use Your Information
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>We process the collected data strictly for the following operational purposes:</p>
                                <ul className="list-disc space-y-2 pl-5">
                                    <li>Executing broadcast campaigns, template messages, and interactive AI bot responses via the Meta WhatsApp Cloud API.</li>
                                    <li>Managing account registration, authentication, tenant isolation, and administrative billing.</li>
                                    <li>Receiving and processing real-time Meta Webhooks (message statuses, incoming customer chats).</li>
                                    <li>Providing live inbox chat interfaces and customer interaction workflows.</li>
                                    <li>Monitoring network throughput, maintaining system security, and mitigating malicious activity or abuse.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    4
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Data Sharing &amp; Third-Party Processors
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    To fulfill our services, RAVISN connects to external infrastructure providers under strict contractual data protection agreements:
                                </p>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                        <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>Meta Platforms, Inc. (WhatsApp Cloud API Integration)</span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                        We share messaging content, phone numbers, and template parameters with Meta Platforms, Inc. (1 Meta Way, Menlo Park, CA 94025, USA) solely to route WhatsApp messages to end recipients and fetch WABA assets as authorized by your Meta account login.
                                    </p>
                                </div>
                                <div className="rounded-lg bg-emerald-50/70 p-4 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                                    <p className="font-semibold text-xs uppercase tracking-wide">No Sale of Personal Data</p>
                                    <p className="mt-1 text-xs leading-relaxed">
                                        RAVISN does <strong>NOT</strong> sell, rent, trade, or monetize user data, customer contact lists, or message histories to any third-party advertisers, data brokers, or external entities.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    5
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Security &amp; Data Retention
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    We employ industry-standard technical and organizational security standards to protect your data against unauthorized access, loss, or alteration:
                                </p>
                                <ul className="list-disc space-y-1.5 pl-5">
                                    <li><strong>Encryption in Transit:</strong> All data transmitted between your browser, our servers, and Meta Graph API endpoints is encrypted using TLS 1.3 / SSL protocol.</li>
                                    <li><strong>Encryption at Rest:</strong> Sensitive access tokens, system user credentials, and database records are encrypted using AES-256 encryption.</li>
                                    <li><strong>Retention Windows:</strong> Account data and contact lists are retained while your subscription is active. System access logs and message delivery logs are automatically purged or anonymized after 90 days unless longer retention is required by law.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 6 - CRITICAL FOR META */}
                        <section className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/50 to-white p-6 shadow-md sm:p-8 dark:border-emerald-500/30 dark:from-emerald-950/20 dark:to-slate-900">
                            <div className="flex items-center gap-3 border-b border-emerald-200/80 pb-4 dark:border-emerald-800/80">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
                                    6
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    User Rights &amp; Data Deletion Instructions
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 leading-relaxed text-sm">
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    In accordance with Meta Platform Terms, GDPR, and global data privacy standards, you retain complete ownership and control over your personal and WhatsApp Business data.
                                </p>

                                <div className="rounded-xl border border-emerald-300/70 bg-white p-5 shadow-sm dark:border-emerald-800/80 dark:bg-slate-950">
                                    <div className="flex items-center gap-2 text-base font-bold text-emerald-800 dark:text-emerald-400">
                                        <Trash2 className="h-5 w-5 text-emerald-600" />
                                        <span>How to Request Data Deletion:</span>
                                    </div>
                                    <blockquote className="mt-3 rounded-lg border-l-4 border-emerald-600 bg-emerald-50/80 p-4 text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:bg-emerald-950/50 dark:text-slate-200">
                                        &quot;Users may request full deletion of their account, connected WABA credentials, uploaded contact lists, and message history by navigating to Account Settings &gt; Security in their RAVISN dashboard, or by emailing our Data Protection Team at <a href="mailto:support@ravisnapp.com" className="text-emerald-700 underline dark:text-emerald-400 font-bold">support@ravisnapp.com</a> with the subject &apos;Data Deletion Request&apos;.&quot;
                                    </blockquote>
                                </div>

                                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <p>Upon receiving a valid deletion request:</p>
                                    <ul className="list-disc space-y-1 pl-5">
                                        <li>All stored WABA access tokens and Meta Graph API credentials will be permanently revoked and deleted from our servers within 48 hours.</li>
                                        <li>Associated customer contact lists, message logs, and campaign metadata will be permanently deleted from primary databases within 30 days.</li>
                                        <li>Confirmation of deletion will be issued to the user via email upon completion.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Section 7 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    7
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Cookies &amp; Tracking Technologies
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <div className="flex items-start gap-3">
                                    <Cookie className="mt-1 h-5 w-5 text-emerald-600 shrink-0" />
                                    <p>
                                        RAVISN utilizes essential first-party HTTP cookies (`XSRF-TOKEN`, `ravisn_session`, `appearance`) required for user session security, CSRF protection, and UI theme preferences. We do not use non-essential cross-site tracking cookies.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 8 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    8
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Contact Information &amp; Data Protection Officer
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 text-sm leading-relaxed">
                                <p>
                                    If you have questions, concerns, or requests regarding this Privacy Policy or data processing practices, please contact our Legal and Data Protection Office:
                                </p>
                                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-emerald-600" />
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                RAVISN Support &amp; Privacy Team
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Email: support@ravisnapp.com
                                            </div>
                                        </div>
                                    </div>
                                    <a
                                        href="mailto:support@ravisnapp.com?subject=Privacy%20Inquiry"
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                    >
                                        <Mail className="h-3.5 w-3.5" />
                                        <span>Contact Support</span>
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>

                {/* Simple Footer */}
                <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto max-w-4xl px-4">
                        <p>&copy; {new Date().getFullYear()} RAVISN. All rights reserved. Powered by Meta WhatsApp Cloud API.</p>
                        <div className="mt-2 flex justify-center gap-4 text-slate-400">
                            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-200">
                                Privacy Policy
                            </Link>
                            <span>&bull;</span>
                            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-200">
                                Terms of Service
                            </Link>
                            <span>&bull;</span>
                            <Link href="/data-deletion" className="hover:text-slate-600 dark:hover:text-slate-200">
                                Data Deletion
                            </Link>
                            <span>&bull;</span>
                            <Link href="/login" className="hover:text-slate-600 dark:hover:text-slate-200">
                                Login
                            </Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
