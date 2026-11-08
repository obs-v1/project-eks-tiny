'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/';
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Login failed');
        }
    }

    return (
        <div className="max-w-md mx-auto mt-16">
            <h1 className="text-3xl font-bold mb-6">Login</h1>
            {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-lg border border-gray-700">
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                           className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" placeholder="Enter username" />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-400 mb-2">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                           className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" placeholder="Enter password" />
                </div>
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-700 text-lg">Login</button>
            </form>
            <p className="text-center mt-4 text-gray-400">Don't have an account? <Link href="/register" className="text-primary">Register here</Link></p>
            <p className="text-center mt-2 text-gray-500 text-sm">Demo: admin / RoboShop@1</p>
        </div>
    );
}
