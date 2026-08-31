import { Head } from '@inertiajs/react';
import * as React from 'react';

import { FlowBuilder } from './flow-builder';
import type { Group } from './flow-builder';

interface CreateAutomationProps {
    groups: Group[];
}

export default function CreateAutomation({ groups }: CreateAutomationProps) {
    return (
        <>
            <Head title="Create Automation Flow" />
            <FlowBuilder groups={groups} />
        </>
    );
}

CreateAutomation.layout = (page: React.ReactNode) => page;
