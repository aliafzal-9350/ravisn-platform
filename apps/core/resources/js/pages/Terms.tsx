import { Head, Link } from '@inertiajs/react';
import {
    Shield,
    FileText,
    ArrowLeft,
    Mail,
    CheckCircle2,
    Building2,
    Cpu,
    Lock,
    CreditCard,
    AlertTriangle,
    Scale,
    Ban,
} from 'lucide-react';

export default function Terms() {
    return (
        <>
            <Head title="Terms of Service - RAVISN" />
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
                            Terms of Service
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
                                    Acceptance of Terms
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;Customer&quot;, or &quot;you&quot;) and <strong>RAVISN</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), governing your access to and use of the RAVISN software, dashboard, APIs, and associated services.
                                </p>
                                <p>
                                    By registering an account, connecting your Meta WhatsApp Business Account (WABA), or using any part of the RAVISN platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the RAVISN platform.
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
                                    Description of Service
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    RAVISN is a Software-as-a-Service (SaaS) platform designed for WhatsApp AI Marketing, Campaign Automation, Visual Flow Building, and Conversational Customer Engagement operating via Meta Platforms, Inc. (&quot;Meta&quot;) and the WhatsApp Cloud API.
                                </p>
                                <ul className="list-disc space-y-1.5 pl-5">
                                    <li>Integration with official Meta WhatsApp Business Accounts via OAuth Embedded Signup.</li>
                                    <li>Creation, submission, and management of WhatsApp Message Templates.</li>
                                    <li>Automated drip campaigns, contact management, and broadcast dispatching.</li>
                                    <li>AI-powered customer assistant interactions and multi-agent live chat inbox management.</li>
                                    <li>Developer APIs and real-time Webhooks integration.</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 3 - CRITICAL FOR META COMPLIANCE */}
                        <section className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/50 to-white p-6 shadow-md sm:p-8 dark:border-emerald-500/30 dark:from-emerald-950/20 dark:to-slate-900">
                            <div className="flex items-center gap-3 border-b border-emerald-200/80 pb-4 dark:border-emerald-800/80">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
                                    3
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Compliance with Meta &amp; WhatsApp Messaging Policies
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 leading-relaxed text-sm">
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    Users of RAVISN must strictly adhere to all applicable Meta Platform Terms, WhatsApp Business Terms, and WhatsApp Commerce Policies.
                                </p>

                                <div className="rounded-xl border border-emerald-300/70 bg-white p-5 shadow-sm dark:border-emerald-800/80 dark:bg-slate-950">
                                    <div className="flex items-center gap-2 text-base font-bold text-emerald-800 dark:text-emerald-400">
                                        <Ban className="h-5 w-5 text-rose-600" />
                                        <span>Zero Tolerance Spam Policy:</span>
                                    </div>
                                    <blockquote className="mt-3 rounded-lg border-l-4 border-emerald-600 bg-emerald-50/80 p-4 text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:bg-emerald-950/50 dark:text-slate-200">
                                        RAVISN strictly prohibits sending unsolicited commercial messages (&quot;spam&quot;), deceptive offers, unauthorized marketing broadcasts, or messages containing prohibited content as defined by Meta Commerce Policies. Violation of Meta policies will result in immediate suspension or termination of your RAVISN account without refund.
                                    </blockquote>
                                </div>

                                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <p>By using RAVISN, you explicitly certify that:</p>
                                    <ul className="list-disc space-y-1 pl-5">
                                        <li>You have obtained explicit, verifiable opt-in consent from all recipient phone numbers prior to initiating WhatsApp messages.</li>
                                        <li>You will honor recipient opt-out requests (&quot;STOP&quot; commands) immediately.</li>
                                        <li>You will comply with all regional regulations including GDPR, TCPA, and local telecommunication laws.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    4
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Account Responsibilities &amp; Security
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    You are responsible for maintaining the confidentiality of your account login credentials, API keys, and Meta OAuth sessions. You accept full responsibility for all activities, messages, and API calls initiated under your account credentials.
                                </p>
                                <p>
                                    You agree to notify RAVISN immediately at <a href="mailto:support@ravisnapp.com" className="text-emerald-600 underline font-semibold dark:text-emerald-400">support@ravisnapp.com</a> if you suspect any unauthorized access or security breach involving your account.
                                </p>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    5
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Fees, Subscriptions &amp; Meta API Charges
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <div className="flex items-start gap-3">
                                    <CreditCard className="mt-1 h-5 w-5 text-emerald-600 shrink-0" />
                                    <div className="space-y-2">
                                        <p>
                                            <strong>Platform Subscriptions:</strong> Access to RAVISN software features is billed on a recurring subscription basis according to your selected plan. All fees are non-refundable unless required by law.
                                        </p>
                                        <p>
                                            <strong>Meta Conversation Charges:</strong> WhatsApp Cloud API messaging costs are set directly by Meta Platforms, Inc. based on conversation categories and country destinations. You are solely responsible for all conversation charges accrued on your connected Meta WABA account.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 6 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    6
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Intellectual Property &amp; Service Availability
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    RAVISN retains all rights, title, and interest in and to the platform, source code, logos, trademarks, and proprietary AI workflows.
                                </p>
                                <p>
                                    While we strive to maintain high availability and reliability, RAVISN does not guarantee 100% uninterrupted platform uptime. Delivery of WhatsApp messages is ultimately dependent on third-party networks and Meta Cloud API infrastructure availability.
                                </p>
                            </div>
                        </section>

                        {/* Section 7 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    7
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Limitation of Liability &amp; Account Termination
                                </h2>
                            </div>
                            <div className="mt-4 space-y-3 leading-relaxed text-sm">
                                <p>
                                    To the maximum extent permitted by applicable law, RAVISN shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business reputation arising from your use of the service or Meta policy enforcement actions.
                                </p>
                                <p>
                                    We reserve the right to suspend or terminate accounts immediately upon detection of Terms violations, fraudulent activity, or Meta policy breaches.
                                </p>
                            </div>
                        </section>

                        {/* Section 8 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                    8
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Contact Information
                                </h2>
                            </div>
                            <div className="mt-4 space-y-4 text-sm leading-relaxed">
                                <p>
                                    For inquiries regarding these Terms of Service or official legal notices, please reach out to our legal department:
                                </p>
                                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-emerald-600" />
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                RAVISN Legal Team
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Email: support@ravisnapp.com
                                            </div>
                                        </div>
                                    </div>
                                    <a
                                        href="mailto:support@ravisnapp.com?subject=Terms%20Inquiry"
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                    >
                                        <Mail className="h-3.5 w-3.5" />
                                        <span>Contact Legal Support</span>
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
