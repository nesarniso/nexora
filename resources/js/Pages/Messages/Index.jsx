import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ conversations = [], filters = {} }) {
    const user = usePage().props.auth.user;
    const [search, setSearch] = useState(filters.search ?? '');
    const [reportingUser, setReportingUser] = useState(null);
    const reportForm = useForm({ reason: 'spam', details: '' });
    const view = filters.view === 'archived' ? 'archived' : 'active';
    usePoll(10000, {
        only: ['conversations', 'unreadMessagesCount'],
        preserveScroll: true,
    });

    const searchConversations = (event) => {
        event.preventDefault();

        router.get(route('messages.index'), {
            search: search.trim() || undefined,
            view,
        }, {
            only: ['conversations', 'filters'],
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const conversationRecords = Array.isArray(conversations) ? conversations : conversations.data ?? [];
    const conversationDetails = conversationRecords.map((conversation) => {
        const otherUser = conversation.user_one_id === user.id
            ? conversation.user_two
            : conversation.user_one;

        return {
            ...conversation,
            otherUser,
            latestMessage: conversation.messages?.[0],
        };
    });
    const filteredConversations = conversationDetails.filter((conversation) => {
        const searchText = search.trim().toLowerCase();

        return !searchText
            || conversation.otherUser?.name?.toLowerCase().includes(searchText)
            || conversation.latestMessage?.body?.toLowerCase().includes(searchText);
    });
    const closeChatMenu = (event) => {
        event.currentTarget.closest('details')?.removeAttribute('open');
    };
    const runConversationAction = (event, conversation, action) => {
        closeChatMenu(event);

        if (action === 'delete' && !window.confirm('Delete this chat from your inbox?')) {
            return;
        }

        if (action === 'block' && !window.confirm(`Block ${conversation.otherUser?.name ?? 'this person'}? They will not be able to message you.`)) {
            return;
        }

        const actionRoutes = {
            unread: ['conversations.unread', conversation.id],
            mute: ['conversations.mute', conversation.id],
            archive: ['conversations.archive', conversation.id],
            delete: ['conversations.delete', conversation.id],
            block: ['conversations.block', conversation.id],
        };

        router.post(route(...actionRoutes[action]), {}, { preserveScroll: true });
    };
    const submitReport = (event) => {
        event.preventDefault();

        if (!reportingUser) {
            return;
        }

        reportForm.post(route('users.reports.store', reportingUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                reportForm.reset();
                setReportingUser(null);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Messages" />

            <div className="mx-auto grid h-[calc(100vh-56px)] max-w-[1600px] grid-cols-1 overflow-hidden bg-white shadow-sm md:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
                <aside className="flex min-h-0 flex-col border-r border-[#e4e6eb]">
                    <div className="flex items-center justify-between px-4 pb-2 pt-5">
                        <h1 className="text-[24px] font-bold text-[#1c1e21]">Chats</h1>
                    </div>

                    <div className="mx-4 mb-3 flex rounded-full bg-[#f0f2f5] p-1">
                        <Link href={route('messages.index', { view: 'active' })} className={`flex-1 rounded-full px-3 py-2 text-center text-sm font-semibold transition ${view === 'active' ? 'bg-white text-[#0866ff] shadow-sm' : 'text-[#65676b]'}`}>
                            Inbox
                        </Link>
                        <Link href={route('messages.index', { view: 'archived' })} className={`flex-1 rounded-full px-3 py-2 text-center text-sm font-semibold transition ${view === 'archived' ? 'bg-white text-[#0866ff] shadow-sm' : 'text-[#65676b]'}`}>
                            Archived
                        </Link>
                    </div>

                    <form onSubmit={searchConversations} role="search" className="mx-4 flex h-10 items-center gap-2 rounded-full bg-[#f0f2f5] px-3 text-[#65676b]">
                        <button type="submit" aria-label="Search messages" className="shrink-0 hover:text-[#0866ff]">
                            <SocialIcon name="search" className="h-5 w-5" />
                        </button>
                        <input
                            type="search"
                            aria-label="Search messages"
                            placeholder="Search Messenger"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[#1c1e21] placeholder:text-[#65676b] focus:ring-0"
                        />
                    </form>

                    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                        {filteredConversations.length === 0 ? (
                            <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                                    <SocialIcon name="messages" className="h-7 w-7" />
                                </span>
                                <h2 className="mt-4 text-[17px] font-semibold text-[#1c1e21]">{search ? 'No matching chats' : 'No chats yet'}</h2>
                                <p className="mt-1 text-sm text-[#65676b]">{search ? 'Try a different name or message.' : 'When you start a conversation, it will appear here.'}</p>
                                {!search && <Link href={route('dashboard')} className="mt-4 rounded-md bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5]">Back to feed</Link>}
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const settings = conversation.user_settings?.[0];
                                const menuItemClass = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#242526] hover:bg-[#f0f2f5]';

                                return (
                                    <div key={conversation.id} className={`group relative flex items-center rounded-lg transition-colors hover:bg-[#f0f2f5] ${conversation.unread_count > 0 ? 'bg-[#f5f9ff]' : ''}`}>
                                        <Link href={route('messages.show', conversation.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-3">
                                            <Avatar name={conversation.otherUser?.name} src={conversation.otherUser?.profile?.avatar_url} size="h-12 w-12" />
                                            <span className="min-w-0 flex-1">
                                                <span className={`block truncate text-[15px] text-[#1c1e21] ${conversation.unread_count > 0 ? 'font-bold' : 'font-semibold'}`}>{conversation.otherUser?.name ?? 'Nexora user'}</span>
                                                <span className="mt-1 flex items-center gap-1 truncate text-[13px] text-[#65676b]">
                                                    <span className={`truncate ${conversation.unread_count > 0 ? 'font-semibold text-[#1c1e21]' : ''}`}>
                                                        {conversation.latestMessage?.sender_id === user.id && 'You: '}
                                                        {conversation.latestMessage?.deleted_at
                                                            ? 'Message deleted'
                                                            : conversation.latestMessage?.body
                                                                ?? (conversation.latestMessage?.attachments?.length
                                                                    ? (conversation.latestMessage.attachments.some((attachment) => attachment.mime_type.startsWith('audio/'))
                                                                        ? 'Voice message'
                                                                        : (conversation.latestMessage.attachments.some((attachment) => attachment.mime_type.startsWith('image/')) ? 'Photo' : 'File attachment'))
                                                                    : 'Start a conversation')}
                                                    </span>
                                                    {conversation.last_message_at && <><span>·</span><time>{new Date(conversation.last_message_at).toLocaleDateString()}</time></>}
                                                </span>
                                            </span>
                                            {conversation.unread_count > 0 && (
                                                <span aria-label={`${conversation.unread_count} unread messages`} className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0866ff] px-1 text-[11px] font-bold text-white">
                                                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                                </span>
                                            )}
                                        </Link>
                                        <details className="relative mr-2 shrink-0">
                                            <summary aria-label={`More options for ${conversation.otherUser?.name ?? 'chat'}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-[#65676b] hover:bg-[#e4e6eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0866ff] [&::-webkit-details-marker]:hidden">
                                                <SocialIcon name="menu" className="h-5 w-5" />
                                            </summary>
                                            <div className="absolute right-0 top-11 z-30 w-64 rounded-xl bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/10">
                                                <button type="button" onClick={(event) => runConversationAction(event, conversation, 'unread')} className={menuItemClass}>
                                                    <SocialIcon name="mail" className="h-5 w-5 text-[#65676b]" />Mark as unread
                                                </button>
                                                <Link href={route('messages.show', conversation.id)} onClick={closeChatMenu} className={menuItemClass}>
                                                    <SocialIcon name="messages" className="h-5 w-5 text-[#65676b]" />Open messaging
                                                </Link>
                                                <button type="button" onClick={(event) => runConversationAction(event, conversation, 'mute')} className={menuItemClass}>
                                                    <SocialIcon name="bellOff" className="h-5 w-5 text-[#65676b]" />{settings?.is_muted ? 'Unmute notifications' : 'Mute notifications'}
                                                </button>
                                                <Link href={route('users.show', conversation.otherUser?.id)} onClick={closeChatMenu} className={menuItemClass}>
                                                    <SocialIcon name="user" className="h-5 w-5 text-[#65676b]" />View profile
                                                </Link>
                                                {conversation.blocked_by_other_user ? (
                                                    <span className={`${menuItemClass} cursor-not-allowed opacity-60`}>
                                                        <SocialIcon name="userX" className="h-5 w-5 text-[#65676b]" />This person blocked you
                                                    </span>
                                                ) : (
                                                    <button type="button" onClick={(event) => runConversationAction(event, conversation, 'block')} className={menuItemClass}>
                                                        <SocialIcon name="userX" className="h-5 w-5 text-[#65676b]" />{conversation.blocked_by_current_user ? 'Unblock' : 'Block'}
                                                    </button>
                                                )}
                                                <button type="button" onClick={(event) => runConversationAction(event, conversation, 'archive')} className={menuItemClass}>
                                                    <SocialIcon name="archive" className="h-5 w-5 text-[#65676b]" />{view === 'archived' ? 'Unarchive chat' : 'Archive chat'}
                                                </button>
                                                <button type="button" onClick={(event) => runConversationAction(event, conversation, 'delete')} className={menuItemClass}>
                                                    <SocialIcon name="trash" className="h-5 w-5 text-[#65676b]" />Delete chat
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        closeChatMenu(event);
                                                        reportForm.reset();
                                                        setReportingUser(conversation.otherUser);
                                                    }}
                                                    className={menuItemClass}
                                                >
                                                    <SocialIcon name="flag" className="h-5 w-5 text-[#65676b]" />Report
                                                </button>
                                            </div>
                                        </details>
                                    </div>
                                );
                            })
                        )}
                        {!search && conversations.prev_page_url && (
                            <Link href={conversations.prev_page_url} preserveScroll className="block rounded-lg px-3 py-2 text-center text-sm font-semibold text-[#0866ff] hover:bg-[#f0f2f5]">Newer conversations</Link>
                        )}
                        {!search && conversations.next_page_url && (
                            <Link href={conversations.next_page_url} preserveScroll className="block rounded-lg px-3 py-2 text-center text-sm font-semibold text-[#0866ff] hover:bg-[#f0f2f5]">Older conversations</Link>
                        )}
                    </div>
                </aside>

                <main className="hidden flex-col items-center justify-center bg-[#f7f8fa] text-center md:flex">
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                        <SocialIcon name="messages" className="h-10 w-10" />
                    </span>
                    <h2 className="mt-5 text-[20px] font-semibold text-[#1c1e21]">Your messages</h2>
                    <p className="mt-2 max-w-sm text-[15px] text-[#65676b]">Select a conversation to catch up, or start a new one with your friends.</p>
                </main>
            </div>
            {reportingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                        setReportingUser(null);
                    }
                }}>
                    <form onSubmit={submitReport} role="dialog" aria-modal="true" aria-labelledby="report-user-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <h2 id="report-user-title" className="text-lg font-bold text-[#1c1e21]">Report {reportingUser.name}</h2>
                        <p className="mt-1 text-sm text-[#65676b]">Choose a reason. Our moderation team will review your report.</p>
                        <label htmlFor="report-reason" className="mt-4 block text-sm font-semibold text-[#444950]">Reason</label>
                        <select id="report-reason" value={reportForm.data.reason} onChange={(event) => reportForm.setData('reason', event.target.value)} className="mt-1 w-full rounded-lg border-[#d8dadf] text-sm focus:border-[#0866ff] focus:ring-[#0866ff]">
                            <option value="spam">Spam</option>
                            <option value="harassment">Harassment</option>
                            <option value="impersonation">Impersonation</option>
                            <option value="other">Other</option>
                        </select>
                        {reportForm.errors.reason && <p role="alert" className="mt-1 text-sm text-red-600">{reportForm.errors.reason}</p>}
                        <label htmlFor="report-details" className="mt-3 block text-sm font-semibold text-[#444950]">Details (optional)</label>
                        <textarea id="report-details" value={reportForm.data.details} onChange={(event) => reportForm.setData('details', event.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded-lg border-[#d8dadf] text-sm focus:border-[#0866ff] focus:ring-[#0866ff]" />
                        {reportForm.errors.details && <p role="alert" className="mt-1 text-sm text-red-600">{reportForm.errors.details}</p>}
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setReportingUser(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5]">Cancel</button>
                            <button type="submit" disabled={reportForm.processing} className="rounded-lg bg-[#0866ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075ce5] disabled:opacity-50">{reportForm.processing ? 'Sending…' : 'Submit report'}</button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
