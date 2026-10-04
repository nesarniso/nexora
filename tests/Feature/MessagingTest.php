<?php

namespace Tests\Feature;

use App\Events\MessageChanged;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\ConversationUserSetting;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MessagingTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_send_message_to_another_user(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        Event::fake([MessageSent::class]);

        $response = $this
            ->actingAs($sender)
            ->post('/users/'.$recipient->id.'/messages', [
                'body' => 'Hello from the social graph phase!',
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('conversations', [
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);

        $this->assertDatabaseHas('messages', [
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'Hello from the social graph phase!',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $recipient->id,
            'type' => 'message_received',
        ]);

        Event::assertDispatched(
            MessageSent::class,
            fn (MessageSent $event): bool => $event->message->sender_id === $sender->id
                && $event->message->recipient_id === $recipient->id
                && $event->message->body === 'Hello from the social graph phase!',
        );
    }

    public function test_user_can_send_an_attachment_without_message_text(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $file = UploadedFile::fake()->image('holiday.jpg');
        Storage::fake('local');
        Event::fake([MessageSent::class]);

        $this->actingAs($sender)
            ->post(route('messages.store', $recipient), [
                'body' => '',
                'attachments' => [$file],
            ])
            ->assertRedirect();

        $message = Message::query()->firstOrFail();
        $attachment = MessageAttachment::query()->firstOrFail();

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'sender_id' => $sender->id,
            'body' => null,
        ]);
        $this->assertDatabaseHas('message_attachments', [
            'id' => $attachment->id,
            'message_id' => $message->id,
            'original_name' => 'holiday.jpg',
            'mime_type' => 'image/jpeg',
        ]);
        Storage::disk('local')->assertExists($attachment->path);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $recipient->id,
            'type' => 'message_received',
            'data->message' => 'Sent an attachment',
        ]);

        $this->actingAs($recipient)
            ->get(route('messages.show', $message->conversation_id))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Show')
                ->where('messages.0.attachments.0.original_name', 'holiday.jpg')
                ->where('messages.0.attachments.0.url', route('messages.attachments.show', [
                    $message->conversation_id,
                    $message->id,
                    $attachment->id,
                ]))
            );

        $this->actingAs($recipient)
            ->get(route('messages.attachments.show', [
                $message->conversation_id,
                $message->id,
                $attachment->id,
            ]))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');

        $this->actingAs($recipient)
            ->get(route('messages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Index')
                ->where('conversations.data.0.messages.0.attachments.0.original_name', 'holiday.jpg')
            );

        Event::assertDispatched(MessageSent::class);
    }

    public function test_user_can_send_a_private_voice_message_and_recipient_can_play_it(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $outsider = User::factory()->create();
        Storage::fake('local');
        Event::fake([MessageSent::class]);

        $this->actingAs($sender)
            ->post(route('messages.store', $recipient), [
                'body' => '',
                'attachments' => [
                    UploadedFile::fake()->create('voice-note.webm', 48, 'audio/webm'),
                ],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $message = Message::query()->firstOrFail();
        $attachment = MessageAttachment::query()->firstOrFail();

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => null,
            'sender_id' => $sender->id,
        ]);
        $this->assertDatabaseHas('message_attachments', [
            'id' => $attachment->id,
            'message_id' => $message->id,
            'original_name' => 'voice-note.webm',
            'mime_type' => 'audio/webm',
        ]);
        Storage::disk('local')->assertExists($attachment->path);

        $this->actingAs($recipient)
            ->get(route('messages.show', $message->conversation_id))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Show')
                ->where('messages.0.attachments.0.is_audio', true)
                ->where('messages.0.attachments.0.url', route('messages.attachments.show', [
                    $message->conversation_id,
                    $message->id,
                    $attachment->id,
                ]))
            );

        $this->actingAs($recipient)
            ->get(route('messages.attachments.show', [
                $message->conversation_id,
                $message->id,
                $attachment->id,
            ]))
            ->assertOk()
            ->assertHeader('Content-Type', 'audio/webm')
            ->assertHeader('Content-Disposition', 'inline');

        $this->actingAs($outsider)
            ->get(route('messages.attachments.show', [
                $message->conversation_id,
                $message->id,
                $attachment->id,
            ]))
            ->assertNotFound();

        Event::assertDispatched(MessageSent::class);
    }

    public function test_user_cannot_send_a_message_without_text_or_attachments(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        Event::fake([MessageSent::class]);

        $this->actingAs($sender)
            ->from(route('messages.index'))
            ->post(route('messages.store', $recipient), [
                'body' => '',
            ])
            ->assertSessionHasErrors('body');

        $this->assertDatabaseCount('conversations', 0);
        $this->assertDatabaseCount('messages', 0);
        $this->assertDatabaseCount('notifications', 0);
        Event::assertNotDispatched(MessageSent::class);
    }

    public function test_only_conversation_participants_can_download_message_attachments(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $outsider = User::factory()->create();
        $file = UploadedFile::fake()->create('private-report.pdf', 12, 'application/pdf');
        Storage::fake('local');

        $this->actingAs($sender)
            ->post(route('messages.store', $recipient), [
                'body' => 'Please review this file',
                'attachments' => [$file],
            ])
            ->assertRedirect();

        $message = Message::query()->firstOrFail();
        $attachment = MessageAttachment::query()->firstOrFail();

        $this->actingAs($recipient)
            ->get(route('messages.attachments.show', [
                $message->conversation_id,
                $message->id,
                $attachment->id,
            ]))
            ->assertOk()
            ->assertHeader('Content-Disposition');

        $this->actingAs($recipient)
            ->post(route('messages.bulk-delete', $message->conversation_id), [
                'message_ids' => [$message->id],
                'delete_for' => 'me',
            ])
            ->assertRedirect();

        $this->actingAs($recipient)
            ->get(route('messages.attachments.show', [
                $message->conversation_id,
                $message->id,
                $attachment->id,
            ]))
            ->assertNotFound();

        $this->actingAs($sender)
            ->get(route('messages.attachments.show', [
                $message->conversation_id,
                $message->id,
                $attachment->id,
            ]))
            ->assertOk();

        $this->actingAs($outsider)
            ->get(route('messages.attachments.show', [
                $message->conversation_id,
                $message->id,
                $attachment->id,
            ]))
            ->assertNotFound();
    }

    public function test_deleting_a_message_for_everyone_removes_its_private_attachments(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        Storage::fake('local');
        Event::fake([MessageSent::class, MessageChanged::class]);

        $this->actingAs($sender)
            ->post(route('messages.store', $recipient), [
                'body' => 'Remove this file too',
                'attachments' => [
                    UploadedFile::fake()->create('report.pdf', 12, 'application/pdf'),
                ],
            ])
            ->assertRedirect();

        $message = Message::query()->firstOrFail();
        $attachment = MessageAttachment::query()->firstOrFail();
        Storage::disk('local')->assertExists($attachment->path);

        $this->actingAs($sender)
            ->post(route('messages.bulk-delete', $message->conversation_id), [
                'message_ids' => [$message->id],
                'delete_for' => 'everyone',
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('message_attachments', [
            'id' => $attachment->id,
        ]);
        Storage::disk('local')->assertMissing($attachment->path);
        Event::assertDispatched(MessageSent::class);
        Event::assertDispatched(MessageChanged::class);
    }

    public function test_user_cannot_send_an_unsupported_attachment_type(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        Storage::fake('local');
        Event::fake([MessageSent::class]);

        $this->actingAs($sender)
            ->from(route('messages.show', 1))
            ->post(route('messages.store', $recipient), [
                'body' => '',
                'attachments' => [
                    UploadedFile::fake()->create('active-content.html', 1, 'text/html'),
                ],
            ])
            ->assertSessionHasErrors('attachments.0');

        $this->assertDatabaseCount('messages', 0);
        $this->assertDatabaseCount('message_attachments', 0);
        Storage::disk('local')->assertDirectoryEmpty('message-attachments');
        Event::assertNotDispatched(MessageSent::class);
    }

    public function test_user_cannot_send_more_than_five_attachments_in_one_message(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        Storage::fake('local');
        Event::fake([MessageSent::class]);

        $this->actingAs($sender)
            ->from(route('messages.index'))
            ->post(route('messages.store', $recipient), [
                'body' => 'Too many attachments',
                'attachments' => [
                    UploadedFile::fake()->image('one.jpg'),
                    UploadedFile::fake()->image('two.jpg'),
                    UploadedFile::fake()->image('three.jpg'),
                    UploadedFile::fake()->image('four.jpg'),
                    UploadedFile::fake()->image('five.jpg'),
                    UploadedFile::fake()->image('six.jpg'),
                ],
            ])
            ->assertSessionHasErrors('attachments');

        $this->assertDatabaseCount('messages', 0);
        $this->assertDatabaseCount('message_attachments', 0);
        Storage::disk('local')->assertDirectoryEmpty('message-attachments');
        Event::assertNotDispatched(MessageSent::class);
    }

    public function test_user_cannot_send_an_attachment_larger_than_ten_megabytes(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        Storage::fake('local');
        Event::fake([MessageSent::class]);

        $this->actingAs($sender)
            ->from(route('messages.index'))
            ->post(route('messages.store', $recipient), [
                'body' => 'Oversized attachment',
                'attachments' => [
                    UploadedFile::fake()->create('large-document.pdf', 10241, 'application/pdf'),
                ],
            ])
            ->assertSessionHasErrors('attachments.0');

        $this->assertDatabaseCount('messages', 0);
        $this->assertDatabaseCount('message_attachments', 0);
        Storage::disk('local')->assertDirectoryEmpty('message-attachments');
        Event::assertNotDispatched(MessageSent::class);
    }

    public function test_user_can_start_a_conversation_from_another_users_profile(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($sender)
            ->post(route('conversations.store', $recipient))
            ->assertRedirect(route('messages.show', Conversation::query()->firstOrFail()));

        $this->assertDatabaseHas('conversations', [
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
    }

    public function test_user_cannot_view_a_conversation_they_do_not_belong_to(): void
    {
        $participantOne = User::factory()->create();
        $participantTwo = User::factory()->create();
        $outsider = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => $participantOne->id,
            'user_two_id' => $participantTwo->id,
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $participantOne->id,
            'recipient_id' => $participantTwo->id,
            'body' => 'Private conversation text',
        ]);

        $this->actingAs($outsider)
            ->get(route('messages.show', $conversation))
            ->assertNotFound();

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'read_at' => null,
        ]);
    }

    public function test_only_conversation_participants_can_authorize_a_private_channel(): void
    {
        $participantOne = User::factory()->create();
        $participantTwo = User::factory()->create();
        $outsider = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => $participantOne->id,
            'user_two_id' => $participantTwo->id,
        ]);
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-app-key',
            'broadcasting.connections.reverb.secret' => 'test-app-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app-id',
        ]);
        Broadcast::forgetDrivers();
        require base_path('routes/channels.php');

        $channelName = 'private-conversations.'.$conversation->id;
        $channelRequest = [
            'socket_id' => '123.456',
            'channel_name' => $channelName,
        ];

        $this->actingAs($participantOne)
            ->postJson('/broadcasting/auth', $channelRequest)
            ->assertOk();

        $this->actingAs($outsider)
            ->postJson('/broadcasting/auth', $channelRequest)
            ->assertForbidden();
    }

    public function test_opening_a_conversation_marks_only_incoming_unread_messages_as_read(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $unreadMessage = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'Unread message',
        ]);
        $readMessage = $conversation->messages()->create([
            'sender_id' => $recipient->id,
            'recipient_id' => $sender->id,
            'body' => 'Message already read by sender',
            'read_at' => now()->subMinute(),
        ]);

        $this->actingAs($recipient)
            ->get(route('messages.show', $conversation))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Show')
                ->has('messages', 2)
            );

        $this->assertDatabaseMissing('messages', [
            'id' => $unreadMessage->id,
            'read_at' => null,
        ]);
        $this->assertDatabaseHas('messages', [
            'id' => $readMessage->id,
            'read_at' => $readMessage->read_at,
        ]);
    }

    public function test_inbox_shows_the_latest_message_and_unread_count_only_for_its_conversations(): void
    {
        $viewer = User::factory()->create();
        $friend = User::factory()->create();
        $outsiderOne = User::factory()->create();
        $outsiderTwo = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($viewer->id, $friend->id),
            'user_two_id' => max($viewer->id, $friend->id),
        ]);
        $conversation->messages()->create([
            'sender_id' => $friend->id,
            'recipient_id' => $viewer->id,
            'body' => 'Earlier message',
            'created_at' => now()->subMinute(),
        ]);
        $conversation->messages()->create([
            'sender_id' => $friend->id,
            'recipient_id' => $viewer->id,
            'body' => 'Latest message',
        ]);
        Conversation::query()->create([
            'user_one_id' => min($outsiderOne->id, $outsiderTwo->id),
            'user_two_id' => max($outsiderOne->id, $outsiderTwo->id),
        ]);

        $this->actingAs($viewer)
            ->get(route('messages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Index')
                ->has('conversations.data', 1)
                ->where('conversations.data.0.id', $conversation->id)
                ->where('conversations.data.0.unread_count', 2)
                ->where('conversations.data.0.messages.0.body', 'Latest message')
                ->where('unreadMessagesCount', 2)
            );
    }

    public function test_archived_conversations_are_hidden_from_the_active_inbox_and_visible_in_the_archived_view(): void
    {
        $viewer = User::factory()->create();
        $friend = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($viewer->id, $friend->id),
            'user_two_id' => max($viewer->id, $friend->id),
        ]);
        $conversation->messages()->create([
            'sender_id' => $friend->id,
            'recipient_id' => $viewer->id,
            'body' => 'Archived chat preview',
        ]);

        ConversationUserSetting::query()->updateOrCreate([
            'conversation_id' => $conversation->id,
            'user_id' => $viewer->id,
        ], [
            'is_archived' => true,
        ]);

        $this->actingAs($viewer)
            ->get(route('messages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Index')
                ->has('conversations.data', 0)
            );

        $this->actingAs($viewer)
            ->get(route('messages.index', ['view' => 'archived']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Index')
                ->where('filters.view', 'archived')
                ->where('conversations.data.0.id', $conversation->id)
            );

        $this->actingAs($viewer)
            ->post(route('conversations.archive', $conversation))
            ->assertRedirect();

        $this->assertDatabaseHas('conversation_user_settings', [
            'conversation_id' => $conversation->id,
            'user_id' => $viewer->id,
            'is_archived' => false,
        ]);
    }

    public function test_muted_conversations_suppress_message_notifications_until_the_user_unmutes_them(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        ConversationUserSetting::query()->updateOrCreate([
            'conversation_id' => $conversation->id,
            'user_id' => $recipient->id,
        ], [
            'is_muted' => true,
        ]);

        $this->actingAs($sender)
            ->post(route('messages.store', $recipient), [
                'body' => 'Muted conversation message',
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $recipient->id,
            'type' => 'message_received',
            'message' => 'Muted conversation message',
        ]);

        $this->actingAs($recipient)
            ->post(route('conversations.mute', $conversation))
            ->assertRedirect();

        $this->assertDatabaseHas('conversation_user_settings', [
            'conversation_id' => $conversation->id,
            'user_id' => $recipient->id,
            'is_muted' => false,
        ]);
    }

    public function test_inbox_search_matches_any_message_and_excludes_other_conversations(): void
    {
        $viewer = User::factory()->create();
        $friend = User::factory()->create(['name' => 'Community Friend']);
        $otherFriend = User::factory()->create(['name' => 'Different Person']);
        $conversation = Conversation::query()->create([
            'user_one_id' => min($viewer->id, $friend->id),
            'user_two_id' => max($viewer->id, $friend->id),
        ]);
        $conversation->messages()->create([
            'sender_id' => $friend->id,
            'recipient_id' => $viewer->id,
            'body' => 'Searchable phrase from earlier',
            'created_at' => now()->subMinute(),
        ]);
        Conversation::query()->create([
            'user_one_id' => min($viewer->id, $otherFriend->id),
            'user_two_id' => max($viewer->id, $otherFriend->id),
        ]);

        $this->actingAs($viewer)
            ->get('/messages?search=Searchable')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Index')
                ->where('filters.search', 'Searchable')
                ->has('conversations.data', 1)
                ->where('conversations.data.0.id', $conversation->id)
            );
    }

    public function test_user_can_reply_to_a_message_in_the_same_conversation(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $originalMessage = $conversation->messages()->create([
            'sender_id' => $recipient->id,
            'recipient_id' => $sender->id,
            'body' => 'Original message',
        ]);

        $this->actingAs($sender)
            ->post(route('messages.store', $recipient), [
                'body' => 'A reply',
                'reply_to_id' => $originalMessage->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'sender_id' => $sender->id,
            'body' => 'A reply',
            'reply_to_id' => $originalMessage->id,
        ]);
    }

    public function test_user_cannot_reply_to_a_message_from_a_different_conversation(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $otherUser = User::factory()->create();
        $otherConversation = Conversation::query()->create([
            'user_one_id' => min($recipient->id, $otherUser->id),
            'user_two_id' => max($recipient->id, $otherUser->id),
        ]);
        $otherMessage = $otherConversation->messages()->create([
            'sender_id' => $recipient->id,
            'recipient_id' => $otherUser->id,
            'body' => 'Not part of this conversation',
        ]);

        $this->actingAs($sender)
            ->from(route('messages.index'))
            ->post(route('messages.store', $recipient), [
                'body' => 'A forged reply',
                'reply_to_id' => $otherMessage->id,
            ])
            ->assertSessionHasErrors('reply_to_id');

        $this->assertDatabaseMissing('messages', [
            'sender_id' => $sender->id,
            'body' => 'A forged reply',
        ]);
    }

    public function test_sender_can_edit_a_message_within_fifteen_minutes(): void
    {
        $this->freezeTime();
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'Original message',
        ]);
        $message->forceFill(['created_at' => now()->subMinutes(14)])->save();
        Event::fake([MessageChanged::class]);

        $this->actingAs($sender)
            ->patch(route('messages.update', [$conversation, $message]), [
                'body' => 'Edited message',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => 'Edited message',
        ]);
        Event::assertDispatched(
            MessageChanged::class,
            fn (MessageChanged $event): bool => $event->conversationId === $conversation->id,
        );
    }

    public function test_user_cannot_edit_another_users_message(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $recipient->id,
            'recipient_id' => $sender->id,
            'body' => 'Original message',
        ]);

        $this->actingAs($sender)
            ->patch(route('messages.update', [$conversation, $message]), [
                'body' => 'Unauthorized edit',
            ])
            ->assertNotFound();

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => 'Original message',
        ]);
    }

    public function test_sender_cannot_edit_a_message_after_fifteen_minutes(): void
    {
        $this->freezeTime();
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'Original message',
        ]);
        $message->forceFill(['created_at' => now()->subMinutes(15)->subSecond()])->save();

        $this->actingAs($sender)
            ->from(route('messages.show', $conversation))
            ->patch(route('messages.update', [$conversation, $message]), [
                'body' => 'Too-late edit',
            ])
            ->assertSessionHasErrors('body');

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => 'Original message',
        ]);
    }

    public function test_user_can_toggle_a_reaction_on_a_message(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'React to this',
        ]);

        $this->actingAs($recipient)
            ->post(route('messages.reactions.store', [$conversation, $message]), [
                'reaction' => '❤️',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $recipient->id,
            'reaction' => '❤️',
        ]);

        $this->actingAs($recipient)
            ->post(route('messages.reactions.store', [$conversation, $message]), [
                'reaction' => '❤️',
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('message_reactions', [
            'message_id' => $message->id,
            'user_id' => $recipient->id,
        ]);
    }

    public function test_user_can_delete_a_message_for_their_inbox_without_deleting_it_for_the_other_participant(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'Keep this for the recipient',
        ]);

        $this->actingAs($recipient)
            ->post(route('messages.bulk-delete', $conversation), [
                'message_ids' => [$message->id],
                'delete_for' => 'me',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => 'Keep this for the recipient',
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('message_user_deletions', [
            'message_id' => $message->id,
            'user_id' => $recipient->id,
        ]);

        $this->actingAs($sender)
            ->get(route('messages.show', $conversation))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Show')
                ->where('messages.0.body', 'Keep this for the recipient')
            );

        $this->actingAs($recipient)
            ->get(route('messages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Index')
                ->where('unreadMessagesCount', 0)
            );
    }

    public function test_sender_can_delete_a_message_for_everyone_within_six_hours(): void
    {
        $this->freezeTime();
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'Remove for everyone',
        ]);
        $message->forceFill(['created_at' => now()->subHours(5)])->save();

        $this->actingAs($sender)
            ->post(route('messages.bulk-delete', $conversation), [
                'message_ids' => [$message->id],
                'delete_for' => 'everyone',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => null,
        ]);
        $this->assertDatabaseMissing('message_user_deletions', [
            'message_id' => $message->id,
        ]);

        $this->actingAs($recipient)
            ->get(route('messages.show', $conversation))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Messages/Show')
                ->where('messages.0.body', null)
            );
    }

    public function test_sender_cannot_delete_a_message_for_everyone_after_six_hours(): void
    {
        $this->freezeTime();
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'Too old to recall',
        ]);
        $message->forceFill(['created_at' => now()->subHours(6)->subSecond()])->save();

        $this->actingAs($sender)
            ->from(route('messages.show', $conversation))
            ->post(route('messages.bulk-delete', $conversation), [
                'message_ids' => [$message->id],
                'delete_for' => 'everyone',
            ])
            ->assertSessionHasErrors('delete_for');

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => 'Too old to recall',
            'deleted_at' => null,
        ]);
    }

    public function test_mixed_message_selection_can_only_be_deleted_for_the_current_user(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_one_id' => min($sender->id, $recipient->id),
            'user_two_id' => max($sender->id, $recipient->id),
        ]);
        $sentMessage = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'body' => 'My message',
        ]);
        $receivedMessage = $conversation->messages()->create([
            'sender_id' => $recipient->id,
            'recipient_id' => $sender->id,
            'body' => 'Their message',
        ]);

        $this->actingAs($sender)
            ->from(route('messages.show', $conversation))
            ->post(route('messages.bulk-delete', $conversation), [
                'message_ids' => [$sentMessage->id, $receivedMessage->id],
                'delete_for' => 'everyone',
            ])
            ->assertSessionHasErrors('delete_for');

        $this->assertDatabaseHas('messages', [
            'id' => $sentMessage->id,
            'body' => 'My message',
            'deleted_at' => null,
        ]);
        $this->assertDatabaseHas('messages', [
            'id' => $receivedMessage->id,
            'body' => 'Their message',
            'deleted_at' => null,
        ]);

        $this->actingAs($sender)
            ->post(route('messages.bulk-delete', $conversation), [
                'message_ids' => [$sentMessage->id, $receivedMessage->id],
                'delete_for' => 'me',
            ])
            ->assertRedirect();

        $this->assertDatabaseCount('message_user_deletions', 2);
    }

    public function test_user_can_mark_notifications_as_read(): void
    {
        $user = User::factory()->create();

        Notification::query()->create([
            'id' => (string) str()->uuid(),
            'user_id' => $user->id,
            'type' => 'message_received',
            'data' => ['message' => 'Hello there'],
        ]);

        $response = $this
            ->actingAs($user)
            ->post('/notifications/read');

        $response->assertRedirect();

        $notification = $user->fresh()->notifications()->first();
        $this->assertNotNull($notification->read_at);
    }
}
