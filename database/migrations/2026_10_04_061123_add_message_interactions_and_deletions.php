<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table): void {
            $table->text('body')->nullable()->change();
            $table->foreignId('reply_to_id')->nullable()->after('recipient_id')->constrained('messages')->nullOnDelete();
            $table->timestamp('edited_at')->nullable()->after('read_at');
            $table->timestamp('deleted_at')->nullable()->after('edited_at');
            $table->index(['conversation_id', 'created_at'], 'messages_conversation_created_index');
        });

        Schema::create('message_reactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reaction', 16);
            $table->timestamps();

            $table->unique(['message_id', 'user_id']);
        });

        Schema::create('message_user_deletions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['message_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('message_user_deletions');
        Schema::dropIfExists('message_reactions');

        DB::table('messages')
            ->whereNull('body')
            ->update(['body' => 'This message was deleted']);

        Schema::table('messages', function (Blueprint $table): void {
            $table->dropIndex('messages_conversation_created_index');
            $table->dropConstrainedForeignId('reply_to_id');
            $table->dropColumn(['edited_at', 'deleted_at']);
            $table->text('body')->nullable(false)->change();
        });
    }
};
