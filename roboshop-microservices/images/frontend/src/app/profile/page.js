'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Profile() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = '/login'; return; }
        fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => r.json()).then(setUser).catch(() => {});
    }, []);

    if (!user) return <div className="text-center py-20">Loading...</div>;

    return (
        <div className="max-w-xl">
            <h1 className="text-3xl font-bold my-6">My Profile</h1>
            <div className="bg-card p-8 rounded-lg border border-gray-700 flex gap-8">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0">
                    {(user.firstName || user.username || 'U')[0].toUpperCase()}
                </div>
                <div className="space-y-3 flex-1">
                    <div className="flex justify-between border-b border-gray-700 pb-2"><span className="text-gray-400">Username:</span><span>{user.username}</span></div>
                    <div className="flex justify-between border-b border-gray-700 pb-2"><span className="text-gray-400">Email:</span><span>{user.email}</span></div>
                    <div className="flex justify-between border-b border-gray-700 pb-2"><span className="text-gray-400">Name:</span><span>{user.firstName} {user.lastName}</span></div>
                    {user.phone && <div className="flex justify-between border-b border-gray-700 pb-2"><span className="text-gray-400">Phone:</span><span>{user.phone}</span></div>}
                </div>
            </div>
            <div className="mt-4">
                <Link href="/orders" className="border border-primary text-primary px-4 py-2 rounded hover:bg-primary hover:text-white">View Orders</Link>
            </div>
        </div>
    );
}
