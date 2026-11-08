'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function ClientLayout({ children }) {
    const [user, setUser] = useState(null);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (token && userData) {
            setUser(JSON.parse(userData));
            fetchCartCount(JSON.parse(userData).id);
        }
    }, []);

    async function fetchCartCount(userId) {
        try {
            const res = await fetch(`/api/cart/${userId}`);
            const data = await res.json();
            setCartCount(data.items?.length || 0);
        } catch (e) {}
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setCartCount(0);
        window.location.href = '/';
    }

    return (
        <>
            <header className="bg-card border-b border-gray-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold text-accent">
                        &#9881; RoboShop
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link href="/" className="text-gray-400 hover:text-white">Home</Link>
                        <Link href="/catalogue" className="text-gray-400 hover:text-white">Catalogue</Link>
                        <Link href="/cart" className="text-gray-400 hover:text-white relative">
                            &#128722; Cart
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full px-1.5">{cartCount}</span>
                            )}
                        </Link>
                        {user ? (
                            <>
                                <Link href="/orders" className="text-gray-400 hover:text-white">Orders</Link>
                                <Link href="/profile" className="text-gray-400 hover:text-white">Hi, {user.firstName || user.username}</Link>
                                <button onClick={logout} className="text-gray-400 hover:text-white border border-gray-600 px-3 py-1 rounded">Logout</button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="text-gray-400 hover:text-white">Login</Link>
                                <Link href="/register" className="bg-primary text-white px-4 py-1.5 rounded hover:bg-blue-700">Register</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">{children}</main>
            <footer className="border-t border-gray-700 text-center py-4 text-gray-500 text-sm">
                <p>&copy; 2024 RoboShop</p>
            </footer>
        </>
    );
}
