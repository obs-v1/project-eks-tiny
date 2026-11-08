'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function Register() {
    const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '', phone: '' });
    const [error, setError] = useState('');

    function update(field, value) { setForm({ ...form, [field]: value }); }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                window.location.href = '/login?registered=true';
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Registration failed');
        }
    }

    return (
        <div className="max-w-md mx-auto mt-16">
            <h1 className="text-3xl font-bold mb-6">Create Account</h1>
            {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-lg border border-gray-700">
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-gray-400 mb-2">First Name</label>
                        <input type="text" value={form.firstName} onChange={e => update('firstName', e.target.value)} required
                               className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-gray-400 mb-2">Last Name</label>
                        <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} required
                               className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" />
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">Username</label>
                    <input type="text" value={form.username} onChange={e => update('username', e.target.value)} required
                           className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">Email</label>
                    <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required
                           className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" />
                </div>
                <div className="mb-4">
                    <label className="block text-gray-400 mb-2">Password</label>
                    <input type="password" value={form.password} onChange={e => update('password', e.target.value)} required minLength="6"
                           className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-400 mb-2">Phone (optional)</label>
                    <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                           className="w-full bg-dark border border-gray-700 rounded px-4 py-2 text-white" />
                </div>
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg hover:bg-blue-700 text-lg">Register</button>
            </form>
            <p className="text-center mt-4 text-gray-400">Already have an account? <Link href="/login" className="text-primary">Login here</Link></p>
        </div>
    );
}
