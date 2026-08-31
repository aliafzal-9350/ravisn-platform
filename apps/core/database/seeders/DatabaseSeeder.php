<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Community workspace
        $tenant = Tenant::updateOrCreate(
            ['email' => 'client@zeromsg.com'],
            [
                'name' => 'Demo Workspace',
                'status' => 'active',
                'meta_business_id' => '10928374829103',
            ]
        );

        // 2. Create workspace user
        User::updateOrCreate(
            ['email' => 'client@zeromsg.com'],
            [
                'name' => 'Client User',
                'password' => Hash::make('password'),
                'role' => 'client',
                'tenant_id' => $tenant->id,
            ]
        );
    }
}
