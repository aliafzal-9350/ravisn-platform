import { Head } from '@inertiajs/react';
import * as React from 'react';

import { FlowBuilder } from './flow-builder';
import type { AutomationFlow, Group } from './flow-builder';

interface EditAutomationProps {
    flow: AutomationFlow;
    groups: Group[];
}

export default function EditAutomation({ flow, groups }: EditAutomationProps) {
    return (
        <>
            <Head title={`Edit ${flow.name}`} />
            <FlowBuilder flow={flow} groups={groups} />
        </>
    );
}

EditAutomation.layout = (page: React.ReactNode) => page;
