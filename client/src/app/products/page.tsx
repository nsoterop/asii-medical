import ProductsComponent from '@/components/products/products';

export const dynamic = 'force-dynamic'; // Ensure SSR

export default async function ProductsPage() {
  return <ProductsComponent />;
}
