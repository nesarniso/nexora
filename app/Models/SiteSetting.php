<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class SiteSetting extends Model
{
    protected $fillable = [
        'site_name',
        'tagline',
        'announcement',
        'registration_enabled',
        'logo_path',
        'site_icon_path',
    ];

    protected function casts(): array
    {
        return [
            'registration_enabled' => 'boolean',
        ];
    }

    public function logoUrl(): ?string
    {
        return $this->logo_path === null
            ? null
            : Storage::disk('public')->url($this->logo_path);
    }

    public function siteIconUrl(): ?string
    {
        return $this->site_icon_path === null
            ? null
            : Storage::disk('public')->url($this->site_icon_path);
    }
}
