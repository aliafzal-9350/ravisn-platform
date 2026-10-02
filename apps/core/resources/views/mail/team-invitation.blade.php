<x-mail::message>
# Join {{ $workspace }}

@if ($inviter)
{{ $inviter }} has invited you to join **{{ $workspace }}** on {{ config('app.name') }} as {{ $role === 'admin' ? 'an administrator' : 'an agent' }}.
@else
You have been invited to join **{{ $workspace }}** on {{ config('app.name') }} as {{ $role === 'admin' ? 'an administrator' : 'an agent' }}.
@endif

<x-mail::button :url="$acceptUrl">
Accept invitation
</x-mail::button>

This invitation expires on {{ $expiresAt->format('F j, Y') }}. If you were not expecting it, you can ignore this email.
</x-mail::message>
