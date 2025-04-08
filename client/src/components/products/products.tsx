import { Product } from '@/types/product.interface';
import fetchHelper from '@/utils/fetchHelper';

async function ProductsComponent() {
  const productsReponse = await fetchHelper.get('/api/products');
  const products = await productsReponse.json();

  if (!products || products.length === 0) {
    return <div>No products available</div>;
  } else {
    return (
      <div>
        {products.map((product: Product) => (
          <div key={product.id}>{product.name}</div>
        ))}
      </div>
    );
  }
}

export default ProductsComponent;
