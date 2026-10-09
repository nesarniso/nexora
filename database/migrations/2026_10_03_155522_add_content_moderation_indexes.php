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
        $supportsFullTextSearch = DB::connection()->getDriverName() === 'pgsql';

        Schema::table('posts', function (Blueprint $table): void {
            $table->index(['created_at', 'id'], 'posts_moderation_created_at_id');
        });

        Schema::table('group_posts', function (Blueprint $table): void {
            $table->index(['created_at', 'id'], 'group_posts_moderation_created_at_id');
        });

        if ($supportsFullTextSearch) {
            Schema::table('posts', function (Blueprint $table): void {
                $table->fullText('content', 'posts_content_fulltext');
            });

            Schema::table('group_posts', function (Blueprint $table): void {
                $table->fullText('content', 'group_posts_content_fulltext');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $supportsFullTextSearch = DB::connection()->getDriverName() === 'pgsql';

        if ($supportsFullTextSearch) {
            Schema::table('posts', function (Blueprint $table): void {
                $table->dropFullText('posts_content_fulltext');
            });

            Schema::table('group_posts', function (Blueprint $table): void {
                $table->dropFullText('group_posts_content_fulltext');
            });
        }

        Schema::table('posts', function (Blueprint $table): void {
            $table->dropIndex('posts_moderation_created_at_id');
        });

        Schema::table('group_posts', function (Blueprint $table): void {
            $table->dropIndex('group_posts_moderation_created_at_id');
        });
    }
};
