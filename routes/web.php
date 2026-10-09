<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\GroupModerationController;
use App\Http\Controllers\GroupPostCommentController;
use App\Http\Controllers\GroupPostController;
use App\Http\Controllers\MediaAssetController;
use App\Http\Controllers\MessageAttachmentController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReactionController;
use App\Http\Controllers\SocialGraphController;
use App\Http\Controllers\StoryController;
use App\Http\Controllers\SavedPostController;
use App\Http\Controllers\UserReportController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified', 'active'])->group(function () {
    Route::get('/dashboard', [PostController::class, 'index'])->name('dashboard');

    Route::prefix('admin')->name('admin.')->middleware('admin')->group(function () {
        Route::get('/', [AdminController::class, 'index'])->name('dashboard');
        Route::get('/analytics', [AdminController::class, 'analytics'])->name('analytics.index');
        Route::get('/users', [AdminController::class, 'users'])->name('users.index');
        Route::patch('/users/{user}/role', [AdminController::class, 'updateRole'])->name('users.role.update');
        Route::patch('/users/{user}/status', [AdminController::class, 'updateUserStatus'])->name('users.status.update');
        Route::get('/content', [AdminController::class, 'content'])->name('content.index');
        Route::delete('/content/posts/{post}', [AdminController::class, 'destroyPost'])->name('content.posts.destroy');
        Route::delete('/content/group-posts/{post}', [AdminController::class, 'destroyGroupPost'])->name('content.group-posts.destroy');
        Route::get('/groups', [AdminController::class, 'groups'])->name('groups.index');
        Route::patch('/groups/{group}', [AdminController::class, 'updateGroup'])->name('groups.update');
        Route::delete('/groups/{group}', [AdminController::class, 'destroyGroup'])->name('groups.destroy');
        Route::get('/reports', [AdminController::class, 'reports'])->name('reports.index');
        Route::patch('/reports/{report}', [AdminController::class, 'reviewReport'])->name('reports.review');
        Route::patch('/user-reports/{userReport}', [AdminController::class, 'reviewUserReport'])->name('user-reports.review');
        Route::get('/activity', [AdminController::class, 'activity'])->name('activity.index');
        Route::get('/activity/export', [AdminController::class, 'exportActivity'])->name('activity.export');
        Route::get('/security', [AdminController::class, 'security'])->name('security.index');
        Route::get('/settings', [AdminController::class, 'settings'])->name('settings.index');
        Route::patch('/settings', [AdminController::class, 'updateSettings'])->name('settings.update');
    });
    Route::get('/posts/{post}', [PostController::class, 'show'])->name('posts.show');
    Route::post('/posts', [PostController::class, 'store'])->name('posts.store');
    Route::patch('/posts/{post}', [PostController::class, 'update'])->name('posts.update');
    Route::delete('/posts/{post}', [PostController::class, 'destroy'])->name('posts.destroy');
    Route::get('/saved-posts', [SavedPostController::class, 'index'])->name('saved-posts.index');
    Route::post('/posts/{post}/saved', [SavedPostController::class, 'store'])->name('posts.saved.store');
    Route::delete('/posts/{post}/saved', [SavedPostController::class, 'destroy'])->name('posts.saved.destroy');
    Route::post('/stories', [StoryController::class, 'store'])->name('stories.store');
    Route::post('/posts/{post}/media', [MediaAssetController::class, 'store'])->name('posts.media.store');
    Route::post('/posts/{post}/comments', [CommentController::class, 'store'])->name('posts.comments.store');
    Route::post('/posts/{post}/reactions', [ReactionController::class, 'store'])->name('posts.reactions.store');

    Route::post('/users/{user}/friend-request', [SocialGraphController::class, 'sendFriendRequest'])->name('friend-request.store');
    Route::post('/users/{user}/friend-accept', [SocialGraphController::class, 'acceptFriendRequest'])->name('friend-request.accept');
    Route::post('/users/{user}/friend-reject', [SocialGraphController::class, 'rejectFriendRequest'])->name('friend-request.reject');
    Route::post('/users/{user}/friend-cancel', [SocialGraphController::class, 'cancelFriendRequest'])->name('friend-request.cancel');
    Route::post('/users/{user}/follow', [SocialGraphController::class, 'toggleFollow'])->name('follow.toggle');
    Route::get('/friends', [SocialGraphController::class, 'index'])->name('friends.index');

    Route::get('/groups', [GroupController::class, 'index'])->name('groups.index');
    Route::post('/groups', [GroupController::class, 'store'])->name('groups.store');
    Route::get('/groups/{group}', [GroupController::class, 'show'])->name('groups.show');
    Route::post('/groups/{group}/membership', [GroupController::class, 'join'])->name('groups.join');
    Route::delete('/groups/{group}/membership', [GroupController::class, 'leave'])->name('groups.leave');
    Route::post('/groups/{group}/invitations', [GroupController::class, 'inviteFriend'])->name('groups.invitations.store');
    Route::delete('/groups/{group}/invitations', [GroupController::class, 'declineInvitation'])->name('groups.invitations.destroy');
    Route::post('/groups/{group}/cover', [GroupController::class, 'updateCover'])->name('groups.cover.update');
    Route::patch('/groups/{group}/members/{membership}', [GroupController::class, 'moderateMember'])->name('groups.members.moderate');
    Route::delete('/groups/{group}/members/{membership}', [GroupController::class, 'removeMember'])->name('groups.members.remove');
    Route::patch('/groups/{group}/members/{membership}/management', [GroupModerationController::class, 'updateMember'])->name('groups.members.management');
    Route::post('/groups/{group}/posts/{post}/reports', [GroupModerationController::class, 'reportPost'])->name('groups.posts.reports.store');
    Route::delete('/groups/{group}/posts/{post}/comments/{comment}', [GroupModerationController::class, 'destroyComment'])->name('groups.posts.comments.destroy');
    Route::post('/groups/{group}/posts/{post}/comments/{comment}/reports', [GroupModerationController::class, 'reportComment'])->name('groups.posts.comments.reports.store');
    Route::patch('/groups/{group}/reports/{report}', [GroupModerationController::class, 'reviewReport'])->name('groups.reports.review');
    Route::post('/groups/{group}/posts', [GroupController::class, 'storePost'])->name('groups.posts.store');
    Route::patch('/groups/{group}/posts/{post}', [GroupPostController::class, 'update'])->name('groups.posts.update');
    Route::delete('/groups/{group}/posts/{post}', [GroupPostController::class, 'destroy'])->name('groups.posts.destroy');
    Route::post('/groups/{group}/posts/{post}/reactions', [GroupPostController::class, 'toggleReaction'])->name('groups.posts.reactions.store');
    Route::post('/groups/{group}/posts/{post}/comments', [GroupPostCommentController::class, 'store'])->name('groups.posts.comments.store');

    Route::get('/messages', [MessageController::class, 'index'])->name('messages.index');
    Route::get('/messages/{conversation}', [MessageController::class, 'show'])->name('messages.show');
    Route::get('/conversations/{conversation}/messages/{message}/attachments/{attachment}', [MessageAttachmentController::class, 'show'])
        ->scopeBindings()
        ->name('messages.attachments.show');
    Route::post('/users/{user}/conversations', [MessageController::class, 'start'])->name('conversations.store');
    Route::post('/conversations/{conversation}/archive', [MessageController::class, 'toggleArchive'])->name('conversations.archive');
    Route::post('/conversations/{conversation}/mute', [MessageController::class, 'toggleMute'])->name('conversations.mute');
    Route::post('/conversations/{conversation}/unread', [MessageController::class, 'markUnread'])->name('conversations.unread');
    Route::post('/conversations/{conversation}/delete', [MessageController::class, 'deleteForUser'])->name('conversations.delete');
    Route::post('/conversations/{conversation}/block', [MessageController::class, 'toggleBlock'])->name('conversations.block');
    Route::post('/users/{user}/reports', [UserReportController::class, 'store'])->name('users.reports.store');
    Route::post('/users/{user}/messages', [MessageController::class, 'store'])->name('messages.store');
    Route::patch('/conversations/{conversation}/messages/{message}', [MessageController::class, 'update'])->name('messages.update');
    Route::post('/conversations/{conversation}/messages/{message}/reactions', [MessageController::class, 'toggleReaction'])->name('messages.reactions.store');
    Route::post('/conversations/{conversation}/messages/bulk-delete', [MessageController::class, 'bulkDelete'])->name('messages.bulk-delete');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read', [NotificationController::class, 'markAllAsRead'])->name('notifications.read');

    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::get('/users/{user}', [ProfileController::class, 'showUser'])->name('users.show');
    Route::get('/profile/{section}', [ProfileController::class, 'showProfileSection'])
        ->whereIn('section', ['about', 'friends', 'photos'])
        ->name('profile.section');
    Route::get('/users/{user}/{section}', [ProfileController::class, 'showUserSection'])
        ->whereIn('section', ['about', 'friends', 'photos'])
        ->name('users.section');
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/privacy', [ProfileController::class, 'updatePrivacy'])->name('profile.privacy.update');
    Route::post('/profile/photos', [ProfileController::class, 'updatePhotos'])->name('profile.photos.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
