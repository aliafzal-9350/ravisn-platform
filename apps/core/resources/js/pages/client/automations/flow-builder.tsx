import type { RequestPayload } from '@inertiajs/core';
import { Link, router } from '@inertiajs/react';
import {
    addEdge,
    Background,
    Controls,
    Handle,
    MarkerType,
    Position,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from '@xyflow/react';
import type {
    Edge as FlowEdge,
    Node as FlowNode,
    NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    ArrowLeft,
    BellOff,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Copy,
    Download,
    Menu,
    PanelRightClose,
    Upload,
    GitBranch,
    Globe2,
    Mail,
    MessageSquare,
    Save,
    Search,
    Sparkles,
    Table2,
    Trash2,
    UserRoundCog,
    Users,
    Workflow,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    index as automationsIndex,
    store as storeAutomation,
    update as updateAutomation,
} from '@/routes/client/automations';

export interface Group {
    id: string | number;
    name: string;
}

export type ActionType =
    | 'send_message'
    | 'send_email'
    | 'http_request'
    | 'google_sheets'
    | 'assign_agent'
    | 'save_response'
    | 'condition'
    | 'disable_autoreply'
    | 'delay'
    | 'add_to_group'
    | 'remove_from_group';

export interface Action {
    type: ActionType;
    text?: string;
    subject?: string;
    email_to?: string;
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: string;
    sheet_name?: string;
    agent_name?: string;
    response_field?: 'notes' | 'var1' | 'var2' | 'var3' | 'var4' | 'var5';
    condition?: string;
    delay_seconds?: number;
    group_id?: string | number;
    conditions?: Array<{
        operator: 'contains' | 'equals' | 'starts_with' | 'ends_with';
        value: string;
    }>;
    conditions_relation?: 'AND' | 'OR';
}

export interface SerializedGraph {
    nodes: Array<{
        id: string;
        type?: string;
        position: { x: number; y: number };
        data: Record<string, string | number | boolean | null>;
    }>;
    edges: Array<{
        id: string;
        source: string;
        target: string;
        type?: string;
        animated?: boolean;
        label?: string;
    }>;
}

export interface AutomationFlow {
    id: string | number;
    name: string;
    trigger_type: string;
    trigger_keyword?: string;
    trigger_match_type?: 'exact' | 'contains';
    actions: Action[];
    visual_graph?: SerializedGraph | null;
    is_active: boolean;
    created_at: string;
}

interface FlowBuilderProps {
    groups: Group[];
    flow?: AutomationFlow;
}

interface FlowFormData {
    name: string;
    actions: Action[];
    visual_graph: SerializedGraph | null;
}

interface CatalogItem {
    type: ActionType;
    title: string;
    description: string;
    category: 'Messages' | 'Requests' | 'Inputs' | 'Logic' | 'Contacts';
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

interface FlowTemplate {
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    actions: Array<Partial<Action> & { type: ActionType }>;
    visual_graph?: SerializedGraph;
}

interface FlowNodeData extends Record<string, unknown> {
    title: string;
    subtitle: string;
    color: string;
    actionIndex?: number;
}

const variables = [
    { token: '{{{senderName}}}', label: 'Sender name' },
    { token: '{{{senderMessage}}}', label: 'Message text' },
    { token: '{{{senderMobile}}}', label: 'Phone number' },
];

const catalog: CatalogItem[] = [
    {
        type: 'send_message',
        title: 'Send Message',
        description: 'Send a WhatsApp message to the customer',
        category: 'Messages',
        icon: MessageSquare,
        color: 'emerald',
    },
    {
        type: 'send_email',
        title: 'Send Email',
        description: 'Send an email notification',
        category: 'Messages',
        icon: Mail,
        color: 'violet',
    },
    {
        type: 'http_request',
        title: 'HTTP Request',
        description: 'Call an external API endpoint',
        category: 'Requests',
        icon: Globe2,
        color: 'purple',
    },
    {
        type: 'google_sheets',
        title: 'Google Spreadsheet',
        description: 'Store data in Google Sheets',
        category: 'Requests',
        icon: Table2,
        color: 'green',
    },
    {
        type: 'assign_agent',
        title: 'Assign Agent',
        description: 'Route the conversation to a human agent',
        category: 'Requests',
        icon: UserRoundCog,
        color: 'rose',
    },
    {
        type: 'save_response',
        title: 'Save Response',
        description: 'Capture and store the customer response',
        category: 'Inputs',
        icon: Save,
        color: 'green',
    },
    {
        type: 'condition',
        title: 'Condition',
        description: 'Route the flow when a rule matches',
        category: 'Logic',
        icon: GitBranch,
        color: 'rose',
    },
    {
        type: 'disable_autoreply',
        title: 'Disable Autoreply',
        description: 'Pause automated replies at this point',
        category: 'Logic',
        icon: BellOff,
        color: 'orange',
    },
    {
        type: 'delay',
        title: 'Delay',
        description: 'Wait before continuing the flow',
        category: 'Logic',
        icon: Clock3,
        color: 'orange',
    },
    {
        type: 'add_to_group',
        title: 'Add to Group',
        description: 'Add the contact to a group',
        category: 'Contacts',
        icon: Users,
        color: 'sky',
    },
    {
        type: 'remove_from_group',
        title: 'Remove from Group',
        description: 'Remove the contact from a group',
        category: 'Contacts',
        icon: Users,
        color: 'amber',
    },
];

const categories: CatalogItem['category'][] = [
    'Messages',
    'Requests',
    'Inputs',
    'Logic',
    'Contacts',
];

const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-600 text-white',
    violet: 'bg-violet-500 text-white',
    purple: 'bg-purple-500 text-white',
    green: 'bg-green-500 text-white',
    rose: 'bg-rose-500 text-white',
    orange: 'bg-orange-500 text-white',
    sky: 'bg-sky-500 text-white',
    amber: 'bg-amber-500 text-white',
};

function StartNode({ data }: NodeProps<FlowNode<FlowNodeData>>) {
    const nodeData = data as FlowNodeData;

    return (
        <div className="w-[320px] overflow-hidden rounded-[24px] border-2 border-emerald-600 bg-white shadow-2xl shadow-zinc-900/10 dark:bg-zinc-950">
            <div className="bg-emerald-600 px-5 py-4 text-left text-white">
                <div className="text-xl font-black">Start Bot</div>
                <div className="text-xs font-semibold text-white/80">
                    {nodeData.subtitle}
                </div>
            </div>
            <div className="space-y-3 p-5 text-left">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">
                    Dynamic variables (click to copy)
                </h3>
                {variables.map((variable) => (
                    <button
                        key={variable.token}
                        type="button"
                        className="flex w-full items-center justify-between gap-4 rounded-xl border bg-zinc-50 px-4 py-2 text-left transition hover:border-emerald-400 hover:bg-emerald-50 dark:bg-zinc-900 dark:hover:bg-emerald-950/30"
                        onClick={() => {
                            navigator.clipboard.writeText(variable.token);
                            toast.success('Variable copied: ' + variable.token);
                        }}
                    >
                        <Copy className="h-4 w-4 text-zinc-500" />
                        <span>
                            <span className="block font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">
                                {variable.token}
                            </span>
                            <span className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                {variable.label}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
            <Handle
                className="!h-4 !w-4 !border-2 !border-white !bg-emerald-600"
                position={Position.Right}
                type="source"
            />
        </div>
    );
}

function ActionNode({ data, selected }: NodeProps<FlowNode<FlowNodeData>>) {
    const nodeData = data as FlowNodeData;
    const simulatedStatus = nodeData.simulatedStatus as
        | 'active'
        | 'success'
        | 'failed'
        | 'idle'
        | undefined;

    let borderClass = 'border-zinc-200 dark:border-zinc-800';
    let ringClass = '';
    let statusLabel = null;

    if (simulatedStatus === 'active') {
        borderClass = 'border-amber-500 scale-105';
        ringClass = 'ring-4 ring-amber-500/30 animate-pulse';
        statusLabel = (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                Running...
            </span>
        );
    } else if (simulatedStatus === 'success') {
        borderClass = 'border-emerald-500';
        ringClass = 'ring-4 ring-emerald-500/20';
        statusLabel = (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                ✓ Success
            </span>
        );
    } else if (simulatedStatus === 'failed') {
        borderClass = 'border-rose-500';
        ringClass = 'ring-4 ring-rose-500/20';
        statusLabel = (
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                ✗ Skipped / stopped
            </span>
        );
    } else if (selected) {
        borderClass = 'border-emerald-600';
        ringClass = 'ring-4 ring-emerald-500/10';
    }

    return (
        <div
            className={`w-[260px] rounded-2xl border bg-white shadow-xl transition-all duration-300 dark:bg-zinc-950 ${borderClass} ${ringClass}`}
        >
            <Handle
                className="!h-3 !w-3 !border-2 !border-white !bg-zinc-400"
                position={Position.Left}
                type="target"
            />
            <div
                className={`rounded-t-[14px] px-4 py-3 ${colorClasses[nodeData.color] ?? colorClasses.emerald}`}
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black">{nodeData.title}</span>
                    {statusLabel}
                </div>
                <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold opacity-85">
                    {nodeData.subtitle}
                </div>
            </div>
            <div className="px-4 py-2.5 text-left text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                Step {(nodeData.actionIndex ?? 0) + 1}
            </div>
            <Handle
                className="!h-3 !w-3 !border-2 !border-white !bg-emerald-600"
                position={Position.Right}
                type="source"
            />
        </div>
    );
}

const nodeTypes = {
    startNode: StartNode,
    actionNode: ActionNode,
};

function createAction(type: ActionType, groups: Group[]): Action {
    if (type === 'send_message') {
        return {
            type,
            text: 'Hi {{{senderName}}}, thanks for reaching out. How can we help today?',
        };
    }

    if (type === 'send_email') {
        return {
            type,
            subject: 'RAVISN automation update',
            email_to: 'support@example.com',
            text: 'Default email body',
        };
    }

    if (type === 'http_request') {
        return {
            type,
            method: 'POST',
            url: 'https://api.example.com/webhook',
            body: '{\n  "phone": "{{{senderMobile}}}",\n  "message": "{{{senderMessage}}}"\n}',
        };
    }

    if (type === 'save_response') {
        return { type, response_field: 'notes' };
    }

    if (type === 'delay') {
        return { type, delay_seconds: 5 };
    }

    if (type === 'add_to_group' || type === 'remove_from_group') {
        return { type, group_id: groups[0]?.id ? String(groups[0]?.id) : undefined };
    }

    if (type === 'google_sheets') {
        return { type, sheet_name: 'Sheet1' };
    }

    if (type === 'assign_agent') {
        return { type, agent_name: 'Support Team' };
    }

    if (type === 'condition') {
        return {
            type,
            condition: 'message contains price',
            conditions: [
                {
                    operator: 'contains',
                    value: 'price',
                },
            ],
            conditions_relation: 'OR',
        };
    }

    return { type };
}

export function actionCatalogItem(type: ActionType): CatalogItem {
    return catalog.find((item) => item.type === type) ?? catalog[0];
}

export function actionSummary(action: Action, groups: Group[]): string {
    if (action.type === 'send_message') {
        return action.text || 'Empty message';
    }

    if (action.type === 'http_request') {
        return `${action.method ?? 'POST'} ${action.url || 'URL Webhook'}`;
    }

    if (action.type === 'delay') {
        return `Wait ${action.delay_seconds ?? 0} seconds`;
    }

    if (action.type === 'add_to_group' || action.type === 'remove_from_group') {
        return `${action.type === 'add_to_group' ? 'Add to' : 'Remove from'}: ${groups.find((group) => String(group.id) === String(action.group_id))?.name ?? 'Select a group'}`;
    }

    if (action.type === 'send_email') {
        return action.subject || 'Email';
    }

    if (action.type === 'save_response') {
        return `Save response to: ${action.response_field ?? 'notes'}`;
    }

    if (action.type === 'google_sheets') {
        return `Save to sheet: ${action.sheet_name || 'Google Sheet'}`;
    }

    if (action.type === 'assign_agent') {
        return `Assign to: ${action.agent_name || 'Agent'}`;
    }

    if (action.type === 'condition') {
        const conds = action.conditions || [];

        if (conds.length > 0) {
            const relText = action.conditions_relation === 'OR' ? 'or' : 'and';

            return (
                `Condition: ` +
                conds
                    .map(
                        (c, index) =>
                            `[${index + 1}] ${c.operator === 'contains' ? 'contains' : c.operator === 'equals' ? 'equals' : c.operator === 'starts_with' ? 'starts with' : 'ends with'}: ${c.value}`,
                    )
                    .join(` ${relText} `)
            );
        }

        return `If matched: ${action.condition || 'New condition'}`;
    }

    return 'Node settings';
}

function buildGraph(
    actions: Action[],
    groups: Group[],
    simulatedStatuses: Record<
        number,
        'active' | 'success' | 'failed' | 'idle'
    > = {},
) {
    const nodes: FlowNode<FlowNodeData>[] = [
        {
            id: 'start',
            type: 'startNode',
            data: {
                title: 'Start',
                subtitle:
                    'Every incoming message enters here to trigger the flow',
                color: 'emerald',
            },
            position: { x: 120, y: 160 },
            draggable: false,
        },
    ];

    const edges: FlowEdge[] = [];

    actions.forEach((action, index) => {
        const item = actionCatalogItem(action.type);
        const nodeId = `action-${index}`;
        const previousNodeId = index === 0 ? 'start' : `action-${index - 1}`;
        const simulatedStatus = simulatedStatuses[index] || 'idle';

        nodes.push({
            id: nodeId,
            type: 'actionNode',
            data: {
                title: item.title,
                subtitle: actionSummary(action, groups),
                color: item.color,
                actionIndex: index,
                simulatedStatus,
            },
            position: { x: 520 + index * 320, y: index % 2 === 0 ? 180 : 360 },
        });

        // Set edge stroke colors dynamically based on execution status
        let edgeColor = '#059669'; // Emerald default

        if (simulatedStatus === 'success') {
            edgeColor = '#10b981'; // Bright emerald green
        } else if (simulatedStatus === 'failed') {
            edgeColor = '#ef4444'; // Rose red
        } else if (simulatedStatus === 'active') {
            edgeColor = '#f59e0b'; // Amber yellow
        }

        edges.push({
            id: `${previousNodeId}-${nodeId}`,
            source: previousNodeId,
            target: nodeId,
            animated: simulatedStatus === 'active',
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: edgeColor,
            },
            style: { stroke: edgeColor, strokeWidth: 2.5 },
        });
    });

    return { nodes, edges };
}

function serializeGraph(
    nodes: FlowNode<FlowNodeData>[],
    edges: FlowEdge[],
): SerializedGraph {
    return {
        nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: {
                title: String(node.data.title),
                subtitle: String(node.data.subtitle),
                color: String(node.data.color),
                actionIndex:
                    typeof node.data.actionIndex === 'number'
                        ? node.data.actionIndex
                        : null,
            },
        })),
        edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            animated: edge.animated,
            label: typeof edge.label === 'string' ? edge.label : undefined,
        })),
    };
}

