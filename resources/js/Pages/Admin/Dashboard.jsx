import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

const metrics = [
    { key: 'users', label: 'Registered users', detail: 'Accounts on Nexora', icon: 'people', color: 'bg-[#e7f3ff] text-[#0866ff]', href: 'admin.users.index' },
    { key: 'suspendedUsers', label: 'Suspended accounts', detail: 'Currently unable to sign in', icon: 'lock', color: 'bg-[#fff3df] text-[#b66b00]', href: 'admin.users.index' },
    { key: 'posts', label: 'Platform posts', detail: 'Personal feed posts', icon: 'photo', color: 'bg-[#e7f8ed] text-[#2e9b53]', href: 'admin.content.index' },
    { key: 'groupPosts', label: 'Group posts', detail: 'Posts across all communities', icon: 'people', color: 'bg-[#f2eaff] text-[#7547c8]', href: 'admin.content.index' },
    { key: 'openReports', label: 'Open group reports', detail: 'Awaiting admin review', icon: 'shield', color: 'bg-[#fff3df] text-[#b66b00]', href: 'admin.reports.index' },
    { key: 'groups', label: 'Groups', detail: 'Communities created', icon: 'people', color: 'bg-[#e7f8ed] text-[#2e9b53]', href: 'admin.groups.index' },
];

export default function Dashboard({ stats, recentUsers, recentActivity }) {
    return (
        <AdminLayout>
            <Head title="Admin overview" />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Admin control plane</p>
                    <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Platform overview</h1>
                    <p className="mt-1 text-sm text-[#65676b]">Monitor and manage the active parts of the Nexora platform.</p>
                </div>
                <Link href={route('admin.users.index')} className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5]">
                    <SocialIcon name="people" className="h-4 w-4" />
                    Manage users
                </Link>
            </div>

            <section aria-label="Platform metrics" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => (
                    <Link key={metric.key} href={route(metric.href)} className="rounded-xl border border-[#e4e6eb] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-[#65676b]">{metric.label}</p>
                                <p className="mt-2 text-3xl font-bold tracking-tight text-[#1c1e21]">{stats[metric.key].toLocaleString()}</p>
                                <p className="mt-1 text-xs text-[#65676b]">{metric.detail}</p>
                            </div>
                            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.color}`}>
                                <SocialIcon name={metric.icon} className="h-5 w-5" />
                            </span>
                        </div>
                    </Link>
                ))}
            </section>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
                <section className="overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-[#e4e6eb] px-5 py-4">
                        <div>
                            <h2 className="font-bold text-[#1c1e21]">Recently joined</h2>
                            <p className="mt-0.5 text-sm text-[#65676b]">Latest accounts created on the platform</p>
                        </div>
                        <Link href={route('admin.users.index')} className="text-sm font-semibold text-[#0866ff] hover:underline">View all</Link>
                    </div>
                    {recentUsers.length > 0 ? (
                        <ul className="divide-y divide-[#e4e6eb]">
                            {recentUsers.map((user) => (
                                <li key={user.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar name={user.name} src={user.profile?.avatar_url} size="h-10 w-10" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[#1c1e21]">{user.name}</p>
                                            <p className="truncate text-sm text-[#65676b]">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_suspended ? 'bg-red-100 text-red-700' : user.is_admin ? 'bg-[#e7f3ff] text-[#0866ff]' : 'bg-[#f0f2f5] text-[#65676b]'}`}>
                                        {user.is_suspended ? 'Suspended' : user.is_admin ? 'Admin' : 'Member'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-5 py-10 text-center text-sm text-[#65676b]">No users have registered yet.</p>
                    )}
                </section>

                <section className="rounded-xl border border-[#e4e6eb] bg-white p-5 shadow-sm">
                    <h2 className="font-bold text-[#1c1e21]">Administration</h2>
                    <p className="mt-1 text-sm text-[#65676b]">Control accounts, content, communities, and moderation.</p>
                    <div className="mt-4 grid gap-3">
                        <Link href={route('admin.users.index')} className="flex items-center gap-3 rounded-lg border border-[#e4e6eb] p-3 transition-colors hover:bg-[#f7f8fa]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7f3ff] text-[#0866ff]"><SocialIcon name="people" className="h-5 w-5" /></span>
                            <span><span className="block text-sm font-semibold text-[#1c1e21]">User administration</span><span className="block text-xs text-[#65676b]">Search, suspend, restore, or change account roles</span></span>
                        </Link>
                        <Link href={route('admin.content.index')} className="flex items-center gap-3 rounded-lg border border-[#e4e6eb] p-3 transition-colors hover:bg-[#f7f8fa]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7f8ed] text-[#2e9b53]"><SocialIcon name="photo" className="h-5 w-5" /></span>
                            <span><span className="block text-sm font-semibold text-[#1c1e21]">Content moderation</span><span className="block text-xs text-[#65676b]">Review or remove any site post</span></span>
                        </Link>
                        <Link href={route('admin.groups.index')} className="flex items-center gap-3 rounded-lg border border-[#e4e6eb] p-3 transition-colors hover:bg-[#f7f8fa]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2eaff] text-[#7547c8]"><SocialIcon name="people" className="h-5 w-5" /></span>
                            <span><span className="block text-sm font-semibold text-[#1c1e21]">Group management</span><span className="block text-xs text-[#65676b]">Inspect, find, and manage communities</span></span>
                        </Link>
                        <Link href={route('admin.reports.index')} className="flex items-center gap-3 rounded-lg border border-[#e4e6eb] p-3 transition-colors hover:bg-[#f7f8fa]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2eaff] text-[#7547c8]"><SocialIcon name="shield" className="h-5 w-5" /></span>
                            <span><span className="block text-sm font-semibold text-[#1c1e21]">Trust &amp; safety</span><span className="block text-xs text-[#65676b]">Review reports across every group</span></span>
                        </Link>
                        <Link href={route('admin.activity.index')} className="flex items-center gap-3 rounded-lg border border-[#e4e6eb] p-3 transition-colors hover:bg-[#f7f8fa]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff3df] text-[#b66b00]"><SocialIcon name="clock" className="h-5 w-5" /></span>
                            <span><span className="block text-sm font-semibold text-[#1c1e21]">Admin activity</span><span className="block text-xs text-[#65676b]">Track actions taken by administrators</span></span>
                        </Link>
                    </div>
                </section>
            </div>
            <section className="mt-6 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-[#e4e6eb] px-5 py-4">
                    <div>
                        <h2 className="font-bold text-[#1c1e21]">Recent admin activity</h2>
                        <p className="mt-0.5 text-sm text-[#65676b]">Latest control panel actions</p>
                    </div>
                    <Link href={route('admin.activity.index')} className="text-sm font-semibold text-[#0866ff] hover:underline">View log</Link>
                </div>
                {recentActivity.length > 0 ? (
                    <ul className="divide-y divide-[#e4e6eb]">
                        {recentActivity.map((activity) => (
                            <li key={activity.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#1c1e21]">{activity.actor?.name ?? 'System'} · {activity.target_label ?? activity.action}</p>
                                    <p className="text-xs text-[#65676b]">{activity.action.replaceAll('.', ' ')}</p>
                                </div>
                                <span className="shrink-0 text-xs text-[#65676b]">{new Date(activity.created_at).toLocaleDateString()}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-5 py-7 text-center text-sm text-[#65676b]">No admin actions have been recorded yet.</p>
                )}
            </section>
        </AdminLayout>
    );
}
