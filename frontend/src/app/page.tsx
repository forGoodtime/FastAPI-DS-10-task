'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

interface Post {
  slug: string;
  title: string;
  author: string;
  date: string;
  category: string;
  content: string;
}

const API_URL = 'http://localhost:8000/api/posts';

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    axios.get(API_URL).then(res => {
      setPosts(res.data);
      const cats = Array.from(new Set(res.data.map((p: Post) => p.category).filter(Boolean)));
      setCategories(['Все', ...cats]);
    });
  }, []);

  const filteredPosts = selectedCategory === 'Все'
    ? posts
    : posts.filter(post => post.category === selectedCategory);

  return (
    <main className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Минималистичный блог</h1>
      <div className="mb-4">
        <span className="mr-2">Категория:</span>
        {categories.map(cat => (
          <button
            key={cat}
            className={`px-3 py-1 rounded mr-2 mb-2 ${selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <ul>
        {filteredPosts.map(post => (
          <li key={post.slug} className="mb-8 border-b pb-4">
            <Link href={`/posts/${post.slug}`} className="text-xl font-semibold hover:underline">
              {post.title}
            </Link>
            <div className="text-gray-500 text-sm mt-1">
              Автор: {post.author} | Дата: {post.date} | Категория: {post.category}
            </div>
            <div className="prose">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}