<?php

namespace App\Services\Automation;

class ConditionEvaluator
{
    /**
     * Match a condition action or raw expression string against incoming message text.
     */
    public static function matches(array|string|null $action, string $messageText): bool
    {
        if (is_array($action)) {
            return self::outcome($action, $messageText)['matched'];
        }

        if (is_string($action)) {
            return self::singleMatches($action, $messageText);
        }

        return true;
    }

    /**
     * @return array{matched: bool, branch_index: int|null}
     */
    public static function outcome(array $action, string $messageText): array
    {
        $conditions = $action['conditions'] ?? null;
        if (! is_array($conditions) || empty($conditions)) {
            return [
                'matched' => self::singleMatches($action['condition'] ?? null, $messageText),
                'branch_index' => 0,
            ];
        }

        $relation = strtoupper($action['conditions_relation'] ?? 'AND');

        if ($relation === 'OR') {
            foreach ($conditions as $conditionIndex => $cond) {
                if (self::singleMatches($cond, $messageText)) {
                    return [
                        'matched' => true,
                        'branch_index' => $conditionIndex,
                    ];
                }
            }

            return ['matched' => false, 'branch_index' => null];
        } else {
            foreach ($conditions as $cond) {
                if (! self::singleMatches($cond, $messageText)) {
                    return ['matched' => false, 'branch_index' => null];
                }
            }

            return ['matched' => true, 'branch_index' => 0];
        }
    }

    /**
     * Match a single condition object or expression string.
     */
    public static function singleMatches(array|string|null $cond, string $messageText): bool
    {
        if (is_array($cond)) {
            $operator = $cond['operator'] ?? 'contains';
            $expected = trim((string) ($cond['value'] ?? ''), " \t\n\r\0\x0B\"'");

            return match ($operator) {
                'equals' => strcasecmp($messageText, $expected) === 0,
                'starts_with' => str_starts_with(mb_strtolower($messageText), mb_strtolower($expected)),
                'ends_with' => str_ends_with(mb_strtolower($messageText), mb_strtolower($expected)),
                default => mb_stripos($messageText, $expected) !== false,
            };
        }

        $condition = trim((string) $cond);

        if ($condition === '') {
            return true;
        }

        if (preg_match('/^(?:\{\{\{senderMessage\}\}\}|message)\s+(contains|equals|starts_with|ends_with)\s+(.+)$/i', $condition, $matches)) {
            $operator = mb_strtolower($matches[1]);
            $expected = trim($matches[2], " \t\n\r\0\x0B\"'");

            return match ($operator) {
                'equals' => strcasecmp($messageText, $expected) === 0,
                'starts_with' => str_starts_with(mb_strtolower($messageText), mb_strtolower($expected)),
                'ends_with' => str_ends_with(mb_strtolower($messageText), mb_strtolower($expected)),
                default => mb_stripos($messageText, $expected) !== false,
            };
        }

        return mb_stripos($messageText, $condition) !== false;
    }
}
