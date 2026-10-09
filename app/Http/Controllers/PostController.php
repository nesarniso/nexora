<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\Profile;
use App\Models\Story;
use App\Services\MediaService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'visibility' => ['nullable', 'string', 'in:public,friends,only_me'],
        ]);
        $search = trim($filters['search'] ?? '');

        $stories = Story::query()
            ->where('expires_at', '>', now())
            ->where(function (Builder $visibleStories) use ($user) {
                $visibleStories->where('stories.user_id', $user->id)
                    ->orWhere(function (Builder $friendsOnly) use ($user) {
                        $friendsOnly->whereExists(function (QueryBuilder $friendship) use ($user) {
                            $friendship->selectRaw('1')
                                ->from('friendships')
                                ->where('friendships.status', 'accepted')
                                ->where(function (QueryBuilder $pair) use ($user) {
                                    $pair->where(function (QueryBuilder $direction) use ($user) {
                                        $direction->whereColumn('friendships.requester_id', 'stories.user_id')
                                            ->where('friendships.addressee_id', $user->id);
                                    })->orWhere(function (QueryBuilder $direction) use ($user) {
                                        $direction->whereColumn('friendships.addressee_id', 'stories.user_id')
                                            ->where('friendships.requester_id', $user->id);
                                    });
                                });
                        });
                    });
            })
            ->whereNotExists(function (QueryBuilder $newerStory) {
                $newerStory->selectRaw('1')
                    ->from('stories as newer_stories')
                    ->whereColumn('newer_stories.user_id', 'stories.user_id')
                    ->where('newer_stories.expires_at', '>', now())
                    ->where(function (QueryBuilder $newer) {
                        $newer->whereColumn('newer_stories.created_at', '>', 'stories.created_at')
                            ->orWhere(function (QueryBuilder $sameTime) {
                                $sameTime->whereColumn('newer_stories.created_at', 'stories.created_at')
                                    ->whereColumn('newer_stories.id', '>', 'stories.id');
                            });
                    });
            })
            ->with(['user.profile', 'mediaAssets'])
            ->latest()
            ->limit(30)
            ->get()
            ->map(function (Story $story): array {
                $media = $story->mediaAssets->first();

                return [
                    'id' => $story->id,
                    'caption' => $story->caption,
                    'created_at' => $story->created_at,
                    'user' => [
                        'id' => $story->user->id,
                        'name' => $story->user->name,
                        'profile' => [
                            'avatar_url' => $story->user->profile?->avatar_url,
                        ],
                    ],
                    'media' => $media ? [
                        'type' => $media->type,
                        'url' => Storage::disk('public')->url($media->path),
                    ] : null,
                ];
            })
            ->filter(fn (array $story): bool => $story['media'] !== null)
            ->values();

        $posts = Post::query()
            ->visibleTo($user)
            ->when($filters['visibility'] ?? null, fn ($query, string $visibility) => $query->where('visibility', $visibility))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('content', 'like', '%'.$search.'%')
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', '%'.$search.'%'));
                });
            })
            ->with([
                'user.profile',
                'mediaAssets',
                'comments' => fn ($query) => $query->latest()->limit(3),
                'comments.user.profile',
                'reactions' => fn ($query) => $query->where('user_id', $user->id),
            ])
            ->withExists(['savedByUsers as is_saved' => fn ($query) => $query->where('users.id', $user->id)])
            ->withCount(['comments', 'reactions'])
            ->latest()
            ->paginate(10);

        $posts->withQueryString();
        $posts->getCollection()->each(function (Post $post): void {
            $post->mediaAssets->each(fn (MediaAsset $asset) => $asset->setAttribute('url', $asset->publicUrl()));
        });

        return Inertia::render('Dashboard', [
            'profile' => $user?->profile,
            'stories' => $stories,
            'posts' => $posts,
            'filters' => [
                'search' => $search,
                'visibility' => $filters['visibility'] ?? 'all',
            ],
            'friendCount' => $user ? Friendship::query()
                ->where('status', 'accepted')
                ->where(function ($query) use ($user) {
                    $query->where('requester_id', $user->id)
                        ->orWhere('addressee_id', $user->id);
                })
                ->count() : 0,
            'followingCount' => $user ? $user->following()->count() : 0,
            'followerCount' => $user ? $user->followers()->count() : 0,
        ]);
    }

    public function show(Request $request, Post $post): Response
    {
        $user = $request->user();
        abort_unless(Post::query()->visibleTo($user)->whereKey($post->id)->exists(), 404);

        $post = Post::query()
            ->visibleTo($user)
            ->with([
                'user.profile',
                'mediaAssets',
                'comments' => fn ($query) => $query->latest()->limit(3),
                'comments.user.profile',
                'reactions' => fn ($query) => $query->where('user_id', $user->id),
            ])
            ->withExists(['savedByUsers as is_saved' => fn ($query) => $query->where('users.id', $user->id)])
            ->withCount(['comments', 'reactions'])
            ->findOrFail($post->id);

        $post->mediaAssets->each(fn (MediaAsset $asset) => $asset->setAttribute('url', $asset->publicUrl()));

        return Inertia::render('Posts/Show', [
            'post' => $post,
            'isOwner' => $post->user_id === $user->id,
        ]);
    }

    public function store(Request $request, MediaService $mediaService): RedirectResponse
    {
        $validated = $request->validate([
            'content' => ['required_without:file', 'nullable', 'string', 'max:2000'],
            'visibility' => ['sometimes', 'string', 'in:public,friends,only_me'],
            'file' => ['nullable', 'required_without:content', 'file', 'mimes:jpg,jpeg,png,gif,webp,mp4,mov,avi,m4v', 'max:25000'],
            'caption' => ['nullable', 'string', 'max:500'],
        ]);

        $post = $request->user()->posts()->create([
            'content' => $validated['content'] ?? '',
            'visibility' => $validated['visibility'] ?? 'public',
        ]);

        $file = $request->file('file');

        if ($file !== null) {
            $mediaService->createForPost($post, $file, $validated['caption'] ?? null);
        }

        return redirect()->route('dashboard');
    }

    public function update(Request $request, Post $post): RedirectResponse
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'content' => ['nullable', 'string', 'max:2000'],
            'visibility' => ['required', 'string', 'in:public,friends,only_me'],
        ]);

        $post->update($validated);

        return back();
    }

    public function destroy(Request $request, Post $post): RedirectResponse
    {
        abort_unless($post->user_id === $request->user()->id, 403);

        $paths = $post->mediaAssets()->pluck('path')->unique()->all();

        DB::transaction(function () use ($post): void {
            $post->mediaAssets()->delete();
            $post->delete();
        });

        $disk = Storage::disk('public');

        foreach ($paths as $path) {
            if (! $this->isManagedMediaPath($path) || MediaAsset::query()->where('path', $path)->exists()) {
                continue;
            }

            $url = $disk->url($path);
            $isProfilePhoto = Profile::query()
                ->where('avatar_url', $url)
                ->orWhere('cover_url', $url)
                ->exists();

            if (! $isProfilePhoto) {
                $disk->delete($path);
            }
        }

        return back();
    }

    private function isManagedMediaPath(string $path): bool
    {
        return str_starts_with($path, 'media/')
            || preg_match('#^profile-photos/\d+/(avatar|cover)/[^/]+$#D', $path) === 1;
    }
}
