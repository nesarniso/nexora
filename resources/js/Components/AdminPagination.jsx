import { Link } from '@inertiajs/react';

export default function AdminPagination({ paginator }) {
    if (!paginator || paginator.last_page <= 1) {
        return null;
    }

    return (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e6eb] px-5 py-3">
            <p className="text-sm text-[#65676b]">
                Showing {paginator.from ?? 0}–{paginator.to ?? 0} of {paginator.total.toLocaleString()}
            </p>
            <div className="flex flex-wrap gap-1">
                {paginator.links.map((link, index) => (
                    <Link
                        key={`${index}-${link.label}`}
                        href={link.url ?? '#'}
                        preserveScroll
                        aria-current={link.active ? 'page' : undefined}
                        aria-disabled={!link.url}
                        className={`min-w-9 rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                            link.active
                                ? 'bg-[#0866ff] text-white'
                                : link.url
                                    ? 'border border-[#ccd0d5] text-[#1c1e21] hover:bg-[#f0f2f5]'
                                    : 'pointer-events-none text-[#bcc0c4]'
                        }`}
                    >
                        {link.label.replace('&laquo;', '‹').replace('&raquo;', '›')}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
