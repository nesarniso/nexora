import Dropdown from '@/Components/Dropdown';
import Avatar from '@/Components/Avatar';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import SocialIcon from '@/Components/SocialIcon';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { props } = usePage();
    const user = props.auth.user;
    const site = props.site;
    const unreadMessagesCount = props.unreadMessagesCount ?? 0;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState(props.filters?.search ?? '');

    useEffect(() => {
        setSearchTerm(props.filters?.search ?? '');
    }, [props.filters?.search]);

    const searchPosts = (event) => {
        event.preventDefault();

        router.get(route('dashboard'), {
            search: searchTerm.trim() || undefined,
            visibility: props.filters?.visibility === 'all' ? undefined : props.filters?.visibility,
        }, {
            preserveScroll: true,
        });
    };

    const navigation = [
        { label: 'Home', href: route('dashboard'), active: route().current('dashboard'), icon: 'home' },
        { label: 'Groups', href: route('groups.index'), active: route().current('groups.*'), icon: 'people' },
        { label: 'Messages', href: route('messages.index'), active: route().current('messages.index'), icon: 'messages' },
        { label: 'Notifications', href: route('notifications.index'), active: route().current('notifications.index'), icon: 'bell' },
    ];

    return (
        <div className="min-h-screen bg-[#f0f2f5] text-[#1c1e21]">
            <Head>
                <link rel="icon" href={site.site_icon_url ?? '/favicon.ico'} />
            </Head>
            <nav className="sticky top-0 z-40 h-14 border-b border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <Link href={route('dashboard')} aria-label={`${site.site_name} home`} className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${site.logo_url ? 'bg-white' : 'bg-[#0866ff] text-3xl font-bold leading-none text-white'}`}>
                            {site.logo_url ? <img src={site.logo_url} alt={site.site_name} className="h-full w-full object-contain" /> : site.site_name.charAt(0).toLowerCase()}
                        </Link>
                        <form onSubmit={searchPosts} role="search" className="hidden h-10 w-[240px] items-center gap-2 rounded-full bg-[#f0f2f5] px-3 text-[#65676b] sm:flex">
                            <button type="submit" aria-label="Search posts" className="shrink-0 rounded-full hover:text-[#0866ff]">
                                <SocialIcon name="search" className="h-5 w-5" />
                            </button>
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder={`Search ${site.site_name} posts`}
                                aria-label={`Search ${site.site_name} posts`}
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[#1c1e21] placeholder:text-[#65676b] focus:ring-0"
                            />
                        </form>
                    </div>

                    <div className="flex h-full items-center justify-center gap-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                aria-label={item.label === 'Messages' && unreadMessagesCount > 0 ? `${item.label}, ${unreadMessagesCount} unread` : item.label}
                                title={item.label === 'Messages' && unreadMessagesCount > 0 ? `${item.label} (${unreadMessagesCount} unread)` : item.label}
                                className={`relative flex h-[52px] w-12 items-center justify-center rounded-lg transition-colors sm:w-[104px] ${item.active ? 'text-[#0866ff]' : 'text-[#65676b] hover:bg-[#f2f2f2]'}`}
                            >
                                <SocialIcon name={item.icon} className="h-[26px] w-[26px]" />
                                {item.label === 'Messages' && unreadMessagesCount > 0 && (
                                    <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e41e3f] px-1 text-[10px] font-bold leading-none text-white">
                                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                    </span>
                                )}
                                {item.active && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-full bg-[#0866ff]" />}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <div className="hidden sm:flex sm:items-center">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button type="button" aria-label="Account menu" className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-[#f0f2f5]">
                                        <Avatar name={user.name} src={user.profile?.avatar_url} size="h-9 w-9" textSize="text-xs" />
                                        <span className="hidden max-w-28 truncate text-[15px] font-semibold text-[#1c1e21] lg:block">{user.name}</span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.show')}>Profile</Dropdown.Link>
                                    <Dropdown.Link href={route('profile.edit')}>Settings</Dropdown.Link>
                                    {user.is_admin && <Dropdown.Link href={route('admin.dashboard')}>Admin panel</Dropdown.Link>}
                                    <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowingNavigationDropdown((value) => !value)}
                            aria-label="Toggle navigation"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e6eb] text-[#050505] hover:bg-[#d8dadf] sm:hidden"
                        >
                            <SocialIcon name="menu" className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className={showingNavigationDropdown ? 'absolute left-0 right-0 block border-t border-[#e4e6eb] bg-white px-3 py-2 shadow-lg sm:hidden' : 'hidden'}>
                    {navigation.map((item) => (
                        <ResponsiveNavLink key={item.label} href={item.href} active={item.active}>{item.label}</ResponsiveNavLink>
                    ))}
                    <ResponsiveNavLink href={route('friends.index')} active={route().current('friends.index')}>Friends</ResponsiveNavLink>
                    <ResponsiveNavLink href={route('groups.index')} active={route().current('groups.*')}>Groups</ResponsiveNavLink>
                    <ResponsiveNavLink href={route('profile.show')}>Profile</ResponsiveNavLink>
                    <ResponsiveNavLink href={route('profile.edit')}>Settings</ResponsiveNavLink>
                    {user.is_admin && <ResponsiveNavLink href={route('admin.dashboard')}>Admin panel</ResponsiveNavLink>}
                    <ResponsiveNavLink method="post" href={route('logout')} as="button">Log Out</ResponsiveNavLink>
                </div>
            </nav>

            {site.announcement && (
                <div role="status" className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-900">
                    {site.announcement}
                </div>
            )}
            {header && <header className="border-b border-[#e4e6eb] bg-white">{header}</header>}
            <main>{children}</main>
        </div>
    );
}
