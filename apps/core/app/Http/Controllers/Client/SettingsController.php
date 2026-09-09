<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Display Platform Settings & Compliance.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('client/settings/index');
    }

    /**
     * Display Privacy Policy within Dashboard.
     */
    public function privacy(Request $request): Response
    {
        return Inertia::render('settings/privacy');
    }

    /**
     * Display Terms of Service within Dashboard.
     */
    public function terms(Request $request): Response
    {
        return Inertia::render('settings/terms');
    }

    /**
     * Display Data Deletion Instructions within Dashboard.
     */
    public function dataDeletion(Request $request): Response
    {
        return Inertia::render('settings/data-deletion');
    }
}
