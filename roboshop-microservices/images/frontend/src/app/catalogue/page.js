'use client';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CatalogueContent() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const searchParams = useSearchParams();
    const category = searchParams.get('category');

    useEffect(() => {
        fetch('/api/catalogue/categories').then(r => r.json()).then(setCategories).catch(() => {});
    }, []);

    useEffect(() => {
        let url = '/api/catalogue/products';
        if (category) url += `?category=${category}`;
        fetch(url).then(r => r.json()).then(setProducts).catch(() => {});
    }, [category]);

    function handleSearch(e) {
        e.preventDefault();
        if (search) {
            fetch(`/api/catalogue/products/search?q=${search}`).then(r => r.json()).then(setProducts).catch(() => {});
        }
    }

    async function addToCart(productId) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) { window.location.href = '/login'; return; }
        await fetch(`/api/cart/${user.id}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity: 1 }),
        });
        window.location.reload();
    }

    return (
        <div>
            <div className="flex justify-between items-center my-6">
                <h1 className="text-3xl font-bold">Product Catalogue</h1>
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                           placeholder="Search products..." className="bg-card border border-gray-700 rounded px-4 py-2 text-white w-64" />
                    <button type="submit" className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700">Search</button>
                </form>
            </div>

            <div className="flex gap-8">
                <aside className="w-52 flex-shrink-0">
                    <h3 className="font-semibold mb-3">Categories</h3>
                    <ul className="space-y-1">
                        <li><Link href="/catalogue" className={`block px-3 py-2 rounded ${!category ? 'bg-card text-white' : 'text-gray-400 hover:text-white'}`}>All Products</Link></li>
                        {categories.map(cat => (
                            <li key={cat}><Link href={`/catalogue?category=${cat}`} className={`block px-3 py-2 rounded ${category === cat ? 'bg-card text-white' : 'text-gray-400 hover:text-white'}`}>{cat}</Link></li>
                        ))}
                    </ul>
                </aside>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                    {products.map(product => (
                        <div key={product.id} className="bg-card rounded-lg border border-gray-700 hover:border-primary transition-all">
                            <div className="h-44 flex items-center justify-center relative rounded-t-lg overflow-hidden">
                                <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded z-10">{product.category}</span>
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold mb-2">{product.name}</h3>
                                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-accent text-lg font-bold">${product.price}</span>
                                    <div className="flex gap-2">
                                        <Link href={`/product/${product.id}`} className="border border-primary text-primary px-3 py-1 rounded hover:bg-primary hover:text-white text-sm">Details</Link>
                                        <button onClick={() => addToCart(product.id)} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Add to Cart</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Catalogue() {
    return (
        <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
            <CatalogueContent />
        </Suspense>
    );
}
