import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    profile,
    className = '',
}) {
    const user = usePage().props.auth.user;
    const profileData = profile ?? user.profile ?? {};

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
            username: profileData.username ?? '',
            bio: profileData.bio ?? '',
            location: profileData.location ?? '',
            website: profileData.website ?? '',
            avatar_url: profileData.avatar_url ?? '',
            cover_url: profileData.cover_url ?? '',
        });

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };
    const inputClassName = 'mt-1 block w-full rounded-lg border-[#ccd0d5] bg-[#f7f8fa] px-3 py-2.5 text-[15px] shadow-none focus:border-[#0866ff] focus:ring-[#0866ff]';
    const labelClassName = 'text-sm font-semibold text-[#65676b]';

    return (
        <section className={className}>
            <header>
                <h2 className="text-[19px] font-bold text-[#1c1e21]">
                    Profile Information
                </h2>

                <p className="mt-1 text-sm text-[#65676b]">
                    Update your account information, username, and public profile details.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-5">
                <div>
                    <InputLabel htmlFor="name" value="Name" className={labelClassName} />

                    <TextInput
                        id="name"
                        className={inputClassName}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" className={labelClassName} />

                    <TextInput
                        id="email"
                        type="email"
                        className={inputClassName}
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                <div>
                    <InputLabel htmlFor="username" value="Username" className={labelClassName} />

                    <TextInput
                        id="username"
                        className={inputClassName}
                        value={data.username}
                        onChange={(e) => setData('username', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.username} />
                </div>

                <div>
                    <InputLabel htmlFor="bio" value="Bio" className={labelClassName} />

                    <textarea
                        id="bio"
                        className="mt-1 block w-full rounded-lg border-[#ccd0d5] bg-[#f7f8fa] px-3 py-2.5 text-[15px] shadow-none focus:border-[#0866ff] focus:ring-[#0866ff]"
                        value={data.bio}
                        rows="4"
                        onChange={(e) => setData('bio', e.target.value)}
                    />

                    <InputError className="mt-2" message={errors.bio} />
                </div>

                <div>
                    <InputLabel htmlFor="location" value="Location" className={labelClassName} />

                    <TextInput
                        id="location"
                        className={inputClassName}
                        value={data.location}
                        onChange={(e) => setData('location', e.target.value)}
                        autoComplete="address-level2"
                    />

                    <InputError className="mt-2" message={errors.location} />
                </div>

                <div>
                    <InputLabel htmlFor="website" value="Website" className={labelClassName} />

                    <TextInput
                        id="website"
                        type="url"
                        className={inputClassName}
                        value={data.website}
                        onChange={(e) => setData('website', e.target.value)}
                        autoComplete="url"
                    />

                    <InputError className="mt-2" message={errors.website} />
                </div>

                <div id="profile-photos" className="scroll-mt-20 space-y-5 rounded-lg border border-[#e4e6eb] p-4">
                    <div>
                        <h3 className="text-[16px] font-semibold text-[#1c1e21]">Profile and cover photos</h3>
                        <p className="mt-1 text-sm text-[#65676b]">Use a direct link to an image file.</p>
                    </div>
                    <div>
                        <InputLabel htmlFor="avatar_url" value="Profile photo URL" className={labelClassName} />
                        <TextInput
                            id="avatar_url"
                            type="url"
                            className={inputClassName}
                            value={data.avatar_url}
                            onChange={(e) => setData('avatar_url', e.target.value)}
                            autoComplete="url"
                        />
                        <InputError className="mt-2" message={errors.avatar_url} />
                    </div>
                    <div>
                        <InputLabel htmlFor="cover_url" value="Cover photo URL" className={labelClassName} />
                        <TextInput
                            id="cover_url"
                            type="url"
                            className={inputClassName}
                            value={data.cover_url}
                            onChange={(e) => setData('cover_url', e.target.value)}
                            autoComplete="url"
                        />
                        <InputError className="mt-2" message={errors.cover_url} />
                    </div>
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-[#65676b]">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md font-medium text-[#0866ff] underline hover:text-[#075ce5] focus:outline-none focus:ring-2 focus:ring-[#0866ff] focus:ring-offset-2"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-700">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton
                        disabled={processing}
                        className="!bg-[#0866ff] !text-sm !font-semibold !normal-case !tracking-normal hover:!bg-[#075ce5] focus:!bg-[#075ce5] active:!bg-[#075ce5]"
                    >
                        Save changes
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm font-medium text-green-700">Saved.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
