import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="space-y-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800">Create a new account</h2>
                    <p className="mt-1 text-sm text-slate-500">It&apos;s quick and easy.</p>
                </div>

                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <InputLabel htmlFor="name" value="Full name" className="text-sm font-medium text-slate-700" />
                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="mt-1 block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:ring-blue-500"
                            autoComplete="name"
                            isFocused={true}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Email address" className="text-sm font-medium text-slate-700" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:ring-blue-500"
                            autoComplete="username"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Password" className="text-sm font-medium text-slate-700" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:ring-blue-500"
                            autoComplete="new-password"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password_confirmation" value="Confirm password" className="text-sm font-medium text-slate-700" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-3 text-base focus:border-blue-500 focus:ring-blue-500"
                            autoComplete="new-password"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                        />
                        <InputError message={errors.password_confirmation} className="mt-2" />
                    </div>

                    <PrimaryButton
                        className="w-full justify-center rounded-lg bg-[#42b72a] px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#36a420]"
                        disabled={processing}
                    >
                        Sign Up
                    </PrimaryButton>
                </form>

                <div className="border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link href={route('login')} className="font-semibold text-blue-600 hover:text-blue-500">
                        Log in
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
