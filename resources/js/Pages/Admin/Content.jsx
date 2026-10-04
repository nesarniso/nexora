import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const contentTypes = [
    { label: 'Personal posts', value: 'personal' },
    { label: 'Group posts', value: 'group' },
];

const mediaOptions = [
    { label: 'All content', value: 'all' },
    { label: 'With media', value: 'with_media' },
    { label: 'Text only', value: 'without_media' },
];

function CursorPagination({ paginator }) {
    if (!paginator.next_page_url && !paginator.prev_page_url) {
        return null;
    }

    return (
        <nav aria-label="Content pagination" className="flex items-center justify-between gap-4 border-t border-[#e4e6eb] px-4 py-3">
            <Link
                href={paginator.prev_page_url ?? '#'}
                preserveScroll
                aria-disabled={!paginator.prev_page_url}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${paginator.prev_page_url ? 'border-[#ccd0d5] text-[#1c1e21] hover:bg-[#f0f2f5]' : 'pointer-events-none border-[#e4e6eb] text-[#bcc0c4]'}`}
            >
                Previous
            </Link>
            <p className="text-center text-xs text-[#65676b]">Showing up to {paginator.per_page} posts at a time</p>
            <Link
                href={paginator.next_page_url ?? '#'}
                preserveScroll
                aria-disabled={!paginator.next_page_url}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${paginator.next_page_url ? 'border-[#ccd0d5] text-[#1c1e21] hover:bg-[#f0f2f5]' : 'pointer-events-none border-[#e4e6eb] text-[#bcc0c4]'}`}
            >
                Next
            </Link>
        </nav>
    );
}

