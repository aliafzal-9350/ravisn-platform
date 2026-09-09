import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
    href: any;
};

export default function TextLink({
    className = '',
    children,
    href,
    ...props
}: Props) {
    const resolvedHref =
        typeof href === 'object' && href !== null && 'url' in href
            ? href.url
            : typeof href === 'string'
              ? href
              : String(href ?? '');

    const resolvedMethod =
        props.method ??
        (typeof href === 'object' && href !== null && 'method' in href
            ? href.method
            : undefined);

    return (
        <Link
            className={cn(
                'text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500',
                className,
            )}
            href={resolvedHref}
            method={resolvedMethod}
            {...props}
        >
            {children}
        </Link>
    );
}
