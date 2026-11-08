import ProductDetail from './ProductDetail';

export function generateStaticParams() {
    return Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1) }));
}

export default function Page() {
    return <ProductDetail />;
}
