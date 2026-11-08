'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function OrdersContent() {
    const [orders, setOrders] = useState([]);
    const searchParams = useSearchParams();
    const success = searchParams.get('success');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) { window.location.href = '/login'; return; }
        fetch(`/api/orders/user/${user.id}`).then(r => r.json()).then(setOrders).catch(() => {});
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold my-6">My Orders</h1>
            {success && (
                <div className="bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded mb-6">
                    Order placed successfully! Transaction: {success}
                </div>
            )}
            {orders.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <p>You haven't placed any orders yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-card p-5 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold">Order #{order.id?.substring(0, 8)}</span>
                                <span className="text-gray-400">{new Date(order.orderDate).toLocaleDateString()}</span>
                                <span className="bg-green-500 text-white text-xs px-3 py-1 rounded">{order.status}</span>
                            </div>
                            <div className="text-gray-400 mb-2">
                                {order.items?.map((item, i) => (
                                    <span key={i}>{item.name} x{item.quantity}{i < order.items.length - 1 ? ', ' : ''}</span>
                                ))}
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Shipped to: {order.shippingCity || 'N/A'}</span>
                                <span className="text-accent font-bold">Total: ${((order.total || 0) + (order.shippingCost || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Orders() {
    return (
        <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
            <OrdersContent />
        </Suspense>
    );
}
