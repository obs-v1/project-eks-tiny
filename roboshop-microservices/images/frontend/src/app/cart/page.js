'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Cart() {
    const [cart, setCart] = useState({ items: [] });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user) {
            fetch(`/api/cart/${user.id}`).then(r => r.json()).then(setCart).catch(() => {});
        }
    }, []);

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    async function updateQuantity(productId, quantity) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) return;
        await fetch(`/api/cart/${user.id}/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity }),
        });
        const res = await fetch(`/api/cart/${user.id}`);
        setCart(await res.json());
    }

    async function removeItem(productId) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) return;
        await fetch(`/api/cart/${user.id}/item/${productId}`, { method: 'DELETE' });
        const res = await fetch(`/api/cart/${user.id}`);
        setCart(await res.json());
    }

    return (
        <div>
            <h1 className="text-3xl font-bold my-6">Shopping Cart</h1>
            {cart.items.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <p className="mb-4">Your cart is empty.</p>
                    <Link href="/catalogue" className="bg-primary text-white px-6 py-2 rounded">Browse Products</Link>
                </div>
            ) : (
                <div>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-700 text-gray-400 text-left">
                                <th className="py-3">Product</th>
                                <th className="py-3">Price</th>
                                <th className="py-3">Quantity</th>
                                <th className="py-3">Subtotal</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.items.map(item => (
                                <tr key={item.productId} className="border-b border-gray-700">
                                    <td className="py-3">
                                        <span className="font-semibold">{item.name}</span>
                                        <span className="text-gray-400 text-sm block">{item.sku}</span>
                                    </td>
                                    <td className="py-3">${item.price.toFixed(2)}</td>
                                    <td className="py-3">
                                        <input type="number" value={item.quantity} min="1" max="99"
                                               onChange={e => updateQuantity(item.productId, parseInt(e.target.value))}
                                               className="w-16 bg-card border border-gray-700 rounded px-2 py-1 text-center text-white" />
                                    </td>
                                    <td className="py-3">${(item.price * item.quantity).toFixed(2)}</td>
                                    <td className="py-3">
                                        <button onClick={() => removeItem(item.productId)}
                                                className="bg-red-500 text-white px-3 py-1 rounded text-sm">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="text-right mt-6">
                        <p className="text-xl mb-4">Total: <span className="text-accent font-bold">${total.toFixed(2)}</span></p>
                        <Link href="/checkout" className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg">Proceed to Checkout</Link>
                    </div>
                </div>
            )}
        </div>
    );
}
