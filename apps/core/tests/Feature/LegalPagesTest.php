<?php

use Inertia\Testing\AssertableInertia as Assert;

test('public legal pages are accessible unauthenticated', function (string $url, string $component) {
    $this->get($url)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    'privacy policy' => ['/privacy', 'Privacy'],
    'data deletion instructions' => ['/data-deletion', 'DataDeletion'],
    'terms of service' => ['/terms', 'Terms'],
]);
