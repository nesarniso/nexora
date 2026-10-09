<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecurityEvent extends Model
{
    protected $fillable = [
        'event_type',
        'email',
        'ip_address',
        'user_agent',
    ];
}
