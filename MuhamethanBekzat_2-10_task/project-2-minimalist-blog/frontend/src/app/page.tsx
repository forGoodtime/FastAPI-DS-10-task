'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Post {
  slug: string;
  title: string;
}

// Make sure this URL matches your backend API route and the backend server is running
const API_URL = 'http://localhost:8000/api/posts';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(API_URL);
        setPosts(response.data);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-100 p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-5xl font-bold mb-8 text-center text-gray-800">
          Минималистичный Блог
        </h1>
        {loading ? (
          <p>Загрузка постов...</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow"
              >
                <h2 className="text-2xl font-semibold text-blue-600">
                  {post.title}
                </h2>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}