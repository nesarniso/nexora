import { Head, usePage } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    const { site } = usePage().props;

    return (
        <div className="min-h-screen bg-[#f0f2f5] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
            <Head>
                <link rel="icon" href={site.site_icon_url ?? '/favicon.ico'} />
            </Head>
            <div className="mx-auto max-w-6xl">
                <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="hidden lg:block">
                        <div className="mb-4 flex items-center gap-2">
                            {site.logo_url
                                ? <img src={site.logo_url} alt={site.site_name} className="max-h-20 max-w-full object-contain object-left" />
                                : <span className="text-[72px] font-bold leading-none tracking-[-0.055em] text-[#0866ff]">{site.site_name.toLowerCase()}</span>}
                        </div>

                        <h1 className="max-w-xl text-[32px] font-normal leading-tight text-[#1c1e21]">
                            {site.tagline}
                        </h1>
                    </div>

                    <div className="mx-auto w-full max-w-md">
                        <div className="overflow-hidden rounded-[18px] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.1)] ring-1 ring-slate-200 sm:p-6">
                            {site.announcement && (
                                <div role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
                                    {site.announcement}
                                </div>
                            )}
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
