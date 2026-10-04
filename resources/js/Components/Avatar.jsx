import { useEffect, useState } from 'react';

export default function Avatar({ name, src, size = 'h-10 w-10', textSize = 'text-sm', className = '' }) {
    const [imageFailed, setImageFailed] = useState(false);
    const initials = (name ?? 'User')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';

    useEffect(() => {
        setImageFailed(false);
    }, [src]);

    const avatarClasses = `${size} shrink-0 rounded-full ${className}`;

    return src && !imageFailed ? (
        <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className={`${avatarClasses} object-cover`}
        />
    ) : (
        <span aria-hidden="true" className={`flex ${avatarClasses} items-center justify-center bg-gradient-to-br from-[#1877f2] to-[#6252d9] ${textSize} font-semibold text-white`}>
            {initials}
        </span>
    );
}
