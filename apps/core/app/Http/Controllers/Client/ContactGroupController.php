<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ContactGroupController extends Controller
{
    /**
     * Get members of a specific contact group.
     */
    public function members(Request $request, ContactGroup $group): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if ((string) $group->tenant_id !== (string) $tenant->id) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $members = $group->contacts()
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => (string) $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
            ]);

        return response()->json($members);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): InertiaResponse
    {
        $tenant = $request->user()->tenant;

        $groups = $tenant->contactGroups()
            ->withCount('contacts')
            ->latest()
            ->paginate(15)
            ->through(fn ($group) => [
                'id' => (string) $group->id,
                'name' => $group->name,
                'description' => $group->description,
                'contacts_count' => $group->contacts_count,
                'created_at' => $group->created_at->format('Y-m-d H:i'),
            ]);

        // Get all contacts of this tenant to allow adding them easily to groups in modals
        $allContacts = $tenant->contacts()
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => (string) $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
            ]);

        return Inertia::render('client/contact-groups/index', [
            'groups' => $groups,
            'allContacts' => $allContacts,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $tenant = $request->user()->tenant;

        $tenant->contactGroups()->create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contact group created successfully!')]);

        return back();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ContactGroup $contactGroup): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        if ((string) $contactGroup->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $contactGroup->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contact group updated successfully!')]);

        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, ContactGroup $contactGroup): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        if ((string) $contactGroup->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $contactGroup->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contact group deleted successfully.')]);

        return back();
    }

    /**
     * Add multiple contacts to a group.
     */
    public function addContacts(Request $request, ContactGroup $group): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        if ((string) $group->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $validated = $request->validate([
            'contact_ids' => ['required', 'array'],
            'contact_ids.*' => ['string', 'exists:contacts,id'],
        ]);

        // Securely filter only tenant's contacts
        $contactIds = Contact::whereIn('id', $validated['contact_ids'])
            ->where('tenant_id', (string) $tenant->id)
            ->pluck('id')
            ->toArray();

        $group->contacts()->syncWithoutDetaching($contactIds);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contacts added to the group successfully!')]);

        return back();
    }

    /**
     * Remove a contact from a group.
     */
    public function removeContact(Request $request, ContactGroup $group, Contact $contact): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        if ((string) $group->tenant_id !== (string) $tenant->id || (string) $contact->tenant_id !== (string) $tenant->id) {
            abort(403);
        }

        $group->contacts()->detach((string) $contact->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contact removed from group.')]);

        return back();
    }
}
