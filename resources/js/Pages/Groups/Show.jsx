import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import GroupPostCard from '@/Components/GroupPostCard';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Show({ group, membership, isMember, isInvited, isAdmin, pendingMemberCount, members, pendingMembers, inviteableFriends, openReports, posts }) {
    const form = useForm({ content: '', image: null });
    const inviteForm = useForm({ user_id: '' });
    const coverInputRef = useRef(null);
    const postImageInputRef = useRef(null);
    const [postImagePreview, setPostImagePreview] = useState('');
    const [groupTab, setGroupTab] = useState('discussion');
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteSearch, setInviteSearch] = useState('');
    const matchingFriends = inviteableFriends.filter((friend) => friend.name.toLowerCase().includes(inviteSearch.trim().toLowerCase()));

    useEffect(() => {
        if (!form.data.image) {
            setPostImagePreview('');

            return undefined;
        }

        const previewUrl = URL.createObjectURL(form.data.image);
        setPostImagePreview(previewUrl);

        return () => URL.revokeObjectURL(previewUrl);
    }, [form.data.image]);

    const createPost = (event) => {
        event.preventDefault();
        form.post(route('groups.posts.store', group.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                if (postImageInputRef.current) {
                    postImageInputRef.current.value = '';
                }
            },
        });
    };

    const inviteFriend = (event) => {
        event.preventDefault();
        inviteForm.post(route('groups.invitations.store', group.id), {
            preserveScroll: true,
            onSuccess: () => {
                inviteForm.reset();
                setInviteDialogOpen(false);
                setInviteSearch('');
            },
        });
    };

    const handleCoverUpload = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('cover', file);

        router.post(route('groups.cover.update', group.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                event.target.value = '';
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`${group.name} · Groups`} />
            <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-[1600px] grid-cols-1 gap-5 px-3 pt-5 sm:px-5 lg:grid-cols-[minmax(180px,1fr)_minmax(0,680px)_minmax(180px,1fr)] lg:gap-6">
                <aside className="h-fit space-y-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-80px)] lg:overflow-y-auto lg:pb-4">
                    <section className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                        <Link href={route('groups.index')} className="flex items-center gap-3 rounded-lg p-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]"><SocialIcon name="people" className="h-5 w-5" /></span>
                            All groups
                        </Link>
                        <div className="mt-3 border-t border-[#e4e6eb] pt-3">
                            <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-[#65676b]">Group sections</h2>
                            <nav aria-label="Group sections" className="mt-2 space-y-1">
                                {[
                                    { id: 'discussion', label: 'Discussion', icon: 'messages' },
                                    { id: 'members', label: `Members · ${group.member_count}`, icon: 'friends' },
                                    { id: 'about', label: 'About', icon: group.privacy === 'public' ? 'globe' : 'lock' },
                                    ...(isAdmin ? [{ id: 'moderation', label: `Moderation · ${openReports.length}`, icon: 'shield' }] : []),
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setGroupTab(tab.id)}
                                        aria-current={groupTab === tab.id ? 'page' : undefined}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${groupTab === tab.id ? 'bg-[#e7f3ff] text-[#0866ff]' : 'text-[#1c1e21] hover:bg-[#f0f2f5]'}`}
                                    >
                                        <SocialIcon name={tab.icon} className="h-5 w-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </section>

                    {isAdmin && (
                        <section className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-5">
                            <div className="flex items-center gap-2">
                                <SocialIcon name="settings" className="h-5 w-5 text-[#65676b]" />
                                <h2 className="text-base font-bold text-[#1c1e21]">Admin tools</h2>
                            </div>
                            <div className="mt-3 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setInviteDialogOpen(true)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]"
                                >
                                    <SocialIcon name="friends" className="h-5 w-5 text-[#65676b]" />
                                    Invite friends
                                </button>
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]"
                                >
                                    <SocialIcon name="camera" className="h-5 w-5 text-[#65676b]" />
                                    Change cover photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGroupTab('members')}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]"
                                >
                                    <SocialIcon name="shield" className="h-5 w-5 text-[#65676b]" />
                                    Manage members
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGroupTab('moderation')}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#1c1e21] hover:bg-[#f0f2f5]"
                                >
                                    <span className="flex items-center gap-3">
                                        <SocialIcon name="shield" className="h-5 w-5 text-[#65676b]" />
                                        Review reports
                                    </span>
                                    {openReports.length > 0 && <span className="rounded-full bg-[#fff4d6] px-2 py-0.5 text-xs text-[#765b00]">{openReports.length}</span>}
                                </button>
                            </div>
                            {pendingMemberCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setGroupTab('members')}
                                    className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg bg-[#fff4d6] px-3 py-2.5 text-left text-sm font-semibold text-[#765b00] hover:bg-[#ffedbd]"
                                >
                                    <span>Membership requests</span>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-xs">{pendingMemberCount}</span>
                                </button>
                            )}
                        </section>
                    )}

                    {isAdmin && pendingMembers.length > 0 && (
                        <section className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <h2 className="text-base font-bold text-[#1c1e21]">Pending requests</h2>
                            <div className="mt-3 space-y-3">
                                {pendingMembers.map((member) => (
                                    <div key={member.id} className="flex items-center gap-2">
                                        <Avatar name={member.name} src={member.avatar_url} />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1c1e21]">{member.name}</span>
                                        <button type="button" onClick={() => router.patch(route('groups.members.moderate', [group.id, member.id]), { action: 'approve' }, { preserveScroll: true })} aria-label={`Approve ${member.name}`} className="rounded-md bg-[#0866ff] px-2 py-1 text-xs font-semibold text-white">Approve</button>
                                        <button type="button" onClick={() => router.patch(route('groups.members.moderate', [group.id, member.id]), { action: 'reject' }, { preserveScroll: true })} aria-label={`Reject ${member.name}`} className="rounded-md bg-[#e4e6eb] px-2 py-1 text-xs font-semibold text-[#1c1e21]">Reject</button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>

                <section className="mx-auto min-w-0 w-full max-w-[680px] space-y-4">
                    <header className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                        <div
                            className="relative h-48 w-full bg-cover bg-center bg-no-repeat sm:h-64"
                            style={{ backgroundImage: group.cover_url ? `url(${group.cover_url})` : 'linear-gradient(135deg, #dfe9ff 0%, #bfd1ff 35%, #d7e4ff 100%)' }}
                        >
                            {isAdmin && (
                                <div className="absolute inset-0 flex items-start justify-end p-4">
                                    <button
                                        type="button"
                                        onClick={() => coverInputRef.current?.click()}
                                        className="rounded-md bg-black/40 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-black/50"
                                    >
                                        Edit cover
                                    </button>
                                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                                </div>
                            )}
                        </div>
                        <div className="px-5 pb-4 pt-5 sm:px-7">
                            <Link href={route('groups.index')} className="text-sm font-semibold text-[#0866ff] hover:underline">‹ All groups</Link>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <h1 className="break-words text-2xl font-bold text-[#1c1e21] sm:text-3xl">{group.name}</h1>
                                    <p className="mt-2 flex items-center gap-2 text-sm text-[#65676b]">
                                        <SocialIcon name={group.privacy === 'public' ? 'globe' : 'lock'} className="h-4 w-4" />
                                        {group.privacy === 'public' ? 'Public group' : 'Private group'}
                                        <span aria-hidden="true">·</span>
                                        {group.member_count} members
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setInviteDialogOpen(true)}
                                            className="inline-flex items-center gap-2 rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5]"
                                        >
                                            <SocialIcon name="friends" className="h-4 w-4" />
                                            Invite
                                        </button>
                                    )}
                                    {isMember && membership?.role !== 'admin' ? (
                                        <button
                                            type="button"
                                            onClick={() => router.delete(route('groups.leave', group.id), { preserveScroll: true })}
                                            className="rounded-md bg-[#e4e6eb] px-4 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#d8dadf]"
                                        >
                                            Leave group
                                        </button>
                                    ) : isInvited ? (
                                        <>
                                        <button
                                            type="button"
                                            onClick={() => router.post(route('groups.join', group.id), {}, { preserveScroll: true })}
                                            className="rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5]"
                                        >
                                            Accept invite
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => router.delete(route('groups.invitations.destroy', group.id), { preserveScroll: true })}
                                            className="rounded-md bg-[#e4e6eb] px-4 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#d8dadf]"
                                        >
                                            Decline
                                        </button>
                                        </>
                                    ) : membership?.status === 'suspended' ? (
                                        <span className="rounded-md bg-[#fff4d6] px-4 py-2 text-sm font-semibold text-[#765b00]">Membership suspended</span>
                                    ) : !isMember && membership?.status === 'pending' ? (
                                        <span className="rounded-md bg-[#fff4d6] px-4 py-2 text-sm font-semibold text-[#765b00]">Request pending</span>
                                    ) : !isMember ? (
                                        <button
                                            type="button"
                                            onClick={() => router.post(route('groups.join', group.id), {}, { preserveScroll: true })}
                                            className="rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5]"
                                        >
                                            {group.privacy === 'private' ? 'Request to join' : 'Join group'}
                                        </button>
                                    ) : membership?.role === 'admin' ? (
                                        <span className="rounded-md bg-[#e7f3ff] px-4 py-2 text-sm font-semibold text-[#0866ff]">You manage this group</span>
                                    ) : null}
                                </div>
                            </div>
                            {group.description && <p className="mt-5 whitespace-pre-wrap text-[15px] leading-6 text-[#1c1e21]">{group.description}</p>}
                            <p className="mt-4 border-t border-[#e4e6eb] pt-3 text-sm text-[#65676b]">Created by <strong className="text-[#1c1e21]">{group.owner_name}</strong></p>
                            {membership?.role === 'admin' && <p className="mt-2 text-xs text-[#65676b]">As the group creator, you remain its admin.</p>}
                        </div>
                    </header>

                    {groupTab === 'discussion' && (isMember ? (
                        <form onSubmit={createPost} className="space-y-3 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <label htmlFor="group-post" className="text-base font-bold text-[#1c1e21]">Share with the group</label>
                            <textarea
                                id="group-post"
                                value={form.data.content}
                                onChange={(event) => form.setData('content', event.target.value)}
                                rows={3}
                                maxLength={2000}
                                placeholder={`Write something for ${group.name}…`}
                                className="w-full resize-y rounded-lg border-0 bg-[#f0f2f5] px-4 py-3 text-sm focus:ring-2 focus:ring-[#0866ff]"
                            />
                            {form.errors.content && <p className="text-sm text-red-600">{form.errors.content}</p>}
                            <input
                                ref={postImageInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                aria-label="Choose an image for the group post"
                                onChange={(event) => form.setData('image', event.target.files?.[0] ?? null)}
                            />
                            {postImagePreview && (
                                <div className="relative overflow-hidden rounded-lg border border-[#e4e6eb]">
                                    <img src={postImagePreview} alt="Group post image preview" className="max-h-[420px] w-full bg-[#f0f2f5] object-contain" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            form.setData('image', null);
                                            if (postImageInputRef.current) {
                                                postImageInputRef.current.value = '';
                                            }
                                        }}
                                        className="absolute right-2 top-2 rounded-md bg-white/95 px-3 py-1.5 text-sm font-semibold text-[#1c1e21] shadow hover:bg-white"
                                    >
                                        Remove image
                                    </button>
                                </div>
                            )}
                            {form.errors.image && <p className="text-sm text-red-600">{form.errors.image}</p>}
                            {form.progress && (
                                <div className="space-y-1">
                                    <progress aria-label="Image upload progress" value={form.progress.percentage} max="100" className="h-2 w-full accent-[#0866ff]" />
                                    <p className="text-right text-xs text-[#65676b]">{form.progress.percentage}% uploaded</p>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-3 border-t border-[#e4e6eb] pt-3">
                                <button
                                    type="button"
                                    onClick={() => postImageInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#45a049] hover:bg-[#f0f2f5]"
                                >
                                    <SocialIcon name="photo" className="h-5 w-5" />
                                    Photo
                                </button>
                                <button type="submit" disabled={form.processing || (!form.data.content.trim() && !form.data.image)} className="rounded-md bg-[#0866ff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:opacity-60">
                                    {form.processing ? 'Posting…' : 'Post'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="rounded-xl bg-white p-5 text-center text-sm text-[#65676b] shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            {group.privacy === 'private'
                                ? 'Join this private group to see posts and participate.'
                                : 'Join this group to share a post.'}
                        </div>
                    ))}

                    {groupTab === 'discussion' && (posts.data.length > 0 ? posts.data.map((post) => (
                        <GroupPostCard key={post.id} group={group} post={post} isAdmin={isAdmin} />
                    )) : (
                        <div className="rounded-xl bg-white px-5 py-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <h2 className="font-semibold text-[#1c1e21]">No posts yet</h2>
                            <p className="mt-1 text-sm text-[#65676b]">Be the first to start a conversation.</p>
                        </div>
                    ))}
                    {groupTab === 'discussion' && posts.links?.length > 3 && (
                        <nav aria-label="Group post pages" className="flex flex-wrap justify-center gap-2">
                            {posts.links.map((link) => link.url && (
                                <Link key={link.label} href={link.url} preserveScroll className={`rounded-md px-3 py-2 text-sm font-semibold ${link.active ? 'bg-[#0866ff] text-white' : 'bg-white text-[#1c1e21] hover:bg-[#e4e6eb]'}`}>
                                    {link.label.replace('&laquo;', '‹').replace('&raquo;', '›')}
                                </Link>
                            ))}
                        </nav>
                    )}

                    {groupTab === 'moderation' && isAdmin && (
                        <section className="space-y-4 rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                            <div className="border-b border-[#e4e6eb] pb-4">
                                <h2 className="text-xl font-bold text-[#1c1e21]">Reported content</h2>
                                <p className="mt-1 text-sm text-[#65676b]">Review member reports and decide whether content should stay or be removed.</p>
                            </div>
                            {openReports.length > 0 ? (
                                <div className="space-y-3">
                                    {openReports.map((report) => (
                                        <article key={report.id} className="space-y-3 rounded-lg border border-[#e4e6eb] p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-[#1c1e21]">
                                                        {report.target_type === 'comment' ? 'Comment' : 'Post'} reported by {report.reporter_name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[#65676b]">
                                                        Reason: {report.reason.replaceAll('_', ' ')} · {new Date(report.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                {report.target_user_name && <span className="text-xs text-[#65676b]">By {report.target_user_name}</span>}
                                            </div>
                                            <blockquote className="rounded-md bg-[#f0f2f5] px-3 py-2 text-sm text-[#1c1e21]">
                                                {report.target_content}
                                            </blockquote>
                                            {report.details && <p className="text-sm text-[#65676b]">Reporter note: {report.details}</p>}
                                            <div className="flex flex-wrap justify-end gap-2 border-t border-[#e4e6eb] pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => router.patch(route('groups.reports.review', [group.id, report.id]), { action: 'dismiss' }, { preserveScroll: true })}
                                                    className="rounded-md bg-[#e4e6eb] px-3 py-2 text-sm font-semibold text-[#1c1e21] hover:bg-[#d8dadf]"
                                                >
                                                    Dismiss report
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm('Remove the reported content from this group?')) {
                                                            router.patch(route('groups.reports.review', [group.id, report.id]), { action: 'remove_content' }, { preserveScroll: true });
                                                        }
                                                    }}
                                                    className="rounded-md bg-[#b42318] px-3 py-2 text-sm font-semibold text-white hover:bg-[#912018]"
                                                >
                                                    Remove content
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-10 text-center text-sm text-[#65676b]">There are no open reports to review.</p>
                            )}
                        </section>
                    )}

                    {groupTab === 'members' && (
                        <section className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                            <div className="flex items-center justify-between gap-3 border-b border-[#e4e6eb] pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[#1c1e21]">Members</h2>
                                    <p className="mt-1 text-sm text-[#65676b]">{group.member_count} group members</p>
                                </div>
                                {isAdmin && (
                                    <button type="button" onClick={() => setInviteDialogOpen(true)} className="rounded-md bg-[#e7f3ff] px-4 py-2 text-sm font-semibold text-[#0866ff] hover:bg-[#dceeff]">
                                        Invite friends
                                    </button>
                                )}
                            </div>
                            {members.length > 0 ? (
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {members.map((member) => (
                                        <div key={member.id} className="flex items-center gap-3 rounded-lg border border-[#e4e6eb] p-3">
                                            <Avatar name={member.name} src={member.avatar_url} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-[#1c1e21]">{member.name}</p>
                                                <p className="text-xs text-[#65676b]">
                                                    {member.role === 'admin' ? 'Admin' : 'Member'}{member.status === 'suspended' ? ' · Suspended' : ''}
                                                </p>
                                            </div>
                                            {isAdmin && member.user_id !== group.owner_id && (
                                                <div className="flex flex-wrap justify-end gap-1">
                                                    {member.status === 'suspended' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.patch(route('groups.members.management', [group.id, member.id]), { action: 'restore' }, { preserveScroll: true })}
                                                            className="rounded-md bg-[#e7f3ff] px-2 py-1 text-xs font-semibold text-[#0866ff]"
                                                        >
                                                            Restore
                                                        </button>
                                                    ) : member.role === 'admin' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => router.patch(route('groups.members.management', [group.id, member.id]), { action: 'demote' }, { preserveScroll: true })}
                                                            className="rounded-md px-2 py-1 text-xs font-semibold text-[#65676b] hover:bg-[#f0f2f5]"
                                                        >
                                                            Remove admin
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => router.patch(route('groups.members.management', [group.id, member.id]), { action: 'promote' }, { preserveScroll: true })}
                                                                className="rounded-md bg-[#e7f3ff] px-2 py-1 text-xs font-semibold text-[#0866ff]"
                                                            >
                                                                Make admin
                                                            </button>
                                                            {member.status === 'approved' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.patch(route('groups.members.management', [group.id, member.id]), { action: 'suspend' }, { preserveScroll: true })}
                                                                    className="rounded-md px-2 py-1 text-xs font-semibold text-[#765b00] hover:bg-[#fff4d6]"
                                                                >
                                                                    Suspend
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    {member.role !== 'admin' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (window.confirm(`Remove ${member.name} from this group?`)) {
                                                                    router.patch(route('groups.members.management', [group.id, member.id]), { action: 'remove' }, { preserveScroll: true });
                                                                }
                                                            }}
                                                            className="rounded-md px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff1f0]"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="py-10 text-center text-sm text-[#65676b]">Member details are visible to group members.</p>
                            )}
                        </section>
                    )}

                    {groupTab === 'about' && (
                        <section className="space-y-4 rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] sm:p-6">
                            <div>
                                <h2 className="text-xl font-bold text-[#1c1e21]">About this group</h2>
                                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-6 text-[#1c1e21]">{group.description || 'The group admin has not added a description yet.'}</p>
                            </div>
                            <div className="grid gap-4 border-t border-[#e4e6eb] pt-4 sm:grid-cols-2">
                                <div className="flex items-start gap-3">
                                    <SocialIcon name={group.privacy === 'public' ? 'globe' : 'lock'} className="mt-0.5 h-5 w-5 text-[#65676b]" />
                                    <div>
                                        <p className="text-sm font-semibold text-[#1c1e21]">{group.privacy === 'public' ? 'Public' : 'Private'} group</p>
                                        <p className="mt-1 text-sm text-[#65676b]">{group.privacy === 'public' ? 'Anyone can see who is in the group and what they post.' : 'Only members can see who is in the group and what they post.'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <SocialIcon name="friends" className="mt-0.5 h-5 w-5 text-[#65676b]" />
                                    <div>
                                        <p className="text-sm font-semibold text-[#1c1e21]">{group.member_count} members</p>
                                        <p className="mt-1 text-sm text-[#65676b]">Created by {group.owner_name}</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </section>

                <aside className="h-fit space-y-4 lg:sticky lg:top-[72px] lg:h-[calc(100vh-80px)] lg:overflow-y-auto lg:pb-4">
                    <section className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-bold text-[#1c1e21]">About this group</h2>
                                <p className="mt-1 text-sm text-[#65676b]">{group.privacy === 'public' ? 'Public group' : 'Private group'}</p>
                            </div>
                            <SocialIcon name={group.privacy === 'public' ? 'globe' : 'lock'} className="h-5 w-5 text-[#65676b]" />
                        </div>
                        <p className="mt-3 text-sm leading-5 text-[#65676b]">{group.description || 'This group is a place for people to connect and share.'}</p>
                        <div className="mt-4 flex items-start gap-3 border-t border-[#e4e6eb] pt-4">
                            <SocialIcon name="friends" className="mt-0.5 h-5 w-5 text-[#65676b]" />
                            <div>
                                <p className="text-sm font-semibold text-[#1c1e21]">{group.member_count} members</p>
                                <p className="mt-1 text-xs text-[#65676b]">Created by {group.owner_name}</p>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-base font-bold text-[#1c1e21]">Members</h2>
                            <button type="button" onClick={() => setGroupTab('members')} className="text-sm font-semibold text-[#0866ff] hover:underline">See all</button>
                        </div>
                        <div className="mt-3 space-y-3">
                            {members.slice(0, 5).map((member) => (
                                <div key={member.id} className="flex items-center gap-2">
                                    <Avatar name={member.name} src={member.avatar_url} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[#1c1e21]">{member.name}</p>
                                        <p className="text-xs text-[#65676b]">
                                            {member.role === 'admin' ? 'Admin' : 'Member'}{member.status === 'suspended' ? ' · Suspended' : ''}
                                        </p>
                                    </div>
                                    {isAdmin && member.role !== 'admin' && member.user_id !== group.owner_id && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm(`Remove ${member.name} from this group?`)) {
                                                    router.patch(route('groups.members.management', [group.id, member.id]), { action: 'remove' }, { preserveScroll: true });
                                                }
                                            }}
                                            aria-label={`Remove ${member.name}`}
                                            className="rounded-md px-2 py-1 text-xs font-semibold text-[#65676b] hover:bg-[#f0f2f5]"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                            {members.length === 0 && <p className="text-sm text-[#65676b]">Member details are visible to group members.</p>}
                        </div>
                    </section>
                </aside>
            </div>

            {isAdmin && inviteDialogOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-6"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setInviteDialogOpen(false);
                        }
                    }}
                >
                    <section role="dialog" aria-modal="true" aria-labelledby="group-invite-title" className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                        <header className="flex items-center justify-between gap-3 border-b border-[#e4e6eb] p-4">
                            <div>
                                <h2 id="group-invite-title" className="text-lg font-bold text-[#1c1e21]">Invite friends</h2>
                                <p className="mt-1 text-sm text-[#65676b]">Invite a friend to join {group.name}.</p>
                            </div>
                            <button type="button" onClick={() => setInviteDialogOpen(false)} aria-label="Close invite dialog" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4e6eb] text-xl text-[#1c1e21] hover:bg-[#d8dadf]">×</button>
                        </header>
                        <div className="min-h-0 overflow-y-auto p-4">
                            <input
                                type="search"
                                aria-label="Search friends to invite"
                                value={inviteSearch}
                                onChange={(event) => setInviteSearch(event.target.value)}
                                placeholder="Search friends"
                                className="w-full rounded-full border-0 bg-[#f0f2f5] px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0866ff]"
                            />
                            {inviteForm.errors.user_id && <p className="mt-3 text-sm text-red-600">{inviteForm.errors.user_id}</p>}
                            {matchingFriends.length > 0 ? (
                                <form onSubmit={inviteFriend} className="mt-3">
                                    <div className="max-h-[45vh] space-y-1 overflow-y-auto">
                                        {matchingFriends.map((friend) => (
                                            <label key={friend.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-[#f0f2f5]">
                                                <Avatar name={friend.name} src={friend.avatar_url} />
                                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1c1e21]">{friend.name}</span>
                                                <input
                                                    type="radio"
                                                    name="invitee"
                                                    value={friend.id}
                                                    checked={String(inviteForm.data.user_id) === String(friend.id)}
                                                    onChange={() => inviteForm.setData('user_id', friend.id)}
                                                    className="h-4 w-4 accent-[#0866ff]"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-4 border-t border-[#e4e6eb] pt-4">
                                        <button type="submit" disabled={!inviteForm.data.user_id || inviteForm.processing} className="w-full rounded-md bg-[#0866ff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:cursor-not-allowed disabled:opacity-60">
                                            {inviteForm.processing ? 'Sending invitation…' : 'Send invitation'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="py-10 text-center">
                                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]"><SocialIcon name="friends" className="h-6 w-6" /></span>
                                    <p className="mt-3 text-sm font-semibold text-[#1c1e21]">{inviteableFriends.length === 0 ? 'No friends available to invite' : 'No friends match your search'}</p>
                                    <p className="mt-1 text-sm text-[#65676b]">{inviteableFriends.length === 0 ? 'Friends already in this group or with an active invitation will not appear here.' : 'Try searching with a different name.'}</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
