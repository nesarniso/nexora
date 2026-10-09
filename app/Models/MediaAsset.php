<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

class MediaAsset extends Model
{
    protected $fillable = [
        'user_id',
        'attachable_type',
        'attachable_id',
        'type',
        'path',
        'mime_type',
        'file_name',
        'size',
        'caption',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function publicUrl(): string
    {
        return preg_match('/^https?:\/\//i', $this->path) === 1
            ? $this->path
            : Storage::disk('public')->url($this->path);
    }
}
