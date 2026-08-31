<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): InertiaResponse
    {
        $tenant = $request->user()->tenant;

        $query = $tenant->contacts()->with('groups');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('group_id')) {
            $groupId = $request->input('group_id');
            $query->whereHas('groups', function ($q) use ($groupId) {
                $q->where('contact_groups.id', $groupId);
            });
        }

        $contacts = $query->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn ($contact) => [
                'id' => (string) $contact->id,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'email' => $contact->email,
                'notes' => $contact->notes,
                'var1' => $contact->var1,
                'var2' => $contact->var2,
                'var3' => $contact->var3,
                'var4' => $contact->var4,
                'var5' => $contact->var5,
                'groups' => $contact->groups->map(fn ($g) => [
                    'id' => (string) $g->id,
                    'name' => $g->name,
                ]),
                'created_at' => $contact->created_at->format('Y-m-d H:i'),
            ]);

        $groups = $tenant->contactGroups()
            ->withCount('contacts')
            ->get()
            ->map(fn ($g) => [
                'id' => (string) $g->id,
                'name' => $g->name,
                'description' => $g->description,
                'contacts_count' => $g->contacts_count,
            ]);

        $allContacts = $tenant->contacts()
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => (string) $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
            ]);

        $totalContactsCount = $tenant->contacts()->count();

        return Inertia::render('client/contacts/index', [
            'contacts' => $contacts,
            'groups' => $groups,
            'allContacts' => $allContacts,
            'totalContactsCount' => $totalContactsCount,
            'filters' => $request->only(['search', 'group_id']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string'],
            'var1' => ['nullable', 'string', 'max:255'],
            'var2' => ['nullable', 'string', 'max:255'],
            'var3' => ['nullable', 'string', 'max:255'],
            'var4' => ['nullable', 'string', 'max:255'],
            'var5' => ['nullable', 'string', 'max:255'],
            'group_ids' => ['nullable', 'array'],
            'group_ids.*' => ['string', 'exists:contact_groups,id'],
        ]);

        $tenant = $request->user()->tenant;

        // Clean phone number (keep only + and digits)
        $phone = $validated['phone'];
        if (! str_starts_with($phone, '+')) {
            $phone = '+'.preg_replace('/[^0-9]/', '', $phone);
        } else {
            $phone = '+'.preg_replace('/[^0-9]/', '', substr($phone, 1));
        }

        $contact = $tenant->contacts()->create([
            'name' => $validated['name'],
            'phone' => $phone,
            'email' => $validated['email'],
            'notes' => $validated['notes'],
            'var1' => $validated['var1'] ?? null,
            'var2' => $validated['var2'] ?? null,
            'var3' => $validated['var3'] ?? null,
            'var4' => $validated['var4'] ?? null,
            'var5' => $validated['var5'] ?? null,
        ]);

        if (! empty($validated['group_ids'])) {
            $contact->groups()->sync($validated['group_ids']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contact created successfully!')]);

        return to_route('client.contacts.index');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Contact $contact): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        if ((string) $contact->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string'],
            'var1' => ['nullable', 'string', 'max:255'],
            'var2' => ['nullable', 'string', 'max:255'],
            'var3' => ['nullable', 'string', 'max:255'],
            'var4' => ['nullable', 'string', 'max:255'],
            'var5' => ['nullable', 'string', 'max:255'],
            'group_ids' => ['nullable', 'array'],
            'group_ids.*' => ['string', 'exists:contact_groups,id'],
        ]);

        // Clean phone number
        $phone = $validated['phone'];
        if (! str_starts_with($phone, '+')) {
            $phone = '+'.preg_replace('/[^0-9]/', '', $phone);
        } else {
            $phone = '+'.preg_replace('/[^0-9]/', '', substr($phone, 1));
        }

        $contact->update([
            'name' => $validated['name'],
            'phone' => $phone,
            'email' => $validated['email'],
            'notes' => $validated['notes'],
            'var1' => $validated['var1'] ?? null,
            'var2' => $validated['var2'] ?? null,
            'var3' => $validated['var3'] ?? null,
            'var4' => $validated['var4'] ?? null,
            'var5' => $validated['var5'] ?? null,
        ]);

        if (isset($validated['group_ids'])) {
            $contact->groups()->sync($validated['group_ids']);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contact updated successfully!')]);

        return to_route('client.contacts.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Contact $contact): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        if ((string) $contact->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $contact->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contact deleted successfully.')]);

        return to_route('client.contacts.index');
    }

    /**
     * Import contacts from a CSV file.
     */
    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'], // Max 5MB
            'group_ids' => ['nullable', 'array'],
            'group_ids.*' => ['string', 'exists:contact_groups,id'],
        ]);

        $tenant = $request->user()->tenant;
        $file = $request->file('file');

        if (($handle = fopen($file->getRealPath(), 'r')) !== false) {
            // Get headers
            $headers = fgetcsv($handle);

            if (! $headers) {
                fclose($handle);
                Inertia::flash('toast', ['type' => 'error', 'message' => __('CSV file is empty.')]);

                return to_route('client.contacts.index');
            }

            // Normalize headers: lowercase and trim
            $headers = array_map(fn ($h) => strtolower(trim($h)), $headers);

            // Find index of expected fields
            $nameIdx = array_search('name', $headers);
            $phoneIdx = array_search('phone', $headers);
            $emailIdx = array_search('email', $headers);
            $notesIdx = array_search('notes', $headers);
            $var1Idx = array_search('var1', $headers);
            $var2Idx = array_search('var2', $headers);
            $var3Idx = array_search('var3', $headers);
            $var4Idx = array_search('var4', $headers);
            $var5Idx = array_search('var5', $headers);

            if ($nameIdx === false || $phoneIdx === false) {
                fclose($handle);
                Inertia::flash('toast', [
                    'type' => 'error',
                    'message' => __('Invalid CSV format. Missing required "name" or "phone" column.'),
                ]);

                return to_route('client.contacts.index');
            }

            $imported = 0;
            while (($row = fgetcsv($handle)) !== false) {
                $name = $row[$nameIdx] ?? '';
                $rawPhone = $row[$phoneIdx] ?? '';

                if (empty($name) || empty($rawPhone)) {
                    continue;
                }

                // Clean phone number
                if (! str_starts_with($rawPhone, '+')) {
                    $phone = '+'.preg_replace('/[^0-9]/', '', $rawPhone);
                } else {
                    $phone = '+'.preg_replace('/[^0-9]/', '', substr($rawPhone, 1));
                }

                $email = $emailIdx !== false ? ($row[$emailIdx] ?? null) : null;
                $notes = $notesIdx !== false ? ($row[$notesIdx] ?? null) : null;
                $var1 = $var1Idx !== false ? ($row[$var1Idx] ?? null) : null;
                $var2 = $var2Idx !== false ? ($row[$var2Idx] ?? null) : null;
                $var3 = $var3Idx !== false ? ($row[$var3Idx] ?? null) : null;
                $var4 = $var4Idx !== false ? ($row[$var4Idx] ?? null) : null;
                $var5 = $var5Idx !== false ? ($row[$var5Idx] ?? null) : null;

                // Create or update contact
                $contact = $tenant->contacts()->updateOrCreate(
                    ['phone' => $phone],
                    [
                        'name' => $name,
                        'email' => $email,
                        'notes' => $notes,
                        'var1' => $var1,
                        'var2' => $var2,
                        'var3' => $var3,
                        'var4' => $var4,
                        'var5' => $var5,
                    ]
                );

                if (! empty($request->group_ids)) {
                    // Attach to groups without removing existing ones
                    $contact->groups()->syncWithoutDetaching($request->group_ids);
                }

                $imported++;
            }

            fclose($handle);

            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __(':count contacts imported successfully!', ['count' => $imported]),
            ]);
        } else {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Failed to open the uploaded file.')]);
        }

        return to_route('client.contacts.index');
    }

    /**
     * Export all contacts to a CSV file.
     */
    public function export(Request $request): StreamedResponse
    {
        $tenant = $request->user()->tenant;
        $contacts = $tenant->contacts()->with('groups')->get();

        $headers = [
            'Content-type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=contacts_export_'.now()->format('Y-m-d').'.csv',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($contacts) {
            $file = fopen('php://output', 'w');

            // Add UTF-8 BOM for Arabic encoding support in Excel
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, ['Name', 'Phone', 'Email', 'Groups', 'Notes', 'Var1', 'Var2', 'Var3', 'Var4', 'Var5', 'Created At']);

            foreach ($contacts as $contact) {
                $groupsList = $contact->groups->pluck('name')->join(', ');
                fputcsv($file, [
                    $contact->name,
                    $contact->phone,
                    $contact->email,
                    $groupsList,
                    $contact->notes,
                    $contact->var1,
                    $contact->var2,
                    $contact->var3,
                    $contact->var4,
                    $contact->var5,
                    $contact->created_at->format('Y-m-d H:i'),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
