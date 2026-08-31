<?php

namespace App\Jobs;

use App\Models\MessageTemplate;
use App\Services\WhatsApp\WhatsAppCloudApi;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncTemplateStatus implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * Execute the job.
     */
    public function handle(WhatsAppCloudApi $whatsAppApi): void
    {
        $pendingTemplates = MessageTemplate::where('status', 'pending')
            ->with('whatsappAccount')
            ->get();

        foreach ($pendingTemplates as $template) {
            try {
                $account = $template->whatsappAccount;
                $wabaId = $account->waba_id;

                if (! $wabaId) {
                    continue;
                }

                if ($account->access_token) {
                    $whatsAppApi->withToken($account->access_token);
                } else {
                    $whatsAppApi->withToken(null); // Fallback to master
                }

                $remoteTemplates = $whatsAppApi->getTemplates($wabaId);

                foreach ($remoteTemplates as $remoteTemplate) {
                    if ($remoteTemplate['name'] === $template->name) {
                        $newStatus = strtolower($remoteTemplate['status'] ?? 'pending');

                        if ($newStatus !== $template->status) {
                            $template->update([
                                'status' => $newStatus,
                                'meta_template_id' => $remoteTemplate['id'] ?? $template->meta_template_id,
                                'rejection_reason' => $newStatus === 'rejected'
                                    ? ($remoteTemplate['rejected_reason'] ?? 'Rejected by Meta')
                                    : null,
                            ]);

                            Log::info("Template status updated: {$template->name}", [
                                'old_status' => $template->status,
                                'new_status' => $newStatus,
                            ]);
                        }

                        break;
                    }
                }
            } catch (\Exception $e) {
                Log::error("Failed to sync template status: {$template->name}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
