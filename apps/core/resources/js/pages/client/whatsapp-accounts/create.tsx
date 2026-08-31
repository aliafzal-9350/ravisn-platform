import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Smartphone } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AccountCreate() {
    const { data, setData, post, processing, errors } = useForm({
        phone_number: '',
        phone_number_id: '',
        waba_id: '',
        display_name: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/dashboard/whatsapp-accounts/request-code', {
            onSuccess: () => {
                toast.success(
                    'WhatsApp number registered. Please verify code from numbers table.',
                );
            },
        });
    };

    return (
        <>
            <Head title="Link Number" />
            <div className="flex max-w-xl flex-col gap-6 text-left">
                {/* Back Button */}
                <div className="flex items-center">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link
                            href="/dashboard/whatsapp-accounts"
                            className="inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to Numbers</span>
                        </Link>
                    </Button>
                </div>

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Link WhatsApp Number
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Onboard a new phone number to Meta WABA to dispatch
                        campaign templates.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-emerald-600" />
                            <CardTitle>Phone Details</CardTitle>
                        </div>
                        <CardDescription>
                            Enter WhatsApp API keys. Ensure that the phone
                            number is active and capable of receiving SMS.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="phone_number">
                                    Phone Number (E.164 Format)
                                </Label>
                                <Input
                                    id="phone_number"
                                    value={data.phone_number}
                                    onChange={(e) =>
                                        setData('phone_number', e.target.value)
                                    }
                                    placeholder="e.g. +966500000000"
                                    required
                                />
                                <span className="text-[10px] text-muted-foreground">
                                    Must start with + and include country code.
                                </span>
                                {errors.phone_number && (
                                    <span className="text-xs text-rose-500">
                                        {errors.phone_number}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="display_name">
                                    Display Name (Friendly Name)
                                </Label>
                                <Input
                                    id="display_name"
                                    value={data.display_name}
                                    onChange={(e) =>
                                        setData('display_name', e.target.value)
                                    }
                                    placeholder="e.g. Marketing Outbound"
                                />
                                {errors.display_name && (
                                    <span className="text-xs text-rose-500">
                                        {errors.display_name}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="phone_number_id">
                                    Meta Phone Number ID
                                </Label>
                                <Input
                                    id="phone_number_id"
                                    value={data.phone_number_id}
                                    onChange={(e) =>
                                        setData(
                                            'phone_number_id',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. 102948291039"
                                    required
                                />
                                {errors.phone_number_id && (
                                    <span className="text-xs text-rose-500">
                                        {errors.phone_number_id}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="waba_id">
                                    Meta WhatsApp Business Account ID (WABA ID)
                                </Label>
                                <Input
                                    id="waba_id"
                                    value={data.waba_id}
                                    onChange={(e) =>
                                        setData('waba_id', e.target.value)
                                    }
                                    placeholder="e.g. 9817293810294"
                                    required
                                />
                                {errors.waba_id && (
                                    <span className="text-xs text-rose-500">
                                        {errors.waba_id}
                                    </span>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-4">
                                <Button variant="outline" asChild>
                                    <Link href="/dashboard/whatsapp-accounts">
                                        Cancel
                                    </Link>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    Request Verification Code
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AccountCreate.layout = (page: any) => page;
