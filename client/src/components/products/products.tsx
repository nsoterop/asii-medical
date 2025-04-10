import fetchHelper from '@/utils/fetchHelper';

interface Product {
  productId: string;
  productName: string;
  productDescription: string;
  manufacturerId: string;
  manufacturerName: string;
}

async function ProductsComponent() {
  const productsReponse = await fetchHelper.get('/api/products');
  const products = await productsReponse.json();

  if (!products || products.length === 0) {
    return <div>No products available</div>;
  } else {
    return (
      <div className="d-flex">
        {products.map((product: Product) => (
          <button
            className="text-3xl font-bold underline"
            key={product.productId}
          >
            {product.productName}
          </button>
        ))}
      </div>
    );
  }
}

export default ProductsComponent;
