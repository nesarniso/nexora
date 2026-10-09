import { useForm } from '@inertiajs/react';
import SocialIcon from '@/Components/SocialIcon';

const visibilityOptions = [
    { value: 'public', label: 'Everyone' },
    { value: 'friends', label: 'Friends' },
    { value: 'only_me', label: 'Only me' },
];

const fields = [
    {
        name: 'location_visibility',
        label: 'Location',
        description: 'Choose who can see the location shown in your profile.',
    },
    {
        name: 'photos_visibility',
        label: 'Photos and videos',
        description: 'Choose who can see the photos and videos section on your profile. Post visibility still controls media attached to each post.',
    },
    {
        name: 'friends_visibility',
        label: 'Friends list',
        description: 'Choose who can see your friends list and friend count.',
    },
];

export default function UpdateProfilePrivacyForm({ privacy }) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm(privacy);

    const submit = (event) => {
        event.preventDefault();
        patch(route('profile.privacy.update'));
    };

    return (
        <form onSubmit={submit} className="max-w-3xl">
            <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                    <SocialIcon name="lock" className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-[19px] font-bold text-[#1c1e21]">Profile privacy</h2>
                    <p className="mt-1 text-sm text-[#65676b]">Control who can see selected information on your profile.</p>
                </div>
            </div>

            <div className="space-y-5">
                {fields.map((field) => (
                    <div key={field.name} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center sm:gap-5">
                        <div>
                            <label htmlFor={field.name} className="text-sm font-semibold text-[#1c1e21]">{field.label}</label>
                            <p className="mt-1 text-sm leading-5 text-[#65676b]">{field.description}</p>
                            {errors[field.name] && <p id={`${field.name}-error`} className="mt-1 text-sm text-[#d93025]">{errors[field.name]}</p>}
                        </div>
                        <select
                            id={field.name}
                            value={data[field.name]}
                            onChange={(event) => setData(field.name, event.target.value)}
                            aria-invalid={Boolean(errors[field.name])}
                            aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                            className="w-full rounded-lg border border-[#ccd0d5] bg-white px-3 py-2.5 text-sm text-[#1c1e21] focus:border-[#0866ff] focus:outline-none focus:ring-1 focus:ring-[#0866ff]"
                        >
                            {visibilityOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#e4e6eb] pt-5">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-lg bg-[#0866ff] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing ? 'Saving…' : 'Save privacy settings'}
                </button>
                {recentlySuccessful && <p role="status" className="text-sm font-medium text-[#248a3d]">Privacy settings saved.</p>}
            </div>
        </form>
    );
}
