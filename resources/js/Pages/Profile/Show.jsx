import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import PostEngagement from '@/Components/PostEngagement';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function SectionTitle({ children, href }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-bold text-[#1c1e21]">{children}</h2>
            {href && <Link href={href} preserveScroll className="rounded-md px-3 py-2 text-[15px] font-medium text-[#0866ff] hover:bg-[#f0f2f5]">See all</Link>}
        </div>
    );
}

export default function Show({ user, profile, posts, photos = [], galleryPhotos = [], videos = [], friends = [], sectionFriends, sectionPhotos, section = 'posts', friendCount = 0, followingCount = 0, followerCount = 0, isOwnProfile = false, friendship = null, canViewPhotos = true, canViewFriendsList = true }) {
    const { errors } = usePage().props;
    const [visibilityFilter, setVisibilityFilter] = useState('all');
    const [previewPhoto, setPreviewPhoto] = useState(null);
    const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
    const [photoProcessing, setPhotoProcessing] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const [friendRequestProcessing, setFriendRequestProcessing] = useState(false);
    const avatarInput = useRef(null);
    const coverInput = useRef(null);

    useEffect(() => {
        if (!previewPhoto && !photoPickerOpen) {
            return undefined;
        }

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setPreviewPhoto(null);
                setPhotoPickerOpen(false);
            }
        };

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [previewPhoto, photoPickerOpen]);

    const submitPhotoChange = (photo, forceFormData = false) => {
        setPhotoError('');
        router.post(route('profile.photos.update'), photo, {
            forceFormData,
            preserveScroll: true,
            onStart: () => setPhotoProcessing(true),
            onSuccess: () => {
                setPhotoError('');
                setPhotoPickerOpen(false);
                if (avatarInput.current) {
                    avatarInput.current.value = '';
                }
                if (coverInput.current) {
                    coverInput.current.value = '';
                }
            },
            onError: (validationErrors) => setPhotoError(validationErrors.avatar ?? validationErrors.cover ?? 'The photo could not be uploaded.'),
            onFinish: () => setPhotoProcessing(false),
        });
    };

    const uploadPhoto = (photoType, file) => {
        submitPhotoChange({ [photoType]: file }, true);
    };

    const sendFriendRequest = () => {
        setFriendRequestProcessing(true);
        router.post(route('friend-request.store', user.id), {}, {
            preserveScroll: true,
            onFinish: () => setFriendRequestProcessing(false),
        });
    };

    const deletePost = (postId) => {
        if (window.confirm('Delete this post? Your profile and cover photos will stay saved.')) {
            router.delete(route('posts.destroy', postId), { preserveScroll: true });
        }
    };

    const visiblePosts = posts.data.filter((post) => (
        visibilityFilter === 'all' || post.visibility === visibilityFilter
    ));

    const profileUrl = isOwnProfile ? route('profile.show') : route('users.show', user.id);
    const sectionUrl = (profileSection) => isOwnProfile
        ? route('profile.section', { section: profileSection })
        : route('users.section', { user: user.id, section: profileSection });
    const tabs = [
        { label: 'Posts', href: profileUrl, active: section === 'posts' },
        { label: 'About', href: sectionUrl('about'), active: section === 'about' },
        ...(canViewFriendsList ? [{ label: 'Friends', href: sectionUrl('friends'), count: friendCount, active: section === 'friends' }] : []),
        ...(canViewPhotos && videos.length > 0 ? [{ label: 'Reels', href: `${profileUrl}#reels`, active: false }] : []),
        ...(canViewPhotos ? [{ label: 'Photos', href: sectionUrl('photos'), active: section === 'photos' }] : []),
    ];

    const joinedDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        : null;

    return (
        <AuthenticatedLayout>
            <Head title={`${user.name} · Profile`} />

            <div className="min-h-[calc(100vh-56px)] bg-[#f0f2f5]">
                <div className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                    <div className="mx-auto max-w-[1100px] px-0 sm:px-4">
                        <div className="relative aspect-[2.7/1] max-h-[400px] min-h-[138px] overflow-hidden bg-gradient-to-br from-[#6b8fd6] via-[#a9c4e8] to-[#e2eaf5] sm:min-h-[220px] md:rounded-b-lg">
                            {profile.cover_url && (
                                <button
                                    type="button"
                                    onClick={() => setPreviewPhoto({ src: profile.cover_url, alt: `${user.name}'s cover photo` })}
                                    aria-label="View cover photo"
                                    className="absolute inset-0 h-full w-full cursor-zoom-in focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#0866ff]"
                                >
                                    <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
                                </button>
                            )}
                            {!profile.cover_url && (
                                <>
                                    <div className="absolute -right-16 -top-36 h-[420px] w-[420px] rounded-full border-[34px] border-white/20" />
                                    <div className="absolute -bottom-56 left-[18%] h-[520px] w-[520px] rounded-full border-[42px] border-white/15" />
                                </>
                            )}
                            {isOwnProfile && (
                                <>
                                    <input
                                        ref={coverInput}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        aria-label="Choose a new cover photo"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                uploadPhoto('cover', file);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => coverInput.current?.click()}
                                        disabled={photoProcessing}
                                        className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#1c1e21] shadow-sm transition-colors hover:bg-[#f0f2f5] disabled:opacity-60"
                                    >
                                        <SocialIcon name="camera" className="h-5 w-5" />
                                        <span className="hidden sm:inline">{photoProcessing ? 'Uploading…' : 'Edit cover photo'}</span>
                                        <span className="sm:hidden">{photoProcessing ? 'Uploading…' : 'Edit cover'}</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="px-4 md:px-8">
                            <div className="grid grid-cols-[112px_minmax(0,1fr)] items-end gap-x-3 gap-y-3 border-b border-[#ced0d4] pb-4 pt-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-x-5 sm:pt-0">
                                <div className="relative z-10 -mt-[64px] w-fit shrink-0 sm:-mt-[92px]">
                                    <div className="relative rounded-full border-4 border-white bg-white">
                                        <button
                                            type="button"
                                            onClick={() => isOwnProfile
                                                ? setPhotoPickerOpen(true)
                                                : profile.avatar_url && setPreviewPhoto({ src: profile.avatar_url, alt: `${user.name}'s profile photo` })}
                                            aria-label={isOwnProfile ? 'Update profile photo' : profile.avatar_url ? 'View profile photo' : 'Profile photo'}
                                            className={`block rounded-full focus:outline-none focus:ring-4 focus:ring-[#0866ff] focus:ring-offset-2 ${isOwnProfile || profile.avatar_url ? 'cursor-pointer' : 'cursor-default'}`}
                                        >
                                            <Avatar name={user.name} src={profile.avatar_url} size="h-[120px] w-[120px] sm:h-[190px] sm:w-[190px]" textSize="text-4xl sm:text-6xl" />
                                        </button>
                                        {isOwnProfile && (
                                            <>
                                                <input
                                                    ref={avatarInput}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                                    className="hidden"
                                                    aria-label="Choose a new profile photo"
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) {
                                                            uploadPhoto('avatar', file);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => avatarInput.current?.click()}
                                                    disabled={photoProcessing}
                                                    aria-label="Change profile photo"
                                                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#e4e6eb] text-[#1c1e21] shadow-sm transition-colors hover:bg-[#d8dadf] disabled:opacity-60 sm:bottom-3 sm:right-3 sm:h-11 sm:w-11"
                                                >
                                                    <SocialIcon name="camera" className="h-5 w-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="min-w-0 pb-1 text-left">
                                    <h1 className="break-words text-[23px] font-bold leading-tight text-[#1c1e21] sm:text-[32px]">{user.name}</h1>
                                    <p className="mt-1 truncate text-[14px] font-semibold text-[#65676b] sm:text-[15px]">@{profile.username ?? 'user'}{friendCount > 0 && <> · {friendCount} friends</>}</p>
                                </div>
                                {!isOwnProfile && (
                                    <div className="col-span-2 flex flex-wrap justify-start gap-2 sm:col-span-1 sm:justify-end sm:pb-1">
                                        <Link
                                            href={route('conversations.store', user.id)}
                                            method="post"
                                            as="button"
                                            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#e4e6eb] px-3 py-2 text-[14px] font-semibold text-[#1c1e21] transition-colors hover:bg-[#d8dadf] sm:px-4 sm:text-[15px]"
                                        >
                                            <SocialIcon name="messages" className="h-5 w-5" /> Message
                                        </Link>
                                        {(!friendship || friendship.status === 'rejected') && (
                                            <button
                                                type="button"
                                                onClick={sendFriendRequest}
                                                disabled={friendRequestProcessing}
                                                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0866ff] px-3 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#075ce5] disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:text-[15px]"
                                            >
                                                <SocialIcon name="friends" className="h-5 w-5" />
                                                {friendRequestProcessing ? 'Sending…' : 'Add friend'}
                                            </button>
                                        )}
                                        {friendship?.status === 'pending' && (
                                            friendship.isOutgoing ? (
                                                <>
                                                    <span role="status" className="inline-flex items-center gap-2 rounded-md bg-[#e4e6eb] px-3 py-2 text-[14px] font-semibold text-[#1c1e21] sm:px-4 sm:text-[15px]">
                                                        <SocialIcon name="clock" className="h-5 w-5" /> Request sent
                                                    </span>
                                                    <Link
                                                        href={route('friend-request.cancel', user.id)}
                                                        method="post"
                                                        as="button"
                                                        preserveScroll
                                                        className="inline-flex items-center justify-center rounded-md bg-[#e4e6eb] px-3 py-2 text-[14px] font-semibold text-[#1c1e21] transition-colors hover:bg-[#d8dadf] sm:px-4 sm:text-[15px]"
                                                    >
                                                        Cancel request
                                                    </Link>
                                                </>
                                            ) : (
                                                <>
                                                    <Link
                                                        href={route('friend-request.accept', user.id)}
                                                        method="post"
                                                        as="button"
                                                        preserveScroll
                                                        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0866ff] px-3 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#075ce5] sm:px-4 sm:text-[15px]"
                                                    >
                                                        <SocialIcon name="friends" className="h-5 w-5" /> Confirm request
                                                    </Link>
                                                    <Link
                                                        href={route('friend-request.reject', user.id)}
                                                        method="post"
                                                        as="button"
                                                        preserveScroll
                                                        className="inline-flex items-center justify-center rounded-md bg-[#e4e6eb] px-3 py-2 text-[14px] font-semibold text-[#1c1e21] transition-colors hover:bg-[#d8dadf] sm:px-4 sm:text-[15px]"
                                                    >
                                                        Delete request
                                                    </Link>
                                                </>
                                            )
                                        )}
                                        {friendship?.status === 'accepted' && (
                                            <span role="status" className="inline-flex items-center gap-2 rounded-md bg-[#e4e6eb] px-3 py-2 text-[14px] font-semibold text-[#1c1e21] sm:px-4 sm:text-[15px]">
                                                <SocialIcon name="friends" className="h-5 w-5" /> Friends
                                            </span>
                                        )}
                                        {friendship?.status === 'blocked' && (
                                            <span role="status" className="rounded-md bg-[#e4e6eb] px-3 py-2 text-[14px] font-semibold text-[#65676b] sm:px-4 sm:text-[15px]">
                                                Unavailable
                                            </span>
                                        )}
                                    </div>
                                )}
                                {isOwnProfile && (
                                    <div className="col-span-2 flex flex-wrap justify-end gap-2 sm:col-span-1 sm:pb-1">
                                        <Link href={route('dashboard')} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0866ff] px-3 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#075ce5] sm:px-4 sm:text-[15px]">
                                            <SocialIcon name="plus" className="h-5 w-5" /><span className="hidden sm:inline">Create post</span><span className="sm:hidden">Post</span>
                                        </Link>
                                        <Link href={route('profile.edit')} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#e4e6eb] px-3 py-2 text-[14px] font-semibold text-[#1c1e21] transition-colors hover:bg-[#d8dadf] sm:px-4 sm:text-[15px]">
                                            <SocialIcon name="people" className="h-5 w-5" /><span className="hidden sm:inline">Edit profile</span><span className="sm:hidden">Edit</span>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <nav aria-label="Profile sections" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {tabs.map((tab) => (
                                    <Link
                                        key={tab.label}
                                        href={tab.href}
                                        preserveScroll
                                        aria-current={tab.active ? 'page' : undefined}
                                        className={`flex shrink-0 items-center gap-2 border-b-[3px] px-3 py-4 text-[14px] font-semibold transition-colors sm:px-5 sm:text-[15px] ${tab.active ? 'border-[#0866ff] text-[#0866ff]' : 'border-transparent text-[#65676b] hover:bg-[#f0f2f5]'}`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count !== undefined && <span className="text-xs font-medium text-[#65676b]">{tab.count}</span>}
                                    </Link>
                                ))}
                                {isOwnProfile && <details className="relative ml-auto hidden shrink-0 sm:block">
                                    <summary aria-label="More profile sections" className="flex h-full cursor-pointer list-none items-center px-4 text-[#65676b] hover:bg-[#f0f2f5] [&::-webkit-details-marker]:hidden">
                                        <SocialIcon name="menu" className="h-5 w-5" />
                                    </summary>
                                    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg bg-white p-2 shadow-lg ring-1 ring-black/10">
                                        <Link href={route('profile.edit')} className="block rounded-md px-3 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]">Profile settings</Link>
                                        {friendCount > 0 && <Link href={sectionUrl('friends')} preserveScroll className="block rounded-md px-3 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]">Friends</Link>}
                                    </div>
                                </details>}
                            </nav>
                            {photoError && (
                                <p role="alert" className="border-t border-[#e4e6eb] py-2 text-sm font-medium text-red-700">
                                    {photoError}
                                </p>
                            )}
                            {errors.user && !isOwnProfile && (
                                <p role="alert" className="border-t border-[#e4e6eb] py-2 text-sm font-medium text-red-700">
                                    {errors.user}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {section === 'posts' ? (
                    <div className="mx-auto grid max-w-[1015px] grid-cols-1 items-start gap-4 px-3 py-5 sm:px-4 md:grid-cols-[minmax(0,410px)_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <section id="about" className="scroll-mt-20 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <SectionTitle>Intro</SectionTitle>
                            {profile.bio ? (
                                <p className="mt-3 whitespace-pre-wrap text-center text-[15px] text-[#1c1e21]">{profile.bio}</p>
                            ) : (
                                <p className="mt-3 text-center text-[15px] text-[#65676b]">Add a bio to tell people a little about yourself.</p>
                            )}
                            {isOwnProfile && (
                                <Link href={route('profile.edit')} className="mt-4 flex w-full items-center justify-center rounded-md bg-[#e4e6eb] px-4 py-2 text-[15px] font-semibold text-[#1c1e21] hover:bg-[#d8dadf]">
                                    Edit bio
                                </Link>
                            )}
                            <div className="mt-4 space-y-3 border-t border-[#e4e6eb] pt-4 text-[15px] text-[#1c1e21]">
                                {profile.location && (
                                    <p className="flex items-center gap-3"><SocialIcon name="people" className="h-5 w-5 text-[#65676b]" /><span>Lives in <strong>{profile.location}</strong></span></p>
                                )}
                                {profile.website && (
                                    <p className="flex items-center gap-3"><SocialIcon name="globe" className="h-5 w-5 text-[#65676b]" /><a href={profile.website} target="_blank" rel="noreferrer" className="truncate font-semibold text-[#0866ff] hover:underline">{profile.website}</a></p>
                                )}
                                {joinedDate && (
                                    <p className="flex items-center gap-3"><SocialIcon name="clock" className="h-5 w-5 text-[#65676b]" /><span>Joined {joinedDate}</span></p>
                                )}
                                <p className="flex items-center gap-3"><SocialIcon name="friends" className="h-5 w-5 text-[#65676b]" /><span>{followingCount} following · {followerCount} followers</span></p>
                            </div>
                        </section>

                        {canViewPhotos && photos.length > 0 && (
                            <section id="photos" className="scroll-mt-20 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                <SectionTitle href={sectionUrl('photos')}>Photos</SectionTitle>
                                <div className="mt-3 grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
                                    {photos.map((photo) => (
                                        <button
                                            key={photo.id}
                                            type="button"
                                            onClick={() => setPreviewPhoto({ src: photo.url, alt: photo.caption ?? '' })}
                                            aria-label={`View photo${photo.caption ? `: ${photo.caption}` : ''}`}
                                            className="aspect-square w-full cursor-zoom-in bg-[#f0f2f5] outline-none transition-opacity hover:opacity-85 focus:ring-2 focus:ring-inset focus:ring-[#0866ff]"
                                        >
                                            <img src={photo.url} alt={photo.caption ?? ''} className="aspect-square w-full object-cover" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                        {canViewPhotos && photos.length === 0 && (
                            <section id="photos" className="scroll-mt-20 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                <SectionTitle>Photos</SectionTitle>
                                <p className="mt-3 rounded-lg bg-[#f0f2f5] px-3 py-6 text-center text-sm text-[#65676b]">Photos shared in posts will appear here.</p>
                            </section>
                        )}

                        {!canViewPhotos && (
                            <section id="photos" className="scroll-mt-20 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                <SectionTitle>Photos</SectionTitle>
                                <p className="mt-3 rounded-lg bg-[#f0f2f5] px-3 py-6 text-center text-sm text-[#65676b]">Photos and videos on this profile are private.</p>
                            </section>
                        )}

                        {canViewFriendsList ? (
                            <section id="friends" className="scroll-mt-20 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <SectionTitle href={sectionUrl('friends')}>Friends</SectionTitle>
                            <p className="mt-1 text-[15px] text-[#65676b]">{friendCount} friends</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {friends.map((friend) => (
                                    <Link
                                        key={friend.id}
                                        href={route('users.show', friend.id)}
                                        className="flex min-w-0 items-center gap-2 rounded-lg p-2 transition-colors hover:bg-[#f0f2f5]"
                                    >
                                        <Avatar name={friend.name} src={friend.avatar_url} size="h-12 w-12" />
                                        <span className="truncate text-sm font-semibold text-[#1c1e21]">{friend.name}</span>
                                    </Link>
                                ))}
                            </div>
                            </section>
                        ) : (
                            <section id="friends" className="scroll-mt-20 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                <SectionTitle>Friends</SectionTitle>
                                <p className="mt-3 rounded-lg bg-[#f0f2f5] px-3 py-6 text-center text-sm text-[#65676b]">This friends list is private.</p>
                            </section>
                        )}
                    </div>

                    <section id="posts" className="scroll-mt-20 space-y-4">
                        {isOwnProfile && <Link href={route('dashboard')} className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#fafafa]">
                            <Avatar name={user.name} src={profile.avatar_url} />
                            <span className="flex h-10 min-w-0 flex-1 items-center rounded-full bg-[#f0f2f5] px-4 text-[15px] text-[#65676b]">What&apos;s on your mind?</span>
                        </Link>}
                        <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <h2 className="text-[20px] font-bold text-[#1c1e21]">Posts</h2>
                            <details className="relative">
                                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md bg-[#e4e6eb] px-3 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#d8dadf] [&::-webkit-details-marker]:hidden">
                                    <SocialIcon name="menu" className="h-4 w-4" />Filters
                                </summary>
                                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg bg-white p-2 shadow-lg ring-1 ring-black/10">
                                    {[
                                        { label: 'All posts', value: 'all' },
                                        { label: 'Public', value: 'public' },
                                        { label: 'Friends', value: 'friends' },
                                        { label: 'Only me', value: 'only_me' },
                                    ].map((filter) => (
                                        <button
                                            key={filter.value}
                                            type="button"
                                            onClick={() => setVisibilityFilter(filter.value)}
                                            className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-[#f0f2f5] ${visibilityFilter === filter.value ? 'text-[#0866ff]' : 'text-[#1c1e21]'}`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </details>
                        </div>

                        {visiblePosts.length === 0 ? (
                            <div className="rounded-lg bg-white px-5 py-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f2f5] text-[#65676b]"><SocialIcon name="people" /></div>
                                <h3 className="mt-3 font-semibold text-[#1c1e21]">{posts.data.length === 0 ? 'No posts yet' : 'No posts match this filter'}</h3>
                                <p className="mt-1 text-sm text-[#65676b]">{posts.data.length === 0 ? 'When you share something, it will appear here.' : 'Choose another filter to see more posts.'}</p>
                                {posts.data.length === 0 && <Link href={route('dashboard')} className="mt-4 inline-flex rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5]">Share your first post</Link>}
                            </div>
                        ) : (
                            visiblePosts.map((post) => (
                                <article id={`post-${post.id}`} key={post.id} className="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                    <div className="flex items-center justify-between gap-3 px-4 pb-0 pt-4">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Avatar name={user.name} src={profile.avatar_url} />
                                            <div className="min-w-0">
                                                <p className="truncate text-[15px] font-semibold text-[#050505]">{user.name}</p>
                                                <p className="flex items-center gap-1 text-xs text-[#65676b]">
                                                    <span>{new Date(post.created_at).toLocaleString()}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <SocialIcon name={post.visibility === 'public' ? 'globe' : 'friends'} className="h-3.5 w-3.5" />
                                                    <span>{post.visibility === 'only_me' ? 'Only me' : post.visibility === 'friends' ? 'Friends' : 'Public'}</span>
                                                </p>
                                                </div>
                                            </div>
                                        {isOwnProfile && (
                                            <button
                                                type="button"
                                                onClick={() => deletePost(post.id)}
                                                className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#b42318]"
                                                aria-label="Delete post"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                    {post.content && <p className="whitespace-pre-wrap px-4 pb-4 pt-3 text-[15px] leading-[1.4] text-[#050505]">{post.content}</p>}
                                    {post.media_assets?.length > 0 && (
                                        <div className="grid gap-1">
                                            {post.media_assets.map((asset) => asset.type === 'image' ? (
                                                <img key={asset.id} src={asset.url} alt={asset.caption ?? ''} className="max-h-[520px] w-full object-cover" loading="lazy" />
                                            ) : (
                                                <video key={asset.id} src={asset.url} controls preload="metadata" className="max-h-[520px] w-full bg-black object-contain" />
                                            ))}
                                        </div>
                                    )}
                                    <PostEngagement post={post} />
                                </article>
                            ))
                        )}
                        {posts.links?.length > 3 && (
                            <nav aria-label="Profile post pages" className="flex flex-wrap justify-center gap-2">
                                {posts.links.map((link) => link.url && (
                                    <Link
                                        key={link.label}
                                        href={link.url}
                                        preserveScroll
                                        className={`rounded-md px-3 py-2 text-sm font-semibold ${link.active ? 'bg-[#0866ff] text-white' : 'bg-white text-[#1c1e21] hover:bg-[#e4e6eb]'}`}
                                    >
                                        {link.label.replace('&laquo;', '‹').replace('&raquo;', '›')}
                                    </Link>
                                ))}
                            </nav>
                        )}

                        {videos.length > 0 && (
                            <section id="reels" className="scroll-mt-20 rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                <SectionTitle>Reels</SectionTitle>
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {videos.map((video) => (
                                        <div key={video.id} className="overflow-hidden rounded-lg bg-black">
                                            <video src={video.url} controls preload="metadata" className="aspect-[9/16] max-h-[320px] w-full object-cover" />
                                            {video.caption && <p className="truncate bg-white px-2 py-2 text-sm text-[#1c1e21]">{video.caption}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </section>
                    </div>
                ) : (
                    <div className="mx-auto max-w-[1015px] px-3 py-5 sm:px-4">
                        {section === 'about' && (
                            <section className="rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                                <h2 className="text-[20px] font-bold text-[#1c1e21]">About {user.name}</h2>
                                <div className="mt-4 space-y-4 text-[15px] text-[#1c1e21]">
                                    <p className="whitespace-pre-wrap">{profile.bio || 'No bio has been added yet.'}</p>
                                    {profile.location && (
                                        <p className="flex items-center gap-3"><SocialIcon name="people" className="h-5 w-5 text-[#65676b]" /><span>Lives in <strong>{profile.location}</strong></span></p>
                                    )}
                                    {profile.website && (
                                        <p className="flex items-center gap-3"><SocialIcon name="globe" className="h-5 w-5 text-[#65676b]" /><a href={profile.website} target="_blank" rel="noreferrer" className="truncate font-semibold text-[#0866ff] hover:underline">{profile.website}</a></p>
                                    )}
                                    {joinedDate && (
                                        <p className="flex items-center gap-3"><SocialIcon name="clock" className="h-5 w-5 text-[#65676b]" /><span>Joined {joinedDate}</span></p>
                                    )}
                                    <p className="flex items-center gap-3"><SocialIcon name="friends" className="h-5 w-5 text-[#65676b]" /><span>{followingCount} following · {followerCount} followers</span></p>
                                </div>
                                {isOwnProfile && (
                                    <Link href={route('profile.edit')} className="mt-5 inline-flex rounded-md bg-[#e4e6eb] px-4 py-2 text-[15px] font-semibold text-[#1c1e21] hover:bg-[#d8dadf]">
                                        Edit profile
                                    </Link>
                                )}
                            </section>
                        )}

                        {section === 'friends' && canViewFriendsList && (
                            <section className="rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-[20px] font-bold text-[#1c1e21]">Friends</h2>
                                    <span className="text-sm text-[#65676b]">{friendCount} friends</span>
                                </div>
                                {sectionFriends?.data?.length > 0 ? (
                                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {sectionFriends.data.map((friend) => (
                                            <Link
                                                key={friend.id}
                                                href={route('users.show', friend.id)}
                                                className="flex min-w-0 items-center gap-3 rounded-lg border border-[#e4e6eb] p-3 transition-colors hover:bg-[#f0f2f5]"
                                            >
                                                <Avatar name={friend.name} src={friend.avatar_url} size="h-14 w-14" />
                                                <span className="truncate font-semibold text-[#1c1e21]">{friend.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-4 rounded-lg bg-[#f0f2f5] px-4 py-8 text-center text-sm text-[#65676b]">No friends to show yet.</p>
                                )}
                                {sectionFriends?.links?.length > 3 && (
                                    <nav aria-label="Friend pages" className="mt-4 flex flex-wrap justify-center gap-2">
                                        {sectionFriends.links.map((link) => link.url && (
                                            <Link
                                                key={link.label}
                                                href={link.url}
                                                preserveScroll
                                                className={`rounded-md px-3 py-2 text-sm font-semibold ${link.active ? 'bg-[#0866ff] text-white' : 'bg-white text-[#1c1e21] hover:bg-[#e4e6eb]'}`}
                                            >
                                                {link.label.replace('&laquo;', '‹').replace('&raquo;', '›')}
                                            </Link>
                                        ))}
                                    </nav>
                                )}
                            </section>
                        )}

                        {section === 'friends' && !canViewFriendsList && (
                            <section className="rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                                <h2 className="text-[20px] font-bold text-[#1c1e21]">Friends</h2>
                                <p className="mt-4 rounded-lg bg-[#f0f2f5] px-4 py-8 text-center text-sm text-[#65676b]">This friends list is private.</p>
                            </section>
                        )}

                        {section === 'photos' && canViewPhotos && (
                            <section className="rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                                <h2 className="text-[20px] font-bold text-[#1c1e21]">Photos</h2>
                                {sectionPhotos?.data?.length > 0 ? (
                                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                                        {sectionPhotos.data.map((photo) => (
                                            <button
                                                key={photo.id}
                                                type="button"
                                                onClick={() => setPreviewPhoto({ src: photo.url, alt: photo.caption ?? '' })}
                                                aria-label={`View photo${photo.caption ? `: ${photo.caption}` : ''}`}
                                                className="aspect-square overflow-hidden rounded-md bg-[#f0f2f5] outline-none hover:opacity-85 focus:ring-2 focus:ring-[#0866ff]"
                                            >
                                                <img src={photo.url} alt={photo.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-4 rounded-lg bg-[#f0f2f5] px-4 py-8 text-center text-sm text-[#65676b]">No photos to show yet.</p>
                                )}

                                {sectionPhotos?.links?.length > 3 && (
                                    <nav aria-label="Photo pages" className="mt-4 flex flex-wrap justify-center gap-2">
                                        {sectionPhotos.links.map((link) => link.url && (
                                            <Link
                                                key={link.label}
                                                href={link.url}
                                                preserveScroll
                                                className={`rounded-md px-3 py-2 text-sm font-semibold ${link.active ? 'bg-[#0866ff] text-white' : 'bg-white text-[#1c1e21] hover:bg-[#e4e6eb]'}`}
                                            >
                                                {link.label.replace('&laquo;', '‹').replace('&raquo;', '›')}
                                            </Link>
                                        ))}
                                    </nav>
                                )}
                            </section>
                        )}

                        {section === 'photos' && !canViewPhotos && (
                            <section className="rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                                <h2 className="text-[20px] font-bold text-[#1c1e21]">Photos</h2>
                                <p className="mt-4 rounded-lg bg-[#f0f2f5] px-4 py-8 text-center text-sm text-[#65676b]">Photos and videos on this profile are private.</p>
                            </section>
                        )}
                    </div>
                )}
            </div>
            {previewPhoto && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 sm:p-8"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setPreviewPhoto(null);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label={previewPhoto.alt}
                        className="relative flex max-h-[90vh] max-w-[min(96vw,1100px)] items-center justify-center"
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewPhoto(null)}
                            aria-label="Close photo preview"
                            className="absolute -right-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e6eb] text-2xl text-[#1c1e21] shadow-lg hover:bg-white sm:-right-4 sm:-top-4"
                        >
                            ×
                        </button>
                        <img src={previewPhoto.src} alt={previewPhoto.alt} className="max-h-[90vh] max-w-full rounded-md object-contain shadow-2xl" />
                    </section>
                </div>
            )}
            {photoPickerOpen && isOwnProfile && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-6"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setPhotoPickerOpen(false);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-photo-picker-title"
                        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl"
                    >
                        <header className="flex items-center justify-between border-b border-[#e4e6eb] px-4 py-3">
                            <h2 id="profile-photo-picker-title" className="text-lg font-bold text-[#1c1e21]">Update profile photo</h2>
                            <button
                                type="button"
                                onClick={() => setPhotoPickerOpen(false)}
                                aria-label="Close profile photo picker"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4e6eb] text-xl text-[#1c1e21] hover:bg-[#d8dadf]"
                            >
                                ×
                            </button>
                        </header>
                        <div className="max-h-[calc(90vh-60px)] overflow-y-auto p-4">
                            <button
                                type="button"
                                onClick={() => avatarInput.current?.click()}
                                disabled={photoProcessing}
                                className="mb-4 w-full rounded-md bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:opacity-60"
                            >
                                {photoProcessing ? 'Saving photo…' : 'Upload a new photo'}
                            </button>
                            <h3 className="mb-3 text-base font-semibold text-[#1c1e21]">Choose from gallery</h3>
                            {galleryPhotos.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {galleryPhotos.map((photo) => (
                                        <button
                                            key={photo.id}
                                            type="button"
                                            onClick={() => submitPhotoChange({ gallery_photo_id: photo.id })}
                                            disabled={photoProcessing}
                                            aria-label={`Use ${photo.caption || 'photo'} as profile photo`}
                                            className="aspect-square overflow-hidden rounded-md bg-[#f0f2f5] outline-none transition-opacity hover:opacity-80 focus:ring-2 focus:ring-[#0866ff] disabled:opacity-60"
                                        >
                                            <img src={photo.url} alt={photo.caption ?? ''} className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-lg bg-[#f0f2f5] px-4 py-6 text-center text-sm text-[#65676b]">
                                    Photos shared in your posts will appear here.
                                </p>
                            )}
                            {photoError && <p role="alert" className="mt-3 text-sm text-red-600">{photoError}</p>}
                        </div>
                    </section>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
