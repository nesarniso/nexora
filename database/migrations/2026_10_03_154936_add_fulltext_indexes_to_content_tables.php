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
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('posts', function (Blueprint $table): void {
            $table->fullText('content', 'posts_content_fulltext');
        });

        Schema::table('group_posts', function (Blueprint $table): void {
            $table->fullText('content', 'group_posts_content_fulltext');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('posts', function (Blueprint $table): void {
            $table->dropFullText('posts_content_fulltext');
        });

        Schema::table('group_posts', function (Blueprint $table): void {
            $table->dropFullText('group_posts_content_fulltext');
        });
    }
};
