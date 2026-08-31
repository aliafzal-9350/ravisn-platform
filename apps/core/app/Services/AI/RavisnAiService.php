<?php

namespace App\Services\AI;

use App\Models\SystemNotification;
use App\Models\WhatsappChat;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RavisnAiService
{
    /**
     * Knowledge Base Constants
     */
    public const AGENCY_NAME = 'RAVISN';

    public const TAGLINE = 'AI Automation That Grows Your Business, On Autopilot.';

    /**
     * Process an incoming message according to the active strategy.
     */
    public function processIncomingMessage(WhatsappChat $chat, string $userMessageText): ?string
    {
        $tenant = $chat->tenant;
        $strategy = $tenant->ai_strategy ?? 'lead_qualifier';

        // MODE 3: PURE MANUAL MODE (AI Disabled) or Chat AI is paused
        if ($strategy === 'pure_manual' || ! $chat->is_ai_active) {
            return null; // AI bypass
        }

        // Check strict guardrails first
        $guardrailResponse = $this->checkGuardrails($userMessageText);
        if ($guardrailResponse) {
            $this->sendAiResponse($chat, $guardrailResponse);

            return $guardrailResponse;
        }

        // Attempt dynamic generation via Google Gemini API if configured
        $geminiResponse = $this->generateGeminiResponse($chat, $userMessageText, $strategy);
        if ($geminiResponse) {
            if (str_contains($geminiResponse, '[TRIGGER: HUMAN_HANDOVER]')) {
                $cleanResponse = trim(str_replace('[TRIGGER: HUMAN_HANDOVER]', '', $geminiResponse));
                $this->sendAiResponse($chat, $cleanResponse);
                $chat->update(['is_ai_active' => false]);

                SystemNotification::create([
                    'tenant_id' => $chat->tenant_id,
                    'title' => '👤 Human Handover Triggered',
                    'message' => "Lead from {$chat->customer_phone} ({$chat->customer_name}) requested a consultation. AI has been paused for human takeover.",
                    'type' => 'info',
                ]);

                return $geminiResponse;
            }

            $this->sendAiResponse($chat, $geminiResponse);

            return $geminiResponse;
        }

        // Fallback to local rule-based engine
        if ($strategy === 'lead_qualifier') {
            return $this->handleLeadQualifierMode($chat, $userMessageText);
        } elseif ($strategy === 'faq_responder') {
            return $this->handleFaqResponderMode($chat, $userMessageText);
        }

        return null;
    }

    /**
     * Generate dynamic AI response via Google Gemini API.
     */
    protected function generateGeminiResponse(WhatsappChat $chat, string $userMessageText, string $strategy): ?string
    {
        $geminiKey = config('services.gemini.key');
        if (empty($geminiKey)) {
            return null;
        }

        $systemInstruction = <<<SYS
You are the official AI Sales & Automation Assistant for RAVISN — "AI Automation That Grows Your Business, On Autopilot."

### 1. PERSONA & BRAND IDENTITY
- Voice & Tone: Warm, highly professional, persuasive, articulate, and empathetic.
- Formatting: Optimized for WhatsApp. Keep answers concise (1 to 3 short sentences maximum). Use clean line breaks and tasteful emojis. Never output large walls of text.

### 2. STRICT GUARDRAILS (NON-NEGOTIABLE FOR ALL MODES)
1. PRICING POLICY (STRICT ZERO-DOLLAR RULE):
   - NEVER state any specific price, dollar amount, or numerical cost under ANY circumstance.
   - If asked about pricing or costs, respond:
     "Every business is unique, so our pricing depends on your specific workflows and project scope. Our team provides a custom quote right after a quick free consultation! Would you like to schedule that?"
2. DEMO POLICY:
   - If asked for a live demo, respond:
     "You're already talking to one! 😊 This WhatsApp assistant is built directly by RAVISN. For a live demo tailored to your specific business operations, our team can arrange one right after a quick consultation."
3. DATA SAFETY & INTEGRITY:
   - Reassure clients that their data stays completely safe within their own systems (Google Sheets, WhatsApp Business, CRMs). RAVISN builds automations around their infrastructure.
4. STAFF REPLACEMENT POLICY:
   - AI agents do NOT replace employees — they handle repetitive 24/7 inquiries so human staff can focus on closing high-value deals.
5. OFF-TOPIC BOUNDARY:
   - Politely redirect non-business queries back to RAVISN's AI automation solutions.

### 3. CURRENT ACTIVE STRATEGY MODE: {$strategy}
SYS;

        if ($strategy === 'lead_qualifier') {
            $systemInstruction .= <<<'MODE1'

#### MODE 1: RAVISN AI LEAD QUALIFIER (2-TURN HANDOVER)
Goal: Qualify lead in 2 turns -> Capture details -> Propose consultation -> Hand over to human staff.
- Turn 1: Discover Needs. Ask what business process they want to automate.
- Turn 2: Qualify & Ask Name and Business Name ("May I know your name and the name of your business?").
- Turn 3: Offer free consultation.
- IF USER AGREES to consultation ("Sure", "Yes", "Okay", "Sounds good", "Contact me", "Please"):
  Respond with confirmation: "Awesome! Our team has been notified and will reach out to you shortly. Have a fantastic day!"
  Append the exact system tag at the very end of your response: [TRIGGER: HUMAN_HANDOVER]
MODE1;
        } else {
            $systemInstruction .= <<<'MODE2'

#### MODE 2: FAQ AUTO-RESPONDER ONLY
Goal: Answer questions strictly from Knowledge Base & FAQs -> Zero sales push -> Zero lead capture.
- Answer incoming questions clearly, accurately, and politely using ONLY the Knowledge Base below.
- Keep answers strictly within 1 to 3 sentences. Enforce Zero-Pricing & Demo rules.
- Do NOT push to capture names or schedule consultations. End responses with:
  "Let us know if you have any other questions! 😊"
MODE2;
        }

        $systemInstruction .= <<<'KB'

### 4. COMPLETE EMBEDDED KNOWLEDGE BASE & FAQS
#### About RAVISN:
- Tagline: "AI Automation That Grows Your Business, On Autopilot."
- Track Record: 300+ completed projects | 500+ customer reviews | 98% happy clients | 24/7 ongoing support.
- Website: ravisn.com | Email: Ravisn.uk@gmail.com | WhatsApp: +1 (564) 222-6889 | IG: @ravisnofficial
- Locations: 41, McLeod Road, Lahore (PK) | 312 W 2ND ST 1992, Casper, WY 82601 (USA).

#### Core Services:
1. AI Chatbot Development (24/7 web/WhatsApp chatbots to answer queries & qualify leads)
2. AI Voice Agents (Automate inbound/outbound calls, bookings, follow-ups)
3. WhatsApp AI Automation (Customer conversations, lead nurturing, scheduling)
4. Lead Qualification Automation (Auto-qualify, score, and route leads)
5. CRM Automation (Connect CRMs with AI workflows for seamless tracking)
6. Appointment Booking Automation (AI schedules meetings, confirmations, reminders)
7. Email Marketing Automation (Automated sequences that nurture leads)
8. Workflow Automation (Eliminate repetitive tasks across apps/teams)
9. AI Knowledge Base (Custom AI trained on your business documents)
10. Customer Support Automation (24/7 AI chat and voice support)
11. Custom AI Solutions (Tailored AI systems for unique processes)

#### Packages & Support:
- Basic Package: AI Chatbot, Lead Capture, WhatsApp Integration, Appointment Booking, Basic CRM, Free Consultation, 30 Days Support, Basic Training.
- All-in-One Solution (Recommended): Everything in Basic + AI Voice Agent, CRM Automation, Email/SMS Automation, Lead Qualification AI, Strategy Session, 60 Days Support, AI Workflow Optimization.
- Premium Package: Everything in All-in-One + Custom AI Agent Development, Multi-Channel Automation, Priority Support, Dedicated Account Manager, 90 Days Support, Free Future Optimization.

#### Process & Timeline:
- Process: Step 1: Discovery & Analysis -> Step 2: Strategy & Planning -> Step 3: Development & Integration -> Step 4: Deployment & Optimization.
- Timeline: Delivered in 1 to 4 weeks depending on scope.
- Industries: Industry-agnostic (Real Estate, HVAC/Home Services, Restaurants, Clinics/Aesthetics, Healthcare, Legal, E-commerce, etc.).

#### Quick FAQs:
- Requirements to start: Book a free consultation on WhatsApp, share your requirements, and RAVISN handles analysis, implementation, and support.
- How strategy is decided: We analyze business goals, workflows, and customer journeys to target high-ROI automations.
- Difference from other agencies: Custom-built AI systems (not generic templates) with real ongoing support and optimization.
- Payment structure: Payment details and milestones are shared alongside your custom quote after the free consultation.
KB;

        $recentMessages = $chat->messages()
            ->latest('id')
            ->take(6)
            ->get()
            ->reverse();

        $contents = [];
        foreach ($recentMessages as $msg) {
            $role = $msg->direction === 'inbound' ? 'user' : 'model';
            $contents[] = [
                'role' => $role,
                'parts' => [['text' => $msg->body]],
            ];
        }

        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $userMessageText]],
        ];

        try {
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='.$geminiKey;

            $response = Http::timeout(10)
                ->post($url, [
                    'system_instruction' => [
                        'parts' => [['text' => $systemInstruction]],
                    ],
                    'contents' => $contents,
                    'generationConfig' => [
                        'temperature' => 0.4,
                        'maxOutputTokens' => 300,
                    ],
                ]);

            if ($response->successful()) {
                $candidateText = $response->json('candidates.0.content.parts.0.text');
                if (! empty($candidateText)) {
                    return trim($candidateText);
                }
            }
        } catch (\Exception $e) {
            Log::error('Gemini API execution failed: '.$e->getMessage(), ['chat_id' => $chat->id]);
        }

        return null;
    }

    /**
     * Strict Guardrails evaluation (Pricing, Demo, Safety, Staffing, Off-Topic).
     */
    protected function checkGuardrails(string $message): ?string
    {
        $lower = mb_strtolower($message);

        // 1. PRICING POLICY (STRICT ZERO-DOLLAR RULE)
        if (preg_match('/\b(price|pricing|cost|how much|fee|rates|charge|charges|dollar|\$|usd|pkr|euro|€|£)\b/i', $lower)) {
            return 'Every business is unique, so our pricing depends on your specific workflows and project scope. Our team provides a custom quote right after a quick free consultation! Would you like to schedule that?';
        }

        // 2. DEMO POLICY
        if (preg_match('/\b(demo|live demo|show me a demo|see a demo|test demo|sample)\b/i', $lower)) {
            return "You're already talking to one! 😊 This WhatsApp assistant is built directly by RAVISN. For a live demo tailored to your specific business operations, our team can arrange one right after a quick consultation.";
        }

        // 3. DATA SAFETY & INTEGRITY
        if (preg_match('/\b(data safe|privacy|secure|security|data safety|gdpr|leak|my data)\b/i', $lower)) {
            return 'Rest assured, your data stays completely safe within your own existing systems (Google Sheets, WhatsApp Business, CRMs). RAVISN builds automations directly around your secure infrastructure.';
        }

        // 4. STAFF REPLACEMENT POLICY
        if (preg_match('/\b(replace staff|replace employees|fire staff|lay off|jobs|replace workers)\b/i', $lower)) {
            return 'RAVISN AI agents do not replace your employees — they handle repetitive 24/7 inquiries so your human staff can focus on closing high-value deals and growing your business.';
        }

        return null;
    }

    /**
     * MODE 1: RAVISN AI LEAD QUALIFIER (2-TURN HANDOVER)
     */
    protected function handleLeadQualifierMode(WhatsappChat $chat, string $userMessageText): string
    {
        $inboundCount = $chat->messages()->where('direction', 'inbound')->count();
        $lower = mb_strtolower(trim($userMessageText));

        // Check if customer agrees to consultation (Turn 3+ / Affirmation check)
        $isAffirmation = preg_match('/\b(yes|yeah|yep|sure|okay|ok|sounds good|contact me|reach out|book|schedule|please|fine|of course)\b/i', $lower);

        // Check if they previously answered name/business or agreed
        $lastOutbound = $chat->messages()
            ->where('direction', 'outbound')
            ->latest('id')
            ->first();

        $lastOutboundBody = $lastOutbound ? mb_strtolower($lastOutbound->body) : '';

        // If the AI previously offered a consultation or asked if they want our team to reach out
        if ($isAffirmation && (str_contains($lastOutboundBody, 'consultation') || str_contains($lastOutboundBody, 'reach out') || $inboundCount >= 3)) {
            $responseText = 'Awesome! Our team has been notified and will reach out to you shortly. Have a fantastic day!';

            // Trigger Handover
            $fullMessageWithTag = $responseText.' [TRIGGER: HUMAN_HANDOVER]';

            // Send customer response (without system tag)
            $this->sendAiResponse($chat, $responseText);

            // Auto-pause AI for human takeover
            $chat->update(['is_ai_active' => false]);

            // Notify team
            SystemNotification::create([
                'tenant_id' => $chat->tenant_id,
                'title' => '👤 Human Handover Triggered',
                'message' => "Lead from {$chat->customer_phone} ({$chat->customer_name}) requested a consultation. AI has been paused for human takeover.",
                'type' => 'info',
            ]);

            return $fullMessageWithTag;
        }

        // TURN 1: Discover Needs
        if ($inboundCount <= 1) {
            $response = 'Welcome to RAVISN! 🚀 We build custom AI automations to grow your business on autopilot. What business process would you like to automate (e.g. appointment booking, clinic leads, CRM workflows, or support)?';
            $this->sendAiResponse($chat, $response);

            return $response;
        }

        // TURN 2: Qualify & Ask Details
        if ($inboundCount === 2) {
            $response = "That's a perfect fit for RAVISN! We can automate your workflow so no leads are ever missed 24/7. May I know your name and the name of your business?";
            $this->sendAiResponse($chat, $response);

            return $response;
        }

        // TURN 3: Propose Consultation
        $customerName = $chat->customer_name && $chat->customer_name !== $chat->customer_phone ? $chat->customer_name : 'there';
        $response = "Great to meet you, {$customerName}! Our experts at RAVISN can design a custom AI workflow tailored specifically for your business. Would you like our team to reach out for a free consultation?";
        $this->sendAiResponse($chat, $response);

        return $response;
    }

    /**
     * MODE 2: FAQ AUTO-RESPONDER ONLY
     */
    protected function handleFaqResponderMode(WhatsappChat $chat, string $userMessageText): string
    {
        $lower = mb_strtolower($userMessageText);

        $faqAnswer = $this->lookupKnowledgeBase($lower);

        $responseText = $faqAnswer."\n\nLet us know if you have any other questions! 😊";

        $this->sendAiResponse($chat, $responseText);

        return $responseText;
    }

    /**
     * Knowledge Base & FAQ Search Logic
     */
    protected function lookupKnowledgeBase(string $query): string
    {
        if (preg_match('/\b(service|services|what do you do|offer|products)\b/i', $query)) {
            return 'RAVISN specializes in 11 core AI solutions including AI Chatbots, AI Voice Agents, WhatsApp Automation, Lead Qualification, CRM Workflows, and 24/7 Support Systems.';
        }

        if (preg_match('/\b(about|ravisn|company|who are you|track record|reviews)\b/i', $query)) {
            return 'RAVISN is a premier AI automation agency with 300+ completed projects, 500+ reviews, and a 98% client satisfaction rate offering 24/7 ongoing support.';
        }

        if (preg_match('/\b(package|packages|plans|basic|all-in-one|premium)\b/i', $query)) {
            return 'We offer custom Basic, All-in-One, and Premium packages featuring WhatsApp AI Chatbots, AI Voice Agents, CRM integration, and dedicated ongoing support.';
        }

        if (preg_match('/\b(contact|email|phone|website|location|office|address)\b/i', $query)) {
            return 'You can reach RAVISN at ravisn.com, email Ravisn.uk@gmail.com, or WhatsApp +1 (564) 222-6889. We have offices in Casper, WY (USA) and Lahore (PK).';
        }

        if (preg_match('/\b(timeline|time|how long|delivery|duration)\b/i', $query)) {
            return 'Most RAVISN custom AI automation workflows are delivered and optimized within 1 to 4 weeks depending on scope.';
        }

        if (preg_match('/\b(industry|industries|real estate|clinic|ecommerce|hvac)\b/i', $query)) {
            return 'RAVISN solutions are industry-agnostic, serving Real Estate, Healthcare, Home Services, Clinics, Legal, E-Commerce, and more.';
        }

        return 'RAVISN builds custom AI Chatbots, Voice Agents, and Workflow Automations that operate 24/7 to grow your business on autopilot.';
    }

    /**
     * Send AI message via WhatsApp Cloud API & save to chat thread.
     */
    protected function sendAiResponse(WhatsappChat $chat, string $messageText): void
    {
        try {
            $account = $chat->whatsappAccount;
            if ($account && $account->access_token && $account->phone_number_id) {
                $api = new WhatsAppCloudApi([
                    'waba_id' => $account->waba_id,
                    'phone_number_id' => $account->phone_number_id,
                    'access_token' => $account->access_token,
                ]);

                $api->sendTextMessage($account->phone_number_id, $chat->customer_phone, $messageText);
            }

            $chat->messages()->create([
                'meta_message_id' => 'ai_'.bin2hex(random_bytes(10)),
                'direction' => 'outbound',
                'message_type' => 'text',
                'body' => $messageText,
                'sent_at' => now(),
                'status' => 'sent',
            ]);

            $chat->update(['last_message_at' => now()]);
        } catch (\Exception $e) {
            Log::error('RavisnAiService failed to send WhatsApp message: '.$e->getMessage(), [
                'chat_id' => $chat->id,
            ]);
        }
    }
}
