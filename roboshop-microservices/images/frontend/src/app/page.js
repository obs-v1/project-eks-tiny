'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch('/api/catalogue/products').then(r => r.json()).then(setProducts).catch(() => {});
    }, []);

    return (
        <div>
            <section className="text-center py-20 bg-gradient-to-br from-card to-dark rounded-lg my-6">
                <h1 className="text-4xl font-bold mb-4">Welcome to RoboShop</h1>
                <p className="text-gray-400 text-lg mb-8">Your one-stop shop for robotics components, AI modules, and automation gear</p>
                <Link href="/catalogue" className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-blue-700 text-lg">
                    Browse Catalogue
                </Link>
            </section>

            <section className="my-10">
                <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(product => (
                        <div key={product.id} className="bg-card rounded-lg border border-gray-700 hover:border-primary transition-all hover:-translate-y-1">
                            <div className="h-44 flex items-center justify-center relative rounded-t-lg overflow-hidden">
                                <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded z-10">{product.category}</span>
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold mb-2">{product.name}</h3>
                                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-accent text-lg font-bold">${product.price}</span>
                                    <Link href={`/product/${product.id}`} className="border border-primary text-primary px-3 py-1 rounded hover:bg-primary hover:text-white text-sm">
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
