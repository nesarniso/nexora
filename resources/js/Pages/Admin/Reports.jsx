import AdminPagination from '@/Components/AdminPagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';

const statusStyles = {
    open: 'bg-[#fff3df] text-[#9a5b00]',
    dismissed: 'bg-[#f0f2f5] text-[#65676b]',
    resolved: 'bg-[#e7f8ed] text-[#258447]',
};

export default function Reports({ reports, userReports, filters }) {
    const { errors } = usePage().props;
    const setStatus = (status) => {
        router.get(route('admin.reports.index'), { status: status === 'open' ? undefined : status }, { preserveScroll: true });
    };
    const review = (report, action) => {
        const description = action === 'dismiss'
            ? `Dismiss report #${report.id}?`
            : `Remove the reported ${report.target_type} and resolve report #${report.id}?`;

        if (window.confirm(description)) {
            router.patch(route('admin.reports.review', report.id), { action }, { preserveScroll: true });
        }
    };
    const reviewUser = (report, action) => {
        const label = action === 'dismiss' ? 'Dismiss' : 'Resolve';

        if (window.confirm(`${label} user report #${report.id}?`)) {
            router.patch(route('admin.user-reports.review', report.id), { action }, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Moderation reports" />
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Trust &amp; safety</p>
                <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Moderation reports</h1>
                <p className="mt-1 text-sm text-[#65676b]">Review group-content and user reports from one central queue.</p>
            </div>
            {errors.action && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.action}</p>}
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter reports">
                {[
                    { label: 'Open', value: 'open' },
                    { label: 'Dismissed', value: 'dismissed' },
                    { label: 'Resolved', value: 'resolved' },
                    { label: 'All reports', value: 'all' },
                ].map((item) => (
                    <button key={item.value} type="button" onClick={() => setStatus(item.value)} aria-pressed={filters.status === item.value} className={`rounded-lg px-3 py-2 text-sm font-semibold ${filters.status === item.value ? 'bg-[#0866ff] text-white' : 'border border-[#d8dadf] bg-white text-[#444950] hover:bg-[#f0f2f5]'}`}>{item.label}</button>
                ))}
            </div>
            <section className="mt-4 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                {reports.data.length > 0 ? (
                    <ul className="divide-y divide-[#e4e6eb]">
                        {reports.data.map((report) => {
                            const reportedContent = report.post ?? report.comment;
                            const reportedAuthor = reportedContent?.user;

                            return (
                                <li key={report.id} className="p-5">
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-bold text-[#1c1e21]">Report #{report.id} · {report.target_type}</h2>
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[report.status] ?? statusStyles.open}`}>{report.status}</span>
                                            </div>
                                            <p className="mt-1 text-sm text-[#65676b]">
                                            {report.reason} · Group <Link href={route('admin.groups.index', { search: report.group?.name })} className="font-semibold text-[#0866ff] hover:underline">{report.group?.name ?? `#${report.group_id}`}</Link>
                                            </p>
                                            <p className="mt-1 text-xs text-[#65676b]">
                                                Reported by {report.reporter?.name ?? 'Deleted account'} · {new Date(report.created_at).toLocaleString()}
                                            </p>
                                            {report.details && <p className="mt-3 rounded-lg bg-[#f7f8fa] p-3 text-sm text-[#444950]">{report.details}</p>}
                                        </div>
                                    </div>
                                    <div className="mt-4 rounded-lg border border-[#e4e6eb] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-[#65676b]">Reported {report.target_type}</p>
                                        <p className="mt-1 text-xs text-[#65676b]">{reportedAuthor?.name ?? 'Content no longer available'}</p>
                                        {reportedContent && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#1c1e21]">{reportedContent.content || 'Image post'}</p>}
                                        {report.post?.image_url && <img src={report.post.image_url} alt="Reported group post attachment" className="mt-3 max-h-64 max-w-sm rounded-lg object-cover" />}
                                        {!reportedContent && <p className="mt-2 text-sm italic text-[#65676b]">Reported content has already been deleted.</p>}
                                    </div>
                                    {report.status === 'open' && reportedContent && (
                                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                                            <button type="button" onClick={() => review(report, 'dismiss')} className="rounded-lg border border-[#ccd0d5] px-3 py-2 text-sm font-semibold text-[#444950] hover:bg-[#f0f2f5]">Dismiss report</button>
                                            <button type="button" onClick={() => review(report, 'remove_content')} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove content</button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="px-5 py-12 text-center text-sm text-[#65676b]">No reports in this queue.</p>
                )}
                <AdminPagination paginator={reports} />
            </section>
            <section className="mt-6 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                <div className="border-b border-[#e4e6eb] px-5 py-4">
                    <h2 className="font-bold text-[#1c1e21]">User reports</h2>
                    <p className="mt-1 text-sm text-[#65676b]">Reports submitted from private conversations.</p>
                </div>
                {userReports.data.length > 0 ? (
                    <ul className="divide-y divide-[#e4e6eb]">
                        {userReports.data.map((report) => (
                            <li key={report.id} className="p-5">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-[#1c1e21]">User report #{report.id}</h3>
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[report.status] ?? statusStyles.open}`}>{report.status}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-[#65676b]">
                                            {report.reason} · Reported user <Link href={route('users.show', report.reported_user_id)} className="font-semibold text-[#0866ff] hover:underline">{report.reported_user?.name ?? 'Deleted account'}</Link>
                                        </p>
                                        <p className="mt-1 text-xs text-[#65676b]">
                                            Reported by {report.reporter?.name ?? 'Deleted account'} · {new Date(report.created_at).toLocaleString()}
                                        </p>
                                        {report.details && <p className="mt-3 rounded-lg bg-[#f7f8fa] p-3 text-sm text-[#444950]">{report.details}</p>}
                                    </div>
                                </div>
                                {report.status === 'open' && (
                                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                                        <button type="button" onClick={() => reviewUser(report, 'dismiss')} className="rounded-lg border border-[#ccd0d5] px-3 py-2 text-sm font-semibold text-[#444950] hover:bg-[#f0f2f5]">Dismiss report</button>
                                        <button type="button" onClick={() => reviewUser(report, 'resolve')} className="rounded-lg bg-[#0866ff] px-3 py-2 text-sm font-semibold text-white hover:bg-[#075ce5]">Resolve report</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-5 py-12 text-center text-sm text-[#65676b]">No user reports in this queue.</p>
                )}
                <AdminPagination paginator={userReports} />
            </section>
        </AdminLayout>
    );
}
