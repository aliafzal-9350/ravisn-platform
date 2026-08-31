<?php

namespace App\Http\Controllers\Crm;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response|JsonResponse
    {
        $query = Contact::query()->orderBy('created_at', 'desc');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                    ->orWhere('last_name', 'ilike', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $contacts = $query->paginate(25);

        if ($request->wantsJson()) {
            return response()->json($contacts);
        }

        return Inertia::render('client/contacts/index', [
            'contacts' => $contacts,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'tags' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
        ]);

        $contact = Contact::create($validated);
        return response()->json($contact, 201);
    }

    public function show(string $id): JsonResponse
    {
        $contact = Contact::with('threads.messages')->findOrFail($id);
        return response()->json($contact);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);
        $validated = $request->validate([
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'tags' => 'nullable|array',
            'custom_attributes' => 'nullable|array',
        ]);

        $contact->update($validated);
        return response()->json($contact);
    }

    public function destroy(string $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);
        $contact->delete();
        return response()->json(['status' => 'deleted']);
    }
}
