import { mkdir, writeFile } from 'node:fs/promises';

// Curated free Unsplash photographs; download once, serve from our own origin.
const photos = [
  ['adjustable-laptop-stand', '8Y4j0iovSuM'],
  ['arduino-starter-kit', 'kyDsOF8gsIA'],
  ['compact-mechanical-keyboard', 'pgK2Khi85dU'],
  ['developer-precision-mouse', 'ZtxED1cpB1E'],
  ['gan-fast-charger', 'OaNfWxDJ4AI'],
  ['portable-power-bank', 'SDzrZdS2_IE'],
  ['robot-chassis-motor-bundle', 'mVJzfw2Zm7Y'],
  ['sensor-exploration-pack', 'zjCc0l9l1cI'],
  ['soldering-prototyping-kit', 'lPcXuJyoIjU'],
  ['studio-monitoring-headphones', 'LSNJ-pltdu8'],
  ['usb-c-8-in-1-hub', '4nVJUZEJb3s'],
  ['workspace', '7mhNvPV5LrE'],
];
await mkdir('public/images/photography', { recursive: true });
const credits = [];
for (const [slug, id] of photos) {
  const response = await fetch(`https://unsplash.com/napi/photos/${id}`);
  if (!response.ok) throw new Error(`Photo metadata ${id}: ${response.status}`);
  const photo = await response.json();
  if (photo.premium) throw new Error(`Photo ${id} requires an Unsplash+ license`);
  const url = new URL(photo.urls.raw);
  url.search = new URLSearchParams({ w: slug === 'workspace' ? '1600' : '960', q: '82', fm: 'webp', fit: 'max' }).toString();
  const image = await fetch(url);
  if (!image.ok || !image.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image download failed: ${id}`);
  const file = `public/images/photography/${slug}.webp`;
  await writeFile(file, Buffer.from(await image.arrayBuffer()));
  credits.push({ file, photographer: photo.user.name, source: photo.links.html, license: 'https://unsplash.com/license', description: photo.alt_description, usage: 'Representative photography for the demo catalogue; not an exact SKU or endorsement.' });
  console.log(`Saved ${slug}`);
}
await writeFile('public/images/photography/credits.json', JSON.stringify(credits, null, 2) + '\n');
