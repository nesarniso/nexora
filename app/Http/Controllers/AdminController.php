<?php

namespace App\Http\Controllers;

use App\Enums\AdminRoleChangeResult;
use App\Models\AdminAuditLog;
use App\Models\Group;
use App\Models\GroupContentReport;
use App\Models\GroupPost;
use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\Profile;
use App\Models\SecurityEvent;
use App\Models\SiteSetting;
use App\Models\User;
use App\Models\UserReport;
use App\Services\AdminRoleManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users' => User::query()->count(),
                'suspendedUsers' => User::query()->where('is_suspended', true)->count(),
                'posts' => Post::query()->count(),
                'groups' => Group::query()->count(),
                'openReports' => GroupContentReport::query()->where('status', 'open')->count()
                    + UserReport::query()->where('status', 'open')->count(),
                'groupPosts' => GroupPost::query()->count(),
            ],
            'recentUsers' => User::query()
                ->select(['id', 'name', 'email', 'is_admin', 'is_suspended', 'created_at'])
                ->with('profile:id,user_id,avatar_url')
                ->latest('created_at')
                ->latest('id')
                ->limit(8)
                ->get(),
            'recentActivity' => AdminAuditLog::query()
                ->with('actor:id,name')
                ->latest()
                ->limit(6)
                ->get(),
        ]);
    }

    public function analytics(): Response
    {
        $today = now()->startOfDay();
        $startDate = $today->copy()->subDays(13);
        $dailyUsers = User::query()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->where('created_at', '>=', $startDate)
            ->groupBy('day')
            ->pluck('total', 'day');
        $dailyPosts = Post::query()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->where('created_at', '>=', $startDate)
            ->groupBy('day')
            ->pluck('total', 'day');
        $dailyGroupPosts = GroupPost::query()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->where('created_at', '>=', $startDate)
            ->groupBy('day')
            ->pluck('total', 'day');

        $dailyActivity = collect(range(13, 0))
            ->map(function (int $daysAgo) use ($dailyUsers, $dailyPosts, $dailyGroupPosts, $today): array {
                $day = $today->copy()->subDays($daysAgo)->toDateString();

                return [
                    'date' => $day,
                    'users' => (int) $dailyUsers->get($day, 0),
                    'posts' => (int) $dailyPosts->get($day, 0) + (int) $dailyGroupPosts->get($day, 0),
                ];
            })
            ->values();

        return Inertia::render('Admin/Analytics', [
            'stats' => [
                'users' => User::query()->count(),
                'posts' => Post::query()->count() + GroupPost::query()->count(),
                'groups' => Group::query()->count(),
                'openReports' => GroupContentReport::query()->where('status', 'open')->count(),
            ],
            'dailyActivity' => $dailyActivity,
        ]);
    }

    public function users(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $search = trim($validated['search'] ?? '');

        $users = User::query()
            ->select(['id', 'name', 'email', 'is_admin', 'is_suspended', 'created_at'])
            ->with('profile:id,user_id,avatar_url')
            ->withCount('posts')
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => ['search' => $search],
        ]);
    }

    public function content(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', Rule::in(['personal', 'group'])],
            'media' => ['nullable', Rule::in(['all', 'with_media', 'without_media'])],
            'per_page' => ['nullable', Rule::in(['25', '50', '100'])],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);
        $search = trim($validated['search'] ?? '');
        $type = $validated['type'] ?? 'personal';
        $media = $validated['media'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? 25);
        $usesFullTextSearch = in_array(DB::connection()->getDriverName(), ['mysql', 'pgsql'], true);

        if ($type === 'personal') {
            $posts = Post::query()
                ->select(['id', 'user_id', 'content', 'visibility', 'created_at'])
                ->with(['user:id,name,email', 'mediaAssets:id,attachable_id,attachable_type,path,type'])
                ->when($media === 'with_media', fn (Builder $query) => $query->whereHas('mediaAssets'))
                ->when($media === 'without_media', fn (Builder $query) => $query->whereDoesntHave('mediaAssets'))
                ->when($search !== '', function (Builder $query) use ($search, $usesFullTextSearch): void {
                    $query->where(function (Builder $query) use ($search, $usesFullTextSearch): void {
                        if (ctype_digit($search)) {
                            $query->orWhere('id', (int) $search);
                        }

                        $query->orWhereHas('user', fn (Builder $user) => $user
                            ->where('name', 'like', $search.'%')
                            ->orWhere('email', $search));

                        if ($usesFullTextSearch) {
                            $query->orWhereFullText('content', $search);
                        } else {
                            $query->orWhere('content', 'like', '%'.$search.'%');
                        }
                    });
                })
                ->when($request->filled('from'), fn (Builder $query) => $query->where('created_at', '>=', $validated['from'].' 00:00:00'))
                ->when($request->filled('to'), fn (Builder $query) => $query->where('created_at', '<=', $validated['to'].' 23:59:59.999999'))
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->cursorPaginate($perPage)
                ->withQueryString();
            $posts->getCollection()->each(function (Post $post): void {
                $post->setAttribute('image_url', $post->mediaAssets->first()?->publicUrl());
                $post->setAttribute('media_count', $post->mediaAssets->count());
                $post->setAttribute('excerpt', Str::limit($post->content, 180));
            });
        } else {
            $posts = GroupPost::query()
                ->select(['id', 'group_id', 'user_id', 'content', 'image_path', 'created_at'])
                ->with(['user:id,name,email', 'group:id,name'])
                ->when($media === 'with_media', fn (Builder $query) => $query->whereNotNull('image_path'))
                ->when($media === 'without_media', fn (Builder $query) => $query->whereNull('image_path'))
                ->when($search !== '', function (Builder $query) use ($search, $usesFullTextSearch): void {
                    $query->where(function (Builder $query) use ($search, $usesFullTextSearch): void {
                        if (ctype_digit($search)) {
                            $query->orWhere('id', (int) $search);
                        }

                        $query->orWhereHas('user', fn (Builder $user) => $user
                            ->where('name', 'like', $search.'%')
                            ->orWhere('email', $search))
                            ->orWhereHas('group', fn (Builder $group) => $group->where('name', 'like', $search.'%'));

                        if ($usesFullTextSearch) {
                            $query->orWhereFullText('content', $search);
                        } else {
                            $query->orWhere('content', 'like', '%'.$search.'%');
                        }
                    });
                })
                ->when($request->filled('from'), fn (Builder $query) => $query->where('created_at', '>=', $validated['from'].' 00:00:00'))
                ->when($request->filled('to'), fn (Builder $query) => $query->where('created_at', '<=', $validated['to'].' 23:59:59.999999'))
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->cursorPaginate($perPage)
                ->withQueryString();
            $posts->getCollection()->each(function (GroupPost $post): void {
                $post->setAttribute(
                    'image_url',
                    $post->image_path === null ? null : Storage::disk('public')->url($post->image_path),
                );
                $post->setAttribute('media_count', $post->image_path === null ? 0 : 1);
                $post->setAttribute('excerpt', Str::limit($post->content, 180));
            });
        }

        return Inertia::render('Admin/Content', [
            'posts' => $posts,
            'filters' => [
                'search' => $search,
                'type' => $type,
                'media' => $media,
                'per_page' => $perPage,
                'from' => $validated['from'] ?? '',
                'to' => $validated['to'] ?? '',
            ],
        ]);
    }

    public function destroyPost(Request $request, Post $post): RedirectResponse
    {
        $targetLabel = 'Post #'.$post->id;
        $mediaPaths = $post->mediaAssets()->pluck('path')->unique()->all();

        DB::transaction(function () use ($post, $request, $targetLabel): void {
            $post->mediaAssets()->delete();
            $post->delete();
            $this->recordActivity($request, 'content.post_deleted', 'post', $post->id, $targetLabel);
        });

        $disk = Storage::disk('public');

        foreach ($mediaPaths as $path) {
            if (
                ! $this->isManagedMediaPath($path)
                || MediaAsset::query()->where('path', $path)->exists()
            ) {
                continue;
            }

            $url = $disk->url($path);
            $isProfilePhoto = Profile::query()
                ->where('avatar_url', $url)
                ->orWhere('cover_url', $url)
                ->exists();

            if (! $isProfilePhoto && $disk->exists($path) && ! $disk->delete($path)) {
                throw new \RuntimeException('The post media could not be deleted from storage.');
            }
        }

        return back();
    }

    public function destroyGroupPost(Request $request, GroupPost $post): RedirectResponse
    {
        $imagePath = $post->image_path;
        $targetLabel = 'Group post #'.$post->id;

        DB::transaction(function () use ($post, $request, $targetLabel): void {
            $post->delete();
            $this->recordActivity($request, 'content.group_post_deleted', 'group_post', $post->id, $targetLabel);
        });

        if (
            $imagePath !== null
            && ! GroupPost::query()->where('image_path', $imagePath)->exists()
            && Storage::disk('public')->exists($imagePath)
            && ! Storage::disk('public')->delete($imagePath)
        ) {
            throw new \RuntimeException('The group post image could not be deleted from storage.');
        }

        return back();
    }

    public function groups(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
        ]);
        $search = trim($validated['search'] ?? '');

        $groups = Group::query()
            ->with('owner:id,name,email')
            ->withCount(['members as approved_members_count' => fn (Builder $members) => $members->where('status', 'approved'), 'posts'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where('name', 'like', '%'.$search.'%')
                    ->orWhereHas('owner', fn (Builder $owner) => $owner
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%'));
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/Groups', [
            'groups' => $groups,
            'filters' => ['search' => $search],
        ]);
    }

    public function destroyGroup(Request $request, Group $group): RedirectResponse
    {
        $groupId = $group->id;
        $targetLabel = $group->name;
        $imagePaths = $group->posts()->whereNotNull('image_path')->pluck('image_path')->all();
        if ($group->cover_path !== null) {
            $imagePaths[] = $group->cover_path;
        }

        DB::transaction(function () use ($group, $groupId, $request, $targetLabel): void {
            $group->delete();
            $this->recordActivity($request, 'group.deleted', 'group', $groupId, $targetLabel);
        });

        $disk = Storage::disk('public');
        foreach (array_unique($imagePaths) as $path) {
            $isStillUsed = GroupPost::query()->where('image_path', $path)->exists()
                || Group::query()->where('cover_path', $path)->exists();

            if (! $isStillUsed && $disk->exists($path) && ! $disk->delete($path)) {
                throw new \RuntimeException('A group image could not be deleted from storage.');
            }
        }

        return back();
    }

    public function updateGroup(Request $request, Group $group): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'privacy' => ['required', Rule::in(['public', 'private'])],
        ]);

        DB::transaction(function () use ($group, $request, $validated): void {
            $group->update($validated);
            $this->recordActivity(
                $request,
                'group.updated',
                'group',
                $group->id,
                $group->name,
                ['privacy' => $group->privacy],
            );
        });

        return back();
    }

    public function reports(Request $request): Response
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['open', 'dismissed', 'resolved', 'all'])],
        ]);
        $status = $validated['status'] ?? 'open';

        $reports = GroupContentReport::query()
            ->with([
                'group:id,name',
                'reporter:id,name,email',
                'reviewedBy:id,name',
                'post:id,group_id,user_id,content,image_path',
                'post.user:id,name,email',
                'comment:id,group_post_id,user_id,content',
                'comment.user:id,name,email',
            ])
            ->when($status !== 'all', fn (Builder $query) => $query->where('status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();
        $userReports = UserReport::query()
            ->with([
                'reporter:id,name,email',
                'reportedUser:id,name,email',
                'reviewedBy:id,name',
            ])
            ->when($status !== 'all', fn (Builder $query) => $query->where('status', $status))
            ->latest()
            ->paginate(15, ['*'], 'user_reports_page')
            ->withQueryString();
        $reports->getCollection()->each(function (GroupContentReport $report): void {
            if ($report->post?->image_path !== null) {
                $report->post->setAttribute(
                    'image_url',
                    Storage::disk('public')->url($report->post->image_path),
                );
            }
        });

        return Inertia::render('Admin/Reports', [
            'reports' => $reports,
            'userReports' => $userReports,
            'filters' => ['status' => $status],
        ]);
    }

    public function reviewUserReport(Request $request, UserReport $userReport): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['dismiss', 'resolve'])],
        ]);

        if ($userReport->status !== 'open') {
            throw ValidationException::withMessages([
                'action' => 'This report has already been reviewed.',
            ]);
        }

        DB::transaction(function () use ($request, $validated, $userReport): void {
            $userReport->update([
                'status' => $validated['action'] === 'dismiss' ? 'dismissed' : 'resolved',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            $this->recordActivity(
                $request,
                'user_report.'.$validated['action'],
                'user_report',
                $userReport->id,
                'User report #'.$userReport->id,
                ['reported_user_id' => $userReport->reported_user_id],
            );
        });

        return back();
    }

    public function reviewReport(Request $request, GroupContentReport $report): RedirectResponse
    {
        $validated = $request->validate([
            'action' => ['required', Rule::in(['dismiss', 'remove_content'])],
        ]);

        if ($report->status !== 'open') {
            throw ValidationException::withMessages([
                'action' => 'This report has already been reviewed.',
            ]);
        }

        $report->load(['post', 'comment']);
        $post = $report->post;
        $comment = $report->comment;
        $imagePath = $post?->image_path;

        if ($validated['action'] === 'remove_content' && $post === null && $comment === null) {
            throw ValidationException::withMessages([
                'action' => 'The reported content is no longer available.',
            ]);
        }

        DB::transaction(function () use ($report, $request, $validated, $post, $comment): void {
            $report->update([
                'status' => $validated['action'] === 'dismiss' ? 'dismissed' : 'resolved',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            if ($validated['action'] === 'remove_content') {
                $post?->delete();
                $comment?->delete();
            }

            $this->recordActivity(
                $request,
                'report.'.($validated['action'] === 'dismiss' ? 'dismissed' : 'content_removed'),
                'group_content_report',
                $report->id,
                'Report #'.$report->id,
                ['group_id' => $report->group_id, 'target_type' => $report->target_type],
            );
        });

        if (
            $validated['action'] === 'remove_content'
            && $imagePath !== null
            && ! GroupPost::query()->where('image_path', $imagePath)->exists()
            && Storage::disk('public')->exists($imagePath)
            && ! Storage::disk('public')->delete($imagePath)
        ) {
            throw new \RuntimeException('The reported group post image could not be deleted from storage.');
        }

        return back();
    }

    public function activity(): Response
    {
        return Inertia::render('Admin/Activity', [
            'activities' => AdminAuditLog::query()
                ->with('actor:id,name,email')
                ->latest()
                ->paginate(25)
                ->withQueryString(),
        ]);
    }

    public function exportActivity(): StreamedResponse
    {
        return response()->streamDownload(function (): void {
            $stream = fopen('php://output', 'w');

            if ($stream === false) {
                throw new \RuntimeException('The audit export stream could not be opened.');
            }

            try {
                fwrite($stream, "\xEF\xBB\xBF");
                fputcsv($stream, [
                    'ID',
                    'Administrator',
                    'Administrator email',
                    'Action',
                    'Target type',
                    'Target ID',
                    'Target',
                    'Metadata',
                    'Created at',
                ], ',', '"', '');

                AdminAuditLog::query()
                    ->with('actor:id,name,email')
                    ->lazyById(500)
                    ->each(function (AdminAuditLog $activity) use ($stream): void {
                        fputcsv($stream, [
                            $activity->id,
                            $this->spreadsheetSafe($activity->actor?->name),
                            $this->spreadsheetSafe($activity->actor?->email),
                            $this->spreadsheetSafe($activity->action),
                            $this->spreadsheetSafe($activity->target_type),
                            $activity->target_id,
                            $this->spreadsheetSafe($activity->target_label),
                            $this->spreadsheetSafe($activity->metadata === null
                                ? null
                                : json_encode($activity->metadata, JSON_THROW_ON_ERROR)),
                            $activity->created_at?->toIso8601String(),
                        ], ',', '"', '');
                    });
            } finally {
                fclose($stream);
            }
        }, 'nexora-admin-audit-'.now()->format('Ymd-His').'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function security(Request $request): Response
    {
        $validated = $request->validate([
            'event_type' => ['nullable', Rule::in(['all', 'login_failed', 'login_locked'])],
            'search' => ['nullable', 'string', 'max:255'],
        ]);
        $eventType = $validated['event_type'] ?? 'all';
        $search = trim($validated['search'] ?? '');

        $events = SecurityEvent::query()
            ->when($eventType !== 'all', fn (Builder $query) => $query->where('event_type', $eventType))
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search): void {
                $query->where('email', 'like', '%'.$search.'%')
                    ->orWhere('ip_address', 'like', '%'.$search.'%');
            }))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/Security', [
            'events' => $events,
            'filters' => ['event_type' => $eventType, 'search' => $search],
        ]);
    }

    public function settings(): Response
    {
        $settings = SiteSetting::query()->firstOrFail();

        return Inertia::render('Admin/Settings', [
            'settings' => [
                ...$settings->only(['site_name', 'tagline', 'announcement', 'registration_enabled']),
                'logo_url' => $settings->logoUrl(),
                'site_icon_url' => $settings->siteIconUrl(),
            ],
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'site_name' => ['required', 'string', 'max:80'],
            'tagline' => ['required', 'string', 'max:160'],
            'announcement' => ['nullable', 'string', 'max:300'],
            'registration_enabled' => ['required', 'boolean'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'site_icon' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'dimensions:min_width=32,min_height=32,max_width=512,max_height=512,ratio=1/1', 'max:2048'],
            'remove_logo' => ['nullable', 'boolean'],
            'remove_site_icon' => ['nullable', 'boolean'],
        ]);

        $newPaths = [];
        $oldPaths = [];
        $disk = Storage::disk('public');

        try {
            foreach (['logo', 'site_icon'] as $field) {
                $file = $request->file($field);

                if ($file instanceof UploadedFile) {
                    $path = $file->storePublicly('site/branding', 'public');

                    if ($path === false) {
                        throw new \RuntimeException("The site {$field} could not be stored.");
                    }

                    $newPaths[$field === 'logo' ? 'logo_path' : 'site_icon_path'] = $path;
                }
            }

            DB::transaction(function () use ($request, $validated, $newPaths, &$oldPaths): void {
                $settings = SiteSetting::query()->firstOrFail();
                $updates = [
                    'site_name' => $validated['site_name'],
                    'tagline' => $validated['tagline'],
                    'announcement' => $validated['announcement'] ?? null,
                    'registration_enabled' => $validated['registration_enabled'],
                ];

                foreach ([
                    'logo_path' => ['logo', 'remove_logo'],
                    'site_icon_path' => ['site_icon', 'remove_site_icon'],
                ] as $pathField => [$uploadField, $removeField]) {
                    if (isset($newPaths[$pathField])) {
                        if ($settings->{$pathField} !== null) {
                            $oldPaths[] = $settings->{$pathField};
                        }

                        $updates[$pathField] = $newPaths[$pathField];
                    } elseif ($request->boolean($removeField) && $settings->{$pathField} !== null) {
                        $oldPaths[] = $settings->{$pathField};
                        $updates[$pathField] = null;
                    }
                }

                $settings->update($updates);

                $this->recordActivity(
                    $request,
                    'site.settings_updated',
                    'site_settings',
                    $settings->id,
                    $settings->site_name,
                    [
                        'site_name' => $settings->site_name,
                        'registration_enabled' => $settings->registration_enabled,
                        'announcement_enabled' => $settings->announcement !== null && $settings->announcement !== '',
                        'logo_updated' => isset($newPaths['logo_path']) || $request->boolean('remove_logo'),
                        'site_icon_updated' => isset($newPaths['site_icon_path']) || $request->boolean('remove_site_icon'),
                    ],
                );
            });
        } catch (\Throwable $exception) {
            foreach ($newPaths as $path) {
                if ($disk->exists($path) && ! $disk->delete($path)) {
                    throw new \RuntimeException('A newly uploaded branding image could not be cleaned up.', previous: $exception);
                }
            }

            throw $exception;
        }

        foreach (array_unique($oldPaths) as $path) {
            if ($disk->exists($path) && ! $disk->delete($path)) {
                throw new \RuntimeException('A replaced site branding image could not be deleted from storage.');
            }
        }

        return back();
    }

    public function updateRole(Request $request, User $user, AdminRoleManager $roles): RedirectResponse
    {
        abort_if($user->is($request->user()), 403, 'You cannot change your own admin access.');

        $validated = $request->validate([
            'action' => ['required', Rule::in(['revoke'])],
        ]);

        $result = $roles->setAdminRole($user, false);

        if ($result === AdminRoleChangeResult::LastAdministrator) {
            throw ValidationException::withMessages([
                'action' => 'At least one administrator must remain.',
            ]);
        }

        if ($result === AdminRoleChangeResult::Updated) {
            $this->recordActivity(
                $request,
                'user.admin_role_'.($validated['action'] === 'grant' ? 'granted' : 'revoked'),
                'user',
                $user->id,
                $user->name,
            );
        }

        return back();
    }

    public function updateUserStatus(Request $request, User $user, AdminRoleManager $roles): RedirectResponse
    {
        abort_if($user->is($request->user()), 403, 'You cannot suspend your own account.');

        $validated = $request->validate([
            'action' => ['required', Rule::in(['suspend', 'restore'])],
        ]);

        $isSuspended = $validated['action'] === 'suspend';
        $result = $roles->setSuspended($user, $isSuspended);

        if ($result === AdminRoleChangeResult::LastActiveAdministrator) {
            throw ValidationException::withMessages([
                'action' => 'At least one administrator account must remain active.',
            ]);
        }

        if ($result === AdminRoleChangeResult::Updated) {
            $this->recordActivity(
                $request,
                'user.account_'.($isSuspended ? 'suspended' : 'restored'),
                'user',
                $user->id,
                $user->name,
            );
        }

        return back();
    }

    /**
     * @param  array<string, int|string|bool|null>  $metadata
     */
    private function recordActivity(
        Request $request,
        string $action,
        string $targetType,
        ?int $targetId,
        ?string $targetLabel = null,
        array $metadata = [],
    ): void {
        AdminAuditLog::query()->create([
            'actor_id' => $request->user()->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_label' => $targetLabel,
            'metadata' => $metadata === [] ? null : $metadata,
        ]);
    }

    private function isManagedMediaPath(string $path): bool
    {
        return str_starts_with($path, 'media/')
            || preg_match('#^profile-photos/\d+/(avatar|cover)/[^/]+$#D', $path) === 1;
    }

    private function spreadsheetSafe(?string $value): ?string
    {
        if ($value !== null && preg_match('/^[\x00-\x20]*[=+\-@]/', $value) === 1) {
            return "'".$value;
        }

        return $value;
    }
}
