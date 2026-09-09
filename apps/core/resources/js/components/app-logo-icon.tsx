import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/logo-r.png"
            alt="RAVISN"
            {...props}
            className={`h-8 w-auto object-contain ${props.className || ''}`}
        />
    );
}
