<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Controllers\DashboardController as MainDashboardController;
use Illuminate\Http\Request;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the enterprise-grade dual-engine operational dashboard.
     */
    public function index(Request $request): Response
    {
        return (new MainDashboardController())->index($request);
    }
}
