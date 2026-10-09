import React from 'react';
import { Link } from '@inertiajs/inertia-react';

export default function SavedPostsIndex({ posts }) {
    return (
        <div>
            <h1 className="text-2xl font-bold">Saved Posts</h1>
            <div>
                {posts?.data?.length ? (
                    posts.data.map((post) => (
                        <div key={post.id} className="border rounded p-4 my-2">
                            <div className="font-semibold">{post.user?.name}</div>
                            <div className="mt-2">{post.content}</div>
                            <div className="text-sm text-gray-500 mt-2">{post.created_at}</div>
                        </div>
                    ))
                ) : (
                    <p>No saved posts.</p>
                )}
            </div>
            <div className="mt-4">
                <Link href="/dashboard" className="text-blue-600">Back to feed</Link>
            </div>
        </div>
    );
}
