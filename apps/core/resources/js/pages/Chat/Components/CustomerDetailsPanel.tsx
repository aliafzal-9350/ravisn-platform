import { jsonHeaders } from '@/lib/csrf';
import * as React from 'react';
import { toast } from 'sonner';
import { User, X } from 'lucide-react';
import type { ContactDetails } from './ConversationList';

interface CustomerDetailsPanelProps {
    contact: ContactDetails | null;
    userName?: string;
    onContactUpdated: (updatedContact: ContactDetails) => void;
    onClose?: () => void;
}

export function CustomerDetailsPanel({
    contact,
    userName = 'Staff Member',
    onContactUpdated,
    onClose,
}: CustomerDetailsPanelProps) {
    const [name, setName] = React.useState('');
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [companyName, setCompanyName] = React.useState('');
    const [industry, setIndustry] = React.useState('');
    const [leadStage, setLeadStage] = React.useState('Enterprise Lead (High Priority)');
    const [internalNotes, setInternalNotes] = React.useState('');
    const [saving, setSaving] = React.useState(false);

    // Sync form when contact prop changes
    React.useEffect(() => {
        if (contact) {
            setName(contact.name || contact.full_name || '');
            setPhoneNumber(contact.phone_number || contact.phone || '');
            setEmail(contact.email || '');
            setCompanyName(contact.company_name || '');
            setIndustry(contact.industry || '');
            setLeadStage(contact.lead_stage || 'Enterprise Lead (High Priority)');
            setInternalNotes(contact.internal_notes || contact.notes || '');
        }
    }, [contact]);

    const handleDiscard = () => {
        if (contact) {
            setName(contact.name || contact.full_name || '');
            setPhoneNumber(contact.phone_number || contact.phone || '');
            setEmail(contact.email || '');
            setCompanyName(contact.company_name || '');
            setIndustry(contact.industry || '');
            setLeadStage(contact.lead_stage || 'Enterprise Lead (High Priority)');
            setInternalNotes(contact.internal_notes || contact.notes || '');
            toast.info('Form changes reverted');
        }
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!contact || !contact.id) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/v1/contacts/${contact.id}`, {
                method: 'PUT',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    name,
                    phone_number: phoneNumber,
                    phone: phoneNumber,
                    email,
                    company_name: companyName,
                    industry,
                    lead_stage: leadStage,
                    internal_notes: internalNotes,
                    notes: internalNotes,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Contact details and internal notes saved successfully');
                if (data.contact) {
                    onContactUpdated(data.contact);
                }
            } else {
                toast.error('Failed to save contact details');
            }
        } catch {
            toast.error('Error saving contact details');
        } finally {
            setSaving(false);
        }
    };

    if (!contact) {
        return (
            <aside className="w-[320px] xl:w-[340px] min-w-[300px] max-w-[360px] shrink-0 h-full flex flex-col items-center justify-center p-6 bg-[#FFFFFF] dark:bg-[#131B2E] border-l border-[#E2E8F0] dark:border-[#1E293B] text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <User className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-xs font-semibold text-foreground">No Contact Selected</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                    Select a conversation thread to view and manage customer details and notes.
                </p>
            </aside>
        );
    }

    const formatLastUpdated = (updatedAt?: string | null) => {
        if (!updatedAt) return `Last updated recently by ${userName}`;
        const d = new Date(updatedAt);
        if (isNaN(d.getTime())) return `Last updated recently by ${userName}`;
        const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const isToday = d.toDateString() === new Date().toDateString();
        const dateStr = isToday ? 'today' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `Last updated ${dateStr} at ${timeStr} by ${userName}`;
    };

    return (
        <aside className="w-[320px] xl:w-[340px] min-w-[300px] max-w-[360px] shrink-0 h-full flex flex-col bg-[#FFFFFF] dark:bg-[#131B2E] border-l border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden">
            {/* Panel Header */}
            <div className="p-4 flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
                <div className="min-w-0 pr-2">
                    <h3 className="text-sm font-bold text-foreground truncate">
                        Customer Details & Notes
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        Manage contact information and history
                    </p>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        title="Close panel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Scrollable Form Body */}
            <form
                id="crm-details-form"
                onSubmit={handleSave}
                className="flex-1 overflow-y-auto p-4 space-y-3 text-xs"
            >
                {/* Full Name */}
                <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Customer Full Name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17]/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Phone Number
                    </label>
                    <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17]/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="customer@company.com"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17]/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                {/* Company / Organization */}
                <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Company / Organization
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company Name"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17]/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                {/* Industry */}
                <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Industry
                    </label>
                    <input
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g. Technology / Logistics"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17]/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>

                {/* Lead Stage / Priority */}
                <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Lead Stage / Priority
                    </label>
                    <div className="relative">
                        <select
                            value={leadStage}
                            onChange={(e) => setLeadStage(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                        >
                            <option value="Enterprise Lead (High Priority)">
                                Enterprise Lead (High Priority)
                            </option>
                            <option value="Qualified Opportunity">Qualified Opportunity</option>
                            <option value="Discovery Call Booked">Discovery Call Booked</option>
                            <option value="Contract Pending">Contract Pending</option>
                            <option value="Closed Won">Closed Won</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-emerald-700 dark:text-emerald-400">
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Internal Conversation Notes Section */}
                <div className="pt-1 space-y-1">
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Internal Notes
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            Private staff notes (not visible to customer)
                        </span>
                    </div>
                    <textarea
                        rows={4}
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="• Key conversation points & notes..."
                        className="w-full p-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17]/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed transition-all text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground/80 italic">
                        {formatLastUpdated(contact.updated_at)}
                    </p>
                </div>
            </form>

            {/* Bottom Action Footer */}
            <div className="p-3 border-t border-[#E2E8F0] dark:border-[#1E293B] bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-end gap-2 shrink-0">
                <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={saving}
                    className="px-3.5 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                    Discard
                </button>

                <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="bg-[#027A48] hover:bg-[#026838] active:bg-[#015828] text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Details & Notes'}
                </button>
            </div>
        </aside>
    );
}
