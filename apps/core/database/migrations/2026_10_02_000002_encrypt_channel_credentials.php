<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Meta access tokens and app secrets were stored in plaintext. The models now
 * use Laravel's `encrypted` cast; this encrypts the existing rows in place.
 * Rows that are already encrypted are left alone, so it is safe to re-run.
 *
 * The Python agent reads channel tokens with the same APP_KEY, so APP_KEY must
 * be identical for core and agent before this runs.
 */
return new class extends Migration
{
    /**
     * @var array<string, list<string>>
     */
    protected array $columns = [
        'channel_identities' => ['access_token'],
        'whatsapp_accounts' => ['access_token', 'app_secret'],
    ];

    public function up(): void
    {
        // An encrypted 32-character secret is ~270 characters: too long for varchar(255).
        Schema::table('whatsapp_accounts', function (Blueprint $table) {
            $table->text('app_secret')->nullable()->change();
        });

        $this->transform(fn (string $value) => $this->isEncrypted($value) ? null : Crypt::encryptString($value));
    }

    public function down(): void
    {
        $this->transform(fn (string $value) => $this->isEncrypted($value) ? Crypt::decryptString($value) : null);
    }

    /**
     * Apply $convert to every non-empty credential; a null result leaves the value as is.
     *
     * @param  \Closure(string): ?string  $convert
     */
    protected function transform(\Closure $convert): void
    {
        foreach ($this->columns as $table => $columns) {
            DB::table($table)->select(['id', ...$columns])->orderBy('id')
                ->chunkById(200, function ($rows) use ($table, $columns, $convert) {
                    foreach ($rows as $row) {
                        $updates = [];
                        foreach ($columns as $column) {
                            $value = $row->{$column};
                            if ($value === null || $value === '') {
                                continue;
                            }
                            $converted = $convert($value);
                            if ($converted !== null) {
                                $updates[$column] = $converted;
                            }
                        }

                        if ($updates !== []) {
                            DB::table($table)->where('id', $row->id)->update($updates);
                        }
                    }
                });
        }
    }

    protected function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (DecryptException) {
            return false;
        }
    }
};
