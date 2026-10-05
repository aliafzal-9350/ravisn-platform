<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\TeamInvitationController;
use App\Http\Controllers\Client\AutomationFlowController;
use App\Http\Controllers\Client\BookingController;
use App\Http\Controllers\Client\CampaignController;
use App\Http\Controllers\Client\ChannelController;
use App\Http\Controllers\Client\ContactController;
use App\Http\Controllers\Client\ContactGroupController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Client\DeveloperController;
use App\Http\Controllers\Client\InboxController;
use App\Http\Controllers\Client\KnowledgeController;
use App\Http\Controllers\Client\MessageTemplateController;
use App\Http\Controllers\Client\SettingsController;
use App\Http\Controllers\Client\SimulatorController;
use App\Http\Controllers\Client\SystemPromptController;
use App\Http\Controllers\Client\TeamController;
use App\Http\Controllers\Client\WhatsappAccountController;
use App\Http\Controllers\Crm\ChatController as CrmChatController;
use App\Http\Controllers\Webhook\WhatsAppWebhookController;
use App\Http\Controllers\Webhooks\MetaWebhookController;
use App\Models\SystemNotification;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login')->name('home');

Route::get('/privacy', function () {
    if (auth()->check()) {
        return redirect('/dashboard/privacy');
    }
    return Inertia::render('Privacy');
})->name('privacy');

Route::get('/data-deletion', function () {
    if (auth()->check()) {
        return redirect('/dashboard/data-deletion');
    }
    return Inertia::render('DataDeletion');
})->name('data-deletion');

Route::get('/terms', function () {
    if (auth()->check()) {
        return redirect('/dashboard/terms');
    }
    return Inertia::render('Terms');
})->name('terms');

// Google Socialite OAuth Routes
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');

// Team invitation links (opened by people who do not have an account yet)
Route::middleware(['guest', 'throttle:20,1'])->group(function () {
    Route::get('invitations/{token}', [TeamInvitationController::class, 'show'])->name('team.invitations.show');
    Route::post('invitations/{token}', [TeamInvitationController::class, 'accept'])->name('team.invitations.accept');
});

require __DIR__.'/settings.php';

// Webhook Routes (Meta & WhatsApp)
Route::prefix('webhook')->name('webhook.')->group(function () {
    Route::get('meta', [MetaWebhookController::class, 'verify'])->name('meta.verify');
    Route::post('meta', [MetaWebhookController::class, 'handle'])->name('meta.handle');
    Route::get('whatsapp/{tenant_token?}', [WhatsAppWebhookController::class, 'verify'])->name('whatsapp.verify');
    Route::post('whatsapp/{tenant_token?}', [WhatsAppWebhookController::class, 'handle'])->name('whatsapp.handle');
});

