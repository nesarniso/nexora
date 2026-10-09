<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class MessageAttachmentController extends Controller
{
    public function show(
        Request $request,
        Conversation $conversation,
        Message $message,
        MessageAttachment $attachment,
    ): Response {
        $user = $request->user();

        abort_unless(
            in_array($user->id, [$conversation->user_one_id, $conversation->user_two_id], true)
                && $message->conversation_id === $conversation->id
                && $attachment->message_id === $message->id
                && $message->deleted_at === null
                && ! $message->hiddenForUsers()->where('users.id', $user->id)->exists(),
            404,
        );

        $disk = Storage::disk('local');
        abort_unless($disk->exists($attachment->path), 404);

        $headers = [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if (in_array($attachment->mime_type, [
            'audio/webm',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav',
            'audio/x-wav',
            'audio/aac',
            'audio/3gpp',
        ], true)) {
            return response()->file($disk->path($attachment->path), [
                ...$headers,
                'Content-Type' => $attachment->mime_type,
                'Content-Disposition' => 'inline',
                'Content-Security-Policy' => "default-src 'none'; media-src 'self'; sandbox",
            ]);
        }

        if (in_array($attachment->mime_type, [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ], true)) {
            return response()->file($disk->path($attachment->path), [
                ...$headers,
                'Content-Type' => $attachment->mime_type,
                'Content-Security-Policy' => "default-src 'none'; sandbox",
            ]);
        }

        $downloadName = Str::ascii(basename(str_replace('\\', '/', $attachment->original_name)));

        return $disk->download(
            $attachment->path,
            $downloadName !== '' ? $downloadName : 'attachment',
            [
                ...$headers,
                'Content-Type' => 'application/octet-stream',
            ],
        );
    }
}
