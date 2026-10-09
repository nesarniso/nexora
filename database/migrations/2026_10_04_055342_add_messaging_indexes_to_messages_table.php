<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->index(['conversation_id', 'recipient_id', 'read_at'], 'messages_conversation_unread_index');
            $table->index(['recipient_id', 'read_at'], 'messages_recipient_unread_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_conversation_unread_index');
            $table->dropIndex('messages_recipient_unread_index');
        });
    }
};
