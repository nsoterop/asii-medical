import { Product } from '@/types/product.interface';
import fetchHelper from '@/utils/fetchHelper';

async function ProductsComponent() {
  const productsReponse = await fetchHelper.get('/api/products');
  const products = await productsReponse.json();

  if (!products || products.length === 0) {
    return <div>No products available</div>;
  } else {
    return (
      <div className="d-flex">
        {products.map((product: Product) => (
          <button className="text-3xl font-bold underline" key={product.id}>
            {product.name}
          </button>
        ))}
      </div>
    );
  }
}

export default ProductsComponent;
