<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\AutomationFlow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class AutomationFlowController extends Controller
{
    /**
     * @return array<string, array<int, string>>
     */
    private function flowValidationRules(): array
    {
        $actionTypes = implode(',', [
            'send_message',
            'send_email',
            'http_request',
            'google_sheets',
            'assign_agent',
            'save_response',
            'condition',
            'disable_autoreply',
            'delay',
            'add_to_group',
            'remove_from_group',
        ]);

        return [
            'name' => ['required', 'string', 'max:255'],
            'trigger_keyword' => ['nullable', 'string', 'max:255'],
            'trigger_match_type' => ['nullable', 'in:exact,contains'],
            'actions' => ['required', 'array', 'min:1'],
            'actions.*.type' => ['required', "in:{$actionTypes}"],
            'actions.*.text' => ['required_if:actions.*.type,send_message', 'nullable', 'string'],
            'actions.*.subject' => ['nullable', 'string', 'max:255'],
            'actions.*.email_to' => ['nullable', 'string', 'max:255'],
            'actions.*.url' => ['nullable', 'url', 'max:2048'],
            'actions.*.method' => ['nullable', 'in:GET,POST,PUT,PATCH,DELETE'],
            'actions.*.body' => ['nullable', 'string'],
            'actions.*.sheet_name' => ['nullable', 'string', 'max:255'],
            'actions.*.agent_name' => ['nullable', 'string', 'max:255'],
            'actions.*.response_field' => ['nullable', 'in:notes,var1,var2,var3,var4,var5'],
            'actions.*.condition' => ['nullable', 'string', 'max:255'],
            'actions.*.conditions' => ['nullable', 'array'],
            'actions.*.conditions.*.operator' => ['required_with:actions.*.conditions', 'in:contains,equals,starts_with,ends_with'],
            'actions.*.conditions.*.value' => ['required_with:actions.*.conditions', 'string', 'max:255'],
            'actions.*.conditions_relation' => ['nullable', 'in:AND,OR'],
            'actions.*.delay_seconds' => ['nullable', 'integer', 'min:1', 'max:86400'],
            'actions.*.group_id' => ['required_if:actions.*.type,add_to_group,remove_from_group', 'nullable', 'string', 'exists:contact_groups,id'],
            'visual_graph' => ['nullable', 'array'],
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): InertiaResponse
    {
        $tenant = $request->user()->tenant;

        $flows = $tenant->automationFlows()
            ->latest()
            ->get()
            ->map(fn (AutomationFlow $flow) => [
                'id' => (string) $flow->id,
                'name' => $flow->name,
                'trigger_type' => $flow->trigger_type,
                'trigger_keyword' => $flow->trigger_keyword,
                'trigger_match_type' => $flow->trigger_match_type,
                'actions' => $flow->actions,
                'visual_graph' => $flow->visual_graph,
                'is_active' => $flow->is_active,
                'created_at' => $flow->created_at->format('Y-m-d H:i'),
            ]);

        $groups = $tenant->contactGroups()
            ->get()
            ->map(fn ($group) => [
                'id' => (string) $group->id,
                'name' => $group->name,
            ]);

        return Inertia::render('client/automations/index', [
            'flows' => $flows,
            'groups' => $groups,
            'activeStrategy' => $tenant->ai_strategy ?? 'lead_qualifier',
        ]);
    }

    /**
     * Update tenant master AI automation strategy.
     */
    public function updateStrategy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'strategy' => ['required', 'string', 'in:lead_qualifier,faq_responder,pure_manual'],
        ]);

        $tenant = $request->user()->tenant;
        $tenant->update(['ai_strategy' => $validated['strategy']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Automation strategy updated successfully!')]);

        return to_route('client.automations.index');
    }

    /**
     * Show the create flow builder.
     */
    public function create(Request $request): InertiaResponse
    {
        return Inertia::render('client/automations/create', [
            'groups' => $this->groupsForTenant($request),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->flowValidationRules());

        $tenant = $request->user()->tenant;

        $tenant->automationFlows()->create([
            'name' => $validated['name'],
            'trigger_type' => 'keyword',
            'trigger_keyword' => $validated['trigger_keyword'] ?? '*',
            'trigger_match_type' => $validated['trigger_match_type'] ?? 'contains',
            'actions' => $validated['actions'],
            'visual_graph' => $validated['visual_graph'] ?? null,
            'is_active' => true,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Automation flow created successfully!')]);

        return to_route('client.automations.index');
    }

    /**
     * Show the edit flow builder.
     */
    public function edit(Request $request, AutomationFlow $automation): InertiaResponse
    {
        $this->authorizeTenantFlow($request, $automation);

        return Inertia::render('client/automations/edit', [
            'flow' => $this->serializeFlow($automation),
            'groups' => $this->groupsForTenant($request),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AutomationFlow $automation): RedirectResponse
    {
        $this->authorizeTenantFlow($request, $automation);

        $validated = $request->validate($this->flowValidationRules());

        $automation->update([
            'name' => $validated['name'],
            'trigger_keyword' => $validated['trigger_keyword'] ?? '*',
            'trigger_match_type' => $validated['trigger_match_type'] ?? 'contains',
            'actions' => $validated['actions'],
            'visual_graph' => $validated['visual_graph'] ?? null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Automation flow updated successfully!')]);

        return to_route('client.automations.index');
    }

    /**
     * Toggle the status of the specified resource.
     */
    public function toggle(Request $request, AutomationFlow $automation): RedirectResponse
    {
        $this->authorizeTenantFlow($request, $automation);

        $automation->update([
            'is_active' => ! $automation->is_active,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Automation flow status updated!')]);

        return to_route('client.automations.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, AutomationFlow $automation): RedirectResponse
    {
        $this->authorizeTenantFlow($request, $automation);

        $automation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Automation flow deleted successfully.')]);

        return to_route('client.automations.index');
    }

    /**
     * Export an automation flow as JSON.
     */
    public function export(Request $request, AutomationFlow $automation): JsonResponse
    {
        $this->authorizeTenantFlow($request, $automation);

        $filename = str($automation->name)
            ->slug()
            ->whenEmpty(fn () => str('automation-flow'))
            ->append('.json')
            ->toString();

        return response()
            ->json([
                'version' => 1,
                'type' => 'ravisn.automation_flow',
                'flow' => [
                    'name' => $automation->name,
                    'trigger_type' => $automation->trigger_type,
                    'trigger_keyword' => $automation->trigger_keyword,
                    'trigger_match_type' => $automation->trigger_match_type,
                    'actions' => $automation->actions,
                    'visual_graph' => $automation->visual_graph,
                    'is_active' => $automation->is_active,
                ],
            ], Response::HTTP_OK, [
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
    }

    /**
     * Import an automation flow from JSON.
     */
    public function import(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'flow_file' => ['required', 'file', 'mimes:json,txt', 'max:512'],
        ]);

        $contents = $validated['flow_file']->get();
        $payload = json_decode($contents, true);

        if (! is_array($payload)) {
            return back()->withErrors(['flow_file' => __('The selected flow file is not valid JSON.')]);
        }

        $flow = Arr::get($payload, 'flow', $payload);
        if (! is_array($flow)) {
            return back()->withErrors(['flow_file' => __('The selected flow file does not contain a flow.')]);
        }

        $importRequest = Request::create('/', 'POST', [
            'name' => str((string) Arr::get($flow, 'name', 'Imported Flow'))
                ->append(' (Imported)')
                ->toString(),
            'trigger_keyword' => Arr::get($flow, 'trigger_keyword', '*'),
            'trigger_match_type' => Arr::get($flow, 'trigger_match_type', 'contains'),
            'actions' => Arr::get($flow, 'actions', []),
            'visual_graph' => Arr::get($flow, 'visual_graph'),
        ]);

        $validator = validator($importRequest->all(), $this->flowValidationRules());

        if ($validator->fails()) {
            return back()->withErrors(['flow_file' => __('The selected flow file has unsupported or missing flow data.')]);
        }

        $tenant = $request->user()->tenant;
        $validatedFlow = $validator->validated();

        $tenant->automationFlows()->create([
            'name' => $validatedFlow['name'],
            'trigger_type' => 'keyword',
            'trigger_keyword' => $validatedFlow['trigger_keyword'] ?? '*',
            'trigger_match_type' => $validatedFlow['trigger_match_type'] ?? 'contains',
            'actions' => $validatedFlow['actions'],
            'visual_graph' => $validatedFlow['visual_graph'] ?? null,
            'is_active' => false,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Automation flow imported successfully.')]);

        return to_route('client.automations.index');
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function groupsForTenant(Request $request): array
    {
        return $request->user()->tenant
            ->contactGroups()
            ->get()
            ->map(fn ($group) => [
                'id' => (string) $group->id,
                'name' => $group->name,
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeFlow(AutomationFlow $flow): array
    {
        return [
            'id' => (string) $flow->id,
            'name' => $flow->name,
            'trigger_type' => $flow->trigger_type,
            'trigger_keyword' => $flow->trigger_keyword,
            'trigger_match_type' => $flow->trigger_match_type,
            'actions' => $flow->actions,
            'visual_graph' => $flow->visual_graph,
            'is_active' => $flow->is_active,
            'created_at' => $flow->created_at->format('Y-m-d H:i'),
        ];
    }

    private function authorizeTenantFlow(Request $request, AutomationFlow $automation): void
    {
        if ((string) $automation->tenant_id !== (string) $request->user()->tenant->id) {
            abort(403);
        }
    }
}
