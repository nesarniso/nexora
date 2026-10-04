<?php

namespace App\Http\Controllers;

use App\Events\MessageChanged;
use App\Models\Conversation;
use App\Models\ConversationUserSetting;
use App\Models\Friendship;
use App\Models\Message;
use App\Models\User;
use App\Services\MessagingService;
use App\Services\SocialGraphService;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function __construct(
        private readonly MessagingService $messaging,
        private readonly SocialGraphService $socialGraph,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = $request->string('search')->trim()->toString();
        $view = $request->input('view', 'active');

        $conversations = Conversation::query()
            ->where(function ($query) use ($user) {
                $query->where('user_one_id', $user->id)
                    ->orWhere('user_two_id', $user->id);
            })
            ->whereDoesntHave('userSettings', fn ($settingQuery) => $settingQuery
                ->where('user_id', $user->id)
                ->where('is_deleted', true))
            ->when($view === 'archived', function ($query) use ($user) {
                $query->whereHas('userSettings', fn ($settingQuery) => $settingQuery
                    ->where('user_id', $user->id)
                    ->where('is_archived', true));
            }, function ($query) use ($user) {
                $query->whereDoesntHave('userSettings', fn ($settingQuery) => $settingQuery
                    ->where('user_id', $user->id)
                    ->where('is_archived', true));
            })
            ->when($search !== '', function ($query) use ($search, $user) {
                $query->where(function ($query) use ($search, $user) {
                    $likeSearch = '%'.$search.'%';

                    $query->whereHas('userOne', fn ($userQuery) => $userQuery
                        ->where('id', '!=', $user->id)
                        ->where('name', 'like', $likeSearch))
                        ->orWhereHas('userTwo', fn ($userQuery) => $userQuery
                            ->where('id', '!=', $user->id)
                            ->where('name', 'like', $likeSearch))
                        ->orWhereHas('messages', fn ($messageQuery) => $messageQuery
                            ->whereNull('deleted_at')
                            ->where('body', 'like', $likeSearch)
                            ->whereDoesntHave('hiddenForUsers', fn ($hiddenQuery) => $hiddenQuery
                                ->where('users.id', $user->id)));
                });
            })
            ->withCount([
                'messages as unread_count' => fn ($query) => $query
                    ->where('recipient_id', $user->id)
                    ->whereNull('read_at')
                    ->whereNull('deleted_at')
                    ->whereDoesntHave('hiddenForUsers', fn ($hiddenQuery) => $hiddenQuery
                        ->where('users.id', $user->id))
                    ->whereDoesntHave('conversation.userSettings', fn ($settingQuery) => $settingQuery
                        ->where('user_id', $user->id)
                        ->where('is_archived', true)),
            ])
            ->with([
                'userOne:id,name',
                'userOne.profile:id,user_id,avatar_url',
                'userTwo:id,name',
                'userTwo.profile:id,user_id,avatar_url',
                'userSettings' => fn ($query) => $query->where('user_id', $user->id),
                'messages' => fn ($query) => $query
                    ->select(['id', 'conversation_id', 'sender_id', 'recipient_id', 'body', 'read_at', 'edited_at', 'deleted_at', 'created_at'])
                    ->with('attachments:id,message_id,original_name,mime_type,size')
                    ->whereDoesntHave('hiddenForUsers', fn ($hiddenQuery) => $hiddenQuery
                        ->where('users.id', $user->id))
                    ->latest('id')
                    ->limit(1),
            ])
            ->latest('last_message_at')
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        $otherUserIds = $conversations->getCollection()->map(
            fn (Conversation $conversation): int => $conversation->user_one_id === $user->id
                ? $conversation->user_two_id
                : $conversation->user_one_id,
        );
        $blockedByCurrentUser = Friendship::query()
            ->where('requester_id', $user->id)
            ->where('status', 'blocked')
            ->whereIn('addressee_id', $otherUserIds)
            ->pluck('addressee_id')
            ->all();
        $blockedByOtherUsers = Friendship::query()
            ->where('status', 'blocked')
            ->whereIn('requester_id', $otherUserIds)
            ->where('addressee_id', $user->id)
            ->pluck('requester_id')
            ->all();
        $conversations->getCollection()->each(function (Conversation $conversation) use (
            $user,
            $blockedByCurrentUser,
            $blockedByOtherUsers,
        ): void {
            $otherUserId = $conversation->user_one_id === $user->id
                ? $conversation->user_two_id
                : $conversation->user_one_id;
            $conversation->setAttribute('blocked_by_current_user', in_array($otherUserId, $blockedByCurrentUser, true));
            $conversation->setAttribute('blocked_by_other_user', in_array($otherUserId, $blockedByOtherUsers, true));
        });

        return Inertia::render('Messages/Index', [
            'conversations' => $conversations,
            'filters' => [
                'search' => $search,
                'view' => $view,
            ],
        ]);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        $user = $request->user();

        abort_unless(
            in_array($user->id, [$conversation->user_one_id, $conversation->user_two_id], true),
            404,
        );

        ConversationUserSetting::forUser($user, $conversation)->update(['is_deleted' => false]);

        $conversation->messages()
            ->where('recipient_id', $user->id)
            ->whereNull('read_at')
            ->whereNull('deleted_at')
            ->whereDoesntHave('hiddenForUsers', fn ($hiddenQuery) => $hiddenQuery
                ->where('users.id', $user->id))
            ->update(['read_at' => now()]);

        $messages = $conversation->messages()
            ->with([
                'sender:id,name',
                'replyTo.sender:id,name',
                'reactions:id,message_id,user_id,reaction',
                'attachments:id,message_id,original_name,mime_type,size',
            ])
            ->whereDoesntHave('hiddenForUsers', fn ($hiddenQuery) => $hiddenQuery
                ->where('users.id', $user->id))
            ->latest('id')
            ->limit(50)
            ->get()
            ->reverse()
            ->values();

        $messages->each(function (Message $message) use ($conversation): void {
            foreach ($message->attachments as $attachment) {
                $attachment->setAttribute('url', route('messages.attachments.show', [
                    $conversation,
                    $message,
                    $attachment,
                ]));
                $attachment->setAttribute('is_image', in_array($attachment->mime_type, [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                ], true));
                $attachment->setAttribute('is_audio', str_starts_with($attachment->mime_type, 'audio/'));
            }
        });

        $conversation = $conversation->load([
            'userOne:id,name',
            'userOne.profile:id,user_id,avatar_url',
            'userTwo:id,name',
            'userTwo.profile:id,user_id,avatar_url',
        ]);
        $conversation->setRelation('settings', ConversationUserSetting::forUser($user, $conversation));

        return Inertia::render('Messages/Show', [
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }

    public function start(Request $request, User $user): RedirectResponse
    {
        abort_if($request->user()->is($user), 404);
        abort_if(Friendship::blockedBetween($request->user(), $user), 404);

        $conversation = $this->messaging->conversationFor($request->user(), $user);
        ConversationUserSetting::forUser($request->user(), $conversation)->update(['is_deleted' => false]);

        return Redirect::route('messages.show', $conversation);
    }

    public function store(Request $request, User $user): RedirectResponse
    {
        abort_if($request->user()->is($user), 404);
        abort_if(Friendship::blockedBetween($request->user(), $user), 404);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:2000', 'required_without:attachments'],
            'reply_to_id' => ['nullable', 'integer', 'exists:messages,id'],
            'attachments' => ['nullable', 'array', 'max:5', 'required_without:body'],
            'attachments.*' => [
                'required',
                'file',
                'max:10240',
                function (string $attribute, mixed $value, Closure $fail): void {
                    $audioExtensions = [
                        'webm' => ['audio/webm', 'video/webm'],
                        'ogg' => ['audio/ogg', 'application/ogg', 'video/ogg'],
                        'mp3' => ['audio/mpeg', 'audio/mp3'],
                        'm4a' => ['audio/mp4', 'audio/x-m4a'],
                        'wav' => ['audio/wav', 'audio/x-wav', 'audio/vnd.wave'],
                        'aac' => ['audio/aac', 'audio/x-aac'],
                        '3gp' => ['audio/3gpp'],
                    ];
                    $extension = $value instanceof UploadedFile
                        ? strtolower($value->getClientOriginalExtension())
                        : '';
                    $isSupportedAudio = $value instanceof UploadedFile
                        && in_array($value->getMimeType(), $audioExtensions[$extension] ?? [], true);

                    if ($isSupportedAudio) {
                        return;
                    }

                    $hasSupportedExistingFileType = Validator::make(
                        ['attachment' => $value],
                        ['attachment' => 'mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt,zip'],
                    )->passes();

                    if (! $hasSupportedExistingFileType) {
                        $fail("The {$attribute} must be an image, supported document, or audio file.");
                    }
                },
            ],
        ]);

        $conversation = $this->messaging->conversationFor($request->user(), $user);
        $replyTo = null;

        if (isset($validated['reply_to_id'])) {
            $replyTo = $conversation->messages()
                ->whereKey($validated['reply_to_id'])
                ->whereNull('deleted_at')
                ->whereDoesntHave('hiddenForUsers', fn ($hiddenQuery) => $hiddenQuery
                    ->where('users.id', $request->user()->id))
                ->first();

            if (! $replyTo) {
                throw ValidationException::withMessages([
                    'reply_to_id' => 'Choose a visible message in this conversation to reply to.',
                ]);
            }
        }

        /** @var array<int, UploadedFile> $attachments */
        $attachments = $request->file('attachments', []);

        $this->messaging->sendMessage(
            $request->user(),
            $user,
            $validated['body'] ?? null,
            $replyTo,
            $attachments,
        );

        return Redirect::back();
    }

    public function update(Request $request, Conversation $conversation, Message $message): RedirectResponse
    {
        $this->authorizeMessageAction($request->user(), $conversation, $message);

        abort_unless($message->sender_id === $request->user()->id, 404);
        abort_if($message->deleted_at, 404);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        if ($message->created_at->lt(now()->subMinutes(15))) {
            throw ValidationException::withMessages([
                'body' => 'Messages can only be edited within 15 minutes of sending.',
            ]);
        }

        $message->update([
            'body' => $validated['body'],
            'edited_at' => now(),
        ]);

        MessageChanged::dispatch($conversation->id);

        return Redirect::back();
    }

    public function toggleReaction(Request $request, Conversation $conversation, Message $message): RedirectResponse
    {
        $this->authorizeMessageAction($request->user(), $conversation, $message);
        abort_if($message->deleted_at, 404);

        $validated = $request->validate([
            'reaction' => ['required', 'string', Rule::in(['👍', '❤️', '😂', '😮', '😢', '😡'])],
        ]);

        $reaction = $message->reactions()->where('user_id', $request->user()->id)->first();

        if ($reaction?->reaction === $validated['reaction']) {
            $reaction->delete();
        } else {
            $message->reactions()->updateOrCreate(
                ['user_id' => $request->user()->id],
                ['reaction' => $validated['reaction']],
            );
        }

        MessageChanged::dispatch($conversation->id);

        return Redirect::back();
    }

    public function bulkDelete(Request $request, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        abort_unless(
            in_array($user->id, [$conversation->user_one_id, $conversation->user_two_id], true),
            404,
        );

        $validated = $request->validate([
            'message_ids' => ['required', 'array', 'min:1', 'max:50'],
            'message_ids.*' => ['required', 'integer', 'distinct'],
            'delete_for' => ['required', Rule::in(['me', 'everyone'])],
        ]);
        $messages = $conversation->messages()
            ->whereIn('id', $validated['message_ids'])
            ->get();

        abort_unless($messages->count() === count($validated['message_ids']), 404);

        if ($validated['delete_for'] === 'everyone') {
            $canDeleteForEveryone = $messages->every(fn (Message $message): bool => $message->sender_id === $user->id
                && $message->deleted_at === null
                && $message->created_at->greaterThanOrEqualTo(now()->subHours(6)));

            if (! $canDeleteForEveryone) {
                throw ValidationException::withMessages([
                    'delete_for' => 'Only messages you sent within the last 6 hours can be deleted for everyone.',
                ]);
            }

            $messages->load('attachments:id,message_id,path');
            $attachmentPaths = $messages->flatMap(
                fn (Message $message) => $message->attachments->pluck('path'),
            )->all();

            DB::transaction(function () use ($messages): void {
                foreach ($messages as $message) {
                    $message->attachments()->delete();
                    $message->update([
                        'body' => null,
                        'deleted_at' => now(),
                    ]);
                }
            });

            if ($attachmentPaths !== [] && ! Storage::disk('local')->delete($attachmentPaths)) {
                throw new \RuntimeException('Unable to remove files from deleted messages.');
            }
        } else {
            DB::transaction(function () use ($messages, $user): void {
                foreach ($messages as $message) {
                    $message->hiddenForUsers()->syncWithoutDetaching([$user->id]);
                }
            });
        }

        MessageChanged::dispatch($conversation->id);

        return Redirect::back();
    }

    public function toggleArchive(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request->user(), $conversation);

        $settings = ConversationUserSetting::forUser($request->user(), $conversation);
        $settings->update([
            'is_archived' => ! $settings->is_archived,
        ]);

        return Redirect::back();
    }

    public function toggleMute(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request->user(), $conversation);

        $settings = ConversationUserSetting::forUser($request->user(), $conversation);
        $settings->update([
            'is_muted' => ! $settings->is_muted,
        ]);

        return Redirect::back();
    }

    public function markUnread(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request->user(), $conversation);
        $user = $request->user();

        $conversation->messages()
            ->where('recipient_id', $user->id)
            ->whereNull('deleted_at')
            ->whereDoesntHave('hiddenForUsers', fn ($query) => $query->where('users.id', $user->id))
            ->update(['read_at' => null]);

        return Redirect::back();
    }

    public function deleteForUser(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request->user(), $conversation);
        $user = $request->user();

        DB::transaction(function () use ($conversation, $user): void {
            $conversation->messages()->get()->each(
                fn (Message $message) => $message->hiddenForUsers()->syncWithoutDetaching([$user->id]),
            );

            ConversationUserSetting::forUser($user, $conversation)->update([
                'is_deleted' => true,
            ]);
        });

        return Redirect::back();
    }

    public function toggleBlock(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversationAccess($request->user(), $conversation);
        $otherUser = $conversation->user_one_id === $request->user()->id
            ? $conversation->userTwo
            : $conversation->userOne;

        $this->socialGraph->toggleBlock($request->user(), $otherUser);

        return Redirect::back();
    }

    private function authorizeConversationAccess(User $user, Conversation $conversation): void
    {
        abort_unless(
            in_array($user->id, [$conversation->user_one_id, $conversation->user_two_id], true),
            404,
        );
    }

    private function authorizeMessageAction(User $user, Conversation $conversation, Message $message): void
    {
        abort_unless(
            in_array($user->id, [$conversation->user_one_id, $conversation->user_two_id], true)
                && $message->conversation_id === $conversation->id,
            404,
        );
    }
}
