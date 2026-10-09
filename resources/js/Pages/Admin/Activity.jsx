import AdminPagination from '@/Components/AdminPagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';

const activityLabels = {
    'content.post_deleted': 'Removed a personal feed post',
    'content.group_post_deleted': 'Removed a group post',
    'group.deleted': 'Deleted a group',
    'group.updated': 'Updated group settings',
    'report.dismissed': 'Dismissed a content report',
    'report.content_removed': 'Removed reported content',
    'user.admin_role_granted': 'Granted administrator access',
    'user.admin_role_revoked': 'Revoked administrator access',
    'user.account_suspended': 'Suspended a user account',
    'user.account_restored': 'Restored a user account',
    'site.settings_updated': 'Updated site settings',
};

export default function Activity({ activities }) {
    return (
        <AdminLayout>
            <Head title="Admin activity log" />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">System oversight</p>
                    <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Admin activity log</h1>
                    <p className="mt-1 text-sm text-[#65676b]">A traceable record of changes made through the admin control panel.</p>
                </div>
                <a href={route('admin.activity.export')} className="inline-flex items-center justify-center rounded-lg border border-[#d8dadf] bg-white px-4 py-2.5 text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]">
                    Export audit CSV
                </a>
            </div>
            <section className="mt-6 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                {activities.data.length > 0 ? (
                    <ul className="divide-y divide-[#e4e6eb]">
                        {activities.data.map((activity) => (
                            <li key={activity.id} className="flex gap-3 px-5 py-4">
                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-xs font-bold text-[#0866ff]">
                                    {(activity.actor?.name ?? 'System').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-[#1c1e21]">
                                        <span className="font-semibold">{activity.actor?.name ?? 'System'}</span>
                                        {' '}{activityLabels[activity.action] ?? activity.action}
                                        {activity.target_label && <span className="font-semibold"> · {activity.target_label}</span>}
                                    </p>
                                    <p className="mt-1 text-xs text-[#65676b]">{new Date(activity.created_at).toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-5 py-12 text-center text-sm text-[#65676b]">Admin changes will appear here.</p>
                )}
                <AdminPagination paginator={activities} />
            </section>
        </AdminLayout>
    );
}
