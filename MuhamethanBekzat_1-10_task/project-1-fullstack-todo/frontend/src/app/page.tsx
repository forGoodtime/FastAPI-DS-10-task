'use client'; // This directive is necessary for using React hooks

import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';

interface Todo {
  id: string;
  task: string;
  completed: boolean;
}

const API_URL = 'http://localhost:8000/api/todos';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState('');

  // 1. Fetch all todos from the backend when the component mounts
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const response = await axios.get(API_URL);
        setTodos(response.data);
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
    };
    fetchTodos();
  }, []); // Empty dependency array means this runs once on mount

  // 2. Handle form submission to add a new task
  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault(); // Prevent page reload
    if (!newTask.trim()) return; // Don't add empty tasks

    try {
      const response = await axios.post(API_URL, { task: newTask });
      setTodos([...todos, response.data]); // Add new task to the list
      setNewTask(''); // Clear the input field
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // 3. Handle toggling the completed status of a task
  const handleToggleComplete = async (id: string) => {
    try {
      const response = await axios.patch(`${API_URL}/${id}`);
      setTodos(todos.map(todo => (todo.id === id ? response.data : todo)));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // 4. Handle deleting a task
  const handleDeleteTask = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setTodos(todos.filter(todo => todo.id !== id)); // Remove task from the list
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // 5. Handle editing a task
  const handleEditTask = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingTask(todo.task);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, { task: editingTask });
      setTodos(todos.map(todo => (todo.id === id ? response.data : todo)));
      setEditingId(null);
      setEditingTask('');
    } catch (error) {
      console.error('Error editing task:', error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await axios.delete(`${API_URL}/completed`);
      setTodos(todos.filter(todo => !todo.completed)); // Remove completed tasks from the list
    } catch (error) {
      console.error('Error clearing completed tasks:', error);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-cyan-400">
          Full-Stack To-Do List
        </h1>

        {/* Form to add a new task */}
        <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="flex-grow p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Add
          </button>
        </form>
        <button className="mb-4 px-4 py-2 bg-red-600 hover:bg-pink-700 rounded" onClick={handleClearCompleted}>
          Очистить все выполненные задачи
        </button>
        {/* List of tasks */}
        <ul>
          {todos.map(todo => (
            <li key={todo.id} className="flex items-center justify-between py-2">
              {editingId === todo.id ? (
                <>
                  <input
                    className="text-black px-2 py-1 rounded"
                    value={editingTask}
                    onChange={e => setEditingTask(e.target.value)}
                  />
                  <button
                    className="ml-2 px-2 py-1 bg-green-500 rounded"
                    onClick={() => handleSaveEdit(todo.id)}
                  >
                    Сохранить
                  </button>
                  <button
                    className="ml-2 px-2 py-1 bg-gray-500 rounded"
                    onClick={() => setEditingId(null)}
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 cursor-pointer ${todo.completed ? 'line-through text-gray-400' : ''}`}
                    onClick={() => handleToggleComplete(todo.id)}
                  >
                    {todo.task}
                  </span>
                  <button
                    className="ml-2 px-2 py-1 bg-yellow-500 rounded"
                    onClick={() => handleEditTask(todo)}
                  >
                    Редактировать
                  </button>
                  <button
                    className="ml-2 px-2 py-1 bg-red-500 rounded"
                    onClick={() => handleDeleteTask(todo.id)}
                  >
                    Удалить
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}