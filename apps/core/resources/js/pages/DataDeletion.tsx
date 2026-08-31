import { Head, Link } from '@inertiajs/react';
import {
    Shield,
    Trash2,
    ArrowLeft,
    Mail,
    CheckCircle2,
    Database,
    Clock,
    AlertCircle,
    UserCheck,
    Settings,
    FileCheck,
} from 'lucide-react';

export default function DataDeletion() {
    return (
        <>
            <Head title="Data Deletion Policy - RAVISN" />
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
                                        Legal &amp; Compliance
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
                            Data Deletion Policy &amp; Instructions
                        </h1>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Effective Date: July 30, 2026 &bull; Last Updated: July 30, 2026
                        </p>
                    </div>
                </section>

                {/* Main Content Area */}
                <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
                    <div className="space-y-10 text-slate-700 dark:text-slate-300">
                        {/* Section 1: Overview */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    1
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Overview &amp; User Autonomy
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    At <strong>RAVISN</strong>, we respect your right to privacy and data sovereignty. In full compliance with Meta Developer Policies, GDPR, CCPA, and international data protection laws, RAVISN provides all registered users with complete control over their personal information and Meta WhatsApp Business Account (WABA) data.
                                </p>
                                <p>
                                    You have the right to request or execute the total deletion of your account, associated WhatsApp integration tokens, customer contact lists, automation workflows, and stored communication histories at any time.
                                </p>
                            </div>
                        </section>

                        {/* Section 2: Self-Service Deletion */}
                        <section className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/50 to-white p-6 shadow-md sm:p-8 dark:border-emerald-500/30 dark:from-emerald-950/20 dark:to-slate-900">
                            <div className="flex items-center gap-3 border-b border-emerald-200/80 pb-4 dark:border-emerald-800/80">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
                                    2
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Option 1: Self-Service Instant Account &amp; Data Deletion
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 leading-relaxed text-sm">
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    The fastest way to purge your data and disconnect Meta services is directly through your RAVISN Dashboard:
                                </p>

                                <div className="space-y-3 rounded-xl border border-emerald-300/70 bg-white p-5 shadow-sm dark:border-emerald-800/80 dark:bg-slate-950">
                                    <ol className="space-y-3 text-xs sm:text-sm font-medium">
                                        <li className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                                1
                                            </span>
                                            <div>
                                                Log in to your <strong>RAVISN Dashboard</strong> at{' '}
                                                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                                                    https://ravisn.com/login
                                                </span>
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                                2
                                            </span>
                                            <div>
                                                Navigate to <strong>Account Settings</strong> &gt; <strong>Security</strong> tab in the navigation menu.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                                3
                                            </span>
                                            <div>
                                                Scroll to the bottom danger zone and click{' '}
                                                <span className="rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                                    Delete Account &amp; Disconnect WABA
                                                </span>
                                                .
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                                4
                                            </span>
                                            <div>
                                                Confirm your password to authorize immediate revocation of Meta OAuth tokens and database record purging.
                                            </div>
                                        </li>
                                    </ol>
                                </div>
                            </div>
                        </section>

                        {/* Section 3: Email Request Process */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    3
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Option 2: Email Data Deletion Request Process
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 text-sm leading-relaxed">
                                <p>
                                    If you cannot access your RAVISN account dashboard or wish to submit a formal data deletion request through our compliance department, follow these steps:
                                </p>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-start gap-3">
                                        <Mail className="mt-1 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div className="space-y-2 text-xs sm:text-sm">
                                            <p>
                                                Send an email from your registered account email address to:
                                            </p>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                Email Target: <a href="mailto:support@ravisnapp.com" className="text-emerald-600 underline dark:text-emerald-400">support@ravisnapp.com</a>
                                            </p>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                Subject Line: <span className="font-mono text-emerald-700 dark:text-emerald-400">&quot;Data Deletion Request&quot;</span>
                                            </p>
                                            <p className="text-slate-600 dark:text-slate-400">
                                                Please include your organization name and WhatsApp Phone Number ID (if applicable) to expedite identity verification.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 4: Scope of Data Deleted */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    4
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Scope of Data Deleted
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 text-sm leading-relaxed">
                                <p>
                                    When an account deletion request is processed, the following categories of data are permanently destroyed from our active databases and backup stores:
                                </p>
                                <ul className="grid gap-3 sm:grid-cols-2">
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">Account Credentials:</span>{' '}
                                            User profiles, passwords, emails, and organization structures.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">WABA Access Tokens:</span>{' '}
                                            Meta OAuth tokens, Phone Number IDs, and WABA configuration data.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <Database className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">Uploaded Contacts &amp; CSVs:</span>{' '}
                                            All uploaded recipient phone numbers, contact groups, and custom fields.
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                                        <FileCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-white">Campaign &amp; Chat History:</span>{' '}
                                            Broadcast history, message logs, AI chat transcripts, and webhook payloads.
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 5: Processing Timeline */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    5
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Processing Timeline &amp; Compliance
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <div className="flex items-start gap-3 rounded-lg bg-emerald-50/70 p-4 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div className="text-xs sm:text-sm">
                                        <p className="font-semibold">30-Day Completion Guarantee</p>
                                        <p className="mt-1 leading-relaxed">
                                            In compliance with Meta Developer Policies and GDPR standards, all valid data deletion requests submitted via dashboard self-service or email are acknowledged within 48 hours and fully executed across all primary and secondary storage systems within <strong>30 days</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 6: Data Retention Exceptions */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    6
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Data Retention Exceptions
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                        Certain limited records may be retained beyond the 30-day window solely to comply with applicable legal, financial, accounting, or regulatory requirements. This includes anonymized, non-identifiable aggregated operational metrics (e.g., total system throughput statistics) and tax/billing transaction logs as required by law.
                                    </p>
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
