'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [ratings, setRatings] = useState([]);
    const [avgRating, setAvgRating] = useState({ average: 0, count: 0 });
    const [score, setScore] = useState(3);
    const [review, setReview] = useState('');
    const [qty, setQty] = useState(1);

    useEffect(() => {
        fetch(`/api/catalogue/products/${id}`).then(r => r.json()).then(setProduct).catch(() => {});
        fetch(`/api/ratings/product/${id}`).then(r => r.json()).then(setRatings).catch(() => {});
        fetch(`/api/ratings/product/${id}/average`).then(r => r.json()).then(setAvgRating).catch(() => {});
    }, [id]);

    async function addToCart() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) { window.location.href = '/login'; return; }
        await fetch(`/api/cart/${user.id}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: parseInt(id), quantity: qty }),
        });
        alert('Added to cart!');
    }

    async function submitRating(e) {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user) { window.location.href = '/login'; return; }
        await fetch('/api/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: parseInt(id), userId: user.id, score, review }),
        });
        window.location.reload();
    }

    if (!product) return <div className="text-center py-20">Loading...</div>;

    const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

    return (
        <div>
            <div className="text-gray-400 mb-4">
                <Link href="/catalogue" className="text-primary">Catalogue</Link> &raquo; <span>{product.category}</span> &raquo; <span>{product.name}</span>
            </div>

            <div className="flex gap-10 mb-10">
                <div className="flex-1 rounded-lg overflow-hidden h-80">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain bg-gradient-to-br from-blue-900 to-gray-800 rounded-lg" />
                </div>
                <div className="flex-1">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded">{product.category}</span>
                    <h1 className="text-3xl font-bold mt-2">{product.name}</h1>
                    <p className="text-gray-400 text-sm mt-1">SKU: {product.sku}</p>
                    <p className="text-gray-300 mt-4 leading-relaxed">{product.description}</p>
                    <div className="text-yellow-400 mt-3">
                        {stars(avgRating.average)} <span className="text-gray-400 ml-2">{avgRating.average?.toFixed(1)} ({avgRating.count} reviews)</span>
                    </div>
                    <p className="text-accent text-3xl font-bold mt-4">${product.price}</p>
                    <p className={`mt-2 ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                    </p>
                    <div className="flex items-center gap-4 mt-6">
                        <label className="text-gray-400">Qty:</label>
                        <input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value))} min="1" max="99"
                               className="w-16 bg-card border border-gray-700 rounded px-2 py-2 text-center text-white" />
                        <button onClick={addToCart} className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-blue-700">Add to Cart</button>
                    </div>
                </div>
            </div>

            <section className="mt-10">
                <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
                <form onSubmit={submitRating} className="bg-card p-6 rounded-lg border border-gray-700 mb-6">
                    <h3 className="font-semibold mb-3">Write a Review</h3>
                    <div className="flex items-center gap-4 mb-3">
                        <label className="text-gray-400">Rating:</label>
                        <div className="flex gap-1">
                            {[1,2,3,4,5].map(s => (
                                <button key={s} type="button" onClick={() => setScore(s)}
                                        className={`text-2xl ${s <= score ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                            ))}
                        </div>
                    </div>
                    <textarea value={review} onChange={e => setReview(e.target.value)} rows="3"
                              placeholder="Share your experience..."
                              className="w-full bg-dark border border-gray-700 rounded px-3 py-2 text-white mb-3" />
                    <button type="submit" className="bg-primary text-white px-6 py-2 rounded hover:bg-blue-700">Submit Review</button>
                </form>

                {ratings.length === 0 && <p className="text-gray-400 text-center py-6">No reviews yet. Be the first!</p>}
                {ratings.map((r, i) => (
                    <div key={i} className="bg-card p-4 rounded-lg border border-gray-700 mb-3">
                        <div className="flex gap-4 items-center mb-2">
                            <span className="text-yellow-400">{stars(r.score)}</span>
                            <span className="font-semibold">{r.user_id}</span>
                        </div>
                        {r.review && <p className="text-gray-300">{r.review}</p>}
                    </div>
                ))}
            </section>
        </div>
    );
}
