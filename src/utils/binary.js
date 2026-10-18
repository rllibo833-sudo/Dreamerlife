export async function imageToBinary(url = `${import.meta.env.BASE_URL}photos/01-cafe-arrival.jpg`) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const blobUrl = URL.createObjectURL(blob);

  console.log(`[Binary] ${url}: ${arrayBuffer.byteLength} bytes`);
  return { arrayBuffer, uint8Array, blobUrl, size: arrayBuffer.byteLength };
}
