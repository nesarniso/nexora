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
        Schema::create('site_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('site_name', 80)->default('Nexora');
            $table->string('tagline', 160)->default('Connect with friends and the people who make your world.');
            $table->text('announcement')->nullable();
            $table->boolean('registration_enabled')->default(true);
            $table->timestamps();
        });

        DB::table('site_settings')->insert([
            'site_name' => 'Nexora',
            'tagline' => 'Connect with friends and the people who make your world.',
            'registration_enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
