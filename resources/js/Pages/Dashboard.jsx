import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import PostEngagement from '@/Components/PostEngagement';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function StoriesTray({ stories = [], user }) {
    const fileInput = useRef(null);
    const [activeStory, setActiveStory] = useState(null);
    const [preview, setPreview] = useState('');
    const { data, setData, post, processing, progress, reset, errors } = useForm({
        file: null,
        caption: '',
    });

    useEffect(() => {
        if (!data.file) {
            setPreview('');
            return undefined;
        }

        const objectUrl = URL.createObjectURL(data.file);
        setPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [data.file]);

    useEffect(() => {
        if (!activeStory && !data.file) {
            return undefined;
        }

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setActiveStory(null);
                setData('file', null);
                reset('caption');
            }
        };
        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [activeStory, data.file, reset, setData]);

    const submitStory = (event) => {
        event.preventDefault();
        post(route('stories.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                if (fileInput.current) {
                    fileInput.current.value = '';
                }
            },
        });
    };

    return (
        <>
            <section aria-labelledby="stories-heading" className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                    <div>
                        <h2 id="stories-heading" className="text-[17px] font-semibold text-[#1c1e21]">Stories</h2>
                        <p className="text-sm text-[#65676b]">Photos and videos disappear after 24 hours</p>
                    </div>
                </div>
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/x-m4v"
                    className="hidden"
                    aria-label="Choose a photo or video for your story"
                    onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (file) {
                            setData({ file, caption: '' });
                        }
                    }}
                />
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        className="relative flex h-44 w-28 shrink-0 flex-col overflow-hidden rounded-xl border border-[#e4e6eb] bg-white text-left transition-colors hover:bg-[#f0f2f5] sm:h-48 sm:w-32"
                    >
                        <span className="flex min-h-0 flex-1 items-center justify-center bg-gradient-to-br from-[#dbeafe] via-[#eef2ff] to-[#f3e8ff]">
                            <Avatar name={user.name} src={user.profile?.avatar_url} size="h-14 w-14" />
                        </span>
                        <span className="relative flex h-12 items-end justify-center bg-white pb-2 text-center text-[13px] font-semibold text-[#1c1e21]">
                            <span className="absolute -top-4 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-[#0866ff] text-white">
                                <SocialIcon name="plus" className="h-4 w-4" />
                            </span>
                            Create story
                        </span>
                    </button>
                    {stories.map((story) => (
                        <button
                            key={story.id}
                            type="button"
                            onClick={() => setActiveStory(story)}
                            aria-label={`View ${story.user.name}'s story`}
                            className="relative flex h-44 w-28 shrink-0 overflow-hidden rounded-xl bg-[#242526] text-left transition-transform hover:scale-[1.02] sm:h-48 sm:w-32"
                        >
                            {story.media?.type === 'image' ? (
                                <img src={story.media.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1877f2] to-[#6252d9]">
                                    <SocialIcon name="play" className="h-10 w-10 text-white" />
                                </div>
                            )}
                            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/10" />
                            <span className="absolute left-2 top-2 rounded-full border-[3px] border-[#0866ff]">
                                <Avatar name={story.user.name} src={story.user.profile?.avatar_url} size="h-9 w-9" />
                            </span>
                            <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-[13px] font-semibold text-white">{story.user.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            {(activeStory || data.file) && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 sm:p-6"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setActiveStory(null);
                            setData('file', null);
                            reset('caption');
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label={data.file ? 'Create a story' : `${activeStory?.user.name}'s story`}
                        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                    >
                        <header className="flex items-center justify-between gap-3 border-b border-[#e4e6eb] p-3">
                            <div className="flex min-w-0 items-center gap-2">
                                {data.file ? (
                                    <>
                                        <Avatar name={user.name} src={user.profile?.avatar_url} size="h-9 w-9" />
                                        <h2 className="truncate text-[15px] font-semibold text-[#1c1e21]">Create a story</h2>
                                    </>
                                ) : (
                                    <>
                                        <Avatar name={activeStory.user.name} src={activeStory.user.profile?.avatar_url} size="h-9 w-9" />
                                        <div className="min-w-0">
                                            <h2 className="truncate text-[15px] font-semibold text-[#1c1e21]">{activeStory.user.name}</h2>
                                            <time className="block text-xs text-[#65676b]">{new Date(activeStory.created_at).toLocaleString()}</time>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveStory(null);
                                    setData('file', null);
                                    reset('caption');
                                }}
                                aria-label="Close story"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e4e6eb] text-xl text-[#1c1e21] hover:bg-[#d8dadf]"
                            >
                                ×
                            </button>
                        </header>
                        {data.file ? (
                            <form onSubmit={submitStory} className="flex min-h-0 flex-col">
                                <div className="flex max-h-[55vh] min-h-64 items-center justify-center bg-[#18191a]">
                                    {data.file.type.startsWith('image/') ? (
                                        <img src={preview} alt="Story preview" className="max-h-[55vh] w-full object-contain" />
                                    ) : (
                                        <video src={preview} controls className="max-h-[55vh] w-full object-contain" />
                                    )}
                                </div>
                                <div className="space-y-3 p-4">
                                    <input
                                        type="text"
                                        maxLength="500"
                                        value={data.caption}
                                        onChange={(event) => setData('caption', event.target.value)}
                                        placeholder="Add a caption to your story"
                                        aria-label="Story caption"
                                        className="w-full rounded-lg border-[#ccd0d5] bg-[#f7f8fa] text-sm focus:border-[#0866ff] focus:ring-[#0866ff]"
                                    />
                                    {errors.file && <p role="alert" className="text-sm text-red-600">{errors.file}</p>}
                                    {errors.caption && <p role="alert" className="text-sm text-red-600">{errors.caption}</p>}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full rounded-md bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {processing ? `Sharing ${progress?.percentage ?? 0}%` : 'Share to story'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="flex max-h-[75vh] min-h-64 items-center justify-center bg-[#18191a]">
                                    {activeStory.media.type === 'image' ? (
                                        <img src={activeStory.media.url} alt={activeStory.caption ?? `${activeStory.user.name}'s story`} className="max-h-[75vh] w-full object-contain" />
                                    ) : (
                                        <video src={activeStory.media.url} controls autoPlay className="max-h-[75vh] w-full object-contain" />
                                    )}
                                </div>
                                {activeStory.caption && <p className="p-4 text-[15px] text-[#1c1e21]">{activeStory.caption}</p>}
                            </>
                        )}
                    </section>
                </div>
            )}
        </>
    );
}

export default function Dashboard({ posts = { data: [], links: [] }, stories = [], profile, filters = {}, friendCount = 0, followingCount = 0, followerCount = 0 }) {
    const user = usePage().props.auth.user;
    const fileInput = useRef(null);
    const [mediaPreview, setMediaPreview] = useState('');
    const { data, setData, post, processing, progress, reset, errors } = useForm({
        content: '',
        visibility: 'public',
        file: null,
        caption: '',
    });

    useEffect(() => {
        if (!data.file) {
            setMediaPreview('');
            return undefined;
        }

        const objectUrl = URL.createObjectURL(data.file);
        setMediaPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [data.file]);

    const submit = (event) => {
        event.preventDefault();
        post(route('posts.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('content', 'file', 'caption');
                if (fileInput.current) {
                    fileInput.current.value = '';
                }
            },
        });
    };

    const visibilityFilters = [
        { label: 'All posts', value: 'all' },
        { label: 'Public', value: 'public' },
        { label: 'Friends', value: 'friends' },
        { label: 'Only me', value: 'only_me' },
    ];

    const postCount = posts.data?.length ?? 0;
    const applyFilter = (visibility) => {
        router.get(route('dashboard'), {
            search: filters.search || undefined,
            visibility: visibility === 'all' ? undefined : visibility,
        }, {
            preserveScroll: true,
        });
    };
    const deletePost = (postId) => {
        if (window.confirm('Delete this post? Your profile and cover photos will stay saved.')) {
            router.delete(route('posts.destroy', postId), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Home" />

            <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-[1600px] grid-cols-1 gap-5 px-3 pt-5 sm:px-5 lg:grid-cols-[minmax(180px,1fr)_minmax(480px,680px)_minmax(180px,1fr)] lg:gap-6">
                <aside className="sticky top-[72px] hidden h-[calc(100vh-80px)] overflow-y-auto pb-4 lg:block">
                    <div className="space-y-1">
                        <Link href={route('profile.show')} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#e4e6e9]">
                            <Avatar name={user.name} src={user.profile?.avatar_url} size="h-9 w-9" />
                            <span className="truncate text-[15px] font-medium">{user.name}</span>
                        </Link>
                        <Link href={route('friends.index')} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#e4e6e9]">
                            <span className="flex h-9 w-9 items-center justify-center text-[#0866ff]"><SocialIcon name="friends" /></span>
                            <span className="text-[15px] font-medium">Friends <span className="text-[#65676b]">· {friendCount}</span></span>
                        </Link>
                        <Link href={route('groups.index')} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#e4e6e9]">
                            <span className="flex h-9 w-9 items-center justify-center text-[#0866ff]"><SocialIcon name="people" /></span>
                            <span className="text-[15px] font-medium">Groups</span>
                        </Link>
                        <Link href={route('messages.index')} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#e4e6e9]">
                            <span className="flex h-9 w-9 items-center justify-center text-[#0866ff]"><SocialIcon name="messages" /></span>
                            <span className="text-[15px] font-medium">Messages</span>
                        </Link>
                        <Link href={route('notifications.index')} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#e4e6e9]">
                            <span className="flex h-9 w-9 items-center justify-center text-[#0866ff]"><SocialIcon name="bell" /></span>
                            <span className="text-[15px] font-medium">Notifications</span>
                        </Link>
                    </div>
                    <div className="mx-2 my-3 border-t border-[#ced0d4]" />
                    <div className="flex items-center justify-between px-2 pb-2">
                        <h2 className="text-[17px] font-semibold text-[#65676b]">Your shortcuts</h2>
                        <Link href={route('profile.edit')} className="rounded-md px-2 py-1 text-sm font-medium text-[#0866ff] hover:bg-[#e4e6eb]">Edit</Link>
                    </div>
                    <Link href={route('profile.edit')} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#e4e6e9]">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#65676b]"><SocialIcon name="bookmark" /></span>
                        <span className="text-[15px] font-medium">Profile settings</span>
                    </Link>
                    <p className="px-2 pt-4 text-xs leading-5 text-[#65676b]">Privacy · Terms · Advertising · Cookies · Nexora © 2026</p>
                </aside>

                <section className="mx-auto w-full max-w-[680px] space-y-4 pb-8">
                    <div className="rounded-xl bg-white px-4 pt-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                        <form onSubmit={submit}>
                            <div className="flex items-center gap-2 pb-3">
                                <Avatar name={user.name} src={user.profile?.avatar_url} size="h-10 w-10" />
                                <textarea
                                    value={data.content}
                                    onChange={(event) => setData('content', event.target.value)}
                                    rows="1"
                                    aria-label="Create a post"
                                    className="min-h-10 flex-1 resize-y rounded-full border-0 bg-[#f0f2f5] px-4 py-[10px] text-[17px] leading-5 text-[#1c1e21] placeholder:text-[#65676b] hover:bg-[#e4e6eb] focus:bg-white focus:ring-2 focus:ring-[#0866ff]"
                                    placeholder={`What's on your mind, ${user.name.split(' ')[0]}?`}
                                />
                            </div>
                            <input
                                ref={fileInput}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/x-m4v"
                                className="hidden"
                                onChange={(event) => setData('file', event.target.files?.[0] ?? null)}
                            />
                            {data.file && (
                                <div className="mb-3 ml-12 space-y-2 rounded-lg border border-[#e4e6eb] p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-medium text-[#1c1e21]">{data.file.name}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData('file', null);
                                                if (fileInput.current) {
                                                    fileInput.current.value = '';
                                                }
                                            }}
                                            className="rounded-md px-2 py-1 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5]"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    {data.file.type.startsWith('image/') ? (
                                        <img src={mediaPreview} alt="Selected upload preview" className="max-h-64 w-full rounded-md object-contain" />
                                    ) : (
                                        <video src={mediaPreview} controls className="max-h-64 w-full rounded-md bg-black object-contain" />
                                    )}
                                    <input
                                        type="text"
                                        maxLength="500"
                                        value={data.caption}
                                        onChange={(event) => setData('caption', event.target.value)}
                                        placeholder="Add a caption (optional)"
                                        aria-label="Media caption"
                                        className="w-full rounded-lg border-[#ccd0d5] bg-[#f7f8fa] text-sm focus:border-[#0866ff] focus:ring-[#0866ff]"
                                    />
                                    {errors.caption && <p className="text-sm text-red-600">{errors.caption}</p>}
                                </div>
                            )}
                            {errors.file && <p className="mb-2 ml-12 text-sm text-red-600">{errors.file}</p>}
                            {errors.content && <p className="pb-2 pl-12 text-sm text-red-600">{errors.content}</p>}
                            <div className="flex items-center justify-between gap-3 border-t border-[#e4e6eb] py-3">
                                <label className="flex items-center gap-2 text-sm text-[#65676b]">
                                    <SocialIcon name="globe" className="h-4 w-4" />
                                    <span className="sr-only">Post audience</span>
                                    <select
                                        value={data.visibility}
                                        onChange={(event) => setData('visibility', event.target.value)}
                                        className="border-0 bg-transparent py-1 pl-0 pr-6 text-sm font-medium text-[#65676b] focus:ring-0"
                                    >
                                        <option value="public">Public</option>
                                        <option value="friends">Friends</option>
                                        <option value="only_me">Only me</option>
                                    </select>
                                </label>
                                <button
                                    type="submit"
                                    disabled={processing || (!data.content.trim() && !data.file)}
                                    className="rounded-md bg-[#0866ff] px-5 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:bg-[#e4e6eb] disabled:text-[#bcc0c4]"
                                >
                                    {processing ? `${progress?.percentage ?? 0}%` : 'Post'}
                                </button>
                            </div>
                            <div className="border-t border-[#e4e6eb] py-1">
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#65676b] transition-colors hover:bg-[#f0f2f5]"
                                >
                                    <SocialIcon name="photo" className="h-6 w-6 text-[#45bd62]" />
                                    <span>Photo/video</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <StoriesTray stories={stories} user={{ ...user, profile }} />

                    <div className="flex items-center justify-between px-1 pt-1">
                        <h2 className="text-[17px] font-semibold text-[#65676b]">Posts</h2>
                        <details className="relative">
                            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md bg-[#e4e6eb] px-3 py-1.5 text-sm font-medium text-[#1c1e21] hover:bg-[#d8dadf] [&::-webkit-details-marker]:hidden">
                                <SocialIcon name="menu" className="h-4 w-4" />
                                {visibilityFilters.find((filter) => filter.value === (filters.visibility ?? 'all'))?.label ?? 'Filters'}
                            </summary>
                            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg bg-white p-2 shadow-lg ring-1 ring-black/10">
                                {visibilityFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        type="button"
                                        onClick={() => applyFilter(filter.value)}
                                        className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-[#f0f2f5] ${(filters.visibility ?? 'all') === filter.value ? 'text-[#0866ff]' : 'text-[#1c1e21]'}`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </details>
                    </div>

                    {postCount === 0 ? (
                        <div className="rounded-xl bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f2f5] text-[#65676b]"><SocialIcon name="people" /></div>
                            <h3 className="font-semibold text-[#1c1e21]">
                                {filters.search ? 'No matching posts' : filters.visibility && filters.visibility !== 'all' ? 'No posts in this audience' : 'Your feed is just getting started'}
                            </h3>
                            <p className="mt-1 text-sm text-[#65676b]">
                                {filters.search ? 'Try another search term.' : filters.visibility && filters.visibility !== 'all' ? 'Choose another feed filter to see more posts.' : 'When people share posts, you’ll see them here.'}
                            </p>
                        </div>
                    ) : (
                        posts.data.map((item) => {
                            const author = item.user?.name ?? 'Unknown user';
                            const audience = item.visibility === 'only_me' ? 'Only me' : item.visibility === 'friends' ? 'Friends' : 'Public';

                            return (
                                <article id={`post-${item.id}`} key={item.id} className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                                    <div className="flex items-start justify-between gap-3 px-4 pb-0 pt-4">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Link
                                                href={route('users.show', item.user.id)}
                                                aria-label={`View ${author}'s profile`}
                                                className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0866ff] focus:ring-offset-2"
                                            >
                                                <Avatar name={author} src={item.user?.profile?.avatar_url} size="h-10 w-10" />
                                            </Link>
                                            <div className="min-w-0">
                                                <Link
                                                    href={route('users.show', item.user.id)}
                                                    className="block w-fit max-w-full truncate text-[15px] font-semibold text-[#050505] hover:underline"
                                                >
                                                    {author}
                                                </Link>
                                                <div className="flex items-center gap-1 text-xs text-[#65676b]">
                                                    <span>{new Date(item.created_at).toLocaleString()}</span>
                                                    <span aria-hidden="true">·</span>
                                                    <SocialIcon name={item.visibility === 'public' ? 'globe' : 'friends'} className="h-3.5 w-3.5" />
                                                    <span className="sr-only">{audience}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {item.user?.id === user.id && (
                                            <button
                                                type="button"
                                                onClick={() => deletePost(item.id)}
                                                className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#b42318]"
                                                aria-label="Delete post"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>

                                    {item.content && <p className="whitespace-pre-wrap px-4 pb-4 pt-3 text-[15px] leading-[1.4] text-[#050505]">{item.content}</p>}
                                    {item.media_assets?.length > 0 && (
                                        <div className="grid gap-1">
                                            {item.media_assets.map((asset) => asset.type === 'image' ? (
                                                <img key={asset.id} src={asset.url} alt={asset.caption ?? ''} className="max-h-[520px] w-full object-cover" loading="lazy" />
                                            ) : (
                                                <video key={asset.id} src={asset.url} controls preload="metadata" className="max-h-[520px] w-full bg-black object-contain" />
                                            ))}
                                            {item.media_assets.some((asset) => asset.caption) && (
                                                <p className="px-4 py-2 text-sm text-[#65676b]">{item.media_assets.find((asset) => asset.caption)?.caption}</p>
                                            )}
                                        </div>
                                    )}
                                    <PostEngagement post={item} />
                                </article>
                            );
                        })
                    )}
                    {posts.links?.length > 3 && (
                        <nav aria-label="Feed pages" className="flex flex-wrap justify-center gap-2">
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
                </section>

                <aside className="sticky top-[72px] hidden h-[calc(100vh-80px)] overflow-y-auto pb-4 lg:block">
                    <div className="px-1 pb-2">
                        <h2 className="text-[17px] font-semibold text-[#65676b]">Your connections</h2>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 rounded-lg p-2">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]"><SocialIcon name="friends" /></span>
                            <div>
                                <p className="text-sm font-medium text-[#1c1e21]">Friends</p>
                                <p className="text-xs text-[#65676b]">{friendCount} connections</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg p-2">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]"><SocialIcon name="people" /></span>
                            <div>
                                <p className="text-sm font-medium text-[#1c1e21]">Following</p>
                                <p className="text-xs text-[#65676b]">{followingCount} people</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg p-2">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]"><SocialIcon name="people" /></span>
                            <div>
                                <p className="text-sm font-medium text-[#1c1e21]">Followers</p>
                                <p className="text-xs text-[#65676b]">{followerCount} people</p>
                            </div>
                        </div>
                    </div>

                    <div className="mx-2 my-3 border-t border-[#ced0d4]" />
                    <div className="px-1">
                        <h2 className="pb-2 text-[17px] font-semibold text-[#65676b]">Keep in touch</h2>
                        <Link href={route('messages.index')} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#e4e6e9]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]"><SocialIcon name="messages" /></span>
                            <span>
                                <span className="block text-sm font-medium text-[#1c1e21]">Open Messenger</span>
                                <span className="block text-xs text-[#65676b]">Continue a conversation</span>
                            </span>
                        </Link>
                    </div>
                    <div className="mx-2 my-3 border-t border-[#ced0d4]" />
                    <p className="px-2 text-xs leading-5 text-[#65676b]">Nexora · Privacy · Terms · Community Standards · © 2026</p>
                </aside>
            </div>
        </AuthenticatedLayout>
    );
}
