import { Head, router, useForm } from '@inertiajs/react';
import {
    Users,
    Plus,
    Download,
    Upload,
    Edit2,
    Trash2,
    Search,
    Tag,
    X,
    FileText,
    Folders,
    UserMinus,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { Column } from '@/components/ui/data-table';
import { DataTable } from '@/components/ui/data-table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Group {
    id: string | number;
    name: string;
    description: string | null;
    contacts_count: number;
}

interface Contact {
    id: string | number;
    name: string;
    phone: string;
    email: string | null;
    notes: string | null;
    var1: string | null;
    var2: string | null;
    var3: string | null;
    var4: string | null;
    var5: string | null;
    groups: { id: string | number; name: string }[];
    created_at: string;
}

interface PaginatedContacts {
    data: Contact[];
    current_page: number;
    last_page: number;
    total: number;
}

interface MiniContact {
    id: string | number;
    name: string;
    phone: string;
}

interface ContactsIndexProps {
    contacts: PaginatedContacts;
    groups: Group[];
    allContacts: MiniContact[];
    totalContactsCount: number;
    filters: {
        search?: string;
        group_id?: string;
    };
}

export default function ContactsIndex({
    contacts,
    groups,
    allContacts,
    totalContactsCount,
    filters,
}: ContactsIndexProps) {
    const [search, setSearch] = React.useState(filters.search || '');
    const [selectedGroupId, setSelectedGroupId] = React.useState<string>(
        filters.group_id || 'all',
    );

    // Modals visibility
    const [addEditContactOpen, setAddEditContactOpen] = React.useState(false);
    const [addEditGroupOpen, setAddEditGroupOpen] = React.useState(false);
    const [importOpen, setImportOpen] = React.useState(false);
    const [membersOpen, setMembersOpen] = React.useState(false);

    // Editing States
    const [editingContact, setEditingContact] = React.useState<Contact | null>(
        null,
    );
    const [editingGroup, setEditingGroup] = React.useState<Group | null>(null);
    const [managingGroup, setManagingGroup] = React.useState<Group | null>(
        null,
    );

    // Group Member Management States
    const [currentGroupMembers, setCurrentGroupMembers] = React.useState<
        MiniContact[]
    >([]);
    const [loadingMembers, setLoadingMembers] = React.useState(false);
    const [addContactSearch, setAddContactSearch] = React.useState('');
    const [selectedContactIds, setSelectedContactIds] = React.useState<
        (string | number)[]
    >([]);

    // Contact Form
    const contactForm = useForm({
        name: '',
        phone: '',
        email: '',
        notes: '',
        var1: '',
        var2: '',
        var3: '',
        var4: '',
        var5: '',
        group_ids: [] as (string | number)[],
    });

    // Group Form
    const groupForm = useForm({
        name: '',
        description: '',
    });

    // Import Form
    const importForm = useForm({
        file: null as File | null,
        group_ids: [] as (string | number)[],
    });

    // Filter Trigger
    const triggerFilter = (groupId: string, searchVal: string) => {
        router.get(
            '/dashboard/contacts',
            {
                search: searchVal || undefined,
                group_id: groupId === 'all' ? undefined : groupId,
            },
            { preserveState: true },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        triggerFilter(selectedGroupId, search);
    };

    const selectGroup = (groupId: string) => {
        setSelectedGroupId(groupId);
        triggerFilter(groupId, search);
    };

    // Sync forms on edit
    React.useEffect(() => {
        if (editingContact) {
            contactForm.setData({
                name: editingContact.name,
                phone: editingContact.phone,
                email: editingContact.email || '',
                notes: editingContact.notes || '',
                var1: editingContact.var1 || '',
                var2: editingContact.var2 || '',
                var3: editingContact.var3 || '',
                var4: editingContact.var4 || '',
                var5: editingContact.var5 || '',
                group_ids: editingContact.groups.map((g) => String(g.id)),
            });
        } else {
            contactForm.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingContact, addEditContactOpen]);

    React.useEffect(() => {
        if (editingGroup) {
            groupForm.setData({
                name: editingGroup.name,
                description: editingGroup.description || '',
            });
        } else {
            groupForm.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingGroup, addEditGroupOpen]);

    // Fetch members when managingGroup opens
    React.useEffect(() => {
        if (managingGroup) {
            setTimeout(() => setLoadingMembers(true), 0);
            fetch(`/dashboard/contact-groups/${String(managingGroup.id)}/members`)
                .then((res) => res.json())
                .then((data) => {
                    setCurrentGroupMembers(data);
                    setLoadingMembers(false);
                })
                .catch(() => setLoadingMembers(false));
        } else {
            setTimeout(() => {
                setCurrentGroupMembers([]);
                setSelectedContactIds([]);
                setAddContactSearch('');
            }, 0);
        }
    }, [managingGroup, membersOpen]);

    const handleSaveContact = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingContact) {
            contactForm.put(`/dashboard/contacts/${String(editingContact.id)}`, {
                onSuccess: () => {
                    toast.success('Contact updated successfully!');
                    setAddEditContactOpen(false);
                    setEditingContact(null);
                },
            });
        } else {
            contactForm.post('/dashboard/contacts', {
                onSuccess: () => {
                    toast.success('Contact created successfully!');
                    setAddEditContactOpen(false);
                },
            });
        }
    };

    const handleSaveGroup = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingGroup) {
            groupForm.put(`/dashboard/contact-groups/${String(editingGroup.id)}`, {
                onSuccess: () => {
                    toast.success('Group updated successfully!');
                    setAddEditGroupOpen(false);
                    setEditingGroup(null);
                },
            });
        } else {
            groupForm.post('/dashboard/contact-groups', {
                onSuccess: () => {
                    toast.success('Group created successfully!');
                    setAddEditGroupOpen(false);
                },
            });
        }
    };

    const handleDeleteContact = (contact: Contact) => {
        if (
            confirm(
                `Are you sure you want to delete contact "${contact.name}"?`,
            )
        ) {
            router.delete(`/dashboard/contacts/${String(contact.id)}`, {
                onSuccess: () => {
                    toast.success('Contact deleted successfully');
                },
            });
        }
    };

    const handleDeleteGroup = (group: Group) => {
        if (
            confirm(
                `Are you sure you want to delete group "${group.name}"? Contacts inside this group will not be deleted.`,
            )
        ) {
            router.delete(`/dashboard/contact-groups/${String(group.id)}`, {
                onSuccess: () => {
                    toast.success('Group deleted successfully');

                    if (selectedGroupId === String(group.id)) {
                        selectGroup('all');
                    }
                },
            });
        }
    };

    const handleImportContacts = (e: React.FormEvent) => {
        e.preventDefault();

        if (!importForm.data.file) {
            toast.error('Please select a CSV file.');

            return;
        }

        importForm.post('/dashboard/contacts/import', {
            onSuccess: () => {
                toast.success('Contacts imported successfully!');
                setImportOpen(false);
                importForm.reset();
            },
        });
    };

    const handleRemoveContactFromGroup = (contactId: string | number) => {
        if (managingGroup) {
            router.delete(
                `/dashboard/contact-groups/${String(managingGroup.id)}/contacts/${String(contactId)}`,
                {
                    onSuccess: () => {
                        toast.success('Contact removed from group');
                        setCurrentGroupMembers((prev) =>
                            prev.filter((m) => String(m.id) !== String(contactId)),
                        );
                    },
                },
            );
        }
    };

    const handleAddContactsToGroup = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedContactIds.length === 0) {
            toast.error('Please select at least one contact.');

            return;
        }

        if (managingGroup) {
            router.post(
                `/dashboard/contact-groups/${String(managingGroup.id)}/contacts`,
                {
                    contact_ids: selectedContactIds,
                },
                {
                    onSuccess: () => {
                        toast.success('Contacts added to group successfully!');
                        setSelectedContactIds([]);
                        setMembersOpen(false);
                        setManagingGroup(null);
                    },
                },
            );
        }
    };

    const toggleContactSelection = (contactId: string | number) => {
        setSelectedContactIds((prev) => {
            const strId = String(contactId);
            const exists = prev.some((id) => String(id) === strId);

            if (exists) {
                return prev.filter((id) => String(id) !== strId);
            } else {
                return [...prev, contactId];
            }
        });
    };

    const filteredAllContacts = allContacts.filter((contact) => {
        const matchesSearch =
            contact.name
                .toLowerCase()
                .includes(addContactSearch.toLowerCase()) ||
            contact.phone.includes(addContactSearch);
        const alreadyMember = currentGroupMembers.some(
            (m) => String(m.id) === String(contact.id),
        );

        return matchesSearch && !alreadyMember;
    });

    const activeGroupDetails = React.useMemo(() => {
        if (selectedGroupId === 'all') {
            return null;
        }

        return groups.find((g) => String(g.id) === selectedGroupId) || null;
    }, [groups, selectedGroupId]);

    const columns: Column<Contact>[] = [
        {
            header: 'Name',
            accessorKey: 'name',
            className: 'font-semibold',
            cell: (row) => (
                <div className="flex flex-col text-left">
                    <span className="font-semibold text-foreground">
                        {row.name}
                    </span>
                    {row.email && (
                        <span className="text-xs text-muted-foreground">
                            {row.email}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Phone Number',
            accessorKey: 'phone',
            className: 'font-mono text-sm text-foreground/80',
        },
        {
            header: 'Groups',
            accessorKey: 'groups',
            cell: (row) => (
                <div className="flex max-w-[200px] flex-wrap gap-1">
                    {row.groups.length > 0 ? (
                        row.groups.map((g) => (
                            <span
                                key={g.id}
                                className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                                <Tag className="h-2.5 w-2.5" />
                                {g.name}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground italic">
                            None
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Variables',
            accessorKey: 'var1',
            cell: (row) => {
                const vars = [
                    row.var1 ? `Var1: ${row.var1}` : null,
                    row.var2 ? `Var2: ${row.var2}` : null,
                    row.var3 ? `Var3: ${row.var3}` : null,
                    row.var4 ? `Var4: ${row.var4}` : null,
                    row.var5 ? `Var5: ${row.var5}` : null,
                ].filter(Boolean);

                return (
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                        {vars.length > 0 ? (
                            vars.map((v, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                >
                                    {v}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground italic">
                                -
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Notes',
            accessorKey: 'notes',
            className: 'max-w-[250px] truncate text-muted-foreground text-xs',
            cell: (row) => row.notes || '-',
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (row) => (
                <div className="flex justify-end gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        onClick={() => {
                            setEditingContact(row);
                            setAddEditContactOpen(true);
                        }}
                    >
                        <Edit2 className="h-4 w-4 text-zinc-500" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20"
                        onClick={() => handleDeleteContact(row)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Contacts & Groups" />

            <Card>
                <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
                    {/* 1. Left CRM Panels: Groups & Lists */}
                    <div className="flex w-full flex-col gap-6 border-b bg-zinc-50/50 p-5 lg:w-[260px] lg:border-r lg:border-b-0 dark:bg-zinc-900/10">
                        <div className="flex flex-col gap-1 text-left">
                            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                Contacts Console
                            </span>
                        </div>

                        {/* Navigation list */}
                        <div className="flex flex-col gap-1 text-left">
                            <button
                                onClick={() => selectGroup('all')}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                                    selectedGroupId === 'all'
                                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-zinc-500" />
                                    <span>All Contacts</span>
                                </div>
                                <span className="rounded bg-zinc-200/50 px-1.5 py-0.5 font-mono text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                                    {totalContactsCount}
                                </span>
                            </button>
                        </div>

                        {/* Groups List */}
                        <div className="flex flex-col gap-2 text-left">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                                    Contact Groups
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                    onClick={() => {
                                        setEditingGroup(null);
                                        setAddEditGroupOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto pr-1">
                                {groups.map((group) => (
                                    <div
                                        key={group.id}
                                        className={`group flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                            selectedGroupId === String(group.id)
                                                ? 'bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white'
                                                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <button
                                            onClick={() =>
                                                selectGroup(String(group.id))
                                            }
                                            className="flex flex-1 items-center gap-2 truncate text-left"
                                        >
                                            <Folders className="h-4 w-4 shrink-0 text-zinc-400" />
                                            <span className="truncate">
                                                {group.name}
                                            </span>
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                            <span className="rounded bg-zinc-200/50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-400">
                                                {group.contacts_count}
                                            </span>

                                            {/* Inline small actions displayed on hover */}
                                            <div className="hidden items-center gap-0.5 rounded bg-zinc-100 p-0.5 shadow-sm group-hover:flex dark:bg-zinc-800">
                                                <button
                                                    className="p-1 hover:text-emerald-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingGroup(group);
                                                        setAddEditGroupOpen(
                                                            true,
                                                        );
                                                    }}
                                                    title="Edit Group"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                    className="p-1 hover:text-rose-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteGroup(
                                                            group,
                                                        );
                                                    }}
                                                    title="Delete Group"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {groups.length === 0 && (
                                    <span className="px-3 py-2 text-xs text-muted-foreground italic">
                                        No groups created.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Right main panel: Contacts Data Table */}
                    <div className="flex flex-1 flex-col gap-6 px-4 text-left">
                        {/* Header */}
                        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">
                                    {activeGroupDetails
                                        ? activeGroupDetails.name
                                        : 'All Contacts'}
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {activeGroupDetails?.description ||
                                        'View and manage all contact entries saved in RAVISN.'}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                                {activeGroupDetails && (
                                    <Button
                                        variant="outline"
                                        className="gap-1.5 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                        onClick={() => {
                                            setManagingGroup(
                                                activeGroupDetails,
                                            );
                                            setMembersOpen(true);
                                        }}
                                    >
                                        <Users className="h-4 w-4" />
                                        <span>Manage Members</span>
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() =>
                                        window.open(
                                            '/dashboard/contacts/export',
                                            '_blank',
                                        )
                                    }
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Export CSV</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => setImportOpen(true)}
                                >
                                    <Upload className="h-4 w-4" />
                                    <span>Import CSV</span>
                                </Button>

                                <Button
                                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                                    onClick={() => {
                                        setEditingContact(null);
                                        setAddEditContactOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Add Contact</span>
                                </Button>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-col gap-3 sm:flex-row"
                        >
                            <div className="relative flex-1">
                                <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, phone or email..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="secondary"
                                className="gap-1.5"
                            >
                                Search
                            </Button>

                            {(search || selectedGroupId !== 'all') && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="gap-1 px-2"
                                    onClick={() => {
                                        setSearch('');
                                        setSelectedGroupId('all');
                                        router.get(
                                            '/dashboard/contacts',
                                            {},
                                            { preserveState: true },
                                        );
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                    <span>Reset Filter</span>
                                </Button>
                            )}
                        </form>

                        {/* Data Table */}
                        <DataTable
                            columns={columns}
                            data={contacts.data}
                            pagination={{
                                currentPage: contacts.current_page,
                                lastPage: contacts.last_page,
                                total: contacts.total,
                                onPageChange: (page) => {
                                    router.get(
                                        '/dashboard/contacts',
                                        {
                                            page,
                                            search: search || undefined,
                                            group_id:
                                                selectedGroupId === 'all'
                                                    ? undefined
                                                    : selectedGroupId,
                                        },
                                        { preserveState: true },
                                    );
                                },
                            }}
                            emptyMessage="No contacts found in this list. Create a contact or upload a CSV file."
                        />
                    </div>
                </div>
            </Card>

            {/* Add / Edit Contact Modal */}
            <Dialog
                open={addEditContactOpen}
                onOpenChange={setAddEditContactOpen}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingContact ? 'Edit Contact' : 'Create Contact'}
                        </DialogTitle>
                        <DialogDescription>
                            Enter contact info. Make sure the phone number
                            includes the country code.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleSaveContact}
                        className="space-y-4 py-2 text-left"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="contact-name">Name *</Label>
                            <Input
                                id="contact-name"
                                required
                                value={contactForm.data.name}
                                onChange={(e) =>
                                    contactForm.setData('name', e.target.value)
                                }
                                placeholder="John Doe"
                            />
                            {contactForm.errors.name && (
                                <p className="text-xs text-rose-500">
                                    {contactForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="contact-phone">
                                Phone Number *
                            </Label>
                            <Input
                                id="contact-phone"
                                required
                                value={contactForm.data.phone}
                                onChange={(e) =>
                                    contactForm.setData('phone', e.target.value)
                                }
                                placeholder="+12125550198"
                            />
                            {contactForm.errors.phone && (
                                <p className="text-xs text-rose-500">
                                    {contactForm.errors.phone}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="contact-email">Email</Label>
                            <Input
                                id="contact-email"
                                type="email"
                                value={contactForm.data.email}
                                onChange={(e) =>
                                    contactForm.setData('email', e.target.value)
                                }
                                placeholder="john@example.com"
                            />
                            {contactForm.errors.email && (
                                <p className="text-xs text-rose-500">
                                    {contactForm.errors.email}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="contact-notes">Notes</Label>
                            <Textarea
                                id="contact-notes"
                                value={contactForm.data.notes}
                                onChange={(e) =>
                                    contactForm.setData('notes', e.target.value)
                                }
                                placeholder="Important details about this contact..."
                                rows={2}
                            />
                            {contactForm.errors.notes && (
                                <p className="text-xs text-rose-500">
                                    {contactForm.errors.notes}
                                </p>
                            )}
                        </div>

                        <div className="mt-3 grid gap-2 border-t pt-3">
                            <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                                Additional Fields (Variables)
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1">
                                    <Label
                                        htmlFor="contact-var1"
                                        className="text-xs"
                                    >
                                        Var 1
                                    </Label>
                                    <Input
                                        id="contact-var1"
                                        value={contactForm.data.var1}
                                        onChange={(e) =>
                                            contactForm.setData(
                                                'var1',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Value for {{2}}"
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label
                                        htmlFor="contact-var2"
                                        className="text-xs"
                                    >
                                        Var 2
                                    </Label>
                                    <Input
                                        id="contact-var2"
                                        value={contactForm.data.var2}
                                        onChange={(e) =>
                                            contactForm.setData(
                                                'var2',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Value for {{3}}"
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label
                                        htmlFor="contact-var3"
                                        className="text-xs"
                                    >
                                        Var 3
                                    </Label>
                                    <Input
                                        id="contact-var3"
                                        value={contactForm.data.var3}
                                        onChange={(e) =>
                                            contactForm.setData(
                                                'var3',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Value for {{4}}"
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label
                                        htmlFor="contact-var4"
                                        className="text-xs"
                                    >
                                        Var 4
                                    </Label>
                                    <Input
                                        id="contact-var4"
                                        value={contactForm.data.var4}
                                        onChange={(e) =>
                                            contactForm.setData(
                                                'var4',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Value for {{5}}"
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="col-span-2 grid gap-1">
                                    <Label
                                        htmlFor="contact-var5"
                                        className="text-xs"
                                    >
                                        Var 5
                                    </Label>
                                    <Input
                                        id="contact-var5"
                                        value={contactForm.data.var5}
                                        onChange={(e) =>
                                            contactForm.setData(
                                                'var5',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Value for {{6}}"
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {groups.length > 0 && (
                            <div className="grid gap-2">
                                <Label>Assign Groups</Label>
                                <div className="grid max-h-[120px] grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
                                    {groups.map((group) => (
                                        <div
                                            key={group.id}
                                            className="flex items-center space-x-2"
                                        >
                                            <Checkbox
                                                id={`c-group-${group.id}`}
                                                checked={contactForm.data.group_ids.includes(
                                                    group.id,
                                                )}
                                                onCheckedChange={() => {
                                                    const current = [
                                                        ...contactForm.data
                                                            .group_ids,
                                                    ];
                                                    const idx = current.indexOf(
                                                        group.id,
                                                    );

                                                    if (idx > -1) {
                                                        current.splice(idx, 1);
                                                    } else {
                                                        current.push(group.id);
                                                    }

                                                    contactForm.setData(
                                                        'group_ids',
                                                        current,
                                                    );
                                                }}
                                            />
                                            <label
                                                htmlFor={`c-group-${group.id}`}
                                                className="cursor-pointer text-sm leading-none font-medium"
                                            >
                                                {group.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddEditContactOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={contactForm.processing}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {contactForm.processing
                                    ? 'Saving...'
                                    : 'Save Contact'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create / Edit Group Modal */}
            <Dialog open={addEditGroupOpen} onOpenChange={setAddEditGroupOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingGroup
                                ? 'Edit Group'
                                : 'Create Contact Group'}
                        </DialogTitle>
                        <DialogDescription>
                            Create a custom segment list to group related
                            contacts together.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleSaveGroup}
                        className="space-y-4 py-2 text-left"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="group-name">Group Name *</Label>
                            <Input
                                id="group-name"
                                required
                                value={groupForm.data.name}
                                onChange={(e) =>
                                    groupForm.setData('name', e.target.value)
                                }
                                placeholder="e.g. VIP Clients, Students Batch A"
                            />
                            {groupForm.errors.name && (
                                <p className="text-xs text-rose-500">
                                    {groupForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="group-description">
                                Description
                            </Label>
                            <Textarea
                                id="group-description"
                                value={groupForm.data.description}
                                onChange={(e) =>
                                    groupForm.setData(
                                        'description',
                                        e.target.value,
                                    )
                                }
                                placeholder="Describe the purpose of this contact list segment..."
                                rows={3}
                            />
                            {groupForm.errors.description && (
                                <p className="text-xs text-rose-500">
                                    {groupForm.errors.description}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddEditGroupOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={groupForm.processing}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {groupForm.processing
                                    ? 'Saving...'
                                    : 'Save Group'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Import CSV Modal */}
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Import Contacts from CSV</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file containing contact details.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleImportContacts}
                        className="space-y-4 py-2 text-left"
                    >
                        <div className="space-y-2 rounded-lg border bg-zinc-50 p-3.5 dark:bg-zinc-900">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                CSV Format Requirements
                            </span>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                The file must contain a header row. Columns
                                should be named precisely:
                            </p>
                            <div className="flex flex-wrap gap-1.5 font-mono text-[10px] font-bold text-zinc-800 dark:text-zinc-200">
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                                    name
                                </span>
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                                    phone
                                </span>
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                                    email
                                </span>
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                                    notes
                                </span>
                                <span className="rounded bg-zinc-200/50 px-1.5 py-0.5 text-zinc-500 dark:bg-zinc-800/50">
                                    var1
                                </span>
                                <span className="rounded bg-zinc-200/50 px-1.5 py-0.5 text-zinc-500 dark:bg-zinc-800/50">
                                    var2
                                </span>
                                <span className="rounded bg-zinc-200/50 px-1.5 py-0.5 text-zinc-500 dark:bg-zinc-800/50">
                                    var3
                                </span>
                                <span className="rounded bg-zinc-200/50 px-1.5 py-0.5 text-zinc-500 dark:bg-zinc-800/50">
                                    var4
                                </span>
                                <span className="rounded bg-zinc-200/50 px-1.5 py-0.5 text-zinc-500 dark:bg-zinc-800/50">
                                    var5
                                </span>
                            </div>
                            <p className="pt-1 text-[10px] font-medium text-rose-500">
                                * "name" and "phone" (including country code)
                                columns are required.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="csv_file">Select CSV File</Label>
                            <Input
                                id="csv_file"
                                type="file"
                                accept=".csv,text/csv"
                                required
                                onChange={(e) => {
                                    const files = e.target.files;

                                    if (files && files.length > 0) {
                                        importForm.setData('file', files[0]);
                                    }
                                }}
                            />
                            {importForm.errors.file && (
                                <p className="text-xs text-rose-500">
                                    {importForm.errors.file}
                                </p>
                            )}
                        </div>

                        {groups.length > 0 && (
                            <div className="grid gap-2">
                                <Label>Add Imported Contacts to Groups</Label>
                                <div className="grid max-h-[120px] grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
                                    {groups.map((group) => (
                                        <div
                                            key={group.id}
                                            className="flex items-center space-x-2"
                                        >
                                            <Checkbox
                                                id={`import-group-${group.id}`}
                                                checked={importForm.data.group_ids.includes(
                                                    group.id,
                                                )}
                                                onCheckedChange={() => {
                                                    const current = [
                                                        ...importForm.data
                                                            .group_ids,
                                                    ];
                                                    const idx = current.indexOf(
                                                        group.id,
                                                    );

                                                    if (idx > -1) {
                                                        current.splice(idx, 1);
                                                    } else {
                                                        current.push(group.id);
                                                    }

                                                    importForm.setData(
                                                        'group_ids',
                                                        current,
                                                    );
                                                }}
                                            />
                                            <label
                                                htmlFor={`import-group-${group.id}`}
                                                className="cursor-pointer text-sm leading-none font-medium"
                                            >
                                                {group.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setImportOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={importForm.processing}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {importForm.processing
                                    ? 'Importing...'
                                    : 'Import CSV'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Group Members Modal */}
            <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>
                            Manage Members - {managingGroup?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Add contacts to this group or remove current
                            members.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid h-[380px] grid-cols-1 gap-4 py-2 text-left md:grid-cols-2">
                        {/* Current Members List */}
                        <div className="flex flex-col rounded-md border bg-zinc-50 p-3 dark:bg-zinc-900/50">
                            <span className="mb-2 text-xs font-semibold text-zinc-500">
                                Group Members ({currentGroupMembers.length})
                            </span>

                            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                                {loadingMembers ? (
                                    <div className="py-10 text-center text-xs text-muted-foreground">
                                        Loading members...
                                    </div>
                                ) : currentGroupMembers.length > 0 ? (
                                    currentGroupMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between rounded border bg-white p-2 text-xs dark:bg-zinc-800"
                                        >
                                            <div className="flex flex-col truncate text-left">
                                                <span className="truncate font-medium text-foreground">
                                                    {member.name}
                                                </span>
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    {member.phone}
                                                </span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/5 hover:text-rose-700"
                                                onClick={() =>
                                                    handleRemoveContactFromGroup(
                                                        member.id,
                                                    )
                                                }
                                            >
                                                <UserMinus className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-xs text-muted-foreground">
                                        No members in this group.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Contacts Form */}
                        <div className="flex flex-col rounded-md border p-3">
                            <span className="mb-2 text-xs font-semibold text-zinc-500">
                                Add Contacts
                            </span>

                            {/* Search bar */}
                            <div className="relative mb-2">
                                <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search contacts..."
                                    className="h-8 pl-8 text-xs"
                                    value={addContactSearch}
                                    onChange={(e) =>
                                        setAddContactSearch(e.target.value)
                                    }
                                />
                            </div>

                            <div className="max-h-[220px] flex-1 space-y-1.5 overflow-y-auto pr-1">
                                {filteredAllContacts.length > 0 ? (
                                    filteredAllContacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className="flex cursor-pointer items-center space-x-2 rounded border p-2 text-xs"
                                            onClick={() =>
                                                toggleContactSelection(
                                                    contact.id,
                                                )
                                            }
                                        >
                                            <Checkbox
                                                id={`sel-c-${contact.id}`}
                                                checked={selectedContactIds.includes(
                                                    contact.id,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleContactSelection(
                                                        contact.id,
                                                    )
                                                }
                                            />
                                            <div className="flex flex-col truncate text-left">
                                                <span className="truncate font-medium text-foreground">
                                                    {contact.name}
                                                </span>
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    {contact.phone}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-xs text-muted-foreground">
                                        No contacts available.
                                    </div>
                                )}
                            </div>

                            {selectedContactIds.length > 0 && (
                                <Button
                                    onClick={handleAddContactsToGroup}
                                    className="mt-3 h-8 w-full bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                >
                                    Add {selectedContactIds.length} Contacts
                                </Button>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMembersOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ContactsIndex.layout = (page: any) => page;
