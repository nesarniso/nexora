import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import { Head, Link, usePage } from '@inertiajs/react';

export default function AdminLayout({ children }) {
    const { auth, site } = usePage().props;
    const navigation = [
        { label: 'Overview', href: route('admin.dashboard'), active: route().current('admin.dashboard'), icon: 'home' },
        { label: 'Analytics', href: route('admin.analytics.index'), active: route().current('admin.analytics.*'), icon: 'chart' },
        { label: 'Users', href: route('admin.users.index'), active: route().current('admin.users.*'), icon: 'people' },
        { label: 'Content', href: route('admin.content.index'), active: route().current('admin.content.*'), icon: 'photo' },
        { label: 'Groups', href: route('admin.groups.index'), active: route().current('admin.groups.*'), icon: 'people' },
        { label: 'Reports', href: route('admin.reports.index'), active: route().current('admin.reports.*'), icon: 'shield' },
        { label: 'Security', href: route('admin.security.index'), active: route().current('admin.security.*'), icon: 'lock' },
        { label: 'Site settings', href: route('admin.settings.index'), active: route().current('admin.settings.*'), icon: 'settings' },
        { label: 'Activity log', href: route('admin.activity.index'), active: route().current('admin.activity.*'), icon: 'clock' },
    ];

    return (
        <div className="min-h-screen bg-[#f0f2f5] text-[#1c1e21]">
            <Head>
                <link rel="icon" href={site.site_icon_url ?? '/favicon.ico'} />
            </Head>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#172033] text-white lg:flex">
                <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[#0866ff]">
                        {site.logo_url
                            ? <img src={site.logo_url} alt={site.site_name} className="h-full w-full bg-white object-contain" />
                            : <SocialIcon name="shield" className="h-5 w-5" />}
                    </span>
                    <div>
                        <p className="font-bold">{site.site_name} Admin</p>
                        <p className="text-xs text-slate-300">Control plane</p>
                    </div>
                </div>
                <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Site management</p>
                    {navigation.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${item.active ? 'bg-[#0866ff] text-white' : 'text-slate-200 hover:bg-white/10'}`}
                        >
                            <SocialIcon name={item.icon} className="h-5 w-5" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-white/10 p-4">
                    <div className="flex items-center gap-3">
                        <Avatar name={auth.user.name} src={auth.user.profile?.avatar_url} size="h-9 w-9" textSize="text-xs" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{auth.user.name}</p>
                            <p className="truncate text-xs text-slate-300">{auth.user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="min-h-screen lg:pl-64">
                <header className="sticky top-0 z-20 border-b border-[#e4e6eb] bg-white">
                    <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                        <nav aria-label="Admin navigation" className="flex min-w-0 items-center gap-1 overflow-x-auto lg:hidden">
                            {navigation.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${item.active ? 'bg-[#e7f3ff] text-[#0866ff]' : 'text-[#65676b] hover:bg-[#f0f2f5]'}`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="hidden text-sm text-[#65676b] sm:inline">{auth.user.name}</span>
                            <Link
                                href={route('dashboard')}
                                className="rounded-lg border border-[#d8dadf] px-3 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]"
                            >
                                Back to {site.site_name}
                            </Link>
                        </div>
                    </div>
                </header>
                {site.announcement && (
                    <div role="status" className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-900 sm:px-6">
                        {site.announcement}
                    </div>
                )}
                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
            </div>
        </div>
    );
}
