import AdminLayout from '@/Layouts/AdminLayout';
import SocialIcon from '@/Components/SocialIcon';
import { Head, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

function BrandingImageField({ title, description, existingUrl, file, onFileChange, onRemove, onUndoRemove, removeSelected, error, square = false }) {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);

            return undefined;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const imageUrl = previewUrl ?? (removeSelected ? null : existingUrl);

    return (
        <div className="rounded-xl border border-[#e4e6eb] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#ccd0d5] bg-[#f7f8fa] ${square ? 'h-24 w-24' : 'h-24 w-48'}`}>
                    {imageUrl ? (
                        <img src={imageUrl} alt={`${title} preview`} className="h-full w-full object-contain p-2" />
                    ) : (
                        <span className="px-3 text-center text-xs text-[#65676b]">No {title.toLowerCase()} uploaded</span>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#1c1e21]">{title}</h3>
                    <p className="mt-1 text-xs text-[#65676b]">{description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-[#d8dadf] bg-white px-3 py-2 text-xs font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]">
                            Choose image
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                                className="sr-only"
                            />
                        </label>
                        {(existingUrl || file || removeSelected) && (
                            <button
                                type="button"
                                onClick={removeSelected ? onUndoRemove : onRemove}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold ${removeSelected ? 'text-[#0866ff] hover:bg-blue-50' : 'text-red-700 hover:bg-red-50'}`}
                            >
                                {removeSelected ? 'Undo removal' : 'Remove image'}
                            </button>
                        )}
                    </div>
                    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
                    {removeSelected && <p className="mt-2 text-xs text-amber-700">The image will be removed when you save.</p>}
                </div>
            </div>
        </div>
    );
}

export default function Settings({ settings }) {
    const { data, setData, post, processing, progress, errors, wasSuccessful } = useForm({
        site_name: settings.site_name,
        tagline: settings.tagline,
        announcement: settings.announcement ?? '',
        registration_enabled: settings.registration_enabled,
        logo: null,
        site_icon: null,
        remove_logo: false,
        remove_site_icon: false,
        _method: 'patch',
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('admin.settings.update'), { preserveScroll: true, forceFormData: true });
    };

    return (
        <AdminLayout>
            <Head title="Site settings" />
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#0866ff]">Platform management</p>
                <h1 className="mt-1 text-2xl font-bold text-[#1c1e21] sm:text-3xl">Site settings</h1>
                <p className="mt-1 text-sm text-[#65676b]">Manage the public identity, announcements, and registration availability.</p>
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="space-y-5 rounded-xl border border-[#e4e6eb] bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <label htmlFor="site_name" className="block text-sm font-semibold text-[#1c1e21]">Site name</label>
                        <input
                            id="site_name"
                            value={data.site_name}
                            onChange={(event) => setData('site_name', event.target.value)}
                            maxLength={80}
                            required
                            className="mt-2 w-full rounded-lg border border-[#ccd0d5] px-3 py-2.5 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        />
                        {errors.site_name && <p role="alert" className="mt-1 text-sm text-red-700">{errors.site_name}</p>}
                    </div>

                    <div>
                        <label htmlFor="tagline" className="block text-sm font-semibold text-[#1c1e21]">Tagline</label>
                        <input
                            id="tagline"
                            value={data.tagline}
                            onChange={(event) => setData('tagline', event.target.value)}
                            maxLength={160}
                            required
                            className="mt-2 w-full rounded-lg border border-[#ccd0d5] px-3 py-2.5 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        />
                        {errors.tagline && <p role="alert" className="mt-1 text-sm text-red-700">{errors.tagline}</p>}
                    </div>

                    <div>
                        <label htmlFor="announcement" className="block text-sm font-semibold text-[#1c1e21]">Site announcement</label>
                        <textarea
                            id="announcement"
                            value={data.announcement}
                            onChange={(event) => setData('announcement', event.target.value)}
                            maxLength={300}
                            rows={3}
                            placeholder="Optional message shown across the site"
                            className="mt-2 w-full resize-y rounded-lg border border-[#ccd0d5] px-3 py-2.5 text-sm focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        />
                        <div className="mt-1 flex justify-between gap-3">
                            {errors.announcement ? <p role="alert" className="text-sm text-red-700">{errors.announcement}</p> : <span className="text-xs text-[#65676b]">Shown to visitors, members, and administrators.</span>}
                            <span className="shrink-0 text-xs text-[#65676b]">{data.announcement.length}/300</span>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-[#e4e6eb] pt-5">
                        <div>
                            <h2 className="text-base font-bold text-[#1c1e21]">Branding</h2>
                            <p className="mt-1 text-sm text-[#65676b]">Upload the logo shown across Nexora and the icon shown in browser tabs.</p>
                        </div>
                        <BrandingImageField
                            title="Site logo"
                            description="PNG, JPG, or WebP. Maximum 4 MB. Appears in the site header and guest pages."
                            existingUrl={settings.logo_url}
                            file={data.logo}
                            onFileChange={(file) => {
                                setData((current) => ({ ...current, logo: file, remove_logo: false }));
                            }}
                            onRemove={() => setData((current) => ({ ...current, logo: null, remove_logo: true }))}
                            onUndoRemove={() => setData((current) => ({ ...current, remove_logo: false }))}
                            removeSelected={data.remove_logo}
                            error={errors.logo}
                        />
                        <BrandingImageField
                            title="Site icon"
                            description="Square PNG, JPG, or WebP, 32–512 px. Maximum 2 MB. Appears in browser tabs."
                            existingUrl={settings.site_icon_url}
                            file={data.site_icon}
                            onFileChange={(file) => {
                                setData((current) => ({ ...current, site_icon: file, remove_site_icon: false }));
                            }}
                            onRemove={() => setData((current) => ({ ...current, site_icon: null, remove_site_icon: true }))}
                            onUndoRemove={() => setData((current) => ({ ...current, remove_site_icon: false }))}
                            removeSelected={data.remove_site_icon}
                            error={errors.site_icon}
                            square
                        />
                    </div>

                    <div className="border-t border-[#e4e6eb] pt-5">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={data.registration_enabled}
                                onChange={(event) => setData('registration_enabled', event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-[#ccd0d5] text-[#0866ff] focus:ring-[#0866ff]"
                            />
                            <span>
                                <span className="block text-sm font-semibold text-[#1c1e21]">Allow new registrations</span>
                                <span className="mt-1 block text-sm text-[#65676b]">When disabled, registration links are hidden and both registration endpoints are unavailable.</span>
                            </span>
                        </label>
                        {errors.registration_enabled && <p role="alert" className="mt-2 text-sm text-red-700">{errors.registration_enabled}</p>}
                    </div>
                </section>

                <aside className="h-fit rounded-xl border border-[#e4e6eb] bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0866ff]">
                            <SocialIcon name="settings" className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="font-bold text-[#1c1e21]">Publish changes</h2>
                            <p className="text-xs text-[#65676b]">Changes apply immediately.</p>
                        </div>
                    </div>
                    {data.announcement && (
                        <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Announcement preview</p>
                            <p className="mt-1 break-words text-sm text-blue-950">{data.announcement}</p>
                        </div>
                    )}
                    <button type="submit" disabled={processing} className="mt-5 w-full rounded-lg bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:opacity-60">
                        {processing ? 'Saving…' : 'Save site settings'}
                    </button>
                    {progress && (
                        <div className="mt-3">
                            <progress value={progress.percentage} max="100" className="h-2 w-full accent-[#0866ff]" />
                            <p className="text-center text-xs text-[#65676b]">Uploading branding… {progress.percentage}%</p>
                        </div>
                    )}
                    {wasSuccessful && <p role="status" className="mt-3 text-center text-sm font-medium text-green-700">Settings saved.</p>}
                </aside>
            </form>
        </AdminLayout>
    );
}
