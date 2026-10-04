import Avatar from '@/Components/Avatar';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Users({ users, filters, errors }) {
    const { auth } = usePage().props;
    const [search, setSearch] = useState(filters.search ?? '');

    const submitSearch = (event) => {
        event.preventDefault();
        router.get(route('admin.users.index'), {
            search: search.trim() || undefined,
        }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const revokeAdmin = (user) => {
        if (!window.confirm(`Are you sure you want to revoke admin access from ${user.name}?`)) {
            return;
        }

        router.patch(route('admin.users.role.update', user.id), { action: 'revoke' }, {
            preserveScroll: true,
        });
    };

    const updateStatus = (user, action) => {
        const message = action === 'suspend'
            ? `Suspend ${user.name}? This will end their active sessions and block new logins.`
            : `Restore ${user.name}'s account access?`;

        if (window.confirm(message)) {
            router.patch(route('admin.users.status.update', user.id), { action }, {
                preserveScroll: true,
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="User administration" />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Administration</p>
                    <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">User administration</h1>
                    <p className="mt-1 text-sm text-[#65676b]">Suspend accounts and restore access when appropriate.</p>
                </div>
                <form onSubmit={submitSearch} role="search" className="flex w-full gap-2 sm:max-w-md">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        maxLength={100}
                        aria-label="Search users by name or email"
                        placeholder="Search name or email"
                        className="min-w-0 flex-1 rounded-lg border border-[#ccd0d5] bg-white px-3 py-2.5 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                    />
                    <button type="submit" className="rounded-lg bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5]">Search</button>
                </form>
            </div>

            {errors.action && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.action}</p>}

            <section className="mt-6 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#e4e6eb] px-5 py-4">
                    <div>
                        <h2 className="font-bold text-[#1c1e21]">Accounts</h2>
                        <p className="mt-0.5 text-sm text-[#65676b]">{users.total.toLocaleString()} total accounts</p>
                    </div>
                </div>
                {users.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-[#f7f8fa] text-xs uppercase tracking-wide text-[#65676b]">
                                <tr>
                                    <th scope="col" className="px-5 py-3 font-semibold">Account</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Joined</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Posts</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Account status</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Role</th>
                                    <th scope="col" className="px-5 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e4e6eb]">
                                {users.data.map((user) => {
                                    const isCurrentUser = user.id === auth.user.id;

                                    return (
                                        <tr key={user.id} className="hover:bg-[#fafbfc]">
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <Avatar name={user.name} src={user.profile?.avatar_url} size="h-10 w-10" />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-[#1c1e21]">{user.name}</p>
                                                        <p className="mt-0.5 truncate text-[#65676b]">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-[#65676b]">{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td className="px-5 py-4 text-[#1c1e21]">{user.posts_count.toLocaleString()}</td>
                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_suspended ? 'bg-red-100 text-red-700' : 'bg-[#e7f8ed] text-[#258447]'}`}>
                                                    {user.is_suspended ? 'Suspended' : 'Active'}
                                                </span>
                                                {isCurrentUser && <span className="ml-2 text-xs text-[#65676b]">You</span>}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_admin ? 'bg-[#e7f3ff] text-[#0866ff]' : 'bg-[#f0f2f5] text-[#65676b]'}`}>
                                                    {user.is_admin ? 'Administrator' : 'Member'}
                                                </span>
                                                {isCurrentUser && <span className="ml-2 text-xs text-[#65676b]">You</span>}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {isCurrentUser ? (
                                                    <span className="text-xs text-[#65676b]">Current account</span>
                                                ) : (
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateStatus(user, user.is_suspended ? 'restore' : 'suspend')}
                                                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${user.is_suspended ? 'bg-[#e7f8ed] text-[#258447] hover:bg-[#d8f1e0]' : 'border border-red-200 text-red-700 hover:bg-red-50'}`}
                                                        >
                                                            {user.is_suspended ? 'Restore account' : 'Suspend account'}
                                                        </button>
                                                        {user.is_admin && (
                                                            <button
                                                                type="button"
                                                                onClick={() => revokeAdmin(user)}
                                                                className="rounded-lg border border-[#ccd0d5] px-3 py-2 text-xs font-semibold text-[#444950] hover:bg-[#f0f2f5]"
                                                            >
                                                                Revoke admin
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="px-5 py-12 text-center text-sm text-[#65676b]">No accounts match this search.</p>
                )}
                {users.last_page > 1 && (
                    <nav aria-label="User pages" className="flex items-center justify-between border-t border-[#e4e6eb] px-5 py-3">
                        <span className="text-sm text-[#65676b]">Page {users.current_page} of {users.last_page}</span>
                        <div className="flex gap-2">
                            <Link
                                href={users.prev_page_url ?? '#'}
                                preserveScroll
                                aria-disabled={!users.prev_page_url}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${users.prev_page_url ? 'border-[#ccd0d5] text-[#1c1e21] hover:bg-[#f0f2f5]' : 'pointer-events-none border-[#e4e6eb] text-[#bcc0c4]'}`}
                            >
                                Previous
                            </Link>
                            <Link
                                href={users.next_page_url ?? '#'}
                                preserveScroll
                                aria-disabled={!users.next_page_url}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${users.next_page_url ? 'border-[#ccd0d5] text-[#1c1e21] hover:bg-[#f0f2f5]' : 'pointer-events-none border-[#e4e6eb] text-[#bcc0c4]'}`}
                            >
                                Next
                            </Link>
                        </div>
                    </nav>
                )}
            </section>
        </AdminLayout>
    );
}
