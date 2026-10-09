<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Friendship;
use App\Models\MediaAsset;
use App\Models\Post;
use App\Models\User;
use App\Services\PrivacyService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProfileController extends Controller
{
    /**
     * Display the authenticated user's social profile.
     */
    public function show(Request $request): Response
    {
        return $this->displayProfile($request, $request->user());
    }

    public function showProfileSection(Request $request, string $section): Response
    {
        return $this->displayProfile($request, $request->user(), $section);
    }

    public function showUser(Request $request, User $user): Response
    {
        return $this->displayProfile($request, $user);
    }

    public function showUserSection(Request $request, User $user, string $section): Response
    {
        return $this->displayProfile($request, $user, $section);
    }

    private function displayProfile(Request $request, User $user, string $section = 'posts'): Response
    {
        $viewer = $request->user();
        $user->loadMissing('profile');
        $isOwnProfile = $viewer->is($user);
        $friendship = $isOwnProfile ? null : Friendship::query()
            ->where(function ($query) use ($viewer, $user): void {
                $query->where('requester_id', $viewer->id)
                    ->where('addressee_id', $user->id);
            })
            ->orWhere(function ($query) use ($viewer, $user): void {
                $query->where('requester_id', $user->id)
                    ->where('addressee_id', $viewer->id);
            })
            ->first(['requester_id', 'addressee_id', 'status']);
        $areFriends = $isOwnProfile || $friendship?->status === 'accepted';
        $canViewLocation = PrivacyService::canViewProfileField(
            $viewer,
            $user,
            $user->profile->location_visibility,
            $areFriends,
        );
        $canViewPhotos = PrivacyService::canViewProfileField(
            $viewer,
            $user,
            $user->profile->photos_visibility,
            $areFriends,
        );
        $canViewFriendsList = PrivacyService::canViewProfileField(
            $viewer,
            $user,
            $user->profile->friends_visibility,
            $areFriends,
        );
        $posts = Post::query()
            ->visibleTo($viewer)
            ->whereBelongsTo($user)
            ->with([
                'mediaAssets',
                'comments' => fn ($query) => $query->latest()->limit(3),
                'comments.user.profile',
                'reactions' => fn ($query) => $query->where('user_id', $viewer->id),
            ])
            ->withCount(['comments', 'reactions'])
            ->latest()
            ->paginate(10);

        $posts->getCollection()->each(function (Post $post): void {
            $post->mediaAssets->each(fn (MediaAsset $asset) => $asset->setAttribute('url', $asset->publicUrl()));
        });

        $friends = $canViewFriendsList
            ? Friendship::query()
                ->with(['requester.profile', 'addressee.profile'])
                ->where('status', 'accepted')
                ->where(function ($query) use ($user) {
                    $query->where('requester_id', $user->id)
                        ->orWhere('addressee_id', $user->id);
                })
                ->latest()
                ->limit(6)
                ->get()
                ->map(function (Friendship $friendship) use ($user): array {
                    $friend = $friendship->requester_id === $user->id
                        ? $friendship->addressee
                        : $friendship->requester;

                    return [
                        'id' => $friend->id,
                        'name' => $friend->name,
                        'username' => $friend->profile?->username,
                        'avatar_url' => $friend->profile?->avatar_url,
                    ];
                })
            : collect();

        $sectionFriends = $section === 'friends' && $canViewFriendsList
            ? Friendship::query()
                ->with(['requester.profile', 'addressee.profile'])
                ->where('status', 'accepted')
                ->where(function ($query) use ($user) {
                    $query->where('requester_id', $user->id)
                        ->orWhere('addressee_id', $user->id);
                })
                ->latest()
                ->paginate(24, ['*'], 'friends_page')
                ->through(function (Friendship $friendship) use ($user): array {
                    $friend = $friendship->requester_id === $user->id
                        ? $friendship->addressee
                        : $friendship->requester;

                    return [
                        'id' => $friend->id,
                        'name' => $friend->name,
                        'username' => $friend->profile?->username,
                        'avatar_url' => $friend->profile?->avatar_url,
                    ];
                })
            : null;

        $photos = $canViewPhotos ? $posts->getCollection()
            ->flatMap(fn (Post $post) => $post->mediaAssets
                ->where('type', 'image')
                ->map(fn ($asset) => [
                    'id' => $asset->id,
                    'url' => $asset->publicUrl(),
                    'caption' => $asset->caption,
                ]))
            ->take(9)
            ->values() : collect();

        $videos = $canViewPhotos ? $posts->getCollection()
            ->flatMap(fn (Post $post) => $post->mediaAssets
                ->where('type', 'video')
                ->map(fn ($asset) => [
                    'id' => $asset->id,
                    'url' => $asset->publicUrl(),
                    'caption' => $asset->caption,
                ]))
            ->values() : collect();

        $galleryPhotos = $isOwnProfile
            ? MediaAsset::query()
                ->whereBelongsTo($user)
                ->where('type', 'image')
                ->where('status', 'uploaded')
                ->where('attachable_type', (new Post)->getMorphClass())
                ->whereIn('attachable_id', $user->posts()->select('posts.id'))
                ->latest()
                ->limit(60)
                ->get()
                ->map(fn (MediaAsset $asset) => [
                    'id' => $asset->id,
                    'url' => $asset->publicUrl(),
                    'caption' => $asset->caption,
                ])
                ->values()
            : collect();
        $sectionPhotos = $section === 'photos' && $canViewPhotos
            ? MediaAsset::query()
                ->whereBelongsTo($user)
                ->where('type', 'image')
                ->where('status', 'uploaded')
                ->whereHasMorph('attachable', [Post::class], fn ($query) => $query
                    ->visibleTo($viewer)
                    ->whereBelongsTo($user))
                ->latest()
                ->paginate(24, ['*'], 'photos_page')
                ->through(fn (MediaAsset $asset): array => [
                    'id' => $asset->id,
                    'url' => $asset->publicUrl(),
                    'caption' => $asset->caption,
                ])
            : null;

        return Inertia::render('Profile/Show', [
            'section' => $section,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'created_at' => $user->created_at,
            ],
            'isOwnProfile' => $isOwnProfile,
            'canViewPhotos' => $canViewPhotos,
            'canViewFriendsList' => $canViewFriendsList,
            'friendship' => $friendship === null ? null : [
                'status' => $friendship->status,
                'isOutgoing' => $friendship->requester_id === $viewer->id,
            ],
            'profile' => [
                'username' => $user->profile?->username,
                'bio' => $user->profile?->bio,
                'location' => $canViewLocation ? $user->profile?->location : null,
                'website' => $user->profile?->website,
                'avatar_url' => $user->profile?->avatar_url,
                'cover_url' => $user->profile?->cover_url,
            ],
            'posts' => $posts,
            'photos' => $photos,
            'galleryPhotos' => $galleryPhotos,
            'sectionPhotos' => $sectionPhotos,
            'sectionFriends' => $sectionFriends,
            'videos' => $videos,
            'friends' => $friends,
            'friendCount' => $canViewFriendsList
                ? Friendship::query()
                    ->where('status', 'accepted')
                    ->where(function ($query) use ($user) {
                        $query->where('requester_id', $user->id)
                            ->orWhere('addressee_id', $user->id);
                    })
                    ->count()
                : null,
            'followingCount' => $user->following()->count(),
            'followerCount' => $user->followers()->count(),
        ]);
    }

    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'profile' => $request->user()->profile,
            'privacy' => [
                'location_visibility' => $request->user()->profile->location_visibility,
                'photos_visibility' => $request->user()->profile->photos_visibility,
                'friends_visibility' => $request->user()->profile->friends_visibility,
            ],
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $profileData = $request->safe()->only([
            'username',
            'bio',
            'location',
            'website',
            'avatar_url',
            'cover_url',
        ]);

        DB::transaction(function () use ($request, $user, $profileData): void {
            $user->fill($request->safe()->only(['name', 'email']));

            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }

            $user->save();

            $profile = $user->profile()->firstOrCreate(['user_id' => $user->id]);

            if (! array_key_exists('username', $profileData) || blank($profileData['username'])) {
                $profileData['username'] = $profile->username ?? $this->generateUsername($user->name);
            }

            $photoUpdates = [];

            foreach (['avatar' => 'avatar_url', 'cover' => 'cover_url'] as $photoType => $attribute) {
                $newUrl = $profileData[$attribute] ?? null;

                if (filled($newUrl) && $newUrl !== $profile->{$attribute}) {
                    $photoUpdates[$photoType] = $newUrl;
                }
            }

            $profile->fill($profileData);
            $profile->save();

            foreach ($photoUpdates as $photoType => $url) {
                $this->createPhotoUpdatePost(
                    $user,
                    $photoType,
                    $url,
                    'image/remote',
                    basename(parse_url($url, PHP_URL_PATH) ?: $photoType.'.jpg'),
                    0,
                );
            }
        });

        return Redirect::route('profile.edit');
    }

    public function updatePrivacy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'location_visibility' => ['required', Rule::in(['public', 'friends', 'only_me'])],
            'photos_visibility' => ['required', Rule::in(['public', 'friends', 'only_me'])],
            'friends_visibility' => ['required', Rule::in(['public', 'friends', 'only_me'])],
        ], [
            'location_visibility.in' => 'Choose a valid audience for your location.',
            'photos_visibility.in' => 'Choose a valid audience for photos on your profile.',
            'friends_visibility.in' => 'Choose a valid audience for your friends list.',
        ]);

        $request->user()->profile()->firstOrFail()->fill($validated)->save();

        return Redirect::route('profile.edit')->with('status', 'privacy-updated');
    }

    public function updatePhotos(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'avatar' => ['nullable', 'required_without_all:cover,gallery_photo_id', 'prohibits:gallery_photo_id', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:8192'],
            'cover' => ['nullable', 'required_without_all:avatar,gallery_photo_id', 'prohibits:gallery_photo_id', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:8192'],
            'gallery_photo_id' => ['nullable', 'required_without_all:avatar,cover', 'integer'],
        ]);

        $user = $request->user();
        $profile = $user->profile()->firstOrFail();
        $disk = Storage::disk('public');
        $galleryPhoto = isset($validated['gallery_photo_id'])
            ? MediaAsset::query()
                ->whereBelongsTo($user)
                ->where('type', 'image')
                ->where('status', 'uploaded')
                ->where('attachable_type', (new Post)->getMorphClass())
                ->whereIn('attachable_id', $user->posts()->select('posts.id'))
                ->findOrFail($validated['gallery_photo_id'])
            : null;
        $photoChanges = [];
        $oldPaths = [];
        $newPaths = [];

        try {
            foreach (['avatar', 'cover'] as $photoType) {
                $file = $request->file($photoType);

                if ($file === null) {
                    continue;
                }

                $directory = 'profile-photos/'.$user->id.'/'.$photoType;
                $path = $file->store($directory, 'public');

                if ($path === false) {
                    throw new \RuntimeException('The profile photo could not be stored.');
                }

                $newPaths[] = $path;
                $photoChanges[$photoType] = [
                    'path' => $path,
                    'mime_type' => $file->getMimeType() ?? 'image/jpeg',
                    'file_name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                ];
            }

            if ($galleryPhoto !== null) {
                $photoChanges['avatar'] = [
                    'path' => $galleryPhoto->path,
                    'mime_type' => $galleryPhoto->mime_type,
                    'file_name' => $galleryPhoto->file_name,
                    'size' => $galleryPhoto->size,
                ];
            }

            $updatedPhotos = [];
            $postPhotoChanges = [];

            foreach ($photoChanges as $photoType => $photo) {
                $urlAttribute = $photoType.'_url';
                $newUrl = $this->photoUrl($photo['path']);

                if ($profile->{$urlAttribute} === $newUrl) {
                    continue;
                }

                $directory = 'profile-photos/'.$user->id.'/'.$photoType;
                $oldPaths[] = $this->profilePhotoPath($profile->{$urlAttribute}, $directory, $disk->url($directory.'/'));
                $updatedPhotos[$urlAttribute] = $newUrl;
                $postPhotoChanges[$photoType] = $photo;
            }

            DB::transaction(function () use ($profile, $user, $updatedPhotos, $postPhotoChanges): void {
                if ($updatedPhotos === []) {
                    return;
                }

                $profile->update($updatedPhotos);

                foreach ($postPhotoChanges as $photoType => $photo) {
                    $this->createPhotoUpdatePost(
                        $user,
                        $photoType,
                        $photo['path'],
                        $photo['mime_type'],
                        $photo['file_name'],
                        $photo['size'],
                    );
                }
            });
        } catch (Throwable $exception) {
            foreach ($newPaths as $path) {
                $disk->delete($path);
            }

            throw $exception;
        }

        foreach (array_filter($oldPaths) as $oldPath) {
            if (! MediaAsset::query()->where('path', $oldPath)->exists()) {
                $disk->delete($oldPath);
            }
        }

        return back();
    }

    private function createPhotoUpdatePost(
        User $user,
        string $photoType,
        string $path,
        string $mimeType,
        string $fileName,
        int $size,
    ): void {
        $post = $user->posts()->create([
            'content' => $photoType === 'avatar'
                ? 'updated their profile photo'
                : 'updated their cover photo',
            'visibility' => 'public',
        ]);

        $post->mediaAssets()->create([
            'user_id' => $user->id,
            'type' => 'image',
            'path' => $path,
            'mime_type' => $mimeType,
            'file_name' => $fileName,
            'size' => $size,
            'caption' => $photoType === 'avatar' ? 'Profile photo' : 'Cover photo',
            'status' => 'uploaded',
        ]);
    }

    private function photoUrl(string $path): string
    {
        return preg_match('/^https?:\/\//i', $path) === 1
            ? $path
            : Storage::disk('public')->url($path);
    }

    private function profilePhotoPath(?string $url, string $directory, string $directoryUrl): ?string
    {
        if ($url === null || ! str_starts_with($url, $directoryUrl)) {
            return null;
        }

        $path = substr($url, strlen($directoryUrl));

        return $path !== '' && ! str_contains($path, '/') && ! str_contains($path, '..')
            ? $directory.'/'.$path
            : null;
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    protected function generateUsername(string $name): string
    {
        $base = Str::slug($name) ?: 'user';
        $username = $base;
        $counter = 2;

        while (auth()->check() && auth()->user()->profile()->where('username', $username)->exists()) {
            $username = $base.'-'.$counter;
            $counter++;
        }

        return $username;
    }
}