function mergeSavedGraph(
    baseGraph: ReturnType<typeof buildGraph>,
    savedGraph: SerializedGraph | null,
): ReturnType<typeof buildGraph> {
    if (!savedGraph || savedGraph.nodes.length === 0) {
        return baseGraph;
    }

    const savedNodesById = new Map(
        savedGraph.nodes.map((node) => [node.id, node]),
    );
    const nodes = baseGraph.nodes.map((node) => {
        const savedNode = savedNodesById.get(node.id);

        return savedNode ? { ...node, position: savedNode.position } : node;
    });

    const edges =
        savedGraph.edges.length > 0
            ? savedGraph.edges.map((edge) => ({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  type: edge.type,
                  animated: edge.animated,
                  label: edge.label,
                  markerEnd: {
                      type: MarkerType.ArrowClosed,
                      width: 18,
                      height: 18,
                      color: '#059669',
                  },
                  style: { stroke: '#059669', strokeWidth: 2.5 },
              }))
            : baseGraph.edges;

    return { nodes, edges };
}

export function FlowBuilder({ groups, flow }: FlowBuilderProps) {
    const importInputRef = React.useRef<HTMLInputElement | null>(null);
    const [paletteSearch, setPaletteSearch] = React.useState('');
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [sidebarTab, setSidebarTab] = React.useState<'nodes' | 'templates'>(
        'nodes',
    );
    const [selectedActionIndex, setSelectedActionIndex] = React.useState<
        number | null
    >(flow?.actions.length ? 0 : null);
    const [formData, setFormData] = React.useState<FlowFormData>({
        name: flow?.name ?? '',
        actions: flow?.actions ? [...flow.actions] : [],
        visual_graph: flow?.visual_graph ?? null,
    });
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Simulation states
    const [simulatedNodeStatuses, setSimulatedNodeStatuses] = React.useState<
        Record<number, 'active' | 'success' | 'failed' | 'idle'>
    >({});
    const [isSimulatorOpen, setIsSimulatorOpen] = React.useState(false);
    const [simulatorMessages, setSimulatorMessages] = React.useState<
        Array<{ sender: 'user' | 'bot' | 'system'; text: string }>
    >([
        {
            sender: 'system',
            text: 'Welcome to the live automation simulator. Type a message to test your flow conditions and steps.',
        },
    ]);
    const [simulatorInput, setSimulatorInput] = React.useState('');
    const [isSimulating, setIsSimulating] = React.useState(false);

    const setFormDataField = <Key extends keyof FlowFormData>(
        key: Key,
        value: FlowFormData[Key],
    ) => {
        setFormData((current) => ({ ...current, [key]: value }));
    };

    const graph = React.useMemo(
        () =>
            mergeSavedGraph(
                buildGraph(formData.actions, groups, simulatedNodeStatuses),
                formData.visual_graph,
            ),
        [
            formData.actions,
            formData.visual_graph,
            groups,
            simulatedNodeStatuses,
        ],
    );
    const [nodes, setNodes, onNodesChange] = useNodesState<
        FlowNode<FlowNodeData>
    >(graph.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(
        graph.edges,
    );

    const onConnect = React.useCallback(
        (connection: any) => {
            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        animated: true,
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 18,
                            height: 18,
                            color: '#059669',
                        },
                        style: { stroke: '#059669', strokeWidth: 2.5 },
                    },
                    eds,
                ),
            );
        },
        [setEdges],
    );

    React.useEffect(() => {
        setNodes((currentNodes) => {
            return graph.nodes.map((newNode) => {
                const existing = currentNodes.find((n) => n.id === newNode.id);

                return existing
                    ? { ...newNode, position: existing.position }
                    : newNode;
            });
        });
        setEdges((currentEdges) => {
            // Keep user custom connections if they exist, otherwise use graph default links
            if (currentEdges.length > 0) {
                return currentEdges;
            }

            return graph.edges;
        });
    }, [graph, setEdges, setNodes]);

    const filteredCatalog = React.useMemo(() => {
        const search = paletteSearch.trim().toLowerCase();

        if (!search) {
            return catalog;
        }

        return catalog.filter((item) =>
            `${item.title} ${item.description} ${item.category}`
                .toLowerCase()
                .includes(search),
        );
    }, [paletteSearch]);

    const selectedAction =
        selectedActionIndex !== null
            ? (formData.actions[selectedActionIndex] ?? null)
            : null;

    const handleAddAction = (type: ActionType) => {
        const nextActions = [...formData.actions, createAction(type, groups)];
        setFormDataField('actions', nextActions);
        setSelectedActionIndex(nextActions.length - 1);
    };

    const handleUpdateAction = (index: number, fields: Partial<Action>) => {
        const updated = [...formData.actions];
        updated[index] = { ...updated[index], ...fields };
        setFormDataField('actions', updated);
    };

    const handleRemoveAction = (index: number) => {
        const updated = formData.actions.filter(
            (_, actionIndex) => actionIndex !== index,
        );
        setFormDataField('actions', updated);
        setSelectedActionIndex(
            updated.length > 0 ? Math.min(index, updated.length - 1) : null,
        );
    };

    React.useEffect(() => {
        if (selectedActionIndex === null) {
            return;
        }

        const action = formData.actions[selectedActionIndex];

        if (
            !action ||
            action.type !== 'condition' ||
            (action.conditions?.length ?? 0) > 0
        ) {
            return;
        }

        const raw = action.condition || '';
        const regex =
            /^(?:\{\{\{senderMessage\}\}\}|message)\s+(contains|equals|starts_with|ends_with)\s+(.+)$/i;
        const match = raw.match(regex);
        const parsed = match
            ? {
                  operator: match[1].toLowerCase() as
                      | 'contains'
                      | 'equals'
                      | 'starts_with'
                      | 'ends_with',
                  value: match[2].replace(/^['"]|['"]$/g, '').trim(),
              }
            : { operator: 'contains' as const, value: raw };

        setTimeout(() => {
            handleUpdateAction(selectedActionIndex, {
                conditions: [parsed],
                conditions_relation: 'AND',
            });
        }, 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedActionIndex, formData.actions]);

    const makeTemplateGraph = (
        nodePositions: Array<{ x: number; y: number }>,
        edges: Array<{ source: string; target: string; label?: string }>,
    ): SerializedGraph => ({
        nodes: [
            {
                id: 'start',
                type: 'startNode',
                position: { x: 80, y: 280 },
                data: {},
            },
            ...nodePositions.map((position, index) => ({
                id: `action-${index}`,
                type: 'actionNode',
                position,
                data: { actionIndex: index },
            })),
        ],
        edges: edges.map((edge, index) => ({
            id: `${edge.source}-${edge.target}-${index}`,
            source: edge.source,
            target: edge.target,
            animated: true,
            label: edge.label,
        })),
    });

    const startConditionEdges = (
        branches: Array<{ target: number; labels: string[] }>,
    ) => [
        { source: 'start', target: 'action-0' },
        ...branches.flatMap((branch) =>
            branch.labels.map((label) => ({
                source: 'action-0',
                target: `action-${branch.target}`,
                label,
            })),
        ),
    ];

    const premadeTemplates: FlowTemplate[] = [
        {
            name: 'Smart FAQ Router',
            description:
                'A branched FAQ menu where each choice routes to a dedicated message node.',
            icon: MessageSquare,
            color: 'emerald',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: '1' },
                        { operator: 'contains', value: 'price' },
                        { operator: 'contains', value: 'plan' },
                        { operator: 'contains', value: '2' },
                        { operator: 'contains', value: 'hours' },
                        { operator: 'contains', value: 'time' },
                        { operator: 'contains', value: '3' },
                        { operator: 'contains', value: 'advisor' },
                        { operator: 'contains', value: 'support' },
                        { operator: 'contains', value: 'menu' },
                        { operator: 'contains', value: 'hello' },
                        { operator: 'contains', value: 'hi' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'Pricing and plans:\n• Starter: $29/month — 1,000 messages\n• Pro: $79/month — 10,000 messages\n• Business: $199/month — unlimited usage\n\nReply with "subscribe" if you want to get started.',
                },
                {
                    type: 'send_message',
                    text: 'Business hours:\nSunday to Thursday\n9:00 AM to 6:00 PM\n\nOutside business hours, leave your message and we will follow up as soon as possible.',
                },
                {
                    type: 'send_message',
                    text: 'Your request to speak with an advisor has been received. Send your question or preferred phone number and our team will contact you shortly.',
                },
                {
                    type: 'send_message',
                    text: 'Hi {{{senderName}}}. Choose what you need:\n\n1 - Pricing and plans\n2 - Business hours\n3 - Speak with an advisor\n\nYou can reply with the number or the keyword.',
                },
                { type: 'save_response', response_field: 'notes' },
                {
                    type: 'send_email',
                    subject: 'FAQ flow request',
                    email_to: 'sales@example.com',
                    text: 'Customer {{{senderName}}} ({{{senderMobile}}}) used the FAQ flow.\nMessage: {{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 280 },
                    { x: 860, y: 80 },
                    { x: 860, y: 280 },
                    { x: 860, y: 480 },
                    { x: 860, y: 680 },
                    { x: 1260, y: 480 },
                    { x: 1640, y: 480 },
                ],
                [
                    ...startConditionEdges([
                        { target: 1, labels: ['1', 'price', 'plan'] },
                        { target: 2, labels: ['2', 'hours', 'time'] },
                        { target: 3, labels: ['3', 'advisor', 'support'] },
                        { target: 4, labels: ['menu', 'hello', 'hi'] },
                    ]),
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                ],
            ),
        },
        {
            name: 'Lead Qualification',
            description:
                'Routes leads by intent: quote, demo, or sales contact, then stores and notifies the team.',
            icon: Table2,
            color: 'green',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: 'quote' },
                        { operator: 'contains', value: 'price' },
                        { operator: 'contains', value: 'demo' },
                        { operator: 'contains', value: 'trial' },
                        { operator: 'contains', value: 'sales' },
                        { operator: 'contains', value: 'call' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'Thanks {{{senderName}}}. Send your expected monthly message volume and business name, and we will prepare a suitable quote.',
                },
                {
                    type: 'send_message',
                    text: 'Great. To book a demo, send your email and preferred time. We will send the demo link.',
                },
                {
                    type: 'send_message',
                    text: 'Your request has been routed to sales. Send your question or preferred contact number.',
                },
                {
                    type: 'send_message',
                    text: 'Choose one option:\n- Quote\n- Demo\n- Sales',
                },
                { type: 'save_response', response_field: 'notes' },
                {
                    type: 'http_request',
                    method: 'POST',
                    url: 'https://api.example.com/leads',
                    body: '{\n  "name": "{{{senderName}}}",\n  "phone": "{{{senderMobile}}}",\n  "message": "{{{senderMessage}}}",\n  "source": "whatsapp_bot"\n}',
                },
                { type: 'google_sheets', sheet_name: 'Qualified Leads' },
                {
                    type: 'send_email',
                    subject: 'Qualified lead',
                    email_to: 'sales@example.com',
                    text: 'New qualified lead:\n{{{senderName}}} - {{{senderMobile}}}\nMessage: {{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 260 },
                    { x: 860, y: 440 },
                    { x: 860, y: 620 },
                    { x: 1260, y: 360 },
                    { x: 1640, y: 360 },
                    { x: 2020, y: 360 },
                    { x: 2400, y: 360 },
                ],
                [
                    ...startConditionEdges([
                        { target: 1, labels: ['quote', 'price'] },
                        { target: 2, labels: ['demo', 'trial'] },
                        { target: 3, labels: ['sales', 'call'] },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                    { source: 'action-6', target: 'action-7' },
                    { source: 'action-7', target: 'action-8' },
                ],
            ),
        },
        {
            name: 'Feedback Routing',
            description:
                'Separates positive feedback, complaints, and neutral feedback while saving and notifying the team.',
            icon: Users,
            color: 'sky',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: '5' },
                        { operator: 'contains', value: 'excellent' },
                        { operator: 'contains', value: '4' },
                        { operator: 'contains', value: 'great' },
                        { operator: 'contains', value: '1' },
                        { operator: 'contains', value: 'bad' },
                        { operator: 'contains', value: 'problem' },
                        { operator: 'contains', value: '2' },
                        { operator: 'contains', value: '3' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'Thank you for the great rating, {{{senderName}}}. We are glad you had a good experience.',
                },
                {
                    type: 'send_message',
                    text: 'We are sorry about the poor experience. Your feedback has been marked as high priority, and our quality team will follow up.',
                },
                {
                    type: 'send_message',
                    text: 'Thanks for your feedback. We will review it to improve the service. You can send more details here.',
                },
                {
                    type: 'send_message',
                    text: 'Send your rating as a number or keyword:\n5 or excellent\n4 or great\n1 or bad\n2/3 or neutral',
                },
                { type: 'save_response', response_field: 'var1' },
                { type: 'google_sheets', sheet_name: 'Customer Feedback' },
                {
                    type: 'send_email',
                    subject: 'New customer feedback',
                    email_to: 'feedback@example.com',
                    text: 'New feedback from {{{senderName}}} ({{{senderMobile}}}):\n{{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 300 },
                    { x: 860, y: 520 },
                    { x: 860, y: 720 },
                    { x: 1260, y: 300 },
                    { x: 1640, y: 300 },
                    { x: 2020, y: 300 },
                ],
                [
                    ...startConditionEdges([
                        { target: 1, labels: ['5', 'excellent', '4', 'great'] },
                        { target: 2, labels: ['1', 'bad', 'problem'] },
                        { target: 3, labels: ['2', '3'] },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                    { source: 'action-6', target: 'action-7' },
                ],
            ),
        },
        {
            name: 'Smart Human Handover',
            description:
                'Classifies urgent, billing, and general support requests before assigning the right team.',
            icon: UserRoundCog,
            color: 'rose',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: 'urgent' },
                        { operator: 'contains', value: 'down' },
                        { operator: 'contains', value: 'not working' },
                        { operator: 'contains', value: 'invoice' },
                        { operator: 'contains', value: 'payment' },
                        { operator: 'contains', value: 'subscription' },
                        { operator: 'contains', value: 'support' },
                        { operator: 'contains', value: 'help' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'Your request has been marked as urgent. Send a short description and a screenshot if available. We are routing it now.',
                },
                {
                    type: 'send_message',
                    text: 'Your request has been routed to billing. Send the invoice number or registered email and we will review it.',
                },
                {
                    type: 'send_message',
                    text: 'Your support request has been received. Send the details and a specialist will help you.',
                },
                {
                    type: 'send_message',
                    text: 'Choose the request type:\nUrgent\nBilling\nSupport',
                },
                { type: 'save_response', response_field: 'var2' },
                { type: 'assign_agent', agent_name: 'Support Queue' },
                { type: 'disable_autoreply' },
                {
                    type: 'send_email',
                    subject: 'Support request requires follow-up',
                    email_to: 'support@example.com',
                    text: 'Support request from {{{senderName}}} ({{{senderMobile}}}):\n{{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 300 },
                    { x: 860, y: 520 },
                    { x: 860, y: 720 },
                    { x: 1260, y: 300 },
                    { x: 1640, y: 300 },
                    { x: 2020, y: 300 },
                    { x: 2400, y: 300 },
                ],
                [
                    ...startConditionEdges([
                        {
                            target: 1,
                            labels: ['urgent', 'down', 'not working'],
                        },
                        {
                            target: 2,
                            labels: ['invoice', 'payment', 'subscription'],
                        },
                        { target: 3, labels: ['support', 'help'] },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                    { source: 'action-6', target: 'action-7' },
                    { source: 'action-7', target: 'action-8' },
                ],
            ),
        },
        {
            name: 'Order Tracking and After-Sales',
            description:
                'Routes tracking, return, and delayed-order requests, then logs the inquiry.',
            icon: Globe2,
            color: 'purple',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: 'track' },
                        { operator: 'contains', value: 'shipping' },
                        { operator: 'contains', value: '#' },
                        { operator: 'contains', value: 'return' },
                        { operator: 'contains', value: 'refund' },
                        { operator: 'contains', value: 'delayed' },
                        { operator: 'contains', value: 'late' },
                        { operator: 'contains', value: 'not received' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'Send the order number or tracking number and we will check the shipment status.',
                },
                {
                    type: 'send_message',
                    text: 'For returns, send the order number and return reason. We will send the correct return steps.',
                },
                {
                    type: 'send_message',
                    text: 'Sorry for the delay. Send the order number and we will escalate it to operations.',
                },
                {
                    type: 'send_message',
                    text: 'Choose the request type:\nTracking\nReturn\nDelay',
                },
                { type: 'save_response', response_field: 'var3' },
                {
                    type: 'http_request',
                    method: 'POST',
                    url: 'https://api.example.com/orders/track',
                    body: '{\n  "phone": "{{{senderMobile}}}",\n  "query": "{{{senderMessage}}}",\n  "customer": "{{{senderName}}}"\n}',
                },
                { type: 'google_sheets', sheet_name: 'Order Inquiries' },
                {
                    type: 'send_email',
                    subject: 'New order inquiry',
                    email_to: 'operations@example.com',
                    text: 'Order inquiry from {{{senderName}}}:\n{{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 300 },
                    { x: 860, y: 520 },
                    { x: 860, y: 720 },
                    { x: 1260, y: 300 },
                    { x: 1640, y: 300 },
                    { x: 2020, y: 300 },
                    { x: 2400, y: 300 },
                ],
                [
                    ...startConditionEdges([
                        { target: 1, labels: ['track', 'shipping', '#'] },
                        { target: 2, labels: ['return', 'refund'] },
                        {
                            target: 3,
                            labels: ['delayed', 'late', 'not received'],
                        },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                    { source: 'action-6', target: 'action-7' },
                    { source: 'action-7', target: 'action-8' },
                ],
            ),
        },
        {
            name: 'Customer Onboarding and Activation',
            description:
                'Routes new customers between quick start, activation, and help while registering them in CRM.',
            icon: Mail,
            color: 'violet',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: 'start' },
                        { operator: 'contains', value: 'quickstart' },
                        { operator: 'contains', value: 'activate' },
                        { operator: 'contains', value: 'account' },
                        { operator: 'contains', value: 'help' },
                        { operator: 'contains', value: 'support' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'Welcome {{{senderName}}}. Quick start: connect your device, import contacts, then send your first test message.',
                },
                {
                    type: 'send_message',
                    text: 'To activate the account, send the registered email and company name. We will review the activation status.',
                },
                {
                    type: 'send_message',
                    text: 'You have been routed to help. Tell us where you got stuck or what error you see.',
                },
                {
                    type: 'send_message',
                    text: 'Choose your path:\nStart\nActivate\nHelp',
                },
                { type: 'add_to_group', group_id: groups[0]?.id },
                { type: 'save_response', response_field: 'notes' },
                { type: 'google_sheets', sheet_name: 'New Customers' },
                {
                    type: 'http_request',
                    method: 'POST',
                    url: 'https://api.example.com/crm/contacts',
                    body: '{\n  "name": "{{{senderName}}}",\n  "phone": "{{{senderMobile}}}",\n  "tag": "vip",\n  "source": "whatsapp"\n}',
                },
                {
                    type: 'send_email',
                    subject: 'New customer needs activation',
                    email_to: 'success@example.com',
                    text: 'New customer:\n{{{senderName}}} - {{{senderMobile}}}\n{{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 300 },
                    { x: 860, y: 520 },
                    { x: 860, y: 720 },
                    { x: 1260, y: 300 },
                    { x: 1640, y: 300 },
                    { x: 2020, y: 300 },
                    { x: 2400, y: 300 },
                    { x: 2780, y: 300 },
                ],
                [
                    ...startConditionEdges([
                        { target: 1, labels: ['start', 'quickstart'] },
                        { target: 2, labels: ['activate', 'account'] },
                        { target: 3, labels: ['help', 'support'] },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                    { source: 'action-6', target: 'action-7' },
                    { source: 'action-7', target: 'action-8' },
                    { source: 'action-8', target: 'action-9' },
                ],
            ),
        },
        {
            name: 'Smart Appointment Booking',
            description:
                'Routes new bookings, reschedules, and cancellations, then logs and notifies the team.',
            icon: Clock3,
            color: 'orange',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: 'book' },
                        { operator: 'contains', value: 'appointment' },
                        { operator: 'contains', value: 'schedule' },
                        { operator: 'contains', value: 'reschedule' },
                        { operator: 'contains', value: 'change' },
                        { operator: 'contains', value: 'cancel' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'To book a new appointment, send your name, requested service, and preferred day/time.',
                },
                {
                    type: 'send_message',
                    text: 'To reschedule, send the booking number and the new preferred time.',
                },
                {
                    type: 'send_message',
                    text: 'To cancel, send the booking number or the phone number used for the booking.',
                },
                {
                    type: 'send_message',
                    text: 'Choose a service:\nBook appointment\nReschedule appointment\nCancel appointment',
                },
                { type: 'save_response', response_field: 'notes' },
                { type: 'google_sheets', sheet_name: 'Appointment Requests' },
                {
                    type: 'send_email',
                    subject: 'WhatsApp appointment request',
                    email_to: 'booking@example.com',
                    text: 'Appointment request from {{{senderName}}} ({{{senderMobile}}}):\n{{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 300 },
                    { x: 860, y: 520 },
                    { x: 860, y: 720 },
                    { x: 1260, y: 300 },
                    { x: 1640, y: 300 },
                    { x: 2020, y: 300 },
                ],
                [
                    ...startConditionEdges([
                        {
                            target: 1,
                            labels: ['book', 'appointment', 'schedule'],
                        },
                        { target: 2, labels: ['reschedule', 'change'] },
                        { target: 3, labels: ['cancel'] },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                    { source: 'action-6', target: 'action-7' },
                ],
            ),
        },
        {
            name: 'Abandoned Cart and Store Offers',
            description:
                'Handles abandoned cart, discount code, and product questions, then saves the sales lead.',
            icon: Sparkles,
            color: 'amber',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: 'cart' },
                        { operator: 'contains', value: 'checkout' },
                        { operator: 'contains', value: 'discount' },
                        { operator: 'contains', value: 'coupon' },
                        { operator: 'contains', value: 'product' },
                        { operator: 'contains', value: 'available' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'We noticed you were interested in completing an order. Send the product number or cart link and we will help you finish checkout.',
                },
                {
                    type: 'send_message',
                    text: 'For a discount code, send the product name or category and we will share the best available offer.',
                },
                {
                    type: 'send_message',
                    text: 'Ask about the product or send its link/image. We will check availability and pricing.',
                },
                {
                    type: 'send_message',
                    text: 'Choose:\nCart\nDiscount\nProduct',
                },
                { type: 'save_response', response_field: 'var4' },
                {
                    type: 'http_request',
                    method: 'POST',
                    url: 'https://api.example.com/shop/lead',
                    body: '{\n  "phone": "{{{senderMobile}}}",\n  "name": "{{{senderName}}}",\n  "message": "{{{senderMessage}}}"\n}',
                },
                {
                    type: 'send_email',
                    subject: 'WhatsApp sales opportunity',
                    email_to: 'store@example.com',
                    text: 'Sales opportunity:\n{{{senderName}}} - {{{senderMobile}}}\n{{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 300 },
                    { x: 860, y: 520 },
                    { x: 860, y: 720 },
                    { x: 1260, y: 300 },
                    { x: 1640, y: 300 },
                    { x: 2020, y: 300 },
                ],
                [
                    ...startConditionEdges([
                        { target: 1, labels: ['cart', 'checkout'] },
                        { target: 2, labels: ['discount', 'coupon'] },
                        { target: 3, labels: ['product', 'available'] },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                    { source: 'action-6', target: 'action-7' },
                ],
            ),
        },
        {
            name: 'Subscription Renewal and Billing',
            description:
                'Routes renewal, payment, and invoice issues before notifying billing.',
            icon: BellOff,
            color: 'rose',
            actions: [
                {
                    type: 'condition',
                    conditions: [
                        { operator: 'contains', value: 'renew' },
                        { operator: 'contains', value: 'renewal' },
                        { operator: 'contains', value: 'payment' },
                        { operator: 'contains', value: 'pay' },
                        { operator: 'contains', value: 'invoice' },
                        { operator: 'contains', value: 'billing' },
                        { operator: 'contains', value: 'menu' },
                    ],
                    conditions_relation: 'OR',
                },
                {
                    type: 'send_message',
                    text: 'To renew your subscription, send the registered email and requested plan. We will send the correct payment link.',
                },
                {
                    type: 'send_message',
                    text: 'For payment review, send the invoice number or registered email and we will check the payment status.',
                },
                {
                    type: 'send_message',
                    text: 'If you have an invoice issue, send the invoice number and a short description.',
                },
                {
                    type: 'send_message',
                    text: 'Choose:\nRenewal\nPayment\nInvoice',
                },
                { type: 'save_response', response_field: 'var5' },
                {
                    type: 'send_email',
                    subject: 'Billing or renewal request',
                    email_to: 'billing@example.com',
                    text: 'Billing/renewal request:\n{{{senderName}}} - {{{senderMobile}}}\n{{{senderMessage}}}',
                },
            ],
            visual_graph: makeTemplateGraph(
                [
                    { x: 440, y: 300 },
                    { x: 860, y: 80 },
                    { x: 860, y: 300 },
                    { x: 860, y: 520 },
                    { x: 860, y: 720 },
                    { x: 1260, y: 300 },
                    { x: 1640, y: 300 },
                ],
                [
                    ...startConditionEdges([
                        { target: 1, labels: ['renew', 'renewal'] },
                        { target: 2, labels: ['payment', 'pay'] },
                        { target: 3, labels: ['invoice', 'billing'] },
                        { target: 4, labels: ['menu'] },
                    ]),
                    { source: 'action-1', target: 'action-5' },
                    { source: 'action-2', target: 'action-5' },
                    { source: 'action-3', target: 'action-5' },
                    { source: 'action-5', target: 'action-6' },
                ],
            ),
        },
    ];

    const loadTemplate = (templateIndex: number) => {
        const template = premadeTemplates[templateIndex];

        if (
            confirm(
                `Load the "${template.name}" template? This will replace the current flow steps.`,
            )
        ) {
            const nextActions = template.actions.map((act) => ({
                ...createAction(act.type as ActionType, groups),
                ...act,
            })) as Action[];
            const nextGraph = mergeSavedGraph(
                buildGraph(nextActions, groups),
                template.visual_graph ?? null,
            );

            setFormData({
                name: template.name,
                actions: nextActions,
                visual_graph: template.visual_graph ?? null,
            });
            setNodes(nextGraph.nodes);
            setEdges(nextGraph.edges);
            setSelectedActionIndex(0);
            setSimulatedNodeStatuses({});
            toast.success('Template loaded successfully');
        }
    };

    const handleSimulateMessage = async (messageText: string) => {
        if (!messageText.trim()) {
            return;
        }

        setSimulatorMessages((prev) => [
            ...prev,
            { sender: 'user', text: messageText },
        ]);
        setSimulatorInput('');
        setIsSimulating(true);

        const actions = formData.actions;
        const newStatuses: Record<
            number,
            'active' | 'success' | 'failed' | 'idle'
        > = {};
        setSimulatedNodeStatuses({});

        const delay = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));
        const userName = 'Alex';
        const userMobile = '+966500000000';

        const replaceTokens = (text: string) => {
            return text
                .replaceAll('{{{senderName}}}', userName)
                .replaceAll('{{{senderMobile}}}', userMobile)
                .replaceAll('{{{senderMessage}}}', messageText);
        };

        const matchCondition = (action: Action) => {
            let isMatched = false;
            let matchedConditionIndex: number | null = null;
            const condList = action.conditions || [];
            const relation = action.conditions_relation || 'AND';

            const matchSingle = (operator: string, val: string) => {
                const normalizedMsg = messageText.toLowerCase().trim();
                const expected = val.toLowerCase().trim();

                if (operator === 'equals') {
                    return normalizedMsg === expected;
                } else if (operator === 'starts_with') {
                    return normalizedMsg.startsWith(expected);
                } else if (operator === 'ends_with') {
                    return normalizedMsg.endsWith(expected);
                }

                return normalizedMsg.includes(expected);
            };

            if (condList.length > 0) {
                if (relation === 'OR') {
                    matchedConditionIndex = condList.findIndex((c) =>
                        matchSingle(c.operator, c.value),
                    );
                    isMatched = matchedConditionIndex !== -1;
                } else {
                    isMatched = condList.every((c) =>
                        matchSingle(c.operator, c.value),
                    );
                    matchedConditionIndex = isMatched ? 0 : null;
                }
            } else {
                const cond = action.condition || '';
                const normalizedMsg = messageText.toLowerCase().trim();
                const matchRegex =
                    /^(?:\{\{\{senderMessage\}\}\}|message)\s+(contains|equals|starts_with|ends_with)\s+(.+)$/i;
                const matchMatches = cond.match(matchRegex);

                if (matchMatches) {
                    const operator = matchMatches[1].toLowerCase();
                    const expected = matchMatches[2]
                        .replace(/^['"]|['"]$/g, '')
                        .toLowerCase()
                        .trim();
                    isMatched = matchSingle(operator, expected);
                } else {
                    isMatched = normalizedMsg.includes(
                        cond.toLowerCase().trim(),
                    );
                }

                matchedConditionIndex = isMatched ? 0 : null;
            }

            const description =
                condList.length > 0
                    ? condList
                          .map((c) => `[${c.operator}: ${c.value}]`)
                          .join(` ${relation === 'OR' ? 'or' : 'and'} `)
                    : action.condition || '';

            return { isMatched, matchedConditionIndex, description };
        };

        const executeAction = async (index: number) => {
            const action = actions[index];

            if (!action) {
                return null;
            }

            newStatuses[index] = 'active';
            setSimulatedNodeStatuses({ ...newStatuses });
            await delay(1200);

            if (action.type === 'condition') {
                const { isMatched, matchedConditionIndex, description } =
                    matchCondition(action);

                if (!isMatched) {
                    newStatuses[index] = 'failed';
                    setSimulatedNodeStatuses({ ...newStatuses });
                    setSimulatorMessages((prev) => [
                        ...prev,
                        {
                            sender: 'system',
                            text: `Flow stopped: no condition matched (${description})`,
                        },
                    ]);

                    return null;
                }

                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `Condition matched. Branch ${(matchedConditionIndex ?? 0) + 1} selected.`,
                    },
                ]);

                return matchedConditionIndex ?? 0;
            } else if (action.type === 'send_message') {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                setSimulatorMessages((prev) => [
                    ...prev,
                    { sender: 'bot', text: replaceTokens(action.text || '') },
                ]);
            } else if (action.type === 'send_email') {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `Email action: send to ${action.email_to || 'support@example.com'} with subject "${action.subject || ''}"`,
                    },
                ]);
            } else if (action.type === 'http_request') {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `HTTP action (${action.method || 'POST'}): ${action.url || ''}`,
                    },
                ]);
            } else if (action.type === 'google_sheets') {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `Google Sheets action: save to "${action.sheet_name || 'Sheet1'}"`,
                    },
                ]);
            } else if (action.type === 'assign_agent') {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `Agent action: assign to "${action.agent_name || ''}"`,
                    },
                ]);
            } else if (action.type === 'save_response') {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `Save response action: store in "${action.response_field || ''}"`,
                    },
                ]);
            } else if (
                action.type === 'add_to_group' ||
                action.type === 'remove_from_group'
            ) {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
                const groupName =
                    groups.find((g) => g.id === Number(action.group_id))
                        ?.name || 'Unselected group';
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `Contact group action: ${action.type === 'add_to_group' ? 'add customer to' : 'remove customer from'} "${groupName}"`,
                    },
                ]);
            } else if (action.type === 'delay') {
                const seconds = action.delay_seconds || 5;
                setSimulatorMessages((prev) => [
                    ...prev,
                    {
                        sender: 'system',
                        text: `Delay action: wait for ${seconds} seconds...`,
                    },
                ]);
                await delay(seconds * 1000);
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
            } else {
                newStatuses[index] = 'success';
                setSimulatedNodeStatuses({ ...newStatuses });
            }

            return undefined;
        };

        const executeNode = async (
            nodeId: string,
            visited = new Set<string>(),
        ) => {
            if (visited.has(nodeId)) {
                return;
            }

            visited.add(nodeId);

            const currentNode = nodes.find((node) => node.id === nodeId);
            let branchIndex: number | null | undefined;

            if (nodeId !== 'start') {
                const actionIndex =
                    typeof currentNode?.data.actionIndex === 'number'
                        ? currentNode.data.actionIndex
                        : null;

                if (actionIndex === null) {
                    return;
                }

                branchIndex = await executeAction(actionIndex);

                if (branchIndex === null) {
                    return;
                }
            }

            let childEdges = edges.filter(
                (edge) => edge.source === nodeId && edge.target,
            );

            if (branchIndex !== undefined && branchIndex !== null) {
                childEdges = childEdges[branchIndex]
                    ? [childEdges[branchIndex]]
                    : [];
            }

            for (const edge of childEdges) {
                await executeNode(edge.target, visited);
            }
        };

        await executeNode('start');

        setIsSimulating(false);
    };

    const insertVariable = (token: string) => {
        if (selectedActionIndex === null || !selectedAction) {
            return;
        }

        if (selectedAction.type === 'send_message') {
            handleUpdateAction(selectedActionIndex, {
                text: (selectedAction.text || '') + token,
            });
        } else if (selectedAction.type === 'send_email') {
            handleUpdateAction(selectedActionIndex, {
                text: (selectedAction.text || '') + token,
            });
        } else if (selectedAction.type === 'http_request') {
            handleUpdateAction(selectedActionIndex, {
                body: (selectedAction.body || '') + token,
            });
        }

        toast.success('Variable inserted');
    };

    const exportCurrentFlow = () => {
        const payload = {
            version: 1,
            type: 'ravisn.automation_flow',
            flow: {
                name: formData.name || 'Untitled Flow',
                trigger_type: 'keyword',
                trigger_keyword: '*',
                trigger_match_type: 'contains',
                actions: formData.actions,
                visual_graph: serializeGraph(nodes, edges),
                is_active: flow?.is_active ?? false,
            },
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const filename = `${
            (formData.name || 'automation-flow')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') || 'automation-flow'
        }.json`;
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importIntoCurrentFlow = async (file: File | null) => {
        if (!file) {
            return;
        }

        try {
            const payload = JSON.parse(await file.text()) as {
                flow?: Partial<FlowFormData>;
            } & Partial<FlowFormData>;
            const importedFlow = payload.flow ?? payload;
            const importedActions = Array.isArray(importedFlow.actions)
                ? importedFlow.actions
                : [];

            setFormData({
                name:
                    typeof importedFlow.name === 'string'
                        ? importedFlow.name
                        : formData.name,
                actions: importedActions as Action[],
                visual_graph: importedFlow.visual_graph ?? null,
            });
            const importedGraph = mergeSavedGraph(
                buildGraph(importedActions as Action[], groups),
                importedFlow.visual_graph ?? null,
            );
            setNodes(importedGraph.nodes);
            setEdges(importedGraph.edges);
            setSelectedActionIndex(importedActions.length > 0 ? 0 : null);
            toast.success('Flow loaded into the editor');
        } catch {
            toast.error('Invalid flow file');
        } finally {
            if (importInputRef.current) {
                importInputRef.current.value = '';
            }
        }
    };

    const submitFlow = () => {
        if (formData.actions.length === 0) {
            toast.error('Add at least one node to the flow.');

            return;
        }

        const payload = {
            ...formData,
            visual_graph: serializeGraph(nodes, edges),
        } as unknown as RequestPayload;

        setIsProcessing(true);

        if (flow) {
            router.put(updateAutomation.url(flow.id), payload, {
                onSuccess: () => toast.success('Flow updated successfully'),
                onFinish: () => setIsProcessing(false),
            });

            return;
        }

        router.post(storeAutomation.url(), payload, {
            onSuccess: () => toast.success('Flow created successfully'),
            onFinish: () => setIsProcessing(false),
        });
    };

    const renderActionEditor = () => {
        if (selectedActionIndex === null || !selectedAction) {
            return null;
        }

        const item = actionCatalogItem(selectedAction.type);
        const Icon = item.icon;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorClasses[item.color]}`}
                        >
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-sm font-black text-zinc-950 dark:text-white">
                                {item.title}
                            </div>
                            <div className="text-[11px] font-semibold text-zinc-500">
                                {item.description}
                            </div>
                        </div>
                    </div>
                    <Button
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveAction(selectedActionIndex)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Clickable Quick Variables */}
                {['send_message', 'send_email', 'http_request'].includes(
                    selectedAction.type,
                ) && (
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-zinc-500">
                            Insert a quick variable:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {variables.map((v) => (
                                <button
                                    key={v.token}
                                    type="button"
                                    onClick={() => insertVariable(v.token)}
                                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedAction.type === 'send_message' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                            Message text
                        </Label>
                        <Textarea
                            className="min-h-24 text-xs"
                            value={selectedAction.text ?? ''}
                            onChange={(event) =>
                                handleUpdateAction(selectedActionIndex, {
                                    text: event.target.value,
                                })
                            }
                            placeholder="Write the WhatsApp reply here..."
                        />
                    </div>
                )}

                {selectedAction.type === 'send_email' && (
                    <div className="space-y-2">
                        <div>
                            <Label className="text-xs font-bold">
                                To email
                            </Label>
                            <Input
                                className="h-9 text-xs"
                                value={selectedAction.email_to ?? ''}
                                onChange={(event) =>
                                    handleUpdateAction(selectedActionIndex, {
                                        email_to: event.target.value,
                                    })
                                }
                                placeholder="email@example.com"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold">Subject</Label>
                            <Input
                                className="h-9 text-xs"
                                value={selectedAction.subject ?? ''}
                                onChange={(event) =>
                                    handleUpdateAction(selectedActionIndex, {
                                        subject: event.target.value,
                                    })
                                }
                                placeholder="Subject"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold">
                                Email body
                            </Label>
                            <Textarea
                                className="min-h-20 text-xs"
                                value={selectedAction.text ?? ''}
                                onChange={(event) =>
                                    handleUpdateAction(selectedActionIndex, {
                                        text: event.target.value,
                                    })
                                }
                                placeholder="Email content"
                            />
                        </div>
                    </div>
                )}

                {selectedAction.type === 'http_request' && (
                    <div className="space-y-2">
                        <Label className="text-xs font-bold">
                            HTTP request
                        </Label>
                        <div className="grid grid-cols-[80px_1fr] gap-1.5">
                            <select
                                className="h-9 rounded-md border bg-background px-2 text-xs font-bold"
                                value={selectedAction.method ?? 'POST'}
                                onChange={(event) =>
                                    handleUpdateAction(selectedActionIndex, {
                                        method: event.target
                                            .value as Action['method'],
                                    })
                                }
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                            <Input
                                className="h-9 text-xs"
                                value={selectedAction.url ?? ''}
                                onChange={(event) =>
                                    handleUpdateAction(selectedActionIndex, {
                                        url: event.target.value,
                                    })
                                }
                                placeholder="https://api.example.com/webhook"
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-bold">
                                Body (JSON)
                            </Label>
                            <Textarea
                                className="min-h-20 font-mono text-[10px] leading-tight"
                                dir="ltr"
                                value={selectedAction.body ?? ''}
                                onChange={(event) =>
                                    handleUpdateAction(selectedActionIndex, {
                                        body: event.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                )}

                {selectedAction.type === 'google_sheets' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                            Google Sheet name
                        </Label>
                        <Input
                            className="h-9 text-xs"
                            value={selectedAction.sheet_name ?? ''}
                            onChange={(event) =>
                                handleUpdateAction(selectedActionIndex, {
                                    sheet_name: event.target.value,
                                })
                            }
                            placeholder="Leads"
                        />
                    </div>
                )}
                {selectedAction.type === 'assign_agent' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                            Agent or department name
                        </Label>
                        <Input
                            className="h-9 text-xs"
                            value={selectedAction.agent_name ?? ''}
                            onChange={(event) =>
                                handleUpdateAction(selectedActionIndex, {
                                    agent_name: event.target.value,
                                })
                            }
                            placeholder="Sales Team"
                        />
                    </div>
                )}
                {selectedAction.type === 'condition' &&
                    (() => {
                        const conds = selectedAction.conditions || [];
                        const relation =
                            selectedAction.conditions_relation || 'AND';

                        const updateRelation = (rel: 'AND' | 'OR') => {
                            handleUpdateAction(selectedActionIndex, {
                                conditions_relation: rel,
                            });
                        };

                        const updateCondItem = (
                            idx: number,
                            fields: Partial<{
                                operator:
                                    | 'contains'
                                    | 'equals'
                                    | 'starts_with'
                                    | 'ends_with';
                                value: string;
                            }>,
                        ) => {
                            const newConds = [...conds];
                            newConds[idx] = { ...newConds[idx], ...fields };

                            const first = newConds[0];
                            const legacyStr = first
                                ? `message ${first.operator} ${first.value}`
                                : '';

                            handleUpdateAction(selectedActionIndex, {
                                conditions: newConds,
                                condition: legacyStr,
                            });
                        };

                        const addCondItem = () => {
                            const newConds = [
                                ...conds,
                                { operator: 'contains' as const, value: '' },
                            ];
                            handleUpdateAction(selectedActionIndex, {
                                conditions: newConds,
                            });
                        };

                        const removeCondItem = (idx: number) => {
                            const newConds = conds.filter((_, i) => i !== idx);
                            const first = newConds[0];
                            const legacyStr = first
                                ? `message ${first.operator} ${first.value}`
                                : '';
                            handleUpdateAction(selectedActionIndex, {
                                conditions: newConds,
                                condition: legacyStr,
                            });
                        };

                        return (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">
                                        Condition relation
                                    </Label>
                                    <select
                                        className="h-9 w-full rounded-md border bg-background px-3 text-xs font-semibold"
                                        value={relation}
                                        onChange={(e) =>
                                            updateRelation(
                                                e.target.value as 'AND' | 'OR',
                                            )
                                        }
                                    >
                                        <option value="AND">
                                            All conditions must match (AND)
                                        </option>
                                        <option value="OR">
                                            Any condition can match (OR)
                                        </option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs font-bold">
                                        Conditions
                                    </Label>
                                    {conds.map((cond, idx) => (
                                        <div
                                            key={idx}
                                            className="border-zinc-150 relative space-y-2 rounded-xl border bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                                        >
                                            {conds.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeCondItem(idx)
                                                    }
                                                    className="absolute top-2 left-2 text-[10px] font-bold text-rose-500 hover:text-rose-700"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                            <div className="text-[10px] font-bold text-zinc-400">
                                                Condition #{idx + 1}
                                            </div>

                                            <div className="space-y-1">
                                                <select
                                                    className="h-8 w-full rounded-md border bg-background px-2 text-[11px] font-semibold"
                                                    value={cond.operator}
                                                    onChange={(e) =>
                                                        updateCondItem(idx, {
                                                            operator: e.target
                                                                .value as any,
                                                        })
                                                    }
                                                >
                                                    <option value="contains">
                                                        Contains
                                                    </option>
                                                    <option value="equals">
                                                        Equals
                                                    </option>
                                                    <option value="starts_with">
                                                        Starts with
                                                    </option>
                                                    <option value="ends_with">
                                                        Ends with
                                                    </option>
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <Input
                                                    className="h-8 text-[11px]"
                                                    value={cond.value}
                                                    onChange={(e) =>
                                                        updateCondItem(idx, {
                                                            value: e.target
                                                                .value,
                                                        })
                                                    }
                                                    placeholder="Keyword or expected value..."
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-relaxed font-bold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                                    Connect each condition from the canvas. Drag
                                    an edge from this condition node to the
                                    message or action node it should trigger.
                                    Outgoing edges follow the condition order:
                                    condition #1 uses the first edge, condition
                                    #2 uses the second edge, and so on.
                                </div>

                                <Button
                                    type="button"
                                    onClick={addCondItem}
                                    variant="outline"
                                    className="h-8 w-full border-dashed border-emerald-300 text-[11px] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                                >
                                    + Add another condition
                                </Button>
                            </div>
                        );
                    })()}
                {selectedAction.type === 'delay' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                            Delay time in seconds
                        </Label>
                        <Input
                            className="h-9 text-xs"
                            min={1}
                            type="number"
                            value={selectedAction.delay_seconds ?? 60}
                            onChange={(event) =>
                                handleUpdateAction(selectedActionIndex, {
                                    delay_seconds: Number(event.target.value),
                                })
                            }
                        />
                    </div>
                )}

                {selectedAction.type === 'save_response' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                            Save response into
                        </Label>
                        <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                            value={selectedAction.response_field ?? 'notes'}
                            onChange={(event) =>
                                handleUpdateAction(selectedActionIndex, {
                                    response_field: event.target
                                        .value as Action['response_field'],
                                })
                            }
                        >
                            <option value="notes">Notes</option>
                            <option value="var1">Var 1</option>
                            <option value="var2">Var 2</option>
                            <option value="var3">Var 3</option>
                            <option value="var4">Var 4</option>
                            <option value="var5">Var 5</option>
                        </select>
                    </div>
                )}

                {(selectedAction.type === 'add_to_group' ||
                    selectedAction.type === 'remove_from_group') && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold">
                            Select contact group
                        </Label>
                        <select
                            className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                            value={selectedAction.group_id !== undefined ? String(selectedAction.group_id) : ''}
                            onChange={(event) =>
                                handleUpdateAction(selectedActionIndex, {
                                    group_id: event.target.value,
                                })
                            }
                        >
                            {groups.map((group) => (
                                <option key={String(group.id)} value={String(group.id)}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {selectedAction.type === 'disable_autoreply' && (
                    <div className="rounded-xl bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                        This node will pause automated replies at this point in
                        the flow.
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className={`fixed inset-0 z-40 grid bg-[#eef2f5] transition-all duration-300 dark:bg-zinc-950 ${isSidebarOpen ? 'lg:grid-cols-[360px_1fr]' : 'lg:grid-cols-[0_1fr]'}`}
            dir="ltr"
        >
            {isSidebarOpen && (
                <button
                    className="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden"
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Floating Sidebar Toggle Handle (Desktop Only) */}
            <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`absolute top-1/2 z-50 hidden h-16 w-5 -translate-y-1/2 items-center justify-center rounded-r-xl border-y border-r bg-white text-zinc-500 shadow-md transition-all duration-300 hover:bg-zinc-50 hover:text-emerald-600 lg:flex dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
                    isSidebarOpen ? 'left-[360px]' : 'left-0'
                }`}
                title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
                {isSidebarOpen ? (
                    <ChevronLeft className="h-4 w-4" />
                ) : (
                    <ChevronRight className="h-4 w-4" />
                )}
            </button>

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex min-h-0 w-[min(360px,calc(100vw-24px))] flex-col border-r bg-white transition-all duration-300 lg:relative lg:z-auto dark:bg-zinc-950 ${
                    isSidebarOpen
                        ? 'translate-x-0 lg:w-[360px]'
                        : '-translate-x-full lg:pointer-events-none lg:w-0 lg:translate-x-0 lg:opacity-0'
                }`}
            >
                {/* Sidebar Header */}
                <div className="border-b p-5 text-left">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Link
                                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                href={automationsIndex.url()}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <button
                                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-900"
                                type="button"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <PanelRightClose className="h-5 w-5" />
                            </button>
                        </div>
                        <div>
                            <div className="text-xl font-black">
                                Flow Options
                            </div>
                            <p className="mt-1 text-xs font-semibold text-zinc-500">
                                Design flows and automate conversations with
                                ease
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs selection bar */}
                <div className="flex border-b bg-zinc-50 p-1 dark:bg-zinc-900/50">
                    <button
                        type="button"
                        onClick={() => setSidebarTab('nodes')}
                        className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
                            sidebarTab === 'nodes'
                                ? 'bg-white text-emerald-600 shadow-xs dark:bg-zinc-950 dark:text-emerald-400'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                    >
                        Nodes
                    </button>
                    <button
                        type="button"
                        onClick={() => setSidebarTab('templates')}
                        className={`flex-1 rounded-lg py-2 text-center text-xs font-bold transition-all ${
                            sidebarTab === 'templates'
                                ? 'bg-white text-emerald-600 shadow-xs dark:bg-zinc-950 dark:text-emerald-400'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                    >
                        Templates
                    </button>
                </div>

                {sidebarTab === 'nodes' ? (
                    <>
                        {/* Search and Imports section */}
                        <div className="space-y-3 border-b p-4">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    className="h-9 pl-9 text-xs"
                                    value={paletteSearch}
                                    onChange={(event) =>
                                        setPaletteSearch(event.target.value)
                                    }
                                    placeholder="Search nodes and tools..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    ref={importInputRef}
                                    accept="application/json,.json"
                                    className="hidden"
                                    type="file"
                                    onChange={(event) =>
                                        void importIntoCurrentFlow(
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <Button
                                    className="h-9 gap-2 text-xs"
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        importInputRef.current?.click()
                                    }
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Import
                                </Button>
                                <Button
                                    className="h-9 gap-2 text-xs"
                                    type="button"
                                    variant="outline"
                                    onClick={exportCurrentFlow}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Export
                                </Button>
                            </div>
                        </div>

                        {/* Nodes Catalog */}
                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            <div className="space-y-6">
                                {categories.map((category) => {
                                    const items = filteredCatalog.filter(
                                        (item) => item.category === category,
                                    );

                                    if (items.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <section
                                            key={category}
                                            className="space-y-2.5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                                                <h3 className="text-[10px] font-black tracking-wide text-zinc-400 uppercase">
                                                    {category}
                                                </h3>
                                                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                                            </div>
                                            <div className="space-y-2">
                                                {items.map((item) => {
                                                    const Icon = item.icon;

                                                    return (
                                                        <button
                                                            key={item.type}
                                                            className="flex w-full items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:bg-zinc-950"
                                                            type="button"
                                                            onClick={() =>
                                                                handleAddAction(
                                                                    item.type,
                                                                )
                                                            }
                                                        >
                                                            <div
                                                                className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[item.color] ?? colorClasses.emerald}`}
                                                            >
                                                                <Icon className="h-5 w-5" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="truncate text-xs font-black text-zinc-900 dark:text-zinc-50">
                                                                    {item.title}
                                                                </div>
                                                                <div className="mt-0.5 truncate text-[10px] font-semibold text-zinc-400">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    /* Advanced Templates Tab */
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                        {premadeTemplates.map((t, idx) => {
                            const Icon = t.icon;

                            return (
                                <div
                                    key={idx}
                                    className="group relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-4 text-left transition-all duration-300 hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClasses[t.color] ?? colorClasses.emerald}`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-xs font-black text-zinc-800 transition-colors group-hover:text-emerald-600 dark:text-zinc-100">
                                                {t.name}
                                            </h4>
                                            <p className="mt-1 text-[10px] leading-relaxed font-semibold text-zinc-400">
                                                {t.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="dark:border-zinc-850 mt-3.5 flex items-center justify-between border-t border-dashed border-zinc-100 pt-3">
                                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-500 dark:bg-zinc-800">
                                            {t.actions.length} steps
                                        </span>
                                        <Button
                                            type="button"
                                            onClick={() => loadTemplate(idx)}
                                            className="h-7 border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                                        >
                                            Apply template
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </aside>

            <main className="relative min-h-0">
                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 border-b bg-white/70 px-3 py-3 backdrop-blur sm:px-5 dark:bg-zinc-950/70">
                    <div className="flex min-w-0 items-center gap-2">
                        {!isSidebarOpen && (
                            <button
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300"
                                type="button"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        )}
                        <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm dark:bg-zinc-900">
                            <Workflow className="h-4 w-4 text-emerald-600" />
                            <input
                                className="min-w-0 bg-transparent text-sm font-black text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-200"
                                value={formData.name}
                                onChange={(event) =>
                                    setFormDataField('name', event.target.value)
                                }
                                placeholder="Name this flow..."
                            />
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsSimulatorOpen((prev) => !prev)}
                            className="h-10 gap-2 border-none bg-zinc-900 px-4 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        >
                            Live Flow Test
                        </Button>
                        <Button
                            asChild
                            className="hidden h-10 gap-2 text-xs sm:inline-flex"
                            type="button"
                            variant="outline"
                        >
                            <Link href={automationsIndex.url()}>Cancel</Link>
                        </Button>
                        <Button
                            className="h-10 gap-2 bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-700"
                            disabled={isProcessing}
                            type="button"
                            onClick={submitFlow}
                        >
                            <Check className="h-4 w-4" />
                            Save Flow
                        </Button>
                    </div>
                </div>

                {/* Floating Node Settings Drawer (Left Side) */}
                {selectedActionIndex !== null && selectedAction && (
                    <div className="absolute top-20 left-4 z-30 max-h-[calc(100vh-120px)] w-[350px] animate-in overflow-y-auto rounded-2xl border border-zinc-200 bg-white/95 p-5 text-left shadow-2xl backdrop-blur duration-300 slide-in-from-left dark:border-zinc-800 dark:bg-zinc-950/95">
                        <div className="mb-3 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setSelectedActionIndex(null)}
                                className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800"
                            >
                                Close
                            </button>
                            <span className="text-xs font-bold text-zinc-400">
                                Step settings
                            </span>
                        </div>
                        {renderActionEditor()}
                    </div>
                )}

                {/* WhatsApp Interactive Simulator Panel */}
                {isSimulatorOpen && (
                    <div className="absolute bottom-4 left-4 z-30 flex h-[480px] w-[360px] animate-in flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 shadow-2xl duration-300 slide-in-from-bottom dark:border-zinc-800 dark:bg-zinc-900">
                        {/* Mock Phone Header */}
                        <div className="flex items-center justify-between bg-[#075e54] p-4 text-white">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSimulatorOpen(false);
                                    setSimulatedNodeStatuses({});
                                }}
                                className="rounded-full bg-black/10 px-2.5 py-1 text-xs font-bold text-white hover:opacity-85"
                            >
                                Close
                            </button>
                            <div className="text-left">
                                <div className="flex items-center justify-start gap-1.5 text-sm font-black">
                                    <span>RAVISN Bot</span>
                                    <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400"></span>
                                </div>
                                <div className="text-[10px] opacity-75">
                                    Live flow simulator
                                </div>
                            </div>
                        </div>

                        {/* Message Timeline */}
                        <div className="flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-4 dark:bg-zinc-950">
                            {simulatorMessages.map((msg, index) => {
                                if (msg.sender === 'system') {
                                    return (
                                        <div
                                            key={index}
                                            className="text-center"
                                        >
                                            <span className="inline-block max-w-[85%] rounded-xl bg-zinc-200/95 px-3 py-1.5 text-[10px] leading-relaxed font-bold text-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-300">
                                                {msg.text}
                                            </span>
                                        </div>
                                    );
                                }

                                const isUser = msg.sender === 'user';

                                return (
                                    <div
                                        key={index}
                                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl p-3 text-left text-xs leading-relaxed font-semibold shadow-sm ${
                                                isUser
                                                    ? 'rounded-tr-none bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white'
                                                    : 'rounded-tl-none border-l-2 border-emerald-500 bg-[#d9fdd3] text-zinc-900 dark:bg-emerald-950/60 dark:text-emerald-50'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSimulateMessage(simulatorInput);
                            }}
                            className="flex items-center gap-2 border-t bg-white p-3 dark:bg-zinc-900"
                        >
                            <Button
                                type="submit"
                                disabled={
                                    isSimulating || !simulatorInput.trim()
                                }
                                className="h-9 rounded-full bg-[#075e54] px-4 text-xs text-white hover:bg-[#128c7e]"
                            >
                                {isSimulating ? 'Sending...' : 'Send'}
                            </Button>
                            <Input
                                value={simulatorInput}
                                onChange={(e) =>
                                    setSimulatorInput(e.target.value)
                                }
                                disabled={isSimulating}
                                className="h-9 flex-1 bg-zinc-50 text-left text-xs dark:bg-zinc-800"
                                placeholder="Type a test message..."
                            />
                        </form>
                    </div>
                )}

                <ReactFlow
                    className="h-full w-full pt-16"
                    edges={edges}
                    fitView
                    maxZoom={1.3}
                    minZoom={0.35}
                    nodes={nodes}
                    nodeTypes={nodeTypes}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={(_, node) => {
                        const actionIndex = node.data.actionIndex;

                        if (typeof actionIndex === 'number') {
                            setSelectedActionIndex(actionIndex);
                        }
                    }}
                    onNodesChange={onNodesChange}
                >
                    <Background color="#94a3b8" gap={24} size={1.2} />
                    <Controls position="bottom-left" showInteractive={false} />
                </ReactFlow>
            </main>
        </div>
    );
}
