import type { ImgHTMLAttributes } from 'react';

export default function AppLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    const { className, ...rest } = props;

    return (
        <img
            src="/ravisn-logo.png"
            alt="RAVISN"
            {...rest}
            className={`h-10 w-auto object-contain dark:brightness-200 ${className || ''}`}
        />
    );
}
