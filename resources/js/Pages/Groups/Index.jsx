import SocialIcon from '@/Components/SocialIcon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function GroupCard({ group }) {
    const membership = group.memberships?.[0];

    return (
        <Link
            href={route('groups.show', group.id)}
            className="group min-w-0 overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.14)]"
        >
            <span
                className="flex h-32 items-center justify-center bg-cover bg-center text-[#0866ff]"
                style={{ backgroundImage: group.cover_url ? `url(${group.cover_url})` : 'linear-gradient(135deg, #dfe9ff 0%, #bfd1ff 45%, #e7f3ff 100%)' }}
            >
                {!group.cover_url && <SocialIcon name="people" className="h-10 w-10 rounded-full bg-white/75 p-2" />}
            </span>
            <span className="block min-w-0 p-4">
                <span className="block truncate text-base font-bold text-[#1c1e21]">{group.name}</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-[#65676b]">
                    <SocialIcon name={group.privacy === 'public' ? 'globe' : 'lock'} className="h-4 w-4" />
                    {group.privacy === 'public' ? 'Public group' : 'Private group'}
                    <span aria-hidden="true">·</span>
                    {group.members_count} {group.members_count === 1 ? 'member' : 'members'}
                </span>
                <span className="mt-2 block min-h-10 text-sm text-[#65676b]">
                    {membership?.status === 'invited'
                        ? 'You have been invited'
                        : membership?.status === 'pending'
                            ? 'Membership request pending'
                            : `Created by ${group.owner.name}`}
                </span>
                <span className="mt-3 block rounded-md bg-[#e7f3ff] px-3 py-2 text-center text-sm font-semibold text-[#0866ff] group-hover:bg-[#dceeff]">View group</span>
            </span>
        </Link>
    );
}

