import { mkdir, readFile, writeFile } from 'node:fs/promises';
const products = JSON.parse(await readFile('catalog/expansion.json', 'utf8'));
const queries = { camera:'camera product', webcam:'webcam', tripod:'camera tripod', monitor:'computer monitor', tablet:'drawing tablet', microphone:'podcast microphone', 'audio-interface':'audio interface studio', headphones:'headphones', speaker:'speaker', 'studio-light':'photography lighting studio', keyboard:'mechanical keyboard', mouse:'computer mouse', cables:'usb cables', workspace:'desk mat workspace', laptop:'laptop', computer:'desktop computer', storage:'external hard drive', router:'wifi router', hub:'usb hub', 'washing-machine':'washing machine', refrigerator:'refrigerator', 'air-conditioner':'air conditioner', fan:'electric fan', vacuum:'vacuum cleaner', iron:'clothes iron', 'air-purifier':'air purifier', 'air-fryer':'air fryer', blender:'blender kitchen', kettle:'electric kettle', 'coffee-machine':'coffee machine', cooker:'rice cooker', toaster:'toaster kitchen', microwave:'microwave oven', 'security-camera':'security camera', 'smart-plug':'electrical outlet', bulb:'light bulb', 'smart-lock':'digital door lock', 'smart-home':'smart home thermostat', 'power-bank':'power bank', charger:'usb charger', extension:'power strip', ups:'computer power supply', 'power-station':'portable power station', 'solar-panel':'solar panel' };
await mkdir('public/images/catalog', {recursive:true});
await mkdir('mobile/assets/catalog', {recursive:true});
const credits = [];
const reviewed = { webcam:'VIdQW-1-fI4',tripod:'I8uQkcQCU8s',monitor:'aTg26S0_OC0',speaker:'YU-OA2TvQRQ','studio-light':'YhC216tAYAg',router:'hXVVNB6Qctg',laptop:'Bd7gNnWJBkU',blender:'oJzx58W1__M',kettle:'pVD5AIpHNhU','coffee-machine':'ftA71vetxuo',cooker:'VNBUJ6imfGs','smart-plug':'nBfTARHPxiU','power-bank':'APdfyW0Aq-E','power-station':'d0AOyCUnxec' };
const keys = [...new Set(products.map(p=>p.photoKey))];
let next = 0;
async function worker() {
  while(next < keys.length) {
    const key = keys[next++];
    const endpoint = `https://unsplash.com/napi/search/photos?${new URLSearchParams({query:queries[key],per_page:'12',order_by:'relevant'})}`;
    const response = await fetch(reviewed[key] ? `https://unsplash.com/napi/photos/${reviewed[key]}` : endpoint);
    if(!response.ok) throw new Error(`Photo search ${key}: HTTP ${response.status}`);
    const body = await response.json();
    const results = reviewed[key] ? [body] : body.results ?? [];
    const photo = results.find(p => !p.premium && p.urls?.raw);
    if(!photo) throw new Error(`No free representative photo for ${key}`);
    const url = new URL(photo.urls.raw);
    url.search = new URLSearchParams({w:'720',q:'78',fm:'webp',fit:'max'}).toString();
    const image = await fetch(url);
    if(!image.ok || !image.headers.get('content-type')?.startsWith('image/')) throw new Error(`Download ${key} failed`);
    const bytes = Buffer.from(await image.arrayBuffer());
    await writeFile(`public/images/catalog/${key}.webp`, bytes);
    await writeFile(`mobile/assets/catalog/${key}.webp`, bytes);
    credits.push({key,description:photo.alt_description,photographer:photo.user.name,source:photo.links.html,license:'https://unsplash.com/license',usage:'Representative demo category photograph, shared across related products. Not an exact SKU.'});
    console.log(`Saved ${key}: ${photo.alt_description ?? 'photograph'}`);
  }
}
await Promise.all([worker(),worker()]);
credits.sort((a,b)=>a.key.localeCompare(b.key));
await writeFile('public/images/catalog/credits.json',JSON.stringify(credits,null,2)+'\n');
await writeFile('mobile/assets/catalog/credits.json',JSON.stringify(credits,null,2)+'\n');
const imports = keys.map(key=>`  ${JSON.stringify(key)}: require("../../assets/catalog/${key}.webp"),`).join('\n');
await writeFile('mobile/src/lib/catalog-photos.ts',`import type { ImageSourcePropType } from "react-native";\n// Representative category photography, credited in assets/catalog/credits.json.\nconst photos: Record<string, ImageSourcePropType> = {\n${imports}\n};\nexport function catalogPhoto(path: string | null): ImageSourcePropType | undefined {\n  const key = path?.match(/^\\/images\\/catalog\\/([a-z-]+)\\.webp$/)?.[1];\n  return key ? photos[key] : undefined;\n}\n`);
console.log(`Saved ${keys.length} licensed representative photographs for 100 demo products.`);
