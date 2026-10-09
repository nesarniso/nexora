import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function PersonCard({ person, children }) {
    return (
        <article className="overflow-hidden rounded-lg border border-[#e4e6eb] bg-white">
            <Link
                href={route('users.show', person.id)}
                aria-label={`View ${person.name}'s profile`}
                className="flex min-h-28 items-center justify-center bg-gradient-to-br from-[#dbeafe] via-[#eef2ff] to-[#f3e8ff] p-4 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0866ff]"
            >
                <Avatar name={person.name} src={person.avatar_url} size="h-16 w-16" textSize="text-lg" className="border border-black/10" />
            </Link>
            <div className="space-y-3 p-3">
                <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold text-[#1c1e21]">
                        <Link href={route('users.show', person.id)} className="rounded-sm hover:text-[#0866ff] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0866ff]">
                            {person.name}
                        </Link>
                    </h2>
                    {person.username && <p className="truncate text-[13px] text-[#65676b]">@{person.username}</p>}
                </div>
                <div className="grid gap-2">{children}</div>
            </div>
        </article>
    );
}

function ActionLink({ href, children, secondary = false }) {
    return (
        <Link
            href={href}
            method="post"
            as="button"
            preserveScroll
            className={`flex min-h-9 w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                secondary
                    ? 'bg-[#e4e6eb] text-[#1c1e21] hover:bg-[#d8dadf]'
                    : 'bg-[#0866ff] text-white hover:bg-[#075ce5]'
            }`}
        >
            {children}
        </Link>
    );
}

function EmptyState({ title, description }) {
    return (
        <div className="col-span-full rounded-xl bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                <SocialIcon name="friends" className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-[18px] font-semibold text-[#1c1e21]">{title}</h2>
            <p className="mt-1 text-[15px] text-[#65676b]">{description}</p>
        </div>
    );
}

export default function Index({
    suggestions = { data: [], links: [], total: 0 },
    incomingRequests = { data: [], links: [], total: 0 },
    friends = { data: [], links: [], total: 0 },
    following = { data: [], links: [], total: 0 },
}) {
    const [activeTab, setActiveTab] = useState('suggestions');
    const [search, setSearch] = useState('');
    const tabs = [
        { id: 'suggestions', label: 'Suggestions', count: suggestions.total ?? 0 },
        { id: 'requests', label: 'Friend requests', count: incomingRequests.total ?? 0 },
        { id: 'friends', label: 'All friends', count: friends.total ?? 0 },
        { id: 'following', label: 'Following', count: following.total ?? 0 },
    ];

    const currentPeople = useMemo(() => {
        const people = {
            suggestions: suggestions.data ?? [],
            requests: incomingRequests.data ?? [],
            friends: friends.data ?? [],
            following: following.data ?? [],
        }[activeTab] ?? [];
        const query = search.trim().toLowerCase();

        return query
            ? people.filter((person) => `${person.name} ${person.username ?? ''}`.toLowerCase().includes(query))
            : people;
    }, [activeTab, friends, following, incomingRequests, search, suggestions.data]);
    const activePage = { suggestions, requests: incomingRequests, friends, following }[activeTab];

    const emptyCopy = {
        suggestions: ['No suggestions right now', 'Check back later to discover more people on Nexora.'],
        requests: ['No friend requests', 'When someone sends you a friend request, it will appear here.'],
        friends: ['No friends yet', 'Send a friend request to start building your circle.'],
        following: ['Not following anyone', 'Follow people to keep up with their public posts.'],
    }[activeTab];

    return (
        <AuthenticatedLayout>
            <Head title="Friends" />

            <div className="mx-auto min-h-[calc(100vh-56px)] max-w-[1200px] px-3 py-5 sm:px-5">
                <header className="mb-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[#65676b]">Your connections</p>
                            <h1 className="text-[26px] font-bold text-[#1c1e21]">Friends</h1>
                        </div>
                        <label className="flex h-10 w-full items-center gap-2 rounded-full bg-[#f0f2f5] px-3 text-[#65676b] sm:max-w-xs">
                            <SocialIcon name="search" className="h-5 w-5" />
                            <input
                                type="search"
                                aria-label="Search friends"
                                placeholder="Search this page"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[#1c1e21] placeholder:text-[#65676b] focus:ring-0"
                            />
                        </label>
                    </div>

                    <nav aria-label="Friends sections" className="mt-4 flex gap-1 overflow-x-auto border-t border-[#e4e6eb] pt-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                                className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-[#e7f3ff] text-[#0866ff]'
                                        : 'text-[#65676b] hover:bg-[#f0f2f5]'
                                }`}
                            >
                                {tab.label}<span className="ml-1 opacity-75">{tab.count}</span>
                            </button>
                        ))}
                    </nav>
                </header>

                {currentPeople.length === 0 ? (
                    <EmptyState
                        title={search ? 'No people found' : emptyCopy[0]}
                        description={search ? 'Try a different name or username.' : emptyCopy[1]}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {currentPeople.map((person) => (
                            <PersonCard key={person.id} person={person}>
                                {activeTab === 'requests' && (
                                    <>
                                        <ActionLink href={route('friend-request.accept', person.id)}>Confirm</ActionLink>
                                        <ActionLink href={route('friend-request.reject', person.id)} secondary>Delete request</ActionLink>
                                    </>
                                )}
                                {activeTab === 'suggestions' && (
                                    <>
                                        <ActionLink href={route('friend-request.store', person.id)}>Add friend</ActionLink>
                                        <ActionLink href={route('follow.toggle', person.id)} secondary>
                                            {person.is_following ? 'Unfollow' : 'Follow'}
                                        </ActionLink>
                                    </>
                                )}
                                {activeTab === 'friends' && (
                                    <span className="flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#e4e6eb] px-3 py-2 text-sm font-semibold text-[#1c1e21]">
                                        <SocialIcon name="friends" className="h-4 w-4" /> Friends
                                    </span>
                                )}
                                {activeTab === 'following' && (
                                    <ActionLink href={route('follow.toggle', person.id)} secondary>Unfollow</ActionLink>
                                )}
                            </PersonCard>
                        ))}
                    </div>
                )}

                {(activePage?.links?.length ?? 0) > 3 && (
                    <nav aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label ?? 'Friends'} pages`} className="mt-5 flex flex-wrap justify-center gap-1">
                        {activePage.links.map((link, index) => {
                            const label = link.label.replace('&laquo;', '‹').replace('&raquo;', '›');

                            return link.url ? (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url}
                                    preserveScroll
                                    className={`rounded-md px-3 py-2 text-sm font-semibold ${
                                        link.active ? 'bg-[#0866ff] text-white' : 'bg-white text-[#1c1e21] hover:bg-[#e4e6eb]'
                                    }`}
                                >
                                    {label}
                                </Link>
                            ) : (
                                <span key={`${link.label}-${index}`} className="rounded-md px-3 py-2 text-sm text-[#9a9ca0]">{label}</span>
                            );
                        })}
                    </nav>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
