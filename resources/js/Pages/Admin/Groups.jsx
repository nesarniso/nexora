import AdminPagination from '@/Components/AdminPagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

function GroupRow({ group }) {
    const form = useForm({
        name: group.name,
        description: group.description ?? '',
        privacy: group.privacy,
    });

    const saveGroup = (event) => {
        event.preventDefault();
        form.patch(route('admin.groups.update', group.id), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    };

    const deleteGroup = () => {
        if (window.confirm(`Permanently delete "${group.name}" and its posts, members, and reports?`)) {
            router.delete(route('admin.groups.destroy', group.id), { preserveScroll: true });
        }
    };

    return (
        <tr className="align-top hover:bg-[#fafbfc]">
            <td className="px-5 py-4">
                <Link href={route('admin.groups.index', { search: group.name })} className="text-xs font-semibold text-[#0866ff] hover:underline">Manage #{group.id}</Link>
                <p className="mt-1 text-xs text-[#65676b]">Created {new Date(group.created_at).toLocaleDateString()}</p>
            </td>
            <td className="px-5 py-4">
                <p className="font-medium text-[#1c1e21]">{group.owner?.name ?? 'Deleted account'}</p>
                <p className="text-xs text-[#65676b]">{group.owner?.email}</p>
            </td>
            <td className="px-5 py-4 text-[#1c1e21]">{group.approved_members_count.toLocaleString()}</td>
            <td className="px-5 py-4 text-[#1c1e21]">{group.posts_count.toLocaleString()}</td>
            <td className="min-w-[330px] px-5 py-4">
                <form onSubmit={saveGroup} className="grid gap-2">
                    <input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} maxLength={100} aria-label={`Name for ${group.name}`} className="w-full rounded-md border border-[#ccd0d5] px-2.5 py-2 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]" />
                    {form.errors.name && <p className="text-xs text-red-600">{form.errors.name}</p>}
                    <textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} maxLength={2000} rows={2} aria-label={`Description for ${group.name}`} placeholder="Group description" className="w-full resize-y rounded-md border border-[#ccd0d5] px-2.5 py-2 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]" />
                    {form.errors.description && <p className="text-xs text-red-600">{form.errors.description}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={form.data.privacy} onChange={(event) => form.setData('privacy', event.target.value)} aria-label={`Privacy for ${group.name}`} className="rounded-md border border-[#ccd0d5] bg-white px-2.5 py-2 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]">
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                        <button type="submit" disabled={form.processing || !form.isDirty} className="rounded-lg bg-[#0866ff] px-3 py-2 text-xs font-semibold text-white hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:opacity-50">Save changes</button>
                        <button type="button" onClick={deleteGroup} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>
                    </div>
                </form>
            </td>
        </tr>
    );
}

export default function Groups({ groups, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const { errors } = usePage().props;

    const submitSearch = (event) => {
        event.preventDefault();
        router.get(route('admin.groups.index'), { search: search.trim() || undefined }, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Group management" />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Site management</p>
                    <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Group management</h1>
                    <p className="mt-1 text-sm text-[#65676b]">Manage communities, inspect membership totals, and remove abusive groups.</p>
                </div>
                <form onSubmit={submitSearch} role="search" className="flex w-full gap-2 sm:max-w-md">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} aria-label="Search groups" placeholder="Search groups or owners" className="min-w-0 flex-1 rounded-lg border border-[#ccd0d5] bg-white px-3 py-2.5 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]" />
                    <button type="submit" className="rounded-lg bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5]">Search</button>
                </form>
            </div>
            {errors.action && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.action}</p>}
            <section className="mt-6 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                <div className="border-b border-[#e4e6eb] px-5 py-4">
                    <h2 className="font-bold text-[#1c1e21]">Communities</h2>
                    <p className="mt-0.5 text-sm text-[#65676b]">{groups.total.toLocaleString()} groups</p>
                </div>
                {groups.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-[#f7f8fa] text-xs uppercase tracking-wide text-[#65676b]">
                                <tr>
                                    <th scope="col" className="px-5 py-3 font-semibold">Group</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Owner</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Members</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Posts</th>
                                    <th scope="col" className="px-5 py-3 font-semibold">Site controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e4e6eb]">
                                {groups.data.map((group) => <GroupRow key={group.id} group={group} />)}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="px-5 py-12 text-center text-sm text-[#65676b]">No groups match this search.</p>
                )}
                <AdminPagination paginator={groups} />
            </section>
        </AdminLayout>
    );
}
