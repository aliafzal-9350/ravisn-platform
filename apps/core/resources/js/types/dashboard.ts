export interface ChannelOverview {
    connected: boolean;
    status: string;
    display_number?: string;
    username?: string;
    page_name?: string;
    quality_rating?: string | null;
    tier_limit?: number;
    daily_sent?: number;
    consumption_pct?: number;
}

export interface DashboardProps {
    overview: {
        whatsapp: ChannelOverview;
        instagram: ChannelOverview;
        messenger: ChannelOverview;
        campaigns_count: number;
    };
    usage: {
        /** False when messages do not record their Meta pricing category. */
        tracked?: boolean;
        marketing: { count: number | null; cost: string | null };
        auth: { count: number | null; cost: string | null };
        utility: { count: number | null; cost: string | null };
        service: { count: number | null; cost: string | null };
        total_sent: number;
        total_cost_usd: string | null;
    };
    telemetry: {
        total_contacts?: number;
        open_threads?: number;
        total_sent: number;
        total_delivered: number;
        /** null until something has been sent. */
        delivery_rate: number | null;
        total_inbound: number;
        avg_latency_ms: number | null;
        total_failed: number;
        resolution_rate: number | null;
        qualified_leads: number;
        demos_booked: number;
    };
    trends: Array<{
        date: string;
        day?: string;
        outbound_count: number;
        inbound_count: number;
        delivered_count: number;
    }>;
    recentCampaigns: Array<{
        id: string | number;
        name: string;
        template_name?: string;
        status: string;
        sent_count: number;
        delivered_count: number;
        target_count?: number;
        launch_id?: string;
        created_at: string;
    }>;
    liveQueue: Array<{
        id: string | number;
        channel: 'whatsapp' | 'instagram' | 'messenger';
        bot_active: boolean;
        assigned_agent?: string;
        intent_tag?: string;
        last_message?: string;
        updated_at: string;
        contact: {
            name: string;
            phone?: string;
            username?: string;
        };
    }>;
}
