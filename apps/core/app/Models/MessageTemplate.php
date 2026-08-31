<?php

namespace App\Models;

use Database\Factories\MessageTemplateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'whatsapp_account_id', 'meta_template_id', 'name',
    'language', 'category', 'status', 'components', 'rejection_reason',
])]
class MessageTemplate extends Model
{
    /** @use HasFactory<MessageTemplateFactory> */
    use HasFactory;

    /**
     * The data type of the primary key ID.
     *
     * @var string
     */
    protected $keyType = 'string';



    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'tenant_id' => 'string',
            'whatsapp_account_id' => 'string',
            'meta_template_id' => 'string',
            'components' => 'array',
        ];
    }

    /**
     * Get the tenant that owns the template.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the WhatsApp account for the template.
     */
    public function whatsappAccount(): BelongsTo
    {
        return $this->belongsTo(WhatsappAccount::class);
    }

    /**
     * Get the campaigns using this template.
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /**
     * Determine if the template is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Map a flat array of values to the template body parameters format.
     * Supports both named and positional parameters.
     *
     * @param  array<int, string>  $values
     * @return array<int, array<string, string>>
     */
    public function getBodyParameters(array $values): array
    {
        $parameters = [];
        $components = $this->components;

        if (is_string($components)) {
            $components = json_decode($components, true) ?: [];
        }

        // Find the BODY component
        $bodyComponent = null;
        foreach ($components as $component) {
            $type = $component['type'] ?? '';
            if (strtoupper($type) === 'BODY') {
                $bodyComponent = $component;
                break;
            }
        }

        if ($bodyComponent && isset($bodyComponent['text'])) {
            $text = $bodyComponent['text'];
            // Find all placeholders matching {{name}}
            preg_match_all('/\{\{\s*([^}]+)\s*\}\}/', $text, $matches);

            if (! empty($matches[1])) {
                foreach ($matches[1] as $index => $paramName) {
                    $paramName = trim($paramName);
                    $value = $values[$index] ?? '';

                    $param = [
                        'type' => 'text',
                        'text' => (string) $value,
                    ];

                    // If it is not a pure integer, it's a named parameter!
                    if (! ctype_digit($paramName)) {
                        $param['parameter_name'] = $paramName;
                    }

                    $parameters[] = $param;
                }

                return $parameters;
            }

            // Body exists but has 0 placeholders: return empty
            return [];
        }

        return [];
    }

    /**
     * Build all template components (body, buttons, header) for the WhatsApp API.
     *
     * This inspects the stored template definition and maps the flat variables
     * array to every component that contains placeholders — not just the body.
     *
     * @param  array<int, string>  $values
     * @return array<int, array<string, mixed>>
     */
    public function getTemplateComponents(array $values): array
    {
        $result = [];
        $components = $this->components;

        if (is_string($components)) {
            $components = json_decode($components, true) ?: [];
        }

        // Body parameters (reuse existing logic)
        $bodyParams = $this->getBodyParameters($values);
        $bodyParamCount = count($bodyParams);
        $totalValuesCount = count($values);
        $useOffset = $totalValuesCount > $bodyParamCount;

        if (! empty($bodyParams)) {
            $result[] = [
                'type' => 'body',
                'parameters' => $bodyParams,
            ];
        }

        // Button parameters — URL buttons may contain {{1}} placeholders
        foreach ($components as $component) {
            $type = strtoupper($component['type'] ?? '');
            if ($type !== 'BUTTONS' || empty($component['buttons'])) {
                continue;
            }

            foreach ($component['buttons'] as $buttonIndex => $button) {
                $buttonType = strtoupper($button['type'] ?? '');
                if ($buttonType !== 'URL') {
                    continue;
                }

                $url = $button['url'] ?? '';
                preg_match_all('/\{\{\s*([^}]+)\s*\}\}/', $url, $urlMatches);

                if (empty($urlMatches[1])) {
                    continue;
                }

                $buttonParams = [];
                foreach ($urlMatches[1] as $urlParamIndex => $paramName) {
                    $paramName = trim($paramName);
                    // Button placeholders are typically {{1}}, map to body values positionally
                    $paramNumber = ctype_digit($paramName) ? ((int) $paramName - 1) : $urlParamIndex;
                    if ($useOffset) {
                        $paramNumber += $bodyParamCount;
                    }
                    $buttonParams[] = [
                        'type' => 'text',
                        'text' => (string) ($values[$paramNumber] ?? ''),
                    ];
                }

                $result[] = [
                    'type' => 'button',
                    'sub_type' => 'url',
                    'index' => (string) $buttonIndex,
                    'parameters' => $buttonParams,
                ];
            }
        }

        return $result;
    }

    /**
     * Reconstruct the actual formatted message body with variables injected.
     *
     * @param  array<int, string>  $values
     */
    public function formatBodyText(array $values): string
    {
        $components = $this->components;

        if (is_string($components)) {
            $components = json_decode($components, true) ?: [];
        }

        // Find the BODY component
        $bodyComponent = null;
        foreach ($components as $component) {
            $type = $component['type'] ?? '';
            if (strtoupper($type) === 'BODY') {
                $bodyComponent = $component;
                break;
            }
        }

        if (! $bodyComponent || ! isset($bodyComponent['text'])) {
            return "Template: {$this->name}".(! empty($values) ? ' ('.implode(', ', $values).')' : '');
        }

        $text = $bodyComponent['text'];

        // Find all placeholders matching {{name}} or {{1}}
        preg_match_all('/\{\{\s*([^}]+)\s*\}\}/', $text, $matches);

        if (! empty($matches[0])) {
            foreach ($matches[0] as $index => $placeholder) {
                $value = $values[$index] ?? '';
                $pos = strpos($text, $placeholder);
                if ($pos !== false) {
                    $text = substr_replace($text, (string) $value, $pos, strlen($placeholder));
                }
            }
        }

        return $text;
    }
}
