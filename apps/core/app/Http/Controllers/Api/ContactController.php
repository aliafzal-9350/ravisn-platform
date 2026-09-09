<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    /**
     * Update customer contact attributes and internal notes.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'company_name' => 'nullable|string|max:255',
            'industry' => 'nullable|string|max:255',
            'lead_stage' => 'nullable|string|max:255',
            'internal_notes' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $phoneNumber = $validated['phone_number'] ?? $validated['phone'] ?? $contact->phone_number ?? $contact->phone;
        $internalNotes = $validated['internal_notes'] ?? $validated['notes'] ?? $contact->internal_notes;

        // Synchronize custom attributes for fallback
        $customAttributes = $contact->custom_attributes ?? [];
        if (isset($validated['company_name'])) {
            $customAttributes['company_name'] = $validated['company_name'];
        }
        if (isset($validated['industry'])) {
            $customAttributes['industry'] = $validated['industry'];
        }
        if (isset($validated['lead_stage'])) {
            $customAttributes['lead_stage'] = $validated['lead_stage'];
        }

        $contact->fill([
            'name' => $validated['name'] ?? $contact->name,
            'phone_number' => $phoneNumber,
            'phone' => $phoneNumber,
            'email' => array_key_exists('email', $validated) ? $validated['email'] : $contact->email,
            'company_name' => $validated['company_name'] ?? $contact->company_name,
            'industry' => $validated['industry'] ?? $contact->industry,
            'lead_stage' => $validated['lead_stage'] ?? $contact->lead_stage,
            'internal_notes' => $internalNotes,
            'notes' => $internalNotes,
            'custom_attributes' => $customAttributes,
        ]);

        $contact->save();

        Log::info("[ContactController] Updated contact {$contact->id} successfully.");

        return response()->json([
            'status' => 'success',
            'message' => 'Contact details and internal notes saved successfully.',
            'contact' => [
                'id' => (string) $contact->id,
                'name' => $contact->name,
                'full_name' => $contact->full_name,
                'phone_number' => $contact->phone_number ?? $contact->phone,
                'phone' => $contact->phone ?? $contact->phone_number,
                'email' => $contact->email,
                'company_name' => $contact->company_name,
                'industry' => $contact->industry,
                'lead_stage' => $contact->lead_stage,
                'internal_notes' => $contact->internal_notes,
                'notes' => $contact->notes,
                'updated_at' => $contact->updated_at?->toISOString() ?? now()->toISOString(),
            ],
        ]);
    }
}
