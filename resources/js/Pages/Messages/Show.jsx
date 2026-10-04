import Avatar from '@/Components/Avatar';
import SocialIcon from '@/Components/SocialIcon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Show({ conversation, messages = [] }) {
    const currentUser = usePage().props.auth.user;
    const pageErrors = usePage().props.errors ?? {};
    const otherUser = conversation.user_one_id === currentUser.id
        ? conversation.user_two
        : conversation.user_one;
    const { data, setData, post, processing, progress, reset, errors } = useForm({
        body: '',
        reply_to_id: null,
        attachments: [],
    });
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingBody, setEditingBody] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [isStartingVoice, setIsStartingVoice] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [voiceError, setVoiceError] = useState('');
    const typingTimeoutsRef = useRef({});
    const attachmentInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    const recordingStartedAtRef = useRef(0);
    const recordingSetupRef = useRef(false);
    const discardRecordingRef = useRef(false);
    const componentMountedRef = useRef(true);
    usePoll(5000, {
        only: ['messages'],
        preserveScroll: true,
    });

    useEffect(() => {
        const echo = window.Echo;

        if (!echo) {
            return undefined;
        }

        const channelName = `conversations.${conversation.id}`;
        const channel = echo.private(channelName);
        const reloadMessages = () => router.reload({
            only: ['messages'],
            preserveScroll: true,
        });

        channel
            .listen('.message.sent', (event) => {
                if (event.message.sender_id !== currentUser.id) {
                    reloadMessages();
                }
            })
            .listen('.message.changed', reloadMessages)
            .listenForWhisper('typing', (event) => {
                if (event.user_id === currentUser.id) {
                    return;
                }

                setTypingUsers((users) => {
                    if (users.some((user) => user.id === event.user_id)) {
                        return users;
                    }

                    return [...users, { id: event.user_id, name: event.name }];
                });

                if (typingTimeoutsRef.current[event.user_id]) {
                    clearTimeout(typingTimeoutsRef.current[event.user_id]);
                }

                typingTimeoutsRef.current[event.user_id] = setTimeout(() => {
                    setTypingUsers((users) => users.filter((user) => user.id !== event.user_id));
                    delete typingTimeoutsRef.current[event.user_id];
                }, 1600);
            });

        return () => {
            Object.values(typingTimeoutsRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
            echo.leave(channelName);
        };
    }, [conversation.id, currentUser.id]);

    useEffect(() => {
        componentMountedRef.current = true;

        return () => {
            componentMountedRef.current = false;
            recordingSetupRef.current = false;

            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }

            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

            if (mediaRecorderRef.current?.state === 'recording') {
                discardRecordingRef.current = true;
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const submit = (event) => {
        event.preventDefault();

        post(route('messages.store', otherUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset('body', 'reply_to_id', 'attachments');
                if (attachmentInputRef.current) {
                    attachmentInputRef.current.value = '';
                }
                setReplyingTo(null);
            },
        });
    };

    const beginReply = (message) => {
        setReplyingTo(message);
        setData('reply_to_id', message.id);
    };

    const cancelReply = () => {
        setReplyingTo(null);
        setData('reply_to_id', null);
    };

    const beginEdit = (message) => {
        setEditingMessageId(message.id);
        setEditingBody(message.body);
    };

    const emitTyping = () => {
        const echo = window.Echo;

        if (!echo) {
            return;
        }

        echo.private(`conversations.${conversation.id}`).whisper('typing', {
            user_id: currentUser.id,
            name: currentUser.name,
        });
    };

    const stopVoiceRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const cancelVoiceRecording = () => {
        discardRecordingRef.current = true;
        stopVoiceRecording();
    };

    const startVoiceRecording = async () => {
        if (recordingSetupRef.current || isRecordingVoice || isStartingVoice) {
            return;
        }

        if (data.attachments.length >= 5) {
            setVoiceError('Remove an attachment before recording a voice message.');
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setVoiceError('Voice recording is not supported by this browser.');
            return;
        }

        recordingSetupRef.current = true;
        discardRecordingRef.current = false;
        setVoiceError('');
        setIsStartingVoice(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (!componentMountedRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            mediaStreamRef.current = stream;
            recordingChunksRef.current = [];

            const supportedMimeType = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus',
                'audio/ogg',
            ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
            const recorder = supportedMimeType
                ? new MediaRecorder(stream, { mimeType: supportedMimeType })
                : new MediaRecorder(stream);

            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordingChunksRef.current.push(event.data);
                }
            };
            recorder.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                mediaStreamRef.current = null;
                mediaRecorderRef.current = null;
                recordingSetupRef.current = false;
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                    recordingIntervalRef.current = null;
                }

                if (!componentMountedRef.current) {
                    recordingChunksRef.current = [];
                    return;
                }

                setIsRecordingVoice(false);
                setIsStartingVoice(false);

                if (discardRecordingRef.current) {
                    recordingChunksRef.current = [];
                    return;
                }

                const mimeType = recorder.mimeType || 'audio/webm';
                const extension = mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('ogg') ? 'ogg' : 'webm');
                const voiceFile = new File(
                    recordingChunksRef.current,
                    `voice-message-${Date.now()}.${extension}`,
                    { type: mimeType },
                );
                recordingChunksRef.current = [];

                if (voiceFile.size === 0) {
                    setVoiceError('No audio was recorded. Please try again.');
                    return;
                }

                if (voiceFile.size > 10 * 1024 * 1024) {
                    setVoiceError('Voice messages must be 10 MB or smaller.');
                    return;
                }

                setData('attachments', [...data.attachments, voiceFile]);
            };
            recorder.onerror = () => {
                setVoiceError('The voice recording could not be completed. Please try again.');
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
            };
            recorder.start(1000);
            recordingStartedAtRef.current = Date.now();
            setRecordingSeconds(0);
            setIsStartingVoice(false);
            setIsRecordingVoice(true);
            recordingIntervalRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
                setRecordingSeconds(elapsed);
                if (elapsed >= 120 && recorder.state === 'recording') {
                    recorder.stop();
                    setVoiceError('Voice recording reached the two-minute limit.');
                }
            }, 1000);
        } catch {
            mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
            recordingSetupRef.current = false;
            if (componentMountedRef.current) {
                setIsStartingVoice(false);
                setVoiceError('Microphone access was denied or is unavailable.');
            }
        }
    };

    const saveEdit = (event) => {
        event.preventDefault();

        router.patch(route('messages.update', [conversation.id, editingMessageId]), {
            body: editingBody,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingMessageId(null);
                setEditingBody('');
            },
        });
    };

    const toggleReaction = (message, reaction) => {
        router.post(route('messages.reactions.store', [conversation.id, message.id]), {
            reaction,
        }, {
            preserveScroll: true,
        });
    };

    const chronologicalMessages = [...messages].sort(
        (first, second) => new Date(first.created_at) - new Date(second.created_at),
    );
    const latestOwnMessageId = [...chronologicalMessages]
        .reverse()
        .find((message) => message.sender_id === currentUser.id)?.id;
    const reactionOptions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    return (
        <AuthenticatedLayout>
            <Head title={otherUser?.name ? `Chat with ${otherUser.name}` : 'Conversation'} />

            <div className="mx-auto grid h-[calc(100vh-56px)] max-w-[1600px] grid-cols-1 overflow-hidden bg-white shadow-sm md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
                <aside className="hidden border-r border-[#e4e6eb] bg-white md:block">
                    <div className="flex items-center justify-between px-4 pb-3 pt-5">
                        <h2 className="text-[22px] font-bold text-[#1c1e21]">Chats</h2>
                        <Link href={route('messages.index')} aria-label="All chats" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4e6eb] text-[#1c1e21] hover:bg-[#d8dadf]">
                            <SocialIcon name="messages" className="h-5 w-5" />
                        </Link>
                    </div>
                    <Link href={route('messages.index')} className="mx-3 flex items-center gap-3 rounded-lg p-3 hover:bg-[#f0f2f5]">
                        <Avatar name={otherUser?.name} src={otherUser?.profile?.avatar_url} />
                        <span className="truncate text-[15px] font-semibold text-[#1c1e21]">{otherUser?.name ?? 'Nexora user'}</span>
                    </Link>
                </aside>

                <main className="flex min-h-0 flex-col bg-white">
                    <header className="flex items-center justify-between border-b border-[#e4e6eb] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                        <div className="flex min-w-0 items-center gap-3">
                            <Link href={route('messages.index')} aria-label="Back to chats" className="flex h-9 w-9 items-center justify-center rounded-full text-[#0866ff] hover:bg-[#f0f2f5] md:hidden">
                                <SocialIcon name="messages" className="h-5 w-5" />
                            </Link>
                            <Avatar name={otherUser?.name} src={otherUser?.profile?.avatar_url} />
                            <div className="min-w-0">
                                <h1 className="truncate text-[15px] font-semibold text-[#1c1e21]">{otherUser?.name ?? 'Nexora user'}</h1>
                                <p className="text-xs text-[#65676b]">Nexora conversation</p>
                            </div>
                        </div>
                    </header>

                    <div aria-label="Conversation messages" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
                        <div className="mt-auto flex flex-col gap-2">
                            {chronologicalMessages.length === 0 ? (
                                <div className="mx-auto mb-5 text-center">
                                    <Avatar name={otherUser?.name} src={otherUser?.profile?.avatar_url} size="h-16 w-16" />
                                    <h2 className="mt-3 text-[17px] font-semibold text-[#1c1e21]">{otherUser?.name ?? 'Nexora user'}</h2>
                                    <p className="mt-1 text-sm text-[#65676b]">Start a conversation with a friendly hello.</p>
                                </div>
                            ) : (
                                chronologicalMessages.map((message) => {
                                    const ownMessage = message.sender_id === currentUser.id;
                                    const isDeleted = Boolean(message.deleted_at);
                                    const canEdit = ownMessage
                                        && !isDeleted
                                        && Date.now() - new Date(message.created_at).getTime() <= 15 * 60 * 1000;
                                    const groupedReactions = (message.reactions ?? []).reduce((groups, reaction) => {
                                        groups[reaction.reaction] = (groups[reaction.reaction] ?? 0) + 1;
                                        return groups;
                                    }, {});
                                    return (
                                        <div key={message.id} className={`flex items-end gap-2 ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                                            {!ownMessage && <Avatar name={otherUser?.name} src={otherUser?.profile?.avatar_url} size="h-7 w-7" />}
                                            <div className="flex max-w-[min(82%,560px)] flex-col gap-1">
                                                {editingMessageId === message.id ? (
                                                    <form onSubmit={saveEdit} className="flex min-w-[min(78vw,360px)] flex-col gap-2 rounded-2xl border border-[#d8dadf] bg-white p-3 shadow-sm">
                                                        <textarea
                                                            value={editingBody}
                                                            onChange={(event) => setEditingBody(event.target.value)}
                                                            aria-label="Edit message"
                                                            maxLength={2000}
                                                            rows="2"
                                                            className="w-full resize-y rounded-lg border-[#d8dadf] text-sm focus:border-[#0866ff] focus:ring-[#0866ff]"
                                                        />
                                                        {pageErrors.body && <p role="alert" className="text-xs text-red-600">{pageErrors.body}</p>}
                                                        <div className="flex justify-end gap-2">
                                                            <button type="button" onClick={() => setEditingMessageId(null)} className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#65676b] hover:bg-[#f0f2f5]">Cancel</button>
                                                            <button type="submit" disabled={!editingBody.trim()} className="rounded-md bg-[#0866ff] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Save</button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className={`rounded-[18px] px-3 py-2 text-[15px] leading-5 ${isDeleted ? 'bg-[#f0f2f5] italic text-[#65676b]' : ownMessage ? 'bg-[#0866ff] text-white' : 'bg-[#f0f2f5] text-[#1c1e21]'}`}>
                                                        {message.reply_to_id && (
                                                            <div className={`mb-2 border-l-2 pl-2 text-xs ${ownMessage && !isDeleted ? 'border-white/70 text-white/80' : 'border-[#0866ff] text-[#65676b]'}`}>
                                                                <span className="font-semibold">{message.reply_to?.sender?.id === currentUser.id ? 'You' : message.reply_to?.sender?.name ?? 'Message'}</span>
                                                                <p className="truncate">{message.reply_to?.deleted_at ? 'This message was deleted' : message.reply_to?.body ?? 'Message unavailable'}</p>
                                                            </div>
                                                        )}
                                                        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
                                                        {!isDeleted && message.attachments?.length > 0 && (
                                                            <div className="mt-2 flex flex-col gap-2">
                                                                {message.attachments.map((attachment) => (
                                                                    attachment.is_audio ? (
                                                                        <div key={attachment.id} className="flex min-w-64 flex-col gap-1 rounded-lg bg-black/5 p-2">
                                                                            <audio controls preload="metadata" src={attachment.url} aria-label={`Voice message from ${ownMessage ? 'you' : otherUser?.name}`} className="max-w-full" />
                                                                            <span className="text-[11px] opacity-75">Voice message</span>
                                                                        </div>
                                                                    ) : (
                                                                        <a
                                                                            key={attachment.id}
                                                                            href={attachment.url}
                                                                            target={attachment.is_image ? '_blank' : undefined}
                                                                            rel={attachment.is_image ? 'noreferrer' : undefined}
                                                                            className="block max-w-full overflow-hidden rounded-lg bg-black/5 text-inherit"
                                                                        >
                                                                            {attachment.is_image ? (
                                                                                <img
                                                                                    src={attachment.url}
                                                                                    alt={attachment.original_name}
                                                                                    loading="lazy"
                                                                                    className="max-h-80 max-w-full rounded-lg object-contain"
                                                                                />
                                                                            ) : (
                                                                                <span className="flex items-center gap-2 px-3 py-2 text-sm underline">
                                                                                    <span aria-hidden="true">📎</span>
                                                                                    <span className="max-w-64 truncate">{attachment.original_name}</span>
                                                                                    <span className="shrink-0 text-xs opacity-75">
                                                                                        {Math.max(1, Math.ceil(attachment.size / 1024))} KB
                                                                                    </span>
                                                                                </span>
                                                                            )}
                                                                        </a>
                                                                    )
                                                                ))}
                                                            </div>
                                                        )}
                                                        {isDeleted && <p className="whitespace-pre-wrap break-words">{ownMessage ? 'You deleted this message' : 'This message was deleted'}</p>}
                                                    </div>
                                                )}
                                                {editingMessageId !== message.id && (
                                                    <div className={`flex flex-col px-1 text-[10px] text-[#65676b] ${ownMessage ? 'items-end' : 'items-start'}`}>
                                                        <time>{new Date(message.created_at).toLocaleString()}</time>
                                                        {!isDeleted && message.edited_at && <span>Edited</span>}
                                                        {!isDeleted && ownMessage && message.id === latestOwnMessageId && message.read_at && (
                                                            <span className="font-semibold">Seen</span>
                                                        )}
                                                    </div>
                                                )}
                                                {!isDeleted && editingMessageId !== message.id && (
                                                    <div className={`flex flex-wrap items-center gap-1 px-1 ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                                                        <button type="button" onClick={() => beginReply(message)} className="rounded px-1.5 py-1 text-[11px] font-medium text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#0866ff]">Reply</button>
                                                        <details className="relative">
                                                            <summary className="cursor-pointer list-none rounded px-1.5 py-1 text-[11px] font-medium text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#0866ff]">React</summary>
                                                            <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full bg-white p-1.5 shadow-lg ring-1 ring-black/10">
                                                                {reactionOptions.map((reaction) => (
                                                                    <button key={reaction} type="button" onClick={() => toggleReaction(message, reaction)} aria-label={`React ${reaction}`} className="rounded-full p-1 text-lg hover:bg-[#f0f2f5]">{reaction}</button>
                                                                ))}
                                                            </div>
                                                        </details>
                                                        {canEdit && <button type="button" onClick={() => beginEdit(message)} className="rounded px-1.5 py-1 text-[11px] font-medium text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#0866ff]">Edit</button>}
                                                    </div>
                                                )}
                                                {!isDeleted && Object.entries(groupedReactions).length > 0 && (
                                                    <div className={`flex flex-wrap gap-1 ${ownMessage ? 'justify-end' : 'justify-start'}`} aria-label="Message reactions">
                                                        {Object.entries(groupedReactions).map(([reaction, count]) => (
                                                            <button key={reaction} type="button" onClick={() => toggleReaction(message, reaction)} className={`rounded-full border px-2 py-0.5 text-xs ${message.reactions.some((item) => item.user_id === currentUser.id && item.reaction === reaction) ? 'border-[#0866ff] bg-[#e7f3ff]' : 'border-[#e4e6eb] bg-white'}`}>
                                                                {reaction} {count}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <form onSubmit={submit} className="border-t border-[#e4e6eb] px-3 py-3">
                        {typingUsers.length > 0 && (
                            <div className="mb-2 px-2 text-xs font-medium text-[#65676b]">
                                {typingUsers.map((user) => user.name).join(', ')} {typingUsers.length === 1 ? 'is typing...' : 'are typing...'}
                            </div>
                        )}
                        {errors.body && <p className="mb-2 px-2 text-sm text-red-600">{errors.body}</p>}
                        {errors.attachments && <p role="alert" className="mb-2 px-2 text-sm text-red-600">{errors.attachments}</p>}
                        {voiceError && <p role="alert" className="mb-2 px-2 text-sm text-red-600">{voiceError}</p>}
                        {Object.entries(errors)
                            .filter(([key]) => key.startsWith('attachments.'))
                            .map(([key, error]) => <p key={key} role="alert" className="mb-2 px-2 text-sm text-red-600">{error}</p>)}
                        {replyingTo && (
                            <div className="mb-2 flex items-start justify-between gap-3 rounded-lg bg-[#f0f2f5] px-3 py-2">
                                <div className="min-w-0 border-l-2 border-[#0866ff] pl-2">
                                    <p className="text-xs font-semibold text-[#0866ff]">Replying to {replyingTo.sender_id === currentUser.id ? 'yourself' : otherUser?.name}</p>
                                    <p className="truncate text-sm text-[#65676b]">{replyingTo.body}</p>
                                </div>
                                <button type="button" onClick={cancelReply} aria-label="Cancel reply" className="rounded-full px-2 text-lg text-[#65676b] hover:bg-[#e4e6eb]">×</button>
                            </div>
                        )}
                        {errors.reply_to_id && <p role="alert" className="mb-2 px-2 text-sm text-red-600">{errors.reply_to_id}</p>}
                        {data.attachments.length > 0 && (
                            <ul className="mb-2 flex flex-wrap gap-2 px-2" aria-label="Selected attachments">
                                {data.attachments.map((file, index) => (
                                    <li key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-full bg-[#f0f2f5] px-3 py-1 text-xs text-[#1c1e21]">
                                        <span className="max-w-52 truncate">{file.name}</span>
                                        <button
                                            type="button"
                                            aria-label={`Remove ${file.name}`}
                                            onClick={() => setData('attachments', data.attachments.filter((_, fileIndex) => fileIndex !== index))}
                                            className="font-bold text-[#65676b] hover:text-[#1c1e21]"
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {progress && (
                            <div className="mb-2 px-2 text-xs text-[#65676b]" role="status">
                                Uploading attachments: {progress.percentage}%
                            </div>
                        )}
                        <div className="flex items-end gap-1 sm:gap-2">
                            {isStartingVoice ? (
                                <span role="status" aria-label="Waiting for microphone" className="flex h-9 w-9 shrink-0 items-center justify-center text-[#0866ff]">
                                    <SocialIcon name="microphone" className="h-5 w-5 animate-pulse" />
                                </span>
                            ) : isRecordingVoice ? (
                                <div className="flex shrink-0 items-center gap-2">
                                    <span role="status" className="text-xs font-semibold tabular-nums text-red-600">
                                        {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                                    </span>
                                    <button type="button" onClick={stopVoiceRecording} aria-label="Stop recording" title="Stop recording" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0866ff] text-white hover:bg-[#075ce5]">
                                        <SocialIcon name="stop" className="h-5 w-5" />
                                    </button>
                                    <button type="button" onClick={cancelVoiceRecording} aria-label="Cancel recording" title="Cancel recording" className="h-9 rounded-full px-2 text-xs font-semibold text-[#65676b] hover:bg-[#f0f2f5]">
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={startVoiceRecording}
                                    disabled={processing}
                                    aria-label="Record voice"
                                    title="Record voice"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0866ff] hover:bg-[#f0f2f5] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <SocialIcon name="microphone" className="h-5 w-5" />
                                </button>
                            )}
                            <label title="Attach photos or files (up to five, 10 MB each)" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0866ff] ${isRecordingVoice || isStartingVoice ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#f0f2f5]'}`}>
                                <input
                                    ref={attachmentInputRef}
                                    type="file"
                                    multiple
                                    disabled={isRecordingVoice || isStartingVoice}
                                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.webm,.ogg,.mp3,.m4a,.wav,.aac,.3gp"
                                    aria-label="Attach up to five files"
                                    onChange={(event) => setData('attachments', Array.from(event.target.files ?? []))}
                                    className="sr-only"
                                />
                                <SocialIcon name="photo" className="h-5 w-5" />
                            </label>
                            <div className="flex min-h-9 min-w-0 flex-1 items-center rounded-full bg-[#f0f2f5] px-3 focus-within:ring-2 focus-within:ring-[#0866ff]">
                                <textarea
                                    value={data.body}
                                    onChange={(event) => {
                                        setData('body', event.target.value);
                                        if (event.target.value.trim()) {
                                            emitTyping();
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            event.currentTarget.form.requestSubmit();
                                        }
                                    }}
                                    rows="1"
                                    aria-label="Message"
                                    placeholder="Aa"
                                    className="max-h-28 min-h-9 min-w-0 flex-1 resize-none overflow-y-auto rounded-full border-0 bg-transparent px-0 py-2 text-[15px] text-[#1c1e21] placeholder:text-[#65676b] focus:ring-0"
                                />
                                <button
                                    type="button"
                                    aria-label="Add smile emoji"
                                    title="Add smile emoji"
                                    onClick={() => setData('body', `${data.body}🙂`)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#0866ff] hover:bg-[#e4e6eb]"
                                >
                                    <SocialIcon name="smile" className="h-5 w-5" />
                                </button>
                            </div>
                            <button type="submit" aria-label="Send message" disabled={processing || (!data.body.trim() && data.attachments.length === 0)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0866ff] hover:bg-[#f0f2f5] disabled:cursor-not-allowed disabled:text-[#bcc0c4]">
                                <SocialIcon name="send" className="h-5 w-5" />
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </AuthenticatedLayout>
    );
}
