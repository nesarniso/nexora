<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\ConversationUserSetting;
use App\Models\Friendship;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class MessagingService
{
    public function conversationFor(User $userOne, User $userTwo): Conversation
    {
        $first = min($userOne->id, $userTwo->id);
        $second = max($userOne->id, $userTwo->id);

        return Conversation::query()->firstOrCreate([
            'user_one_id' => $first,
            'user_two_id' => $second,
        ]);
    }

    /**
     * @param  array<int, UploadedFile>  $attachments
     */
    public function sendMessage(
        User $sender,
        User $recipient,
        ?string $body,
        ?Message $replyTo = null,
        array $attachments = [],
    ): Message {
        $messageBody = trim($body ?? '') !== '' ? $body : null;

        if (Friendship::blockedBetween($sender, $recipient)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'body' => 'This message cannot be sent because one of you has blocked the other.',
            ]);
        }

        if ($messageBody === null && $attachments === []) {
            throw new \InvalidArgumentException('A message must include text or an attachment.');
        }

        $conversation = $this->conversationFor($sender, $recipient);

        $message = DB::transaction(function () use ($conversation, $sender, $recipient, $messageBody, $replyTo, $attachments) {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $sender->id,
                'recipient_id' => $recipient->id,
                'body' => $messageBody,
                'reply_to_id' => $replyTo?->id,
            ]);

            foreach ($attachments as $file) {
                $path = $file->store('message-attachments', 'local');

                if (! $path) {
                    throw new RuntimeException('Unable to store the message attachment.');
                }

                $mimeType = $file->getMimeType() ?? 'application/octet-stream';
                $extension = strtolower($file->getClientOriginalExtension());
                $audioMimeTypes = [
                    'webm' => 'audio/webm',
                    'ogg' => 'audio/ogg',
                    'mp3' => 'audio/mpeg',
                    'm4a' => 'audio/mp4',
                    'wav' => 'audio/wav',
                    'aac' => 'audio/aac',
                    '3gp' => 'audio/3gpp',
                ];

                if (isset($audioMimeTypes[$extension]) && (
                    str_starts_with($mimeType, 'audio/')
                    || in_array($mimeType, ['video/webm', 'video/ogg', 'video/mp4'], true)
                )) {
                    $mimeType = $audioMimeTypes[$extension];
                }

                $message->attachments()->create([
                    'path' => $path,
                    'original_name' => Str::limit($file->getClientOriginalName(), 255, ''),
                    'mime_type' => $mimeType,
                    'size' => $file->getSize(),
                ]);
            }

            $conversation->update([
                'last_message_at' => now(),
            ]);

            return $message;
        });

        $recipientSettings = $conversation->userSettingFor($recipient);
        ConversationUserSetting::query()
            ->where('conversation_id', $conversation->id)
            ->whereIn('user_id', [$sender->id, $recipient->id])
            ->update(['is_deleted' => false]);

        if (! $recipientSettings->is_muted) {
            app(NotificationService::class)->create($recipient, 'message_received', [
                'conversation_id' => $conversation->id,
                'sender_id' => $sender->id,
                'message_id' => $message->id,
                'message' => $messageBody ?? 'Sent an attachment',
            ]);
        }

        MessageSent::dispatch($message);

        return $message;
    }
}
