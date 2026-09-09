<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('contacts')) {
            Schema::table('contacts', function (Blueprint $table) {
                if (! Schema::hasColumn('contacts', 'company_name')) {
                    $table->string('company_name')->nullable()->after('email');
                }
                if (! Schema::hasColumn('contacts', 'industry')) {
                    $table->string('industry')->nullable()->after('company_name');
                }
                if (! Schema::hasColumn('contacts', 'lead_stage')) {
                    $table->string('lead_stage')->nullable()->default('Enterprise Lead (High Priority)')->after('industry');
                }
                if (! Schema::hasColumn('contacts', 'internal_notes')) {
                    $table->text('internal_notes')->nullable()->after('notes');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('contacts')) {
            Schema::table('contacts', function (Blueprint $table) {
                $columns = ['company_name', 'industry', 'lead_stage', 'internal_notes'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('contacts', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
