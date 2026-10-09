import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function GroupPostCard({ group, post, isAdmin }) {
    const currentUser = usePage().props.auth.user;
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [reportTarget, setReportTarget] = useState(null);
    const reaction = post.reactions?.[0];
    const canEdit = post.user_id === currentUser.id;
    const canDelete = canEdit || isAdmin;
    const reactionForm = useForm({ type: reaction?.type ?? 'like' });
    const commentForm = useForm({ body: '' });
    const editForm = useForm({ content: post.content ?? '' });
    const reportForm = useForm({ reason: 'spam', details: '' });

    function toggleReaction() {
        reactionForm.setData('type', reaction?.type ?? 'like');
        reactionForm.post(route('groups.posts.reactions.store', [group.id, post.id]), {
            preserveScroll: true,
        });
    }

    function submitComment(event) {
        event.preventDefault();

        commentForm.post(route('groups.posts.comments.store', [group.id, post.id]), {
            preserveScroll: true,
            onSuccess: () => {
                commentForm.reset('body');
                setCommentsOpen(true);
            },
        });
    }

    function submitEdit(event) {
        event.preventDefault();

        editForm.patch(route('groups.posts.update', [group.id, post.id]), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    }

    function deletePost() {
        if (window.confirm('Delete this group post? This cannot be undone.')) {
            router.delete(route('groups.posts.destroy', [group.id, post.id]), {
                preserveScroll: true,
            });
        }
    }

    function submitReport(event) {
        event.preventDefault();

        const endpoint = reportTarget.kind === 'post'
            ? route('groups.posts.reports.store', [group.id, post.id])
            : route('groups.posts.comments.reports.store', [group.id, post.id, reportTarget.id]);

        reportForm.post(endpoint, {
            preserveScroll: true,
            onSuccess: () => {
                reportForm.reset();
                setReportTarget(null);
            },
        });
    }

    function toggleReport(target) {
        setReportTarget((current) => (
            current?.kind === target.kind && current?.id === target.id ? null : target
        ));
        setCommentsOpen(true);
        reportForm.clearErrors();
    }

    return (
        <article id={`group-post-${post.id}`} className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-3 p-4">
                <Avatar name={post.user.name} src={post.user.profile?.avatar_url} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1c1e21]">{post.user.name}</p>
                    <p className="text-xs text-[#65676b]">{new Date(post.created_at).toLocaleString()}</p>
                </div>
                {(canDelete || !canEdit) && (
                    <div className="flex items-center gap-1">
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => setEditing((value) => !value)}
                                className="rounded-md px-3 py-2 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5]"
                            >
                                {editing ? 'Cancel' : 'Edit'}
                            </button>
                        )}
                        {canDelete && (
                            <button
                                type="button"
                                onClick={deletePost}
                                className="rounded-md px-3 py-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff1f0]"
                            >
                                Delete
                            </button>
                        )}
                        {!canEdit && (
                            <button
                                type="button"
                                onClick={() => toggleReport({ kind: 'post', id: post.id })}
                                className="rounded-md px-3 py-2 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5]"
                            >
                                Report
                            </button>
                        )}
                    </div>
                )}
            </div>
            {editing ? (
                <form onSubmit={submitEdit} className="space-y-2 px-4 pb-4">
                    <textarea
                        value={editForm.data.content}
                        onChange={(event) => editForm.setData('content', event.target.value)}
                        maxLength="2000"
                        rows="3"
                        aria-label="Edit group post"
                        className="w-full resize-y rounded-lg border-0 bg-[#f0f2f5] px-4 py-3 text-sm focus:ring-2 focus:ring-[#0866ff]"
                    />
                    {editForm.errors.content && <p className="text-sm text-red-600">{editForm.errors.content}</p>}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={editForm.processing || (!editForm.data.content.trim() && !post.image_path)}
                            className="rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:opacity-60"
                        >
                            {editForm.processing ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            ) : (
                post.content && <p className="whitespace-pre-wrap px-4 pb-1 text-[15px] leading-6 text-[#1c1e21]">{post.content}</p>
            )}
            {post.image_url && (
                <img
                    src={post.image_url}
                    alt={`Image shared by ${post.user.name}`}
                    className="mt-3 max-h-[640px] w-full bg-[#f0f2f5] object-contain"
                />
            )}
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
            <div className="grid grid-cols-2 gap-1 px-2 py-1">
                <button
                    type="button"
                    onClick={toggleReaction}
                    disabled={reactionForm.processing}
                    aria-pressed={Boolean(reaction)}
                    className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold hover:bg-[#f0f2f5] disabled:cursor-wait ${reaction ? 'text-[#0866ff]' : 'text-[#65676b]'}`}
                >
                    <SocialIcon name="like" className="h-5 w-5" />
                    {reaction ? 'Liked' : 'Like'}
                </button>
                <button
                    type="button"
                    onClick={() => setCommentsOpen((open) => !open)}
                    aria-expanded={commentsOpen}
                    className="flex items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5]"
                >
                    <SocialIcon name="comment" className="h-5 w-5" />
                    Comment
                </button>
            </div>
            {commentsOpen && (
                <section aria-label="Group post comments" className="space-y-3 border-t border-[#e4e6eb] px-4 py-3">
                    {post.comments?.length ? (
                        <div className="space-y-3">
                            {post.comments.map((comment) => (
                                <div key={comment.id} className="flex items-start gap-2">
                                    <Avatar name={comment.user?.name} src={comment.user?.profile?.avatar_url} />
                                    <div className="min-w-0 flex-1">
                                        <div className="inline-block max-w-full rounded-2xl bg-[#f0f2f5] px-3 py-2">
                                            <p className="text-xs font-semibold text-[#1c1e21]">{comment.user?.name ?? 'Nexora user'}</p>
                                            <p className="whitespace-pre-wrap break-words text-sm text-[#1c1e21]">{comment.body}</p>
                                        </div>
                                        <div className="mt-1 flex gap-3 px-2">
                                            {comment.user_id !== currentUser.id && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleReport({ kind: 'comment', id: comment.id })}
                                                    className="text-xs font-semibold text-[#65676b] hover:underline"
                                                >
                                                    Report
                                                </button>
                                            )}
                                            {isAdmin && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm('Remove this comment from the group?')) {
                                                            router.delete(route('groups.posts.comments.destroy', [group.id, post.id, comment.id]), { preserveScroll: true });
                                                        }
                                                    }}
                                                    className="text-xs font-semibold text-[#b42318] hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {post.comments_count > post.comments.length && (
                                <p className="text-xs text-[#65676b]">Showing the latest {post.comments.length} comments.</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-[#65676b]">No comments yet. Start the conversation.</p>
                    )}
                    <form onSubmit={submitComment} className="flex items-start gap-2">
                        <Avatar name={currentUser.name} src={currentUser.profile?.avatar_url} />
                        <div className="min-w-0 flex-1">
                            <textarea
                                value={commentForm.data.body}
                                onChange={(event) => commentForm.setData('body', event.target.value)}
                                rows="1"
                                maxLength="1000"
                                aria-label="Write a group post comment"
                                placeholder="Write a comment..."
                                className="min-h-10 w-full resize-y rounded-2xl border-0 bg-[#f0f2f5] px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0866ff]"
                            />
                            {commentForm.errors.body && <p className="mt-1 text-sm text-red-600">{commentForm.errors.body}</p>}
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={commentForm.processing || !commentForm.data.body.trim()}
                                    className="rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:bg-[#e4e6eb] disabled:text-[#65676b]"
                                >
                                    {commentForm.processing ? 'Posting…' : 'Comment'}
                                </button>
                            </div>
                        </div>
                    </form>
                    {reportTarget && (
                        <form onSubmit={submitReport} className="space-y-2 rounded-lg border border-[#e4e6eb] bg-[#f7f8fa] p-3">
                            <p className="text-sm font-semibold text-[#1c1e21]">Report this {reportTarget.kind}</p>
                            <label className="block text-xs font-semibold text-[#65676b]">
                                Reason
                                <select
                                    value={reportForm.data.reason}
                                    onChange={(event) => reportForm.setData('reason', event.target.value)}
                                    className="mt-1 block w-full rounded-md border-[#ccd0d5] bg-white text-sm"
                                >
                                    <option value="spam">Spam</option>
                                    <option value="harassment">Harassment</option>
                                    <option value="inappropriate">Inappropriate content</option>
                                    <option value="misinformation">Misinformation</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>
                            <textarea
                                value={reportForm.data.details}
                                onChange={(event) => reportForm.setData('details', event.target.value)}
                                rows="2"
                                maxLength="500"
                                aria-label="Report details"
                                placeholder="Add context for the group admins (optional)"
                                className="w-full rounded-md border-[#ccd0d5] bg-white text-sm"
                            />
                            {reportForm.errors.reason && <p className="text-sm text-red-600">{reportForm.errors.reason}</p>}
                            {reportForm.errors.details && <p className="text-sm text-red-600">{reportForm.errors.details}</p>}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setReportTarget(null)} className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#65676b] hover:bg-[#e4e6eb]">
                                    Cancel
                                </button>
                                <button type="submit" disabled={reportForm.processing} className="rounded-md bg-[#0866ff] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:opacity-60">
                                    {reportForm.processing ? 'Sending…' : 'Send report'}
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            )}
        </article>
    );
}