// Client / Dashboard Routes
Route::middleware(['auth', 'verified'])
    ->prefix('dashboard')
    ->group(function () {
        // Main Dashboard (maps to named route 'dashboard')
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

        // All other routes prefixed with 'client.' name
        Route::name('client.')->group(function () {
            // Legal Compliance
            Route::get('privacy', [SettingsController::class, 'privacy'])->name('privacy');
            Route::get('terms', [SettingsController::class, 'terms'])->name('terms');
            Route::get('data-deletion', [SettingsController::class, 'dataDeletion'])->name('data-deletion');

            // Contacts (agents can view, add and edit; deleting and bulk import/export stay with admins)
            Route::resource('contacts', ContactController::class)->only(['index', 'store', 'update']);

            // Inbox & Threads
            Route::get('inbox', [InboxController::class, 'index'])->name('inbox.index');
            Route::get('inbox/chats/{chat}/messages', [InboxController::class, 'messages'])->name('inbox.messages');
            Route::post('inbox/chats/{chat}/send', [InboxController::class, 'sendMessage'])->name('inbox.send');
            Route::post('inbox/chats/{chat}/toggle-ai', [InboxController::class, 'toggleAi'])->name('inbox.toggle-ai');

            // Omni-channel Thread Human Takeover Toggle API
            Route::patch('threads/{thread}/takeover', [CrmChatController::class, 'toggleTakeover'])->name('threads.takeover');

            // Channel profile pictures (our stored copy, tenant scoped)
            Route::get('connect/{channel}/avatar', [ChannelController::class, 'avatar'])
                ->whereIn('channel', ['whatsapp', 'instagram', 'messenger'])
                ->name('connect.avatar');

            // Notifications
            Route::post('notifications/{notification}/read', function (SystemNotification $notification) {
                if ((string) $notification->tenant_id === (string) auth()->user()->tenant_id) {
                    $notification->update(['read_at' => now()]);
                }

                return back();
            })->name('notifications.read');

            Route::post('notifications/read-all', function () {
                $user = auth()->user();
                $query = SystemNotification::whereNull('read_at');
                if ($user->tenant_id) {
                    $query->where('tenant_id', $user->tenant_id);
                } else {
                    $query->whereNull('tenant_id');
                }
                $query->update(['read_at' => now()]);

                return back();
            })->name('notifications.read-all');

            // Workspace administration: admins only, agents receive a 403
            Route::middleware('role:admin')->group(function () {
                // Connect Channels Hub
                Route::get('connect', [ChannelController::class, 'index'])->name('connect.index');
                Route::post('connect/sync', [ChannelController::class, 'sync'])->name('connect.sync');
                Route::post('connect/manual-link/whatsapp', [ChannelController::class, 'manualLinkWhatsApp'])->name('connect.manual-link.whatsapp');
                Route::post('connect/webhook-token', [ChannelController::class, 'updateWebhookToken'])->name('connect.webhook-token');
                Route::post('connect/{channel}/token', [ChannelController::class, 'updateToken'])->name('connect.token');
                Route::post('connect/{channel}/test-ping', [ChannelController::class, 'testPing'])->name('connect.test-ping');
                Route::delete('connect/{channel}', [ChannelController::class, 'disconnect'])->name('connect.disconnect');
                Route::post('connect/whatsapp/sync-templates', [ChannelController::class, 'syncTemplates'])->name('connect.sync-templates');

                // Bookings & Lead Intelligence
                Route::get('bookings', [BookingController::class, 'index'])->name('bookings.index');
                Route::get('bookings/{contact}/summary', [BookingController::class, 'showSummary'])->name('bookings.summary');

                // Knowledge Base Manager (pgvector RAG)
                Route::get('knowledge', [KnowledgeController::class, 'index'])->name('knowledge.index');
                Route::post('knowledge/entry', [KnowledgeController::class, 'storeEntry'])->name('knowledge.entry.store');
                Route::put('knowledge/entry/{id}', [KnowledgeController::class, 'updateEntry'])->name('knowledge.entry.update');
                Route::delete('knowledge/entry/{id}', [KnowledgeController::class, 'destroyEntry'])->name('knowledge.entry.destroy');
                Route::delete('knowledge/all', [KnowledgeController::class, 'destroyAll'])->name('knowledge.destroyAll');
                Route::post('knowledge/delete-all', [KnowledgeController::class, 'destroyAll'])->name('knowledge.deleteAll');
                Route::post('knowledge/upload', [KnowledgeController::class, 'upload'])->name('knowledge.upload');
                Route::delete('knowledge/{id}', [KnowledgeController::class, 'destroy'])->name('knowledge.destroy');

                // System Prompt Tuning
                Route::get('prompt-tuning', [SystemPromptController::class, 'index'])->name('prompt-tuning.index');
                Route::post('prompt-tuning', [SystemPromptController::class, 'update'])->name('prompt-tuning.update');

                // Live AI Simulator & Playground
                Route::get('simulator', [SimulatorController::class, 'index'])->name('simulator.index');
                Route::post('simulator/query', [SimulatorController::class, 'query'])->name('simulator.query');

                // Workspace Settings
                Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');

                // WhatsApp Accounts
                Route::get('whatsapp-accounts', [WhatsappAccountController::class, 'index'])->name('whatsapp-accounts.index');
                Route::get('whatsapp-accounts/create', [WhatsappAccountController::class, 'create'])->name('whatsapp-accounts.create');
                Route::post('whatsapp-accounts/request-code', [WhatsappAccountController::class, 'requestCode'])->name('whatsapp-accounts.request-code');
                Route::post('whatsapp-accounts/{account}/verify', [WhatsappAccountController::class, 'verify'])->name('whatsapp-accounts.verify');
                Route::post('whatsapp-accounts/sync', [WhatsappAccountController::class, 'sync'])->name('whatsapp-accounts.sync');
                Route::post('whatsapp-accounts/embedded-signup', [WhatsappAccountController::class, 'embeddedSignup'])->name('whatsapp-accounts.embedded-signup');
                Route::put('whatsapp-accounts/{account}', [WhatsappAccountController::class, 'update'])->name('whatsapp-accounts.update');
                Route::delete('whatsapp-accounts/{account}', [WhatsappAccountController::class, 'destroy'])->name('whatsapp-accounts.destroy');

                // Contacts: destructive and bulk operations
                Route::resource('contacts', ContactController::class)->only(['destroy']);
                Route::post('contacts/import', [ContactController::class, 'import'])->name('contacts.import');
                Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');

                // Contact Groups
                Route::resource('contact-groups', ContactGroupController::class)->except(['create', 'show', 'edit']);
                Route::get('contact-groups/{group}/members', [ContactGroupController::class, 'members'])->name('contact-groups.members');
                Route::post('contact-groups/{group}/contacts', [ContactGroupController::class, 'addContacts'])->name('contact-groups.add-contacts');
                Route::delete('contact-groups/{group}/contacts/{contact}', [ContactGroupController::class, 'removeContact'])->name('contact-groups.remove-contact');

                // Developer Panel
                Route::get('developer', [DeveloperController::class, 'index'])->name('developer.index');
                Route::post('developer/keys', [DeveloperController::class, 'storeKey'])->name('developer.keys.store');
                Route::delete('developer/keys/{key}', [DeveloperController::class, 'destroyKey'])->name('developer.keys.destroy');
                Route::post('developer/webhooks', [DeveloperController::class, 'storeWebhook'])->name('developer.webhooks.store');
                Route::put('developer/webhooks/{webhook}/toggle', [DeveloperController::class, 'toggleWebhook'])->name('developer.webhooks.toggle');
                Route::delete('developer/webhooks/{webhook}', [DeveloperController::class, 'destroyWebhook'])->name('developer.webhooks.destroy');

                // Automation Flows
                Route::put('automations/strategy', [AutomationFlowController::class, 'updateStrategy'])->name('automations.strategy');
                Route::post('automations/import', [AutomationFlowController::class, 'import'])->name('automations.import');
                Route::get('automations/{automation}/export', [AutomationFlowController::class, 'export'])->name('automations.export');
                Route::resource('automations', AutomationFlowController::class)->except(['show']);
                Route::put('automations/{automation}/toggle', [AutomationFlowController::class, 'toggle'])->name('automations.toggle');

                // Message Templates
                Route::get('templates', [MessageTemplateController::class, 'index'])->name('templates.index');
                Route::get('templates/create', [MessageTemplateController::class, 'create'])->name('templates.create');
                Route::post('templates', [MessageTemplateController::class, 'store'])->name('templates.store');
                Route::get('templates/{template}', [MessageTemplateController::class, 'show'])->name('templates.show');
                Route::delete('templates/{template}', [MessageTemplateController::class, 'destroy'])->name('templates.destroy');
                Route::post('templates/sync', [MessageTemplateController::class, 'sync'])->name('templates.sync');

                // Campaigns
                Route::get('campaigns', [CampaignController::class, 'index'])->name('campaigns.index');
                Route::get('campaigns/create', [CampaignController::class, 'create'])->name('campaigns.create');
                Route::post('campaigns', [CampaignController::class, 'store'])->name('campaigns.store');
                Route::get('campaigns/{campaign}', [CampaignController::class, 'show'])->name('campaigns.show');
                Route::delete('campaigns/{campaign}', [CampaignController::class, 'destroy'])->name('campaigns.destroy');
                Route::post('campaigns/{campaign}/start', [CampaignController::class, 'start'])->name('campaigns.start');
                Route::post('campaigns/{campaign}/pause', [CampaignController::class, 'pause'])->name('campaigns.pause');
                Route::post('campaigns/upload-recipients', [CampaignController::class, 'uploadRecipients'])->name('campaigns.upload-recipients');

                // Team management
                Route::get('team', [TeamController::class, 'index'])->name('team.index');
                Route::post('team/invitations', [TeamController::class, 'invite'])->middleware('throttle:20,1')->name('team.invite');
                Route::post('team/invitations/{invitation}/resend', [TeamController::class, 'resend'])->middleware('throttle:20,1')->name('team.invitations.resend');
                Route::delete('team/invitations/{invitation}', [TeamController::class, 'revoke'])->name('team.invitations.revoke');
                Route::patch('team/members/{member}', [TeamController::class, 'updateRole'])->name('team.members.update');
                Route::delete('team/members/{member}', [TeamController::class, 'destroy'])->name('team.members.destroy');
            });
        });
    });
