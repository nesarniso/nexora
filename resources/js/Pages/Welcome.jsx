import { Head, Link, useForm } from '@inertiajs/react';

export default function Welcome({ auth, canRegister = true, site }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event) => {
        event.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title={`${site.site_name} - Connect with friends`}>
                <link rel="icon" href={site.site_icon_url ?? '/favicon.ico'} />
            </Head>
            <div className="flex min-h-screen flex-col bg-[#f0f2f5] text-[#1c1e21]">
                {site.announcement && (
                    <div role="status" className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-900">
                        {site.announcement}
                    </div>
                )}
                <main className="flex flex-1 items-center">
                    <div className="mx-auto grid w-full max-w-[980px] items-center gap-8 px-4 pb-12 pt-8 sm:px-6 md:grid-cols-[1fr_396px] md:gap-12 md:pb-20 md:pt-12">
                        <section className="text-center md:-mt-8 md:text-left">
                            <Link href="/" aria-label={`${site.site_name} home`} className="inline-flex min-h-14 items-center">
                                {site.logo_url
                                    ? <img src={site.logo_url} alt={site.site_name} className="max-h-16 max-w-full object-contain" />
                                    : <span className="text-[52px] font-bold leading-none tracking-[-0.055em] text-[#0866ff] sm:text-[58px]">{site.site_name.toLowerCase()}</span>}
                            </Link>
                            <h1 className="mx-auto mt-4 max-w-[500px] text-[23px] font-normal leading-[1.25] text-[#1c1e21] sm:text-[26px] md:mx-0 md:mt-5">
                                {site.tagline}
                            </h1>
                        </section>

                        <section className="mx-auto w-full max-w-[396px]">
                            <div className="rounded-lg bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.12)] sm:p-4">
                                {auth.user ? (
                                    <div className="space-y-4 text-center">
                                        <p className="text-[17px] text-[#1c1e21]">You’re already signed in.</p>
                                        <Link href={route('dashboard')} className="flex w-full items-center justify-center rounded-md bg-[#0866ff] px-4 py-3 text-[20px] font-bold text-white transition-colors hover:bg-[#075ce5]">
                                            Go to your feed
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <form onSubmit={submit} className="space-y-3">
                                            <div>
                                                <label htmlFor="email" className="sr-only">Email address or phone number</label>
                                                <input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    autoComplete="username"
                                                    autoFocus
                                                    value={data.email}
                                                    onChange={(event) => setData('email', event.target.value)}
                                                    placeholder="Email address"
                                                    aria-invalid={Boolean(errors.email)}
                                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                                    className="h-[52px] w-full rounded-md border border-[#dddfe2] bg-white px-4 text-[17px] text-[#1c1e21] placeholder:text-[#90949c] focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                                                />
                                                {errors.email && <p id="email-error" className="px-1 pt-1 text-sm text-[#b42318]">{errors.email}</p>}
                                            </div>

                                            <div>
                                                <label htmlFor="password" className="sr-only">Password</label>
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    autoComplete="current-password"
                                                    value={data.password}
                                                    onChange={(event) => setData('password', event.target.value)}
                                                    placeholder="Password"
                                                    aria-invalid={Boolean(errors.password)}
                                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                                    className="h-[52px] w-full rounded-md border border-[#dddfe2] bg-white px-4 text-[17px] text-[#1c1e21] placeholder:text-[#90949c] focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                                                />
                                                {errors.password && <p id="password-error" className="px-1 pt-1 text-sm text-[#b42318]">{errors.password}</p>}
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="flex h-12 w-full items-center justify-center rounded-md bg-[#0866ff] px-4 text-[20px] font-bold text-white transition-colors hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:bg-[#8db7f5]"
                                            >
                                                {processing ? 'Logging in…' : 'Log in'}
                                            </button>
                                        </form>

                                        <div className="py-1 text-center">
                                            <Link href={route('password.request')} className="text-sm font-medium text-[#0866ff] hover:underline">
                                                Forgotten password?
                                            </Link>
                                        </div>

                                        <div className="my-3 border-t border-[#dadde1]" />

                                        {canRegister && site.registration_enabled && (
                                            <div className="pb-2 pt-1 text-center">
                                                <Link href={route('register')} className="inline-flex h-12 items-center justify-center rounded-md bg-[#42b72a] px-5 text-[17px] font-bold text-white transition-colors hover:bg-[#36a420]">
                                                    Create new account
                                                </Link>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {!auth.user && canRegister && site.registration_enabled && (
                                <p className="mt-7 text-center text-sm text-[#1c1e21]">
                                    <Link href={route('register')} className="font-semibold hover:underline">Join {site.site_name}</Link>
                                    {' '}to connect with friends and communities.
                                </p>
                            )}
                        </section>
                    </div>
                </main>

                <footer className="bg-white px-4 py-6 text-xs text-[#737373]">
                    <div className="mx-auto max-w-[980px]">
                        <div className="flex flex-wrap gap-x-3 gap-y-2 border-b border-[#dddfe2] pb-3">
                            {['English (US)', 'বাংলা', 'हिन्दी', 'اردو', 'Español', 'Français (France)', 'العربية', 'Português (Brasil)'].map((language) => (
                                <span key={language} className="cursor-default">{language}</span>
                            ))}
                        </div>
                        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2 pt-3">
                            {['About', 'Privacy', 'Terms', 'Help', 'Contact', 'Cookies'].map((item) => (
                                <span key={item} className="cursor-default hover:underline">{item}</span>
                            ))}
                        </nav>
                        <p className="pt-4">Nexora © 2026</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
