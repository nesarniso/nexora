import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function PostEngagement({ post }) {
    const currentUser = usePage().props.auth.user;
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [shareMessage, setShareMessage] = useState('');
    const [shareUrl, setShareUrl] = useState('');
    const reaction = post.reactions?.[0];
    const { post: submitReaction, processing: reacting } = useForm({ type: 'like' });
    const { data, setData, post: submitComment, processing, errors, reset } = useForm({
        body: '',
    });

    const toggleLike = () => {
        submitReaction(route('posts.reactions.store', post.id), {
            preserveScroll: true,
        });
    };

    const comment = (event) => {
        event.preventDefault();

        submitComment(route('posts.comments.store', post.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset('body');
                setCommentsOpen(true);
            },
        });
    };

    const share = async () => {
        const url = new URL(window.location.href);
        url.hash = `post-${post.id}`;

        try {
            await navigator.clipboard.writeText(url.toString());
            setShareUrl('');
            setShareMessage('Post link copied.');
        } catch {
            setShareMessage('Copy this post link:');
            setShareUrl(url.toString());
        }
    };

    return (
        <>
            <div className="mx-4 flex items-center justify-between border-b border-[#ced0d4] py-2 text-[13px] text-[#65676b]">
                <span>{post.reactions_count ?? 0} reactions</span>
                <button
                    type="button"
                    onClick={() => setCommentsOpen((open) => !open)}
                    className="hover:underline"
                >
                    {post.comments_count ?? 0} comments
                </button>
            </div>
            <div className="grid grid-cols-3 gap-1 px-2 py-1">
                <button
                    type="button"
                    onClick={toggleLike}
                    disabled={reacting}
                    aria-pressed={Boolean(reaction)}
                    className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors hover:bg-[#f0f2f5] disabled:cursor-wait ${reaction ? 'text-[#0866ff]' : 'text-[#65676b]'}`}
                >
                    <SocialIcon name="like" className="h-5 w-5" />
                    {reaction ? 'Liked' : 'Like'}
                </button>
                <button
                    type="button"
                    onClick={() => setCommentsOpen((open) => !open)}
                    aria-expanded={commentsOpen}
                    className="flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-[#65676b] transition-colors hover:bg-[#f0f2f5]"
                >
                    <SocialIcon name="comment" className="h-5 w-5" />
                    Comment
                </button>
                <button
                    type="button"
                    onClick={share}
                    className="flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-[#65676b] transition-colors hover:bg-[#f0f2f5]"
                >
                    <SocialIcon name="share" className="h-5 w-5" />
                    Share
                </button>
            </div>
            {shareMessage && (
                <div role="status" className="mx-4 mb-2 text-sm text-[#65676b]">
                    {shareMessage}
                    {shareUrl && (
                        <input
                            readOnly
                            aria-label="Post link"
                            value={shareUrl}
                            onFocus={(event) => event.target.select()}
                            className="mt-1 block w-full rounded-md border-[#ccd0d5] bg-[#f7f8fa] text-sm"
                        />
                    )}
                </div>
            )}
            {commentsOpen && (
                <section aria-label="Post comments" className="space-y-3 border-t border-[#e4e6eb] px-4 py-3">
                    {post.comments?.length ? (
                        <div className="space-y-3">
                            {post.comments.map((commentItem) => (
                                <div key={commentItem.id} className="flex items-start gap-2">
                                    <Avatar
                                        name={commentItem.user?.name}
                                        src={commentItem.user?.profile?.avatar_url}
                                    />
                                    <div className="min-w-0 rounded-2xl bg-[#f0f2f5] px-3 py-2">
                                        <p className="text-xs font-semibold text-[#1c1e21]">{commentItem.user?.name ?? 'Nexora user'}</p>
                                        <p className="whitespace-pre-wrap break-words text-sm text-[#1c1e21]">{commentItem.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[#65676b]">No comments yet. Start the conversation.</p>
                    )}
                    <form onSubmit={comment} className="flex items-start gap-2">
                        <Avatar name={currentUser.name} src={currentUser.profile?.avatar_url} />
                        <div className="min-w-0 flex-1">
                            <textarea
                                value={data.body}
                                onChange={(event) => setData('body', event.target.value)}
                                rows="1"
                                maxLength="1000"
                                aria-label="Write a comment"
                                placeholder="Write a comment..."
                                className="min-h-10 w-full resize-y rounded-2xl border-0 bg-[#f0f2f5] px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0866ff]"
                            />
                            {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body}</p>}
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={processing || !data.body.trim()}
                                    className="rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:bg-[#e4e6eb] disabled:text-[#65676b]"
                                >
                                    {processing ? 'Posting…' : 'Comment'}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
            )}
        </>
    );
}
