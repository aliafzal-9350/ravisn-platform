<?php

use App\Http\Controllers\Client\AutomationFlowController;
use App\Http\Controllers\Client\CampaignController;
use App\Http\Controllers\Client\ContactController;
use App\Http\Controllers\Client\ContactGroupController;
use App\Http\Controllers\Client\DashboardController as ClientDashboardController;
use App\Http\Controllers\Client\DeveloperController;
use App\Http\Controllers\Client\InboxController;
use App\Http\Controllers\Client\MessageTemplateController;
use App\Http\Controllers\Client\WhatsappAccountController;
use App\Http\Controllers\Webhook\WhatsAppWebhookController;
use App\Models\SystemNotification;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login')->name('home');

Route::get('/privacy', function () {
    return Inertia::render('Privacy');
})->name('privacy');

Route::get('/data-deletion', function () {
    return Inertia::render('DataDeletion');
})->name('data-deletion');

Route::get('/terms', function () {
    return Inertia::render('Terms');
})->name('terms');

require __DIR__.'/settings.php';

// Webhook Routes
Route::prefix('webhook')->name('webhook.')->group(function () {
    Route::get('whatsapp/{tenant_token?}', [WhatsAppWebhookController::class, 'verify'])->name('whatsapp.verify');
    Route::post('whatsapp/{tenant_token?}', [WhatsAppWebhookController::class, 'handle'])->name('whatsapp.handle');
});

// Client / Dashboard Routes
Route::middleware(['auth', 'verified', 'client'])
    ->prefix('dashboard')
    ->group(function () {
        // Main Dashboard (maps to named route 'dashboard')
        Route::get('/', [ClientDashboardController::class, 'index'])->name('dashboard');

        // All other routes prefixed with 'client.' name
        Route::name('client.')->group(function () {
            // WhatsApp Accounts
            Route::get('whatsapp-accounts', [WhatsappAccountController::class, 'index'])->name('whatsapp-accounts.index');
            Route::get('whatsapp-accounts/create', [WhatsappAccountController::class, 'create'])->name('whatsapp-accounts.create');
            Route::post('whatsapp-accounts/request-code', [WhatsappAccountController::class, 'requestCode'])->name('whatsapp-accounts.request-code');
            Route::post('whatsapp-accounts/{account}/verify', [WhatsappAccountController::class, 'verify'])->name('whatsapp-accounts.verify');
            Route::post('whatsapp-accounts/sync', [WhatsappAccountController::class, 'sync'])->name('whatsapp-accounts.sync');
            Route::post('whatsapp-accounts/embedded-signup', [WhatsappAccountController::class, 'embeddedSignup'])->name('whatsapp-accounts.embedded-signup');
            Route::put('whatsapp-accounts/{account}', [WhatsappAccountController::class, 'update'])->name('whatsapp-accounts.update');
            Route::delete('whatsapp-accounts/{account}', [WhatsappAccountController::class, 'destroy'])->name('whatsapp-accounts.destroy');

            // Contacts
            Route::resource('contacts', ContactController::class)->except(['create', 'show', 'edit']);
            Route::post('contacts/import', [ContactController::class, 'import'])->name('contacts.import');
            Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');

            // Contact Groups
            Route::resource('contact-groups', ContactGroupController::class)->except(['create', 'show', 'edit']);
            Route::get('contact-groups/{group}/members', [ContactGroupController::class, 'members'])->name('contact-groups.members');
            Route::post('contact-groups/{group}/contacts', [ContactGroupController::class, 'addContacts'])->name('contact-groups.add-contacts');
            Route::delete('contact-groups/{group}/contacts/{contact}', [ContactGroupController::class, 'removeContact'])->name('contact-groups.remove-contact');

            // Inbox
            Route::get('inbox', [InboxController::class, 'index'])->name('inbox.index');
            Route::get('inbox/chats/{chat}/messages', [InboxController::class, 'messages'])->name('inbox.messages');
            Route::post('inbox/chats/{chat}/send', [InboxController::class, 'sendMessage'])->name('inbox.send');
            Route::post('inbox/chats/{chat}/toggle-ai', [InboxController::class, 'toggleAi'])->name('inbox.toggle-ai');

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
        });
    });
