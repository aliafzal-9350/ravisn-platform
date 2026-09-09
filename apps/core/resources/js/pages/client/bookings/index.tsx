import { Head } from '@inertiajs/react';
import {
    Calendar,
    CalendarCheck,
    CheckCircle2,
    Clock,
    DollarSign,
    ExternalLink,
    Filter,
    Flame,
    Instagram,
    MessageCircle,
    MessageSquare,
    Phone,
    Search,
    Shield,
    Smartphone,
    FileText,
    TrendingUp,
    User,
    X,
    Zap,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

interface Lead {
    id: string;
    name: string;
    phone: string;
    handle?: string | null;
    channel_type: 'whatsapp' | 'instagram' | 'messenger';
    industry: string;
    budget: string;
    meeting_scheduled_at: string;
    lead_score: number;
    lead_classification: 'Qualified' | 'Hot' | 'Warm' | 'Cold';
    last_contacted_at: string;
    thread_id?: string | null;
}

interface BookingsProps {
    leads: Lead[];
    summaryStats: {
        total_leads: number;
        qualified_count: number;
        hot_count: number;
        avg_lead_score: number;
    };
}

export default function BookingsIndex({ leads = [], summaryStats }: BookingsProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filterCategory, setFilterCategory] = React.useState<'all' | 'Qualified' | 'Hot' | 'Warm' | 'Cold'>('all');
    const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [drawerData, setDrawerData] = React.useState<any>(null);
    const [loadingSummary, setLoadingSummary] = React.useState(false);

    const filteredLeads = leads.filter((lead) => {
        const matchesSearch =
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.phone.includes(searchQuery) ||
            lead.industry.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;
        if (filterCategory !== 'all') return lead.lead_classification === filterCategory;
        return true;
    });

    const handleOpenSummary = async (lead: Lead) => {
        setSelectedLead(lead);
        setDrawerOpen(true);
        setLoadingSummary(true);

        try {
            const res = await fetch(`/dashboard/bookings/${lead.id}/summary`);
            if (res.ok) {
                const data = await res.json();
                setDrawerData(data);
            } else {
                toast.error('Failed to load lead summary.');
            }
        } catch {
            toast.error('An error occurred loading lead details.');
        } finally {
            setLoadingSummary(false);
        }
    };

    const getScoreBadge = (classification: string, score: number) => {
        switch (classification) {
            case 'Qualified':
                return (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Qualified ({score})</span>
                    </Badge>
                );
            case 'Hot':
                return (
                    <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 text-[11px]">
                        <Flame className="h-3 w-3" />
                        <span>Hot ({score})</span>
                    </Badge>
                );
            case 'Warm':
                return (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold gap-1 text-[11px]">
                        <TrendingUp className="h-3 w-3" />
                        <span>Warm ({score})</span>
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="border-border text-muted-foreground gap-1 text-[11px]">
                        <span>Cold ({score})</span>
                    </Badge>
                );
        }
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'instagram':
                return <Instagram className="h-3.5 w-3.5 text-pink-500" />;
            case 'messenger':
                return <MessageCircle className="h-3.5 w-3.5 text-blue-500" />;
            default:
                return <Smartphone className="h-3.5 w-3.5 text-emerald-500" />;
        }
    };

    return (
        <>
            <Head title="Bookings & Lead Intelligence" />

            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-1 py-2 text-left">
                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                            <CalendarCheck className="h-4 w-4" />
                            <span>Lead Qualification & Consultations</span>
                        </div>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                            Bookings & Lead Management
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Consultation booking schedules, verified contact details, and discussion summaries.
                        </p>
                    </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-border/80 bg-card shadow-xs">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Total Inbound Leads</span>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                    <User className="size-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-foreground">{summaryStats?.total_leads ?? leads.length}</div>
                            <p className="mt-1 text-[11px] text-muted-foreground">Across all connected Meta channels</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 bg-card shadow-xs">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Qualified Leads</span>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                                    <CheckCircle2 className="size-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                {summaryStats?.qualified_count ?? 0}
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">Score &ge; 80 (High Buying Intent)</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 bg-card shadow-xs">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Hot Leads</span>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                                    <Flame className="size-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                                {summaryStats?.hot_count ?? 0}
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">Score 60 - 79 (Actively Engaged)</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 bg-card shadow-xs">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">Average Lead Score</span>
                                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                                    <TrendingUp className="size-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-foreground">
                                {summaryStats?.avg_lead_score ?? 72} / 100
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">Rule-based scoring algorithm</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by contact name, phone, or industry..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs border-border bg-card"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {(['all', 'Qualified', 'Hot', 'Warm', 'Cold'] as const).map((cat) => (
                            <Button
                                key={cat}
                                variant={filterCategory === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterCategory(cat)}
                                className={
                                    filterCategory === cat
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs'
                                        : 'text-xs border-border'
                                }
                            >
                                {cat === 'all' ? 'All Leads' : cat}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Leads Table */}
                <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                                    <th className="p-3.5">Contact Name & Channel</th>
                                    <th className="p-3.5">Phone / Handle</th>
                                    <th className="p-3.5">Industry / Category</th>
                                    <th className="p-3.5">Budget Allocation</th>
                                    <th className="p-3.5">Scheduled Consultation</th>
                                    <th className="p-3.5">Lead Score & Status</th>
                                    <th className="p-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 text-foreground">
                                {filteredLeads.length > 0 ? (
                                    filteredLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => handleOpenSummary(lead)}
                                        >
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                                                        {getChannelIcon(lead.channel_type)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground">{lead.name}</div>
                                                        <div className="text-[10px] text-muted-foreground capitalize">
                                                            {lead.channel_type}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3.5 font-mono text-muted-foreground">
                                                {lead.phone}
                                            </td>
                                            <td className="p-3.5">
                                                <Badge variant="outline" className="border-border text-[10px]">
                                                    {lead.industry}
                                                </Badge>
                                            </td>
                                            <td className="p-3.5 font-medium text-foreground">
                                                {lead.budget}
                                            </td>
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-1.5 text-foreground font-medium">
                                                    <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                                    <span>{lead.meeting_scheduled_at}</span>
                                                </div>
                                            </td>
                                            <td className="p-3.5">
                                                {getScoreBadge(lead.lead_classification, lead.lead_score)}
                                            </td>
                                            <td className="p-3.5 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 font-semibold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenSummary(lead);
                                                    }}
                                                >
                                                    View Summary
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            No leads match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Conversation Summary Slide-over Drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-border text-left">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-emerald-600 text-white text-xs font-semibold">
                                AI Executive Summary
                            </Badge>
                            {drawerData?.contact?.lead_score && (
                                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 font-bold text-xs">
                                    Score: {drawerData.contact.lead_score}/100
                                </Badge>
                            )}
                        </div>
                        <SheetTitle className="text-xl font-bold mt-2">
                            {selectedLead?.name}
                        </SheetTitle>
                        <SheetDescription className="text-xs">
                            Channel: {selectedLead?.channel_type.toUpperCase()} | Phone: {selectedLead?.phone}
                        </SheetDescription>
                    </SheetHeader>

                    {loadingSummary ? (
                        <div className="py-16 text-center text-xs text-muted-foreground">
                            Loading conversation summary & transcript...
                        </div>
                    ) : drawerData ? (
                        <div className="flex flex-col gap-6 py-4 text-xs text-left">
                            {/* Executive Summary */}
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                                <h4 className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                                    <FileText className="h-4 w-4" />
                                    <span>Executive Conversation Brief</span>
                                </h4>
                                <p className="text-foreground leading-relaxed text-xs">
                                    {drawerData.executive_summary}
                                </p>
                            </div>

                            {/* Key Discussion Points */}
                            <div className="rounded-xl border border-border/80 bg-card p-4">
                                <h4 className="font-bold text-foreground mb-2.5">Key Discussion Points & Budget</h4>
                                <ul className="flex flex-col gap-2 text-muted-foreground">
                                    {drawerData.key_discussion_points?.map((pt: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{pt}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Chronological Transcript */}
                            <div className="rounded-xl border border-border/80 bg-card p-4">
                                <h4 className="font-bold text-foreground mb-3 flex items-center justify-between">
                                    <span>Chronological Transcript</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                        {drawerData.transcript?.length ?? 0} messages
                                    </span>
                                </h4>

                                <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                                    {drawerData.transcript && drawerData.transcript.length > 0 ? (
                                        drawerData.transcript.map((msg: any) => (
                                            <div
                                                key={msg.id}
                                                className={`flex flex-col rounded-lg p-2.5 text-xs ${
                                                    msg.direction === 'outbound'
                                                        ? 'bg-emerald-500/10 border border-emerald-500/20 ml-6 text-foreground'
                                                        : 'bg-muted/60 border border-border/60 mr-6 text-foreground'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                                    <span className="font-semibold">
                                                        {msg.direction === 'outbound'
                                                            ? (msg.is_ai_generated ? 'Automated Response' : 'Human Staff')
                                                            : 'Customer'}
                                                    </span>
                                                    <span>{msg.created_at}</span>
                                                </div>
                                                <p className="leading-normal break-words">{msg.content}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-6 text-center text-muted-foreground text-xs">
                                            Initial conversation initiated. Awaiting customer follow-up.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </SheetContent>
            </Sheet>
        </>
    );
}
