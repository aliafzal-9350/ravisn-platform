<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to apply dark class immediately if the user has chosen dark mode --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? 'light' }}';

                if (appearance === 'dark') {
                    document.documentElement.classList.add('dark');
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.png" type="image/png">
        <link rel="shortcut icon" href="/favicon.png" type="image/png">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @php
            $component = $page['component'];
            $componentPath = "resources/js/pages/{$component}.tsx";
            if (file_exists(public_path('build/manifest.json'))) {
                $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true) ?? [];
                if (!isset($manifest[$componentPath])) {
                    $lowerPath = "resources/js/pages/" . strtolower($component) . ".tsx";
                    if (isset($manifest[$lowerPath])) {
                        $componentPath = $lowerPath;
                    }
                }
            }
        @endphp
        @vite(['resources/css/app.css', 'resources/js/app.tsx', $componentPath])
        <x-inertia::head>
            <title>{{ config('app.name', 'RAVISN') }}</title>
        </x-inertia::head>

        {{-- Meta Facebook JavaScript SDK for WhatsApp Embedded Signup --}}
        @if(config('whatsapp.app_id', config('services.whatsapp.app_id')))
        <script>
            window.fbAsyncInit = function() {
                FB.init({
                    appId      : '{{ config("whatsapp.app_id", config("services.whatsapp.app_id")) }}',
                    cookie     : true,
                    xfbml      : true,
                    version    : 'v21.0'
                });
            };
        </script>
        <script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>
        @endif
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
