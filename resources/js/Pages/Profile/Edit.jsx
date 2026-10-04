import SocialIcon from '@/Components/SocialIcon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

const sections = [
    { label: 'Personal details', icon: 'people', href: '#personal-details' },
    { label: 'Profile and cover photos', icon: 'photo', href: '#profile-photos' },
    { label: 'Password and security', icon: 'shield', href: '#password-security' },
    { label: 'Account deletion', icon: 'lock', href: '#account-control' },
];

export default function Edit({ mustVerifyEmail, status, profile }) {
    return (
        <AuthenticatedLayout>
            <Head title="Settings" />

            <div className="min-h-[calc(100vh-56px)] bg-[#f0f2f5]">
                <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-3 py-5 sm:px-5 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,900px)] lg:gap-8">
                    <aside className="h-fit rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] md:sticky md:top-[72px]">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#65676b]">Nexora</p>
                                <h1 className="mt-1 text-[23px] font-bold text-[#1c1e21]">Settings</h1>
                            </div>
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e6eb] text-[#1c1e21]">
                                <SocialIcon name="settings" className="h-5 w-5" />
                            </span>
                        </div>

                        <Link href={route('profile.show')} className="mt-4 flex items-center gap-3 rounded-lg bg-[#f0f2f5] p-3 transition-colors hover:bg-[#e4e6eb]">
                            <SocialIcon name="home" className="h-5 w-5 text-[#0866ff]" />
                            <span className="text-sm font-semibold text-[#1c1e21]">Back to your profile</span>
                        </Link>

                        <nav aria-label="Settings sections" className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-1">
                            {sections.map((section) => (
                                <a key={section.href} href={section.href} className="flex min-w-0 items-center gap-2 rounded-lg p-2 text-sm font-medium text-[#1c1e21] transition-colors hover:bg-[#f0f2f5] sm:gap-3 sm:p-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                                        <SocialIcon name={section.icon} className="h-5 w-5" />
                                    </span>
                                    <span className="leading-4">{section.label}</span>
                                </a>
                            ))}
                        </nav>
                        <p className="mt-4 hidden border-t border-[#e4e6eb] pt-4 text-xs leading-5 text-[#65676b] md:block">
                            Manage your account, public profile, and security preferences.
                        </p>
                    </aside>

                    <main className="min-w-0 space-y-4">
                        <section id="personal-details" className="scroll-mt-20 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                                profile={profile}
                                className="max-w-3xl"
                            />
                        </section>

                        <section id="password-security" className="scroll-mt-20 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                            <div className="mb-5 flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                                    <SocialIcon name="shield" className="h-5 w-5" />
                                </span>
                                <div>
                                    <h2 className="text-[19px] font-bold text-[#1c1e21]">Password and security</h2>
                                    <p className="mt-1 text-sm text-[#65676b]">Keep your account secure by using a strong password.</p>
                                </div>
                            </div>
                            <UpdatePasswordForm className="max-w-3xl" />
                        </section>

                        <section id="account-control" className="scroll-mt-20 rounded-xl border border-[#e4e6eb] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                            <div className="mb-5 flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffebe9] text-[#d93025]">
                                    <SocialIcon name="lock" className="h-5 w-5" />
                                </span>
                                <div>
                                    <h2 className="text-[19px] font-bold text-[#1c1e21]">Account control</h2>
                                    <p className="mt-1 text-sm text-[#65676b]">Permanently remove your Nexora account and associated data.</p>
                                </div>
                            </div>
                            <DeleteUserForm className="max-w-3xl" />
                        </section>
                    </main>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
