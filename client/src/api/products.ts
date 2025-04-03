export async function getProducts() {
    const data = await fetch('http://localhost:4000/api');
    return data.text();
}