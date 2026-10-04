import AdminPagination from '@/Components/AdminPagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Security({ events, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const filterEvents = (eventType = filters.event_type, searchTerm = search) => {
        router.get(route('admin.security.index'), {
            event_type: eventType === 'all' ? undefined : eventType,
            search: searchTerm.trim() || undefined,
        }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const submitSearch = (event) => {
        event.preventDefault();
        filterEvents(filters.event_type);
    };

    return (
        <AdminLayout>
            <Head title="Security events" />
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Trust &amp; safety</p>
                <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Security events</h1>
                <p className="mt-1 text-sm text-[#65676b]">Review failed sign-ins and login attempts blocked by rate limiting.</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter security events by type">
                    {[
                        { label: 'All events', value: 'all' },
                        { label: 'Failed logins', value: 'login_failed' },
                        { label: 'Rate limited', value: 'login_locked' },
                    ].map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => filterEvents(item.value)}
                            aria-pressed={filters.event_type === item.value}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold ${filters.event_type === item.value ? 'bg-[#0866ff] text-white' : 'border border-[#d8dadf] bg-white text-[#444950] hover:bg-[#f0f2f5]'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <form onSubmit={submitSearch} role="search" className="flex w-full gap-2 sm:max-w-sm">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        maxLength={255}
                        aria-label="Search by email or IP address"
                        placeholder="Email or IP address"
                        className="min-w-0 flex-1 rounded-lg border border-[#ccd0d5] bg-white px-3 py-2 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                    />
                    <button type="submit" className="rounded-lg bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5]">Search</button>
                </form>
            </div>

            <section className="mt-4 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#e4e6eb] px-5 py-4">
                    <h2 className="font-bold text-[#1c1e21]">Authentication events</h2>
                    <span className="text-sm text-[#65676b]">{events.total.toLocaleString()} total</span>
                </div>
                {events.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                            <thead className="bg-[#f7f8fa] text-xs uppercase tracking-wide text-[#65676b]">
                                <tr>
                                    <th scope="col" className="px-5 py-3 font-semibold">Event</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Account attempted</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Source IP</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Browser</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">When</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e4e6eb]">
                                {events.data.map((securityEvent) => (
                                    <tr key={securityEvent.id} className="align-top">
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${securityEvent.event_type === 'login_locked' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                                                {securityEvent.event_type === 'login_locked' ? 'Rate limited' : 'Failed login'}
                                            </span>
                                        </td>
                                        <td className="max-w-60 break-all px-5 py-4 font-medium text-[#1c1e21]">{securityEvent.email}</td>
                                        <td className="px-5 py-4 font-mono text-xs text-[#444950]">{securityEvent.ip_address ?? 'Unavailable'}</td>
                                        <td className="max-w-64 truncate px-5 py-4 text-[#65676b]" title={securityEvent.user_agent ?? ''}>{securityEvent.user_agent ?? 'Unavailable'}</td>
                                        <td className="whitespace-nowrap px-5 py-4 text-xs text-[#65676b]">{new Date(securityEvent.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="px-5 py-12 text-center text-sm text-[#65676b]">No security events match these filters.</p>
                )}
                <AdminPagination paginator={events} />
            </section>
        </AdminLayout>
    );
}
