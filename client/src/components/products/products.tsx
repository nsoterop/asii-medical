import { getProducts } from '@/api/products';

async function ProductsComponent() {
  const posts = await getProducts();
  return (
    <ul>
      <li>{posts}</li>
    </ul>
  );
}

export default ProductsComponent;
