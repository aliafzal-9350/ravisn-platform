<?php

namespace App\Http\Middleware;

use App\Models\SystemNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Laravel\Fortify\Features;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $notifications = [];
        $unshownToasts = [];
        $user = $request->user();

        if ($user) {
            // Fetch unread notifications for the user's workspace.
            if ($user->tenant_id) {
                $notificationsQuery = SystemNotification::where('tenant_id', $user->tenant_id);
            } else {
                $notificationsQuery = SystemNotification::whereNull('tenant_id');
            }

            // Get last 15 unread notifications
            $notifications = $notificationsQuery->clone()
                ->whereNull('read_at')
                ->latest()
                ->limit(15)
                ->get()
                ->map(fn ($n) => [
                    'id' => $n->id,
                    'title' => $n->title,
                    'message' => $n->message,
                    'type' => $n->type,
                    'created_at' => $n->created_at->diffForHumans(),
                ]);

            // Get unshown toasts
            $unshownToastsList = $notificationsQuery->clone()
                ->where('is_toast_shown', false)
                ->get();

            // Mark them as toast shown immediately
            if ($unshownToastsList->isNotEmpty()) {
                SystemNotification::whereIn('id', $unshownToastsList->pluck('id'))
                    ->update(['is_toast_shown' => true]);
            }

            $unshownToasts = $unshownToastsList->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->title,
                'message' => $n->message,
                'type' => $n->type,
            ]);
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'passkeysEnabled' => Features::enabled(Features::passkeys()),
            'whatsapp_app_id' => config('whatsapp.app_id', ''),
            'whatsapp_config_id' => config('whatsapp.config_id', ''),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'notifications' => $notifications,
            'unshownToasts' => $unshownToasts,
        ];
    }
}