export default function Content({ posts, filters }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const { errors } = usePage().props;
    const isGroupPost = filters.type === 'group';

    useEffect(() => {
        setSearch(filters.search ?? '');
        setFrom(filters.from ?? '');
        setTo(filters.to ?? '');
    }, [filters.search, filters.from, filters.to]);

    const visitWithFilters = (updates = {}) => {
        const nextFilters = {
            search: search.trim() || undefined,
            type: filters.type,
            media: filters.media === 'all' ? undefined : filters.media,
            per_page: filters.per_page === 25 ? undefined : filters.per_page,
            from: from || undefined,
            to: to || undefined,
            ...updates,
        };

        router.get(route('admin.content.index'), nextFilters, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const submitFilters = (event) => {
        event.preventDefault();
        visitWithFilters();
    };

    const clearFilters = () => {
        setSearch('');
        setFrom('');
        setTo('');
        router.get(route('admin.content.index'), { type: filters.type }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const removePost = (post) => {
        const description = `Permanently remove ${isGroupPost ? 'group post' : 'post'} #${post.id}?`;

        if (window.confirm(description)) {
            router.delete(route(
                isGroupPost ? 'admin.content.group-posts.destroy' : 'admin.content.posts.destroy',
                post.id,
            ), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout>
            <Head title="Content management" />
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Trust &amp; safety</p>
                <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Content management</h1>
                <p className="mt-1 text-sm text-[#65676b]">Search, filter, and review posts in a compact moderation queue.</p>
            </div>

            <div className="mt-6 border-b border-[#d8dadf]">
                <nav aria-label="Content type" className="-mb-px flex gap-5 overflow-x-auto">
                    {contentTypes.map((type) => (
                        <Link
                            key={type.value}
                            href={route('admin.content.index', {
                                type: type.value,
                                search: filters.search || undefined,
                                media: filters.media === 'all' ? undefined : filters.media,
                                per_page: filters.per_page === 25 ? undefined : filters.per_page,
                                from: filters.from || undefined,
                                to: filters.to || undefined,
                            })}
                            preserveScroll
                            className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold ${filters.type === type.value ? 'border-[#0866ff] text-[#0866ff]' : 'border-transparent text-[#65676b] hover:text-[#1c1e21]'}`}
                            aria-current={filters.type === type.value ? 'page' : undefined}
                        >
                            {type.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <form onSubmit={submitFilters} className="mt-4 rounded-xl border border-[#e4e6eb] bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_160px_150px_150px_150px_auto]">
                    <div>
                        <label htmlFor="content-search" className="sr-only">Search content</label>
                        <input
                            id="content-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            maxLength={100}
                            placeholder="Search text, post ID, author, or group"
                            className="w-full rounded-lg border border-[#ccd0d5] px-3 py-2.5 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        />
                    </div>
                    <div>
                        <label htmlFor="content-media" className="sr-only">Filter by media</label>
                        <select
                            id="content-media"
                            value={filters.media}
                            onChange={(event) => visitWithFilters({ media: event.target.value === 'all' ? undefined : event.target.value })}
                            className="w-full rounded-lg border border-[#ccd0d5] bg-white px-3 py-2.5 text-sm text-[#1c1e21] focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        >
                            {mediaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="content-from" className="sr-only">Published from</label>
                        <input id="content-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="Published from" className="w-full rounded-lg border border-[#ccd0d5] px-2 py-2.5 text-sm text-[#444950] focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]" />
                    </div>
                    <div>
                        <label htmlFor="content-to" className="sr-only">Published to</label>
                        <input id="content-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="Published to" className="w-full rounded-lg border border-[#ccd0d5] px-2 py-2.5 text-sm text-[#444950] focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]" />
                    </div>
                    <div>
                        <label htmlFor="content-page-size" className="sr-only">Posts per page</label>
                        <select
                            id="content-page-size"
                            value={filters.per_page}
                            onChange={(event) => visitWithFilters({ per_page: Number(event.target.value) === 25 ? undefined : event.target.value })}
                            className="w-full rounded-lg border border-[#ccd0d5] bg-white px-3 py-2.5 text-sm text-[#1c1e21] focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        >
                            {[25, 50, 100].map((size) => <option key={size} value={size}>{size} per page</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                        <button type="submit" className="flex-1 rounded-lg bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5]">Apply</button>
                        <button type="button" onClick={clearFilters} className="rounded-lg border border-[#d8dadf] px-3 py-2.5 text-sm font-semibold text-[#444950] hover:bg-[#f0f2f5]">Clear</button>
                    </div>
                </div>
                {errors.from && <p role="alert" className="mt-2 text-sm text-red-700">{errors.from}</p>}
                {errors.to && <p role="alert" className="mt-2 text-sm text-red-700">{errors.to}</p>}
                <p className="mt-3 text-xs text-[#65676b]">
                    {isGroupPost
                        ? 'Search matches post text, post ID, author, or group. Date and media filters are applied on the server.'
                        : 'Search matches post text, post ID, or author. Date and media filters are applied on the server.'}
                </p>
            </form>

            {errors.action && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.action}</p>}

            <section className="mt-4 overflow-hidden rounded-xl border border-[#e4e6eb] bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-1 border-b border-[#e4e6eb] px-4 py-3 sm:flex-row sm:items-center">
                    <h2 className="text-sm font-bold text-[#1c1e21]">{isGroupPost ? 'Group posts' : 'Personal feed posts'}</h2>
                    <p className="text-xs text-[#65676b]">
                        {posts.data.length === 0 ? 'No matching posts' : `${posts.data.length} posts loaded · newest first`}
                    </p>
                </div>

                {posts.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] table-fixed text-left text-sm">
                            <colgroup>
                                <col className="w-[44%]" />
                                <col className="w-[18%]" />
                                <col className="w-[14%]" />
                                <col className="w-[12%]" />
                                <col className="w-[12%]" />
                            </colgroup>
                            <thead className="bg-[#f7f8fa] text-[11px] uppercase tracking-wide text-[#65676b]">
                                <tr>
                                    <th scope="col" className="px-4 py-2.5 font-semibold">Content</th>
                                    <th scope="col" className="px-4 py-2.5 font-semibold">Author</th>
                                    <th scope="col" className="px-4 py-2.5 font-semibold">{isGroupPost ? 'Group' : 'Visibility'}</th>
                                    <th scope="col" className="px-4 py-2.5 font-semibold">Published</th>
                                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e4e6eb]">
                                {posts.data.map((post) => (
                                    <tr key={`${filters.type}-${post.id}`} className="align-middle hover:bg-[#fafbfc]">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {post.image_url ? (
                                                    <img src={post.image_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg border border-[#e4e6eb] object-cover" />
                                                ) : (
                                                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f2f5] text-sm text-[#65676b]">Aa</span>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="line-clamp-2 break-words text-sm text-[#1c1e21]">{post.excerpt || 'Image post'}</p>
                                                    {post.content.length > 180 && (
                                                        <details className="mt-1">
                                                            <summary className="w-fit cursor-pointer text-xs font-semibold text-[#0866ff]">View full post</summary>
                                                            <p className="mt-2 max-w-xl whitespace-pre-wrap break-words rounded-lg bg-[#f7f8fa] p-3 text-xs text-[#444950]">{post.content}</p>
                                                        </details>
                                                    )}
                                                    <p className="mt-1 text-[11px] text-[#8a8d91]">Post #{post.id}{post.media_count > 0 ? ` · ${post.media_count} media` : ' · Text'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="truncate font-semibold text-[#1c1e21]">{post.user?.name ?? 'Deleted account'}</p>
                                            <p className="truncate text-xs text-[#65676b]">{post.user?.email ?? 'Account unavailable'}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isGroupPost && post.group ? (
                                                <Link href={route('admin.groups.index', { search: post.group.name })} className="block truncate font-semibold text-[#0866ff] hover:underline">{post.group.name}</Link>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-[#f0f2f5] px-2 py-1 text-xs font-medium capitalize text-[#444950]">{post.visibility}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[#65676b]" title={new Date(post.created_at).toLocaleString()}>
                                            {new Date(post.created_at).toLocaleDateString()}
                                            <span className="mt-0.5 block">{new Date(post.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button type="button" onClick={() => removePost(post)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-5 py-12 text-center">
                        <p className="text-sm font-semibold text-[#1c1e21]">No posts found</p>
                        <p className="mt-1 text-xs text-[#65676b]">Try adjusting the search or filters.</p>
                    </div>
                )}
                <CursorPagination paginator={posts} />
            </section>
        </AdminLayout>
    );
}
