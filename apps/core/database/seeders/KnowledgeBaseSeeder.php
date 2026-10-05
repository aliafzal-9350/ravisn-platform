<?php

namespace Database\Seeders;

use App\Models\KnowledgeBase;
use App\Models\KnowledgeChunk;
use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KnowledgeBaseSeeder extends Seeder
{
    public function run(): void
    {
        // This is RAVISN's own agency content, so it belongs to the RAVISN
        // workspace created by DatabaseSeeder, never to a client tenant.
        $tenant = Tenant::where('email', 'admin@ravisn.com')->first();
        if (! $tenant) {
            $this->command?->warn('RAVISN workspace not found; skipping knowledge base seed.');

            return;
        }

        $kb = KnowledgeBase::firstOrCreate(
            ['tenant_id' => (string) $tenant->id, 'name' => 'RAVISN Enterprise Knowledge Base'],
            [
                'description' => 'Unified RAG repository for company answers, products, services, and policies',
                'embedding_model' => 'text-embedding-3-small',
                'dimension' => 1536,
                'is_active' => true,
            ]
        );

        $topics = [
            [
                'title' => 'About RAVISN',
                'category' => 'About',
                'question' => 'About RAVISN',
                'answer' => 'RAVISN is an AI Automation Agency — "AI Automation That Grows Your Business, On Autopilot." We combine creativity, strategy, and AI automation to build intelligent systems that streamline operations, generate qualified leads, and turn visitors into loyal customers. 300+ projects completed, 500+ customer reviews, 98% happy clients, 24/7 support. Website: ravisn.com',
            ],
            [
                'title' => 'Core AI Automation Services',
                'category' => 'Services',
                'question' => 'What are RAVISN\'s core AI automation services?',
                'answer' => 'AI Chatbot Development (24/7 chatbots that answer queries, qualify leads, improve engagement) | AI Voice Agents (automate inbound/outbound calls, bookings, follow-ups) | WhatsApp AI Automation (customer conversations, lead nurturing, appointment scheduling, support on WhatsApp Business) | Lead Qualification Automation (auto qualify, score, and route leads) | CRM Automation (connect CRM with AI workflows for lead management and follow-ups) | Appointment Booking Automation (AI schedules meetings, confirmations, reminders) | Email Marketing Automation (automated sequences that nurture leads) | Workflow Automation (eliminate repetitive tasks across apps and teams) | AI Knowledge Base (AI assistants trained on your business documents) | Customer Support Automation (24/7 AI chat and voice support) | Custom AI Solutions (fully tailored AI systems for your business processes)',
            ],
            [
                'title' => 'How We Work - 4 Step Process',
                'category' => 'Process',
                'question' => 'How does RAVISN work with clients?',
                'answer' => 'Step 1: Discovery & Business Analysis — we understand your business and find automation gaps. Step 2: AI Strategy & Automation Planning — we design the right AI solution for you. Step 3: Development & System Integration — we build and connect it with your existing systems. Step 4: Deployment & Continuous Optimization — we launch, monitor, and keep improving it.',
            ],
            [
                'title' => 'Industries We Serve',
                'category' => 'Industries',
                'question' => 'Which industries does RAVISN serve?',
                'answer' => 'Real estate, HVAC & home services, restaurants, aesthetics & clinics, healthcare, legal services, e-commerce, and many more. Our solutions are industry-agnostic and fully customizable — any business with customer conversations, leads, or repetitive tasks can be automated.',
            ],
            [
                'title' => 'Delivery Timeline',
                'category' => 'Timeline',
                'question' => 'What is the delivery timeline for AI automation projects?',
                'answer' => 'Most AI automation solutions are delivered within 1-4 weeks, depending on the scope of the project.',
            ],
            [
                'title' => 'Automation Packages & Plans',
                'category' => 'Packages',
                'question' => 'What packages and plans does RAVISN offer?',
                'answer' => 'Basic Package: AI Chatbot Setup (Website), Lead Capture Automation, WhatsApp Integration, Appointment Booking, Basic CRM Integration, Free Consultation, 30 Days Support, Basic Training. | All-in-One Solution (Recommended): Everything in Basic + AI Voice Agent, CRM Automation, Email & SMS Automation, Lead Qualification AI, Workflow Automation, Monthly Performance Report, Free Strategy Session, 60 Days Support, AI Workflow Optimization. | Premium Package: Everything in All-in-One + Custom AI Agent Development, Multi-Channel Automation (WhatsApp + Voice + Email AI), Advanced CRM & API Integrations, Dedicated Account Manager, Priority Support, AI Growth Consultation, 90 Days Premium Support, Free Future Optimization.',
            ],
            [
                'title' => 'Pricing & Quotation Policy',
                'category' => 'Pricing Policy',
                'question' => 'What is your pricing policy?',
                'answer' => 'Never mention any specific price or amount. Every business is unique, so pricing depends on business needs and project scope. Our team shares a custom quote after a free consultation.',
            ],
            [
                'title' => 'Why Choose RAVISN',
                'category' => 'Why Choose Us',
                'question' => 'Why should businesses choose RAVISN?',
                'answer' => 'We\'re not just another agency — we\'re your strategic partner in growth. Proven expertise: AI Automation, AI Chatbots & Agents, Workflow Automation, Lead Generation Automation. We deliver custom-built systems, not generic templates, with ongoing support and optimization.',
            ],
            [
                'title' => 'Contact Details & Locations',
                'category' => 'Contact',
                'question' => 'What are your contact details and office locations?',
                'answer' => 'WhatsApp: +1 (564) 222-6889 | Email: Ravisn.uk@gmail.com | Instagram: @ravisnofficial | Website: ravisn.com | US Office: 312 W 2ND ST 1992 CASPER, WY 82601 | Pakistan Office: 41, McLeod Road, Lahore.',
            ],
            [
                'title' => 'Free AI Consultation Offer',
                'category' => 'Free Offer',
                'question' => 'Do you offer a free consultation?',
                'answer' => 'Free consultation for every new client — book a call on WhatsApp, share your business requirements, and our experts will analyze your workflows and recommend the best AI automation solution.',
            ],
        ];

        $qaData = [
            // English Greetings & Basics
            ['q' => 'Assalamualaikum', 'a' => 'Wa Alaikum Assalam! How can we help you?', 'lang' => 'roman_urdu', 'cat' => 'greeting'],
            ['q' => 'Hello', 'a' => 'Hello! How can RAVISN help you today?', 'lang' => 'english', 'cat' => 'greeting'],
            ['q' => 'Hi', 'a' => 'Hi! How can we assist you?', 'lang' => 'english', 'cat' => 'greeting'],
            ['q' => 'Hey', 'a' => 'Hey! How can we help?', 'lang' => 'english', 'cat' => 'greeting'],
            ['q' => 'Good morning', 'a' => 'Good morning! How can we help you today?', 'lang' => 'english', 'cat' => 'greeting'],
            ['q' => 'Good afternoon', 'a' => 'Good afternoon! How can we assist you?', 'lang' => 'english', 'cat' => 'greeting'],
            ['q' => 'Good evening', 'a' => 'Good evening! How can we help?', 'lang' => 'english', 'cat' => 'greeting'],
            ['q' => 'How are you?', 'a' => 'We’re doing great, thank you! How can we help you?', 'lang' => 'english', 'cat' => 'greeting'],
            ['q' => 'Who are you?', 'a' => 'We are RAVISN, an AI automation agency.', 'lang' => 'english', 'cat' => 'identity'],
            ['q' => 'What is RAVISN?', 'a' => 'RAVISN provides AI automation solutions for businesses — AI Automation That Grows Your Business, On Autopilot.', 'lang' => 'english', 'cat' => 'identity'],
            ['q' => 'What do you do?', 'a' => 'We help businesses automate customer support, sales, leads, workflows, and more.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'Are you a real person?', 'a' => 'I’m RAVISN’s AI assistant. I can help with information about our services.', 'lang' => 'english', 'cat' => 'identity'],
            ['q' => 'Are you AI?', 'a' => 'Yes, I’m an AI assistant for RAVISN.', 'lang' => 'english', 'cat' => 'identity'],
            ['q' => 'Can I talk to a human?', 'a' => 'Yes. Please contact the RAVISN team on WhatsApp (+1 564-222-6889) for human assistance.', 'lang' => 'english', 'cat' => 'support'],
            ['q' => 'Can you help me?', 'a' => 'Yes, of course. Tell me what you need.', 'lang' => 'english', 'cat' => 'general'],
            ['q' => 'Do you make websites?', 'a' => 'Our main focus is AI automation and custom AI solutions. Please share your requirement.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'Do you make apps?', 'a' => 'We can discuss custom AI and automation solutions based on your requirement.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'Can you build a chatbot for my business?', 'a' => 'Yes, we can build an AI chatbot for your business.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'Can I use it on WhatsApp?', 'a' => 'Yes, WhatsApp AI automation is available.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'Can I use it on my website?', 'a' => 'Yes, AI customer support can be integrated with a website.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'Can it answer customers automatically?', 'a' => 'Yes, an AI agent can automatically handle customer questions 24/7.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it work 24/7?', 'a' => 'Yes, AI customer support can operate around the clock.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it understand my business?', 'a' => 'Yes, you can provide business knowledge to guide the AI agent.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can I upload a PDF?', 'a' => 'Yes, your business documents and PDFs can be added to the AI knowledge base.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can I add my company information?', 'a' => 'Yes, company information can be added to the AI knowledge base.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'What if the answer is not in my knowledge?', 'a' => 'The configured AI fallback will politely offer human assistance or answer safely without hallucinations.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it sell products?', 'a' => 'Yes, AI can assist with customer conversations and sales workflows.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it collect leads?', 'a' => 'Yes, lead collection and qualification can be automated.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it book appointments?', 'a' => 'Yes, appointment booking automation can be configured.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it send follow-ups?', 'a' => 'Yes, follow-up workflows can be automated.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it connect to CRM?', 'a' => 'Yes, CRM automation and integrations can be connected based on your system.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Can it handle customer complaints?', 'a' => 'Yes, AI can handle common support conversations and route complex cases to your human team.', 'lang' => 'english', 'cat' => 'features'],
            ['q' => 'Is there a free plan?', 'a' => 'Please contact RAVISN for the latest available plans and options. We offer a free consultation for every new client.', 'lang' => 'english', 'cat' => 'pricing'],
            ['q' => 'Do you offer a demo?', 'a' => 'Yes, you can contact RAVISN to discuss a demo. You are also talking to one right now!', 'lang' => 'english', 'cat' => 'demo'],
            ['q' => 'How do I start?', 'a' => 'Tell us about your business and automation requirements, and the RAVISN team can guide you. Book a free consultation on WhatsApp!', 'lang' => 'english', 'cat' => 'onboarding'],
            ['q' => 'Do you work with small businesses?', 'a' => 'Yes, solutions can be customized for different business sizes.', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'Do you work with large companies?', 'a' => 'Yes, custom automation can be designed for larger operations.', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'I want an AI agent', 'a' => 'Sure. Tell us what you want the AI agent to do.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'I want WhatsApp automation', 'a' => 'Sure. Share your WhatsApp automation requirements with the RAVISN team.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'I want a voice bot', 'a' => 'Yes, RAVISN offers AI voice agent solutions for inbound and outbound calls.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'I want a sales bot', 'a' => 'Yes, we can build an AI sales agent for your business.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'I want customer support AI', 'a' => 'Yes, we build 24/7 AI-powered customer support solutions.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'I want lead generation automation', 'a' => 'Yes, lead capture, qualification, and follow-up can be automated.', 'lang' => 'english', 'cat' => 'services'],
            ['q' => 'Tell me a joke', 'a' => 'Sure! Why did the chatbot get promoted? Because it always had the right response!', 'lang' => 'english', 'cat' => 'chitchat'],
            ['q' => 'What is your phone number?', 'a' => 'Our official WhatsApp and phone contact is +1 (564) 222-6889.', 'lang' => 'english', 'cat' => 'contact'],
            ['q' => 'What is your email?', 'a' => 'You can contact RAVISN by email at Ravisn.uk@gmail.com for inquiries and support.', 'lang' => 'english', 'cat' => 'contact'],
            ['q' => 'What is your website?', 'a' => 'RAVISN\'s official website is ravisn.com.', 'lang' => 'english', 'cat' => 'contact'],
            ['q' => 'Are you on Instagram?', 'a' => 'Yes! Our official Instagram handle is @ravisnofficial.', 'lang' => 'english', 'cat' => 'contact'],
            ['q' => 'Where are you located?', 'a' => 'Our office is at 41, McLeod Road, Lahore, and our US office is at 312 W 2ND ST 1992 CASPER, WY 82601.', 'lang' => 'english', 'cat' => 'contact'],
            ['q' => 'How much does it cost?', 'a' => 'Pricing depends on your business needs and project scope since every solution is custom-built. Our team shares a tailored quote after a free consultation on WhatsApp.', 'lang' => 'english', 'cat' => 'pricing'],
            ['q' => 'What is your price?', 'a' => 'We do not have fixed pricing because every business is unique. We provide a custom quote after a free consultation call.', 'lang' => 'english', 'cat' => 'pricing'],
            ['q' => 'Can you help my real estate business?', 'a' => 'Yes! We build custom AI automation for real estate (24/7 lead qualification, WhatsApp follow-ups, CRM sync, and voice booking agents).', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'Do you work with real estate?', 'a' => 'Yes, RAVISN provides specialized automation solutions for real estate businesses.', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'Can you help my restaurant?', 'a' => 'Yes, AI automation can support restaurants with customer inquiries, bookings, orders, and promotions.', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'Can you help my clinic?', 'a' => 'Yes, we provide AI automation for clinics, aesthetics, and healthcare for 24/7 appointment scheduling and customer support.', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'Can you help my ecommerce business?', 'a' => 'Yes, AI automation can support e-commerce customer service, order tracking, sales, and abandoned cart recovery.', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'Can you help my HVAC business?', 'a' => 'Yes, HVAC and home-service businesses can automate inbound emergency calls, quote requests, and dispatching.', 'lang' => 'english', 'cat' => 'industries'],
            ['q' => 'What is included in the Basic package?', 'a' => 'The Basic Package includes Website AI Chatbot setup, Lead Capture Automation, WhatsApp Integration, Appointment Booking, Basic CRM Integration, Free Consultation, 30 Days Support, and Basic Training.', 'lang' => 'english', 'cat' => 'packages'],
            ['q' => 'What is in the All-in-One package?', 'a' => 'The All-in-One Solution (Recommended) includes everything in Basic plus AI Voice Agent, CRM Automation, Email & SMS Automation, Lead Qualification AI, Workflow Automation, Monthly Performance Report, Strategy Session, 60 Days Support, and Workflow Optimization.', 'lang' => 'english', 'cat' => 'packages'],
            ['q' => 'What is in the Premium package?', 'a' => 'The Premium Package includes everything in All-in-One plus Custom AI Agent Development, Multi-Channel Automation (WhatsApp + Voice + Email AI), Advanced CRM & API Integrations, Dedicated Account Manager, Priority Support, Growth Consultation, and 90 Days Premium Support.', 'lang' => 'english', 'cat' => 'packages'],
            ['q' => 'How long does setup take?', 'a' => 'Most AI automation projects are delivered within 1–4 weeks, depending on project scope.', 'lang' => 'english', 'cat' => 'timeline'],
            ['q' => 'How many projects has RAVISN completed?', 'a' => 'RAVISN has completed 300+ projects with 500+ reviews and 98% happy clients.', 'lang' => 'english', 'cat' => 'about'],

            // Roman Urdu Q&As
            ['q' => 'Assalam o Alaikum', 'a' => 'Wa Alaikum Assalam! RAVISN mein khush aamdeed. Batayein hum kis tarah help kar sakte hain?', 'lang' => 'roman_urdu', 'cat' => 'greeting'],
            ['q' => 'Salam', 'a' => 'Wa Alaikum Assalam! Kaise help kar sakte hain?', 'lang' => 'roman_urdu', 'cat' => 'greeting'],
            ['q' => 'Kese ho?', 'a' => 'Alhamdulillah, theek! Aap batayein kis cheez mein help chahiye?', 'lang' => 'roman_urdu', 'cat' => 'greeting'],
            ['q' => 'Aap kon ho?', 'a' => 'Main RAVISN ka AI assistant hoon.', 'lang' => 'roman_urdu', 'cat' => 'identity'],
            ['q' => 'RAVISN kya hai?', 'a' => 'RAVISN AI automation agency hai jo businesses ko automation solutions deti hai.', 'lang' => 'roman_urdu', 'cat' => 'identity'],
            ['q' => 'Aap kya karte ho?', 'a' => 'Hum AI chatbot, voice agent, WhatsApp automation, lead automation aur custom AI solutions provide karte hain.', 'lang' => 'roman_urdu', 'cat' => 'services'],
            ['q' => 'Aapka email kya hai?', 'a' => 'Aap hum se email par contact kar sakte hain: Ravisn.uk@gmail.com.', 'lang' => 'roman_urdu', 'cat' => 'contact'],
            ['q' => 'Aapka number kya hai?', 'a' => 'RAVISN ka official WhatsApp number +1 (564) 222-6889 hai.', 'lang' => 'roman_urdu', 'cat' => 'contact'],
            ['q' => 'Aap kahan located hain?', 'a' => 'RAVISN ka office 41, McLeod Road, Lahore mein hai aur hamara US office Casper, WY mein hai.', 'lang' => 'roman_urdu', 'cat' => 'contact'],
            ['q' => 'Aapki website kya hai?', 'a' => 'Hamari official website ravisn.com hai.', 'lang' => 'roman_urdu', 'cat' => 'contact'],
            ['q' => 'Price kya hai?', 'a' => 'Pricing aapki requirements par depend karti hai. Hum free consultation ke baad custom quote share karte hain.', 'lang' => 'roman_urdu', 'cat' => 'pricing'],
            ['q' => 'Iski price kitni hai?', 'a' => 'Price business needs aur project scope par depend karti hai. Free consultation ke baad custom quote milta hai.', 'lang' => 'roman_urdu', 'cat' => 'pricing'],
            ['q' => 'Aapki price kya hai?', 'a' => 'Fixed price nahi hai. Har business ke liye custom quote diya jata hai.', 'lang' => 'roman_urdu', 'cat' => 'pricing'],
            ['q' => 'Demo mil sakta hai?', 'a' => 'Ji haan! Aap abhi RAVISN WhatsApp assistant se chat kar rahe hain. Custom demo consultation ke baad arrange ho sakta hai.', 'lang' => 'roman_urdu', 'cat' => 'demo'],
            ['q' => 'Start kaise karoon?', 'a' => 'WhatsApp par free consultation book karein, apni business needs share karein, aur hamari team aap ko guide karegi.', 'lang' => 'roman_urdu', 'cat' => 'onboarding'],
            ['q' => 'Real estate ke liye AI hai?', 'a' => 'Ji haan! Real estate ke liye lead qualification, WhatsApp follow-ups, aur 24/7 AI chat/voice agents automate ho sakte hain.', 'lang' => 'roman_urdu', 'cat' => 'industries'],
            ['q' => 'Restaurant ke liye AI ban sakta hai?', 'a' => 'Ji haan, restaurant ke customer questions, bookings, leads aur workflows automate ho sakte hain.', 'lang' => 'roman_urdu', 'cat' => 'industries'],
            ['q' => 'Clinic ke liye AI hai?', 'a' => 'Ji haan, customer support aur appointment workflows ke liye AI solution banaya ja sakta hai.', 'lang' => 'roman_urdu', 'cat' => 'industries'],
            ['q' => 'Online store ke liye AI hai?', 'a' => 'Ji haan, ecommerce customer support, sales aur workflows automate kiye ja sakte hain.', 'lang' => 'roman_urdu', 'cat' => 'industries'],
            ['q' => 'Basic package mein kya included hai?', 'a' => 'Basic package mein website AI chatbot setup, lead capture, WhatsApp integration, appointment booking, basic CRM integration, consultation, 30 days support aur training shamil hai.', 'lang' => 'roman_urdu', 'cat' => 'packages'],
            ['q' => 'All-in-One package mein kya hai?', 'a' => 'All-in-One solution mein Basic ke sath AI voice agent, CRM automation, email/SMS automation, lead qualification AI, workflow automation, 60 days support shamil hai.', 'lang' => 'roman_urdu', 'cat' => 'packages'],
            ['q' => 'Premium package mein kya included hai?', 'a' => 'Premium package mein custom AI agent development, multi-channel automation (WhatsApp + Voice + Email), advanced CRM/API integrations, dedicated account manager, aur 90 days premium support shamil hai.', 'lang' => 'roman_urdu', 'cat' => 'packages'],
            ['q' => 'Setup mein kitna time lagta hai?', 'a' => 'Aksar AI automation projects 1–4 weeks mein deliver ho jate hain.', 'lang' => 'roman_urdu', 'cat' => 'timeline'],
            ['q' => 'Kya support milti hai?', 'a' => 'Ji haan. Delivery ke baad ongoing support, monitoring aur optimization milti hai.', 'lang' => 'roman_urdu', 'cat' => 'support'],
            ['q' => 'Kya aap WhatsApp automate karte hain?', 'a' => 'Ji haan. Hum WhatsApp Business par customer chats, leads, appointments aur support automate karte hain.', 'lang' => 'roman_urdu', 'cat' => 'services'],
            ['q' => 'Kya aap AI chatbot banate hain?', 'a' => 'Ji haan. Hum 24/7 AI chatbots banate hain jo questions, leads aur customer engagement handle karte hain.', 'lang' => 'roman_urdu', 'cat' => 'services'],
            ['q' => 'Kya aap AI voice agent banate hain?', 'a' => 'Ji haan. AI voice agents inbound/outbound calls, bookings aur follow-ups automate kar sakte hain.', 'lang' => 'roman_urdu', 'cat' => 'services'],
            ['q' => 'Kya aap CRM automate kar sakte hain?', 'a' => 'Ji haan. CRM ko AI workflows ke sath connect karke leads aur follow-ups automate kiye ja sakte hain.', 'lang' => 'roman_urdu', 'cat' => 'services'],

            // Urdu Nastaliq Q&As
            ['q' => 'السلام علیکم', 'a' => 'وعلیکم السلام! RAVISN میں خوش آمدید۔ بتائیں ہم آپ کی کیسے مدد کر سکتے ہیں؟', 'lang' => 'urdu_nastaliq', 'cat' => 'greeting'],
            ['q' => 'سلام', 'a' => 'وعلیکم السلام! بتائیں آپ کی کیسے مدد کریں؟', 'lang' => 'urdu_nastaliq', 'cat' => 'greeting'],
            ['q' => 'ہیلو', 'a' => 'ہیلو! RAVISN میں خوش آمدید۔ کیسے مدد کریں؟', 'lang' => 'urdu_nastaliq', 'cat' => 'greeting'],
            ['q' => 'آپ کیسے ہیں؟', 'a' => 'الحمدللہ ٹھیک! بتائیں آپ کو کس چیز میں مدد چاہیے؟', 'lang' => 'urdu_nastaliq', 'cat' => 'greeting'],
            ['q' => 'آپ کون ہیں؟', 'a' => 'میں RAVISN کا AI اسسٹنٹ ہوں۔', 'lang' => 'urdu_nastaliq', 'cat' => 'identity'],
            ['q' => 'RAVISN کیا ہے؟', 'a' => 'RAVISN ایک AI آٹومیشن ایجنسی ہے جو کاروباروں کو آٹومیشن سلوشنز فراہم کرتی ہے۔', 'lang' => 'urdu_nastaliq', 'cat' => 'identity'],
            ['q' => 'آپ کیا کرتے ہیں؟', 'a' => 'ہم AI چیٹ بوٹس، وائس ایجنٹس، واٹس ایپ آٹومیشن، لیڈ آٹومیشن اور کسٹم AI سلوشنز فراہم کرتے ہیں۔', 'lang' => 'urdu_nastaliq', 'cat' => 'services'],
            ['q' => 'آپ کا ای میل کیا ہے؟', 'a' => 'آپ ہم سے Ravisn.uk@gmail.com پر رابطہ کر سکتے ہیں۔', 'lang' => 'urdu_nastaliq', 'cat' => 'contact'],
            ['q' => 'آپ کا نمبر کیا ہے؟', 'a' => 'ہمارا آفیشل واٹس ایپ نمبر 6889-222 (564) 1+ ہے۔', 'lang' => 'urdu_nastaliq', 'cat' => 'contact'],
            ['q' => 'آپ کہاں موجود ہیں؟', 'a' => 'RAVISN کا دفتر 41، میکلوڈ روڈ، لاہور میں ہے اور ہمارا امریکی دفتر کیسپر، وائیومنگ میں ہے۔', 'lang' => 'urdu_nastaliq', 'cat' => 'contact'],
            ['q' => 'آپ کی ویب سائٹ ہے؟', 'a' => 'جی ہاں، ہماری ویب سائٹ ravisn.com ہے۔', 'lang' => 'urdu_nastaliq', 'cat' => 'contact'],
            ['q' => 'قیمت کیا ہے؟', 'a' => 'قیمت آپ کے پروجیکٹ کے اسکوپ پر منحصر ہے۔ ہم مفت مشاورت کے بعد کوٹیشن فراہم کرتے ہیں۔', 'lang' => 'urdu_nastaliq', 'cat' => 'pricing'],
            ['q' => 'اس کی قیمت کتنی ہے؟', 'a' => 'قیمت بزنس کی ضروریات اور پروجیکٹ اسکوپ پر منحصر ہے۔ فری کنسلٹیشن کے بعد کسٹم کوٹ دیا جاتا ہے۔', 'lang' => 'urdu_nastaliq', 'cat' => 'pricing'],
            ['q' => 'کیا ڈیمو مل سکتا ہے؟', 'a' => 'جی ہاں، آپ ابھی RAVISN واٹس ایپ اسسٹنٹ سے چیٹ کر رہے ہیں۔ کسٹم ڈیمو فری مشاورت کے بعد دیا جا سکتا ہے۔', 'lang' => 'urdu_nastaliq', 'cat' => 'demo'],
            ['q' => 'شروع کیسے کروں؟', 'a' => 'واٹس ایپ پر فری کنسلٹیشن بک کریں، اپنی بزنس ضرورت بتائیں اور ہماری ٹیم رہنمائی کرے گی۔', 'lang' => 'urdu_nastaliq', 'cat' => 'onboarding'],
            ['q' => 'ریئل اسٹیٹ کے لیے AI ہے؟', 'a' => 'جی ہاں! ریئل اسٹیٹ کے لیے لیڈ کوالیفکیشن، واٹس ایپ فالو اپس اور وائس ایجنٹس آٹومیٹ کیے جا سکتے ہیں۔', 'lang' => 'urdu_nastaliq', 'cat' => 'industries'],
            ['q' => 'ریسٹورنٹ کے لیے AI بن سکتا ہے؟', 'a' => 'جی ہاں، کسٹمر سوالات، بکنگز اور لیڈز آٹومیٹ کی جا سکتی ہیں۔', 'lang' => 'urdu_nastaliq', 'cat' => 'industries'],
            ['q' => 'کیا سپورٹ ملتی ہے؟', 'a' => 'جی ہاں، ڈیلیوری کے بعد جاری سپورٹ اور آپٹمائزیشن فراہم کی جاتی ہے۔', 'lang' => 'urdu_nastaliq', 'cat' => 'support'],
            ['q' => 'سیٹ اپ میں کتنا وقت لگتا ہے؟', 'a' => 'زیادہ تر AI آٹومیشن پروجیکٹس 1 تا 4 ہفتوں میں مکمل ہو جاتے ہیں۔', 'lang' => 'urdu_nastaliq', 'cat' => 'timeline'],
        ];

        // 1. Ingest Comprehensive Topics
        foreach ($topics as $item) {
            $question = $item['question'];
            $answer = $item['answer'];
            $content = "Topic: {$item['title']}\n\nQuestion: {$question}\n\nAnswer: {$answer}";
            $embedding = $this->computeEmbedding($content);

            $chunk = KnowledgeChunk::updateOrCreate(
                [
                    'knowledge_base_id' => $kb->id,
                    'content' => $content,
                ],
                [
                    'metadata' => [
                        'type' => 'topic',
                        'title' => $item['title'],
                        'category' => $item['category'],
                        'question' => $question,
                        'answer' => $answer,
                        'source' => 'system_seed_topics',
                    ],
                ]
            );

            if (DB::getDriverName() === 'pgsql') {
                $vectorString = '[' . implode(',', $embedding) . ']';
                DB::statement('UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?', [$vectorString, $chunk->id]);
            }
        }

        // 2. Ingest Multi-lingual Q&A Chunks
        foreach ($qaData as $item) {
            $question = $item['q'];
            $answer = $item['a'];
            $content = "Question: {$question}\n\nAnswer: {$answer}";
            $embedding = $this->computeEmbedding($content);

            $chunk = KnowledgeChunk::updateOrCreate(
                [
                    'knowledge_base_id' => $kb->id,
                    'content' => $content,
                ],
                [
                    'metadata' => [
                        'type' => 'qa',
                        'title' => $question,
                        'category' => $item['cat'] ?? 'general',
                        'language' => $item['lang'] ?? 'english',
                        'question' => $question,
                        'answer' => $answer,
                        'source' => 'system_seed_qa',
                    ],
                ]
            );

            if (DB::getDriverName() === 'pgsql') {
                $vectorString = '[' . implode(',', $embedding) . ']';
                DB::statement('UPDATE knowledge_chunks SET embedding = ?::vector WHERE id = ?', [$vectorString, $chunk->id]);
            }
        }
    }

    /**
     * Deterministic 1536-dimensional L2-normalized vector embedding.
     * Perfectly mirrors _pseudo_embedding in apps/agent/src/services/embedding_service.py.
     */
    private function computeEmbedding(string $text): array
    {
        $dim = 1536;
        $vec = array_fill(0, $dim, 0.0);
        $words = preg_split('/\s+/u', mb_strtolower($text));
        foreach ($words as $word) {
            if (! empty($word)) {
                $h = hexdec(substr(md5($word), 0, 8));
                $idx = $h % $dim;
                $vec[$idx] += 1.0;
            }
        }
        $norm = sqrt(array_sum(array_map(fn ($x) => $x * $x, $vec)));
        if ($norm > 0) {
            $vec = array_map(fn ($x) => $x / $norm, $vec);
        } else {
            $vec[0] = 1.0;
        }

        return $vec;
    }
}