export default function Index({ groups, filters, managedGroups }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const form = useForm({
        name: '',
        description: '',
        privacy: 'public',
    });

    const submitSearch = (event) => {
        event.preventDefault();
        router.get(route('groups.index'), {
            search: search.trim() || undefined,
            tab: filters.tab === 'your-groups' ? filters.tab : undefined,
        }, { preserveScroll: true, preserveState: true });
    };

    const selectTab = (tab) => {
        router.get(route('groups.index'), {
            search: search.trim() || undefined,
            tab: tab === 'discover' ? undefined : tab,
        }, { preserveScroll: true, preserveState: true });
    };

    const createGroup = (event) => {
        event.preventDefault();
        form.post(route('groups.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Groups" />
            <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-[1600px] grid-cols-1 gap-5 px-3 pt-5 sm:px-5 lg:grid-cols-[minmax(180px,1fr)_minmax(0,680px)_minmax(180px,1fr)] lg:gap-6">
                <aside className="h-fit space-y-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-80px)] lg:overflow-y-auto lg:pb-4">
                    <section className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                            <SocialIcon name="people" className="h-6 w-6" />
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold text-[#1c1e21]">Groups</h1>
                            <p className="text-sm text-[#65676b]">Find your community</p>
                        </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                        {[
                            { label: 'Discover', value: 'discover' },
                            { label: 'Your groups', value: 'your-groups' },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => selectTab(tab.value)}
                                aria-pressed={filters.tab === tab.value}
                                className={`rounded-md px-3 py-2 text-sm font-semibold ${filters.tab === tab.value ? 'bg-[#e7f3ff] text-[#0866ff]' : 'bg-[#f0f2f5] text-[#1c1e21] hover:bg-[#e4e6eb]'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    </section>

                    <form onSubmit={createGroup} className="space-y-3 rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                        <h2 className="text-lg font-bold text-[#1c1e21]">Create a group</h2>
                        <label className="block text-sm font-semibold text-[#1c1e21]" htmlFor="group-name">Group name</label>
                        <input
                            id="group-name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            maxLength={100}
                            required
                            className="w-full rounded-md border border-[#ccd0d5] px-3 py-2 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                            placeholder="e.g. Local hiking friends"
                        />
                        {form.errors.name && <p className="text-sm text-red-600">{form.errors.name}</p>}
                        <label className="block text-sm font-semibold text-[#1c1e21]" htmlFor="group-description">Description</label>
                        <textarea
                            id="group-description"
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                            maxLength={2000}
                            rows={3}
                            className="w-full resize-y rounded-md border border-[#ccd0d5] px-3 py-2 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                            placeholder="What is this group about?"
                        />
                        {form.errors.description && <p className="text-sm text-red-600">{form.errors.description}</p>}
                        <label className="block text-sm font-semibold text-[#1c1e21]" htmlFor="group-privacy">Privacy</label>
                        <select
                            id="group-privacy"
                            value={form.data.privacy}
                            onChange={(event) => form.setData('privacy', event.target.value)}
                            className="w-full rounded-md border border-[#ccd0d5] bg-white px-3 py-2 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        >
                            <option value="public">Public — anyone can see posts</option>
                            <option value="private">Private — members only</option>
                        </select>
                        {form.errors.privacy && <p className="text-sm text-red-600">{form.errors.privacy}</p>}
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full rounded-md bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:opacity-60"
                        >
                            {form.processing ? 'Creating…' : 'Create group'}
                        </button>
                    </form>
                </aside>

                <section className="mx-auto min-w-0 w-full max-w-[680px] space-y-4">
                    <form onSubmit={submitSearch} className="flex gap-2 rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                        <input
                            type="search"
                            aria-label="Search groups"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search groups"
                            className="min-w-0 flex-1 rounded-full border-0 bg-[#f0f2f5] px-4 py-2 text-sm focus:ring-2 focus:ring-[#0866ff]"
                        />
                        <button type="submit" className="rounded-full bg-[#e4e6eb] px-4 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#d8dadf]">Search</button>
                    </form>
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-bold text-[#1c1e21]">{filters.tab === 'your-groups' ? 'Your groups' : 'Discover groups'}</h2>
                        <span className="text-sm text-[#65676b]">{groups.total} groups</span>
                    </div>
                    {groups.data.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {groups.data.map((group) => <GroupCard key={group.id} group={group} />)}
                        </div>
                    ) : (
                        <div className="rounded-xl bg-white px-5 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f2f5] text-[#65676b]"><SocialIcon name="people" /></span>
                            <h3 className="mt-3 font-semibold text-[#1c1e21]">No groups found</h3>
                            <p className="mt-1 text-sm text-[#65676b]">Try a different search or create a group for your community.</p>
                        </div>
                    )}
                    {groups.links?.length > 3 && (
                        <nav aria-label="Group pages" className="flex flex-wrap justify-center gap-2">
                            {groups.links.map((link) => link.url && (
                                <Link
                                    key={link.label}
                                    href={link.url}
                                    preserveScroll
                                    className={`rounded-md px-3 py-2 text-sm font-semibold ${link.active ? 'bg-[#0866ff] text-white' : 'bg-white text-[#1c1e21] hover:bg-[#e4e6eb]'}`}
                                >
                                    {link.label.replace('&laquo;', '‹').replace('&raquo;', '›')}
                                </Link>
                            ))}
                        </nav>
                    )}
                </section>

                <aside className="h-fit space-y-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-80px)] lg:overflow-y-auto lg:pb-4">
                    <section className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-[#1c1e21]">Your groups</h2>
                                <p className="mt-1 text-sm text-[#65676b]">Groups you manage</p>
                            </div>
                            <SocialIcon name="settings" className="h-5 w-5 text-[#65676b]" />
                        </div>
                        {managedGroups.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {managedGroups.map((group) => (
                                    <Link
                                        key={group.id}
                                        href={route('groups.show', group.id)}
                                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-[#f0f2f5]"
                                    >
                                        <span
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cover bg-center bg-[#e7f3ff] text-[#0866ff]"
                                            style={group.cover_url ? { backgroundImage: `url(${group.cover_url})` } : undefined}
                                        >
                                            {!group.cover_url && <SocialIcon name="people" className="h-5 w-5" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-[#1c1e21]">{group.name}</span>
                                            <span className="mt-0.5 block text-xs text-[#65676b]">
                                                {group.member_count} members
                                                {group.pending_members_count > 0 && ` · ${group.pending_members_count} request${group.pending_members_count === 1 ? '' : 's'}`}
                                            </span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm leading-5 text-[#65676b]">Groups you create will appear here with quick access to their admin tools.</p>
                        )}
                    </section>

                    <section className="rounded-xl bg-white p-4 text-sm leading-5 text-[#65676b] shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                        <h2 className="font-semibold text-[#1c1e21]">Build your community</h2>
                        <p className="mt-2">Create a group for people who share your interests, invite friends, and keep conversations organized in one place.</p>
                    </section>
                </aside>
            </div>
        </AuthenticatedLayout>
    );
}
