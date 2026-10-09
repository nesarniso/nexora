import SocialIcon from '@/Components/SocialIcon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

function notificationLabel(type) {
    if (typeof type !== 'string' || type.length === 0) {
        return 'New activity';
    }

    const labels = {
        friend_request: 'Friend request',
        friend_request_received: 'Friend request',
        friend_request_accepted: 'Friend request accepted',
        message_received: 'New message',
        post_comment: 'Comment on your post',
        post_reaction: 'Reaction to your post',
        group_post_comment: 'Comment on your group post',
        group_post_reaction: 'Reaction to your group post',
        group_join_request: 'Group membership request',
        group_join_approved: 'Group request approved',
        group_membership_updated: 'Group membership updated',
        group_content_reported: 'Group content reported',
        group_report_resolved: 'Group report reviewed',
        new_follower: 'New follower',
        group_invite: 'Group invitation',
    };

    return labels[type] ?? type.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function notificationIcon(type) {
    if (typeof type !== 'string') {
        return 'bell';
    }

    if (type.includes('message')) {
        return 'messages';
    }

    if (type.includes('friend') || type.includes('follow')) {
        return 'friends';
    }

    if (type.includes('comment')) {
        return 'comment';
    }

    return 'bell';
}

export default function Index({ notifications = [], unreadCount = 0 }) {
    const [filter, setFilter] = useState('all');
    const visibleNotifications = notifications.filter((notification) => (
        filter === 'all' || (filter === 'unread' && !notification.read_at)
    ));

    return (
        <AuthenticatedLayout>
            <Head title="Notifications" />

            <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-[1600px] grid-cols-1 bg-[#f0f2f5] md:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
                <aside className="border-r border-[#e4e6eb] bg-white px-4 py-5">
                    <div className="flex items-center justify-between gap-2">
                        <h1 className="text-[24px] font-bold text-[#1c1e21]">Notifications</h1>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <h2 className="text-[17px] font-semibold text-[#1c1e21]">New</h2>
                        {unreadCount > 0 && (
                            <Link
                                href={route('notifications.read')}
                                method="post"
                                as="button"
                                className="rounded-md px-2 py-1 text-sm font-medium text-[#0866ff] hover:bg-[#f0f2f5]"
                            >
                                Mark all as read
                            </Link>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-[#65676b]">{unreadCount} unread notifications</p>

                    <div className="mt-4 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === 'all' ? 'bg-[#e7f3ff] text-[#0866ff]' : 'text-[#65676b] hover:bg-[#f0f2f5]'}`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('unread')}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === 'unread' ? 'bg-[#e7f3ff] text-[#0866ff]' : 'text-[#65676b] hover:bg-[#f0f2f5]'}`}
                        >
                            Unread
                        </button>
                    </div>
                </aside>

                <main className="mx-auto w-full max-w-[900px] px-3 py-5 sm:px-5">
                    {visibleNotifications.length === 0 ? (
                        <section className="rounded-xl bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
                            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0866ff]">
                                <SocialIcon name="bell" className="h-8 w-8" />
                            </span>
                            <h2 className="mt-4 text-[18px] font-semibold text-[#1c1e21]">
                                {filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}
                            </h2>
                            <p className="mt-1 text-[15px] text-[#65676b]">
                                {filter === 'unread' ? 'There are no unread notifications.' : 'When something happens, you’ll see it here.'}
                            </p>
                        </section>
                    ) : (
                        <section aria-label="Recent notifications" className="space-y-1">
                            {visibleNotifications.map((notification) => (
                                <article
                                    key={notification.id}
                                    className={`flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-[#e4e6eb] ${notification.read_at ? '' : 'bg-[#e7f3ff]'}`}
                                >
                                    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#0866ff] shadow-sm">
                                        <SocialIcon name={notificationIcon(notification.type)} className="h-6 w-6" />
                                        {!notification.read_at && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#e7f3ff] bg-[#0866ff]" />}
                                    </span>
                                    <div className="min-w-0 flex-1 pt-1">
                                        <h2 className="text-[15px] font-semibold leading-5 text-[#1c1e21]">{notificationLabel(notification.type)}</h2>
                                        <p className="mt-1 break-words text-[14px] leading-5 text-[#65676b]">{typeof notification.data?.message === 'string' ? notification.data.message : 'There is new activity on your account.'}</p>
                                        <time className={`mt-1 block text-xs font-semibold ${notification.read_at ? 'text-[#65676b]' : 'text-[#0866ff]'}`}>
                                            {new Date(notification.created_at).toLocaleString()}
                                        </time>
                                        {notification.type === 'group_invite' && Number.isInteger(notification.data?.group_id) && (
                                            <Link
                                                href={route('groups.show', notification.data.group_id)}
                                                className="mt-2 inline-flex rounded-md bg-[#0866ff] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#075ce5]"
                                            >
                                                View invitation
                                            </Link>
                                        )}
                                        {['group_post_comment', 'group_post_reaction'].includes(notification.type)
                                            && Number.isInteger(notification.data?.group_id)
                                            && Number.isInteger(notification.data?.group_post_id) && (
                                                <Link
                                                    href={`${route('groups.show', notification.data.group_id)}#group-post-${notification.data.group_post_id}`}
                                                    className="mt-2 inline-flex rounded-md bg-[#0866ff] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#075ce5]"
                                                >
                                                    View post
                                                </Link>
                                            )}
                                        {[
                                            'group_join_request',
                                            'group_join_approved',
                                            'group_membership_updated',
                                            'group_content_reported',
                                            'group_report_resolved',
                                        ].includes(notification.type)
                                            && Number.isInteger(notification.data?.group_id) && (
                                                <Link
                                                    href={route('groups.show', notification.data.group_id)}
                                                    className="mt-2 inline-flex rounded-md bg-[#0866ff] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#075ce5]"
                                                >
                                                    View group
                                                </Link>
                                            )}
                                    </div>
                                </article>
                            ))}
                        </section>
                    )}
                </main>
            </div>
        </AuthenticatedLayout>
    );
}
