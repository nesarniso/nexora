import AdminLayout from '@/Layouts/AdminLayout';
import SocialIcon from '@/Components/SocialIcon';
import { Head } from '@inertiajs/react';

const statCards = [
    { key: 'users', label: 'Total members', icon: 'people', color: 'text-blue-700', background: 'bg-blue-50' },
    { key: 'posts', label: 'Total posts', icon: 'photo', color: 'text-violet-700', background: 'bg-violet-50' },
    { key: 'groups', label: 'Communities', icon: 'globe', color: 'text-emerald-700', background: 'bg-emerald-50' },
    { key: 'openReports', label: 'Open reports', icon: 'shield', color: 'text-amber-700', background: 'bg-amber-50' },
];

export default function Analytics({ stats, dailyActivity }) {
    const maxValue = Math.max(1, ...dailyActivity.flatMap((day) => [day.users, day.posts]));

    return (
        <AdminLayout>
            <Head title="Platform analytics" />
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Platform insights</p>
                <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Analytics</h1>
                <p className="mt-1 text-sm text-[#65676b]">A quick view of platform size and the last 14 days of activity.</p>
            </div>

            <section aria-label="Platform totals" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                    <article key={card.key} className="rounded-xl border border-[#e4e6eb] bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[#65676b]">{card.label}</p>
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.background} ${card.color}`}>
                                <SocialIcon name={card.icon} className="h-5 w-5" />
                            </span>
                        </div>
                        <p className="mt-4 text-3xl font-bold tracking-tight text-[#1c1e21]">{stats[card.key].toLocaleString()}</p>
                    </article>
                ))}
            </section>

            <section className="mt-6 rounded-xl border border-[#e4e6eb] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                        <h2 className="text-lg font-bold text-[#1c1e21]">Daily activity</h2>
                        <p className="mt-1 text-sm text-[#65676b]">New members and posts, including group posts.</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#65676b]">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#0866ff]" />Members</span>
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" />Posts</span>
                    </div>
                </div>
                <div className="mt-8 grid grid-cols-7 gap-2 sm:grid-cols-14" role="img" aria-label="Daily member and post activity for the last 14 days">
                    {dailyActivity.map((day) => (
                        <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
                            <div className="flex h-40 w-full items-end justify-center gap-1 border-b border-[#e4e6eb] px-1">
                                <div
                                    title={`${day.users} new members`}
                                    className="w-2/5 rounded-t bg-[#0866ff]"
                                    style={{ height: `${Math.max(day.users === 0 ? 0 : 4, (day.users / maxValue) * 100)}%` }}
                                />
                                <div
                                    title={`${day.posts} posts`}
                                    className="w-2/5 rounded-t bg-[#8b5cf6]"
                                    style={{ height: `${Math.max(day.posts === 0 ? 0 : 4, (day.posts / maxValue) * 100)}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-[#65676b] sm:text-xs">
                                {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${day.date}T12:00:00`))}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </AdminLayout>
    );
}
