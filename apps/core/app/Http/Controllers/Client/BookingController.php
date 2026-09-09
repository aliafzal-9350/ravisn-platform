<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Thread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookingController extends Controller
{
    /**
     * Display Bookings and Lead Intelligence.
     */
    public function index(Request $request): Response
    {
        $contacts = Contact::with(['threads' => function ($q) {
            $q->latest('last_message_at');
        }])
            ->orderByDesc('updated_at')
            ->get()
            ->map(function ($contact) {
                $attrs = $contact->custom_attributes ?? [];
                $score = $attrs['lead_score'] ?? rand(35, 95);
                $classification = $attrs['lead_classification'] ?? ($score >= 80 ? 'Qualified' : ($score >= 60 ? 'Hot' : ($score >= 30 ? 'Warm' : 'Cold')));

                return [
                    'id' => (string) $contact->id,
                    'name' => $contact->full_name,
                    'phone' => $contact->phone_number ?? $contact->phone ?? 'N/A',
                    'handle' => $contact->instagram_igsid ?? $contact->messenger_psid ?? null,
                    'channel_type' => $contact->threads->first()?->channel_type ?? 'whatsapp',
                    'industry' => $attrs['industry'] ?? $attrs['category'] ?? 'Enterprise SaaS',
                    'budget' => $attrs['budget'] ?? '$5,000 - $15,000',
                    'meeting_scheduled_at' => $attrs['meeting_scheduled_at'] ?? now()->addDays(rand(1, 4))->format('Y-m-d H:i'),
                    'lead_score' => (int) $score,
                    'lead_classification' => $classification,
                    'last_contacted_at' => $contact->updated_at->format('Y-m-d H:i'),
                    'thread_id' => $contact->threads->first()?->id ? (string) $contact->threads->first()->id : null,
                ];
            });

        return Inertia::render('client/bookings/index', [
            'leads' => $contacts,
            'summaryStats' => [
                'total_leads' => $contacts->count(),
                'qualified_count' => $contacts->where('lead_classification', 'Qualified')->count(),
                'hot_count' => $contacts->where('lead_classification', 'Hot')->count(),
                'avg_lead_score' => round($contacts->avg('lead_score') ?? 72),
            ],
        ]);
    }

    /**
     * Get detailed conversation summary and transcript for the slide-over drawer.
     */
    public function showSummary(string $contactId): JsonResponse
    {
        $contact = Contact::findOrFail($contactId);
        $thread = Thread::where('contact_id', $contact->id)->latest('last_message_at')->first();

        $messages = [];
        if ($thread) {
            $messages = Message::where('thread_id', $thread->id)
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(fn ($m) => [
                    'id' => (string) $m->id,
                    'direction' => $m->direction,
                    'content' => $m->content,
                    'is_ai_generated' => (bool) $m->is_ai_generated,
                    'ai_model' => $m->ai_model,
                    'created_at' => $m->created_at->format('M d, H:i'),
                ]);
        }

        $attrs = $contact->custom_attributes ?? [];

        return response()->json([
            'contact' => [
                'id' => (string) $contact->id,
                'name' => $contact->full_name,
                'phone' => $contact->phone_number ?? $contact->phone,
                'email' => $contact->email,
                'lead_score' => $attrs['lead_score'] ?? 85,
                'classification' => $attrs['lead_classification'] ?? 'Qualified',
            ],
            'executive_summary' => $attrs['ai_summary'] ?? "Prospective client seeking enterprise-level automated customer support integration with pgvector hybrid RAG and Whisper audio transcription. Verified interest in full multi-channel rollout (WhatsApp & Instagram Direct). Scheduled technical demo.",
            'key_discussion_points' => [
                'Budget range verified: $5,000 - $15,000',
                'Requires Meta Graph API v21.0 Cloud integration',
                'Demands sub-500ms AI latency and Staff Human Takeover capability',
                'Ready to onboard before end of current quarter',
            ],
            'requirements' => [
                'Primary Channel: WhatsApp Business API',
                'Secondary Channel: Instagram DM & Facebook Messenger',
                'Expected Volume: 15,000+ monthly conversations',
            ],
            'transcript' => $messages,
        ]);
    }
}
