<?php

namespace Database\Seeders;

use App\Models\ChannelIdentity;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Tenant;
use App\Models\Thread;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OmnichannelInboxSeeder extends Seeder
{
    /**
     * Seed omnichannel conversation threads, contacts, and messages.
     */
    public function run(): void
    {
        $tenant = Tenant::first() ?? Tenant::create([
            'name' => 'RAVISN Platform',
            'email' => 'admin@ravisn.com',
            'status' => 'active',
            'meta_business_id' => '10928374829103',
        ]);

        $waChannel = ChannelIdentity::where('channel_type', 'whatsapp')->first();
        $igChannel = ChannelIdentity::where('channel_type', 'instagram')->first();
        $msgChannel = ChannelIdentity::where('channel_type', 'messenger')->first();

        if (! $waChannel || ! $igChannel || ! $msgChannel) {
            $this->command?->warn('Channel identities missing. Skipping OmnichannelInboxSeeder.');
            return;
        }

        // 1. WhatsApp Thread - Ali Afzal (HVAC Solutions, High Priority Enterprise Lead)
        $this->seedAliAfzalConversation($tenant, $waChannel);

        // 2. WhatsApp Thread - Usman Khan (Prime Properties, Roman Urdu)
        $this->seedUsmanKhanConversation($tenant, $waChannel);

        // 3. Instagram Direct Thread - Sarah Jenkins (Jenkins Apparel London)
        $this->seedSarahJenkinsConversation($tenant, $igChannel);

        // 4. Facebook Messenger Thread - Dr. Tariq Mahmood (City Dental Care Hospital)
        $this->seedTariqMahmoodConversation($tenant, $msgChannel);

        $this->command?->info('Omnichannel Inbox seeded successfully across WhatsApp, Instagram, and Messenger!');
    }

    private function seedAliAfzalConversation(Tenant $tenant, ChannelIdentity $channel): void
    {
        $contact = Contact::updateOrCreate(
            ['email' => 'ali@afzalhvac.com'],
            [
                'tenant_id' => $tenant->id,
                'first_name' => 'Ali',
                'last_name' => 'Afzal',
                'name' => 'Ali Afzal',
                'phone_number' => '+15642226889',
                'phone' => '+15642226889',
                'notes' => 'Requires 24/7 emergency dispatch and WhatsApp scheduling for 15 field technicians.',
                'custom_attributes' => [
                    'company_name' => 'Afzal HVAC Solutions',
                    'industry' => 'HVAC & Field Services',
                    'lead_stage' => 'Enterprise Lead (High Priority)',
                ],
                'tags' => ['whatsapp', 'enterprise', 'high-ticket', 'hvac'],
            ]
        );

        $thread = Thread::updateOrCreate(
            [
                'contact_id' => $contact->id,
                'channel_identity_id' => $channel->id,
            ],
            [
                'channel_type' => 'whatsapp',
                'status' => 'open',
                'bot_active' => true,
                'last_message_at' => now()->subMinutes(12),
                'metadata' => [
                    'source' => 'Meta WhatsApp Cloud API',
                    'priority' => 'high',
                ],
            ]
        );

        // Clear existing demo messages for clean idempotency
        Message::where('thread_id', $thread->id)->delete();

        $messages = [
            [
                'direction' => 'inbound',
                'content' => 'Hi, I run an HVAC repair company with 15 technicians. We miss after-hours emergency calls and want WhatsApp AI to book emergency appointments into our calendar.',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(45),
            ],
            [
                'direction' => 'outbound',
                'content' => 'Hello Ali! RAVISN Autonomous Agent can integrate directly with your technician scheduling calendar and handle 24/7 dispatch via WhatsApp Cloud API. When an emergency call or message comes in, the agent captures location, system model, and assigns an immediate slot. Would you like to schedule a 15-minute live demo this Thursday at 3:00 PM EST?',
                'is_ai_generated' => true,
                'ai_model' => 'llama-3.3-70b-versatile',
                'detected_intent' => 'emergency_dispatch_inquiry',
                'latency_ms' => 680,
                'confidence_score' => 0.9850,
                'status' => 'delivered',
                'created_at' => now()->subMinutes(44),
            ],
            [
                'direction' => 'inbound',
                'content' => 'Thursday 3:00 PM EST works great. Please confirm what pricing tier covers 15 technicians.',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(20),
            ],
            [
                'direction' => 'outbound',
                'content' => 'Perfect! I have reserved Thursday at 3:00 PM EST for your custom live demo. For 15 field technicians, our Enterprise Tier includes unlimited multi-agent reasoning, CRM sync, and hybrid pgvector knowledge base. A calendar invitation has been sent to ali@afzalhvac.com!',
                'is_ai_generated' => true,
                'ai_model' => 'llama-3.3-70b-versatile',
                'detected_intent' => 'demo_confirmed',
                'latency_ms' => 710,
                'confidence_score' => 0.9920,
                'status' => 'read',
                'created_at' => now()->subMinutes(19),
            ],
            [
                'direction' => 'inbound',
                'content' => 'Received the invite, thank you! Looking forward to it.',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(12),
            ],
            [
                'direction' => 'inbound',
                'message_type' => 'audio',
                'content' => 'Hello team, we are facing an emergency heating outage at our facility on 5th Avenue. Could someone dispatch a field technician right away?',
                'media_url' => 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
                'media_mime_type' => 'audio/ogg',
                'raw_payload' => [
                    'transcript' => 'Hello team, we are facing an emergency heating outage at our facility on 5th Avenue. Could someone dispatch a field technician right away?',
                    'asr_engine' => 'Groq Whisper large-v3',
                    'confidence' => 0.985,
                ],
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(9),
            ],
            [
                'direction' => 'inbound',
                'message_type' => 'image',
                'content' => 'Here is a photo of our boiler pressure gauge reading 0.2 bar.',
                'media_url' => 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
                'media_mime_type' => 'image/jpeg',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(7),
            ],
            [
                'direction' => 'outbound',
                'message_type' => 'document',
                'content' => 'Commercial HVAC Emergency Service Protocol & SLA.pdf',
                'media_url' => 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                'media_mime_type' => 'application/pdf',
                'is_ai_generated' => false,
                'status' => 'delivered',
                'created_at' => now()->subMinutes(5),
            ],
            [
                'direction' => 'outbound',
                'message_type' => 'note',
                'content' => 'Client verified under Tier 2 Enterprise SLA. Senior technician #4 (David) dispatched with high-pressure booster kit to 5th Ave facility.',
                'is_ai_generated' => false,
                'status' => 'delivered',
                'created_at' => now()->subMinutes(3),
            ],
            [
                'direction' => 'outbound',
                'message_type' => 'text',
                'content' => 'Technician David is en route to your facility with ETA 15 minutes. We have received your pressure gauge photo and prepared the replacement pressure regulator.',
                'is_ai_generated' => false,
                'status' => 'sent',
                'created_at' => now()->subMinutes(1),
            ],
        ];

        foreach ($messages as $msg) {
            Message::create(array_merge($msg, [
                'thread_id' => $thread->id,
                'contact_id' => $contact->id,
                'channel_type' => 'whatsapp',
                'message_type' => $msg['message_type'] ?? 'text',
                'updated_at' => $msg['created_at'],
            ]));
        }
    }

    private function seedUsmanKhanConversation(Tenant $tenant, ChannelIdentity $channel): void
    {
        $contact = Contact::updateOrCreate(
            ['email' => 'usman@primeprop.pk'],
            [
                'tenant_id' => $tenant->id,
                'first_name' => 'Usman',
                'last_name' => 'Khan',
                'name' => 'Usman Khan',
                'phone_number' => '+923001234567',
                'phone' => '+923001234567',
                'notes' => 'Client prefers Roman Urdu. Interested in automated property listing inquiries and price brochure delivery.',
                'custom_attributes' => [
                    'company_name' => 'Prime Properties DHA',
                    'industry' => 'Real Estate',
                    'lead_stage' => 'Demo Scheduled',
                ],
                'tags' => ['whatsapp', 'roman-urdu', 'real-estate', 'dha-lahore'],
            ]
        );

        $thread = Thread::updateOrCreate(
            [
                'contact_id' => $contact->id,
                'channel_identity_id' => $channel->id,
            ],
            [
                'channel_type' => 'whatsapp',
                'status' => 'open',
                'bot_active' => true,
                'last_message_at' => now()->subMinutes(25),
                'metadata' => [
                    'source' => 'Meta WhatsApp Cloud API',
                    'language' => 'roman_urdu',
                ],
            ]
        );

        Message::where('thread_id', $thread->id)->delete();

        $messages = [
            [
                'direction' => 'inbound',
                'content' => 'Salam, mujhe apne real estate business ke liye WhatsApp AI bot chahiye jo clients ko plots aur flats ke details aur rate list automatically bhej sakay.',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subHours(2),
            ],
            [
                'direction' => 'outbound',
                'content' => 'Walaikum Assalam Usman sahib! RAVISN AI agent Roman Urdu aur English dono fluently samajhta hai. Yeh clients ko DHA, Bahria, aur commercial projects ki rate lists, PDF brochures, aur video walkthroughs WhatsApp par foran deliver kar sakta hai. Kya aap kal sham 4 baje demo dekhna pasand karein ge?',
                'is_ai_generated' => true,
                'ai_model' => 'llama-3.3-70b-versatile',
                'detected_intent' => 'real_estate_inquiry',
                'latency_ms' => 620,
                'confidence_score' => 0.9780,
                'status' => 'delivered',
                'created_at' => now()->subHours(2)->addMinutes(1),
            ],
            [
                'direction' => 'inbound',
                'content' => 'Jee kal 4 baje theek hai. Kya yeh CRM ke sath bhi connect ho jata hai?',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(40),
            ],
            [
                'direction' => 'outbound',
                'content' => 'Zabardast! Kal 4 baje aapka live demo schedule ho chuka hai. Jee haan, RAVISN mukammal tor par HubSpot, Salesforce, aur custom CRM databases ke sath direct sync karta hai aur har lead ka status update karta hai.',
                'is_ai_generated' => true,
                'ai_model' => 'llama-3.3-70b-versatile',
                'detected_intent' => 'crm_integration_inquiry',
                'latency_ms' => 640,
                'confidence_score' => 0.9840,
                'status' => 'delivered',
                'created_at' => now()->subMinutes(39),
            ],
            [
                'direction' => 'inbound',
                'content' => 'Bohat shukriya, kal baat hoti hai!',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(25),
            ],
        ];

        foreach ($messages as $msg) {
            Message::create(array_merge($msg, [
                'thread_id' => $thread->id,
                'contact_id' => $contact->id,
                'channel_type' => 'whatsapp',
                'message_type' => 'text',
                'updated_at' => $msg['created_at'],
            ]));
        }
    }

    private function seedSarahJenkinsConversation(Tenant $tenant, ChannelIdentity $channel): void
    {
        $contact = Contact::updateOrCreate(
            ['email' => 'sarah@jenkinsapparel.co.uk'],
            [
                'tenant_id' => $tenant->id,
                'first_name' => 'Sarah',
                'last_name' => 'Jenkins',
                'name' => 'Sarah Jenkins',
                'instagram_igsid' => 'sarah_boutique_uk',
                'notes' => 'High-volume Instagram DM traffic (>500 DMs/day). Wants Shopify order tracking and refund policy automation.',
                'custom_attributes' => [
                    'company_name' => 'Jenkins Apparel London',
                    'industry' => 'E-commerce / Retail',
                    'lead_stage' => 'Qualified Lead',
                ],
                'tags' => ['instagram', 'shopify', 'uk', 'ecommerce'],
            ]
        );

        $thread = Thread::updateOrCreate(
            [
                'contact_id' => $contact->id,
                'channel_identity_id' => $channel->id,
            ],
            [
                'channel_type' => 'instagram',
                'status' => 'open',
                'bot_active' => true,
                'last_message_at' => now()->subMinutes(8),
                'metadata' => [
                    'source' => 'Meta Instagram Graph API',
                    'instagram_handle' => '@sarah_boutique_uk',
                ],
            ]
        );

        Message::where('thread_id', $thread->id)->delete();

        $messages = [
            [
                'direction' => 'inbound',
                'content' => 'Hey! We get over 500 DMs a day on Instagram asking about order tracking, sizing charts, and return policies. Can RAVISN handle our Shopify catalog directly in IG DMs?',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subHours(3),
            ],
            [
                'direction' => 'outbound',
                'content' => 'Hi Sarah! Absolutely. RAVISN natively integrates with Meta Graph API for Instagram Direct and connects with your Shopify store. It looks up real-time order tracking numbers, answers sizing queries using your product catalog, and processes return requests within seconds. Would you like to see a sample conversation flow?',
                'is_ai_generated' => true,
                'ai_model' => 'gemini-1.5-pro',
                'detected_intent' => 'instagram_ecommerce_inquiry',
                'latency_ms' => 780,
                'confidence_score' => 0.9820,
                'status' => 'delivered',
                'created_at' => now()->subHours(3)->addMinutes(1),
            ],
            [
                'direction' => 'inbound',
                'content' => 'Yes please! And does it support human handover if a customer is upset?',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(30),
            ],
            [
                'direction' => 'outbound',
                'content' => 'Yes, 100%! If sentiment analysis detects frustration or if the user requests a human, the agent instantly disables bot_active, notifies your support team via Reverb websockets, and hands over the full context without losing the thread.',
                'is_ai_generated' => true,
                'ai_model' => 'gemini-1.5-pro',
                'detected_intent' => 'human_handover_inquiry',
                'latency_ms' => 750,
                'confidence_score' => 0.9890,
                'status' => 'delivered',
                'created_at' => now()->subMinutes(29),
            ],
            [
                'direction' => 'inbound',
                'content' => "That is exactly what we need. Let's get our dev team on a call.",
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subMinutes(8),
            ],
        ];

        foreach ($messages as $msg) {
            Message::create(array_merge($msg, [
                'thread_id' => $thread->id,
                'contact_id' => $contact->id,
                'channel_type' => 'instagram',
                'message_type' => 'text',
                'updated_at' => $msg['created_at'],
            ]));
        }
    }

    private function seedTariqMahmoodConversation(Tenant $tenant, ChannelIdentity $channel): void
    {
        $contact = Contact::updateOrCreate(
            ['email' => 'tariq@citydental.pk'],
            [
                'tenant_id' => $tenant->id,
                'first_name' => 'Dr. Tariq',
                'last_name' => 'Mahmood',
                'name' => 'Dr. Tariq Mahmood',
                'messenger_psid' => '109283748291039_user_441',
                'notes' => 'Dental clinic patient appointment booking on Facebook Page.',
                'custom_attributes' => [
                    'company_name' => 'City Dental Care Hospital',
                    'industry' => 'Healthcare / Clinic',
                    'lead_stage' => 'New Lead',
                ],
                'tags' => ['messenger', 'healthcare', 'facebook-page'],
            ]
        );

        $thread = Thread::updateOrCreate(
            [
                'contact_id' => $contact->id,
                'channel_identity_id' => $channel->id,
            ],
            [
                'channel_type' => 'messenger',
                'status' => 'open',
                'bot_active' => true,
                'last_message_at' => now()->subHours(1),
                'metadata' => [
                    'source' => 'Meta Messenger Platform API',
                    'page_id' => '100000000000000',
                ],
            ]
        );

        Message::where('thread_id', $thread->id)->delete();

        $messages = [
            [
                'direction' => 'inbound',
                'content' => 'Hello, we want to automate patient appointment bookings on our Facebook clinic page. Can the bot collect patient name, required service, and preferred doctor?',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subHours(5),
            ],
            [
                'direction' => 'outbound',
                'content' => 'Hello Dr. Tariq! Yes, RAVISN Autonomous Agent can conduct structured patient triage on Facebook Messenger. It collects patient history, service requirement (e.g., Scaling, Root Canal, Orthodontics), matches doctor availability, and sends an SMS/Email confirmation to both patient and doctor.',
                'is_ai_generated' => true,
                'ai_model' => 'llama-3.3-70b-versatile',
                'detected_intent' => 'clinic_booking_inquiry',
                'latency_ms' => 690,
                'confidence_score' => 0.9760,
                'status' => 'delivered',
                'created_at' => now()->subHours(5)->addMinutes(1),
            ],
            [
                'direction' => 'inbound',
                'content' => 'Sounds very thorough. Can we test the bot with our reception staff tomorrow morning?',
                'is_ai_generated' => false,
                'status' => 'read',
                'created_at' => now()->subHours(1),
            ],
        ];

        foreach ($messages as $msg) {
            Message::create(array_merge($msg, [
                'thread_id' => $thread->id,
                'contact_id' => $contact->id,
                'channel_type' => 'messenger',
                'message_type' => 'text',
                'updated_at' => $msg['created_at'],
            ]));
        }
    }
}
