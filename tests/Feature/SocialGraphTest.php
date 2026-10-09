<?php

namespace Tests\Feature;

use App\Models\Friendship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SocialGraphTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_send_friend_request(): void
    {
        $requester = User::factory()->create();
        $addressee = User::factory()->create();

        $response = $this
            ->actingAs($requester)
            ->post('/users/'.$addressee->id.'/friend-request');

        $response->assertRedirect();
        $this->assertDatabaseHas('friendships', [
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $addressee->id,
            'type' => 'friend_request_received',
        ]);
    }

    public function test_friend_request_can_be_accepted(): void
    {
        $requester = User::factory()->create();
        $addressee = User::factory()->create();

        Friendship::query()->create([
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);

        $response = $this
            ->actingAs($addressee)
            ->post('/users/'.$requester->id.'/friend-accept');

        $response->assertRedirect();
        $this->assertDatabaseHas('friendships', [
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'accepted',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $requester->id,
            'type' => 'friend_request_accepted',
        ]);
    }

    public function test_user_can_follow_another_user(): void
    {
        $follower = User::factory()->create();
        $followee = User::factory()->create();

        $response = $this
            ->actingAs($follower)
            ->post('/users/'.$followee->id.'/follow');

        $response->assertRedirect();
        $this->assertDatabaseHas('follows', [
            'follower_id' => $follower->id,
            'followee_id' => $followee->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $followee->id,
            'type' => 'new_follower',
        ]);
    }

    public function test_reverse_friend_request_accepts_the_existing_request(): void
    {
        $originalRequester = User::factory()->create();
        $incomingRequester = User::factory()->create();
        $friendship = Friendship::query()->create([
            'requester_id' => $originalRequester->id,
            'addressee_id' => $incomingRequester->id,
            'status' => 'pending',
        ]);

        $response = $this
            ->actingAs($incomingRequester)
            ->post('/users/'.$originalRequester->id.'/friend-request');

        $response->assertRedirect();
        $this->assertDatabaseCount('friendships', 1);
        $this->assertDatabaseHas('friendships', [
            'id' => $friendship->id,
            'status' => 'accepted',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $originalRequester->id,
            'type' => 'friend_request_accepted',
        ]);
    }

    public function test_user_cannot_send_a_friend_request_to_themselves(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/friends')
            ->post('/users/'.$user->id.'/friend-request');

        $response->assertRedirect('/friends')->assertSessionHasErrors('user');
        $this->assertDatabaseCount('friendships', 0);
    }

    public function test_user_cannot_accept_a_request_they_did_not_receive(): void
    {
        $requester = User::factory()->create();
        $addressee = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);

        $response = $this
            ->actingAs($requester)
            ->from('/friends')
            ->post('/users/'.$addressee->id.'/friend-accept');

        $response->assertRedirect('/friends')->assertSessionHasErrors('friend_request');
        $this->assertDatabaseHas('friendships', [
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $requester->id,
            'type' => 'friend_request_accepted',
        ]);
    }

    public function test_user_can_reject_an_incoming_friend_request(): void
    {
        $requester = User::factory()->create();
        $addressee = User::factory()->create();
        Friendship::query()->create([
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'pending',
        ]);

        $response = $this
            ->actingAs($addressee)
            ->post('/users/'.$requester->id.'/friend-reject');

        $response->assertRedirect();
        $this->assertDatabaseHas('friendships', [
            'requester_id' => $requester->id,
            'addressee_id' => $addressee->id,
            'status' => 'rejected',
        ]);
    }

    public function test_follow_toggle_unfollows_without_creating_an_extra_notification(): void
    {
        $follower = User::factory()->create();
        $followee = User::factory()->create();
        $this->actingAs($follower)->post('/users/'.$followee->id.'/follow')->assertRedirect();

        $this->actingAs($follower)->post('/users/'.$followee->id.'/follow')->assertRedirect();

        $this->assertDatabaseMissing('follows', [
            'follower_id' => $follower->id,
            'followee_id' => $followee->id,
        ]);
        $this->assertDatabaseCount('notifications', 1);
    }

    public function test_user_cannot_follow_themselves(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/friends')
            ->post('/users/'.$user->id.'/follow');

        $response->assertRedirect('/friends')->assertSessionHasErrors('user');
        $this->assertDatabaseCount('follows', 0);
        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_friends_page_lists_requests_friends_following_and_available_suggestions(): void
    {
        $user = User::factory()->create(['name' => 'Current User']);
        $incomingRequester = User::factory()->create(['name' => 'Incoming Requester']);
        $friend = User::factory()->create(['name' => 'Accepted Friend']);
        $followee = User::factory()->create(['name' => 'Followed Person']);
        $outgoingRequester = User::factory()->create(['name' => 'Outgoing Request']);
        $suggestion = User::factory()->create(['name' => 'Zara Suggestion']);

        Friendship::query()->create([
            'requester_id' => $incomingRequester->id,
            'addressee_id' => $user->id,
            'status' => 'pending',
        ]);
        Friendship::query()->create([
            'requester_id' => $user->id,
            'addressee_id' => $friend->id,
            'status' => 'accepted',
        ]);
        Friendship::query()->create([
            'requester_id' => $user->id,
            'addressee_id' => $outgoingRequester->id,
            'status' => 'pending',
        ]);
        $user->follow($followee);

        $this->actingAs($user)
            ->get('/friends')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Friends/Index')
                ->where('incomingRequests.data.0.id', $incomingRequester->id)
                ->where('friends.data.0.id', $friend->id)
                ->where('following.data.0.id', $followee->id)
                ->where('suggestions.data.1.id', $suggestion->id)
                ->has('suggestions.data', 2)
            );
    }
}
