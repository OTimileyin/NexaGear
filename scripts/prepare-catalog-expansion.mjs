import { mkdir, writeFile } from 'node:fs/promises';
// Owner-requested demonstration catalogue. Prices are draft NGN amounts, not retailer quotes.
const groups = [
  ['Content Creation', [
    ['Creator Mirrorless Camera', 420000, 'camera'], ['Compact Vlogging Camera', 285000, 'camera'], ['Action Camera Kit', 165000, 'camera'], ['Desktop Streaming Webcam', 48000, 'webcam'], ['Portable Video Tripod', 32000, 'tripod'], ['Flexible Mini Tripod', 14000, 'tripod'], ['Phone Video Stabilizer', 65000, 'camera'], ['Camera Field Monitor', 98000, 'monitor'], ['Creator Graphics Tablet', 72000, 'tablet'], ['Portable Teleprompter Kit', 58000, 'camera']
  ]],
  ['Creator Audio', [
    ['USB Podcast Microphone', 45000, 'microphone'], ['Wireless Lavalier Microphone Kit', 62000, 'microphone'], ['Shotgun Video Microphone', 68000, 'microphone'], ['Desktop Audio Interface', 92000, 'audio-interface'], ['Portable Audio Recorder', 85000, 'microphone'], ['Microphone Boom Arm', 24000, 'microphone'], ['Recording Pop Filter', 9000, 'microphone'], ['Creator Closed-Back Headphones', 56000, 'headphones'], ['Compact Studio Speaker Pair', 138000, 'speaker'], ['Podcast Mixing Console', 165000, 'audio-interface']
  ]],
  ['Studio Lighting', [
    ['Desktop Ring Light Kit', 22000, 'studio-light'], ['Bi-Color LED Video Panel', 48000, 'studio-light'], ['Portable RGB Video Light', 36000, 'studio-light'], ['Creator Softbox Lighting Kit', 69000, 'studio-light'], ['Adjustable Studio Light Stand', 19000, 'studio-light'], ['Photography Reflector Set', 14000, 'studio-light'], ['Desk-Mounted Key Light', 58000, 'studio-light'], ['Portable Photo Light Tent', 35000, 'studio-light'], ['Background Support Frame', 44000, 'studio-light'], ['Rechargeable Camera Light', 26000, 'studio-light']
  ]],
  ['Developer Setup', [
    ['Full-Size Mechanical Keyboard', 65000, 'keyboard'], ['Split Ergonomic Keyboard', 98000, 'keyboard'], ['Wireless Compact Keyboard', 38000, 'keyboard'], ['Vertical Ergonomic Mouse', 34000, 'mouse'], ['Wireless Trackball Mouse', 47000, 'mouse'], ['27-Inch Developer Monitor', 225000, 'monitor'], ['Portable USB-C Monitor', 145000, 'monitor'], ['Dual Monitor Arm', 68000, 'monitor'], ['Desk Cable Management Kit', 12000, 'cables'], ['Extended Desk Mat', 16000, 'workspace']
  ]],
  ['Computing & Storage', [
    ['Everyday Developer Laptop', 685000, 'laptop'], ['Creator Workstation Laptop', 1250000, 'laptop'], ['Compact Desktop Computer', 485000, 'computer'], ['Mini Developer PC', 320000, 'computer'], ['Portable 1TB SSD', 98000, 'storage'], ['Portable 2TB SSD', 165000, 'storage'], ['Desktop Backup Drive', 89000, 'storage'], ['High-Speed USB Flash Drive', 22000, 'storage'], ['Memory Card Creator Pack', 28000, 'storage'], ['USB-C Storage Enclosure', 34000, 'storage']
  ]],
  ['Connectivity', [
    ['Dual-Band Home Router', 58000, 'router'], ['Mesh Wi-Fi Starter Kit', 145000, 'router'], ['USB-C Ethernet Adapter', 24000, 'hub'], ['Desktop Network Switch', 48000, 'router'], ['USB-C Docking Station', 98000, 'hub'], ['HDMI Display Cable', 11000, 'cables'], ['Braided USB-C Cable Set', 14500, 'cables'], ['USB-A Extension Cable', 7500, 'cables'], ['Wireless Presentation Clicker', 19000, 'mouse'], ['Bluetooth Audio Adapter', 18000, 'hub']
  ]],
  ['Home Appliances', [
    ['Compact Front-Load Washing Machine', 385000, 'washing-machine'], ['Energy-Saving Refrigerator', 485000, 'refrigerator'], ['Portable Air Conditioner', 345000, 'air-conditioner'], ['Rechargeable Standing Fan', 68000, 'fan'], ['Compact Desk Fan', 23000, 'fan'], ['Cordless Vacuum Cleaner', 145000, 'vacuum'], ['Robot Floor Vacuum', 245000, 'vacuum'], ['Steam Garment Iron', 36000, 'iron'], ['Handheld Clothes Steamer', 42000, 'iron'], ['Room Air Purifier', 115000, 'air-purifier']
  ]],
  ['Kitchen Appliances', [
    ['Countertop Air Fryer', 85000, 'air-fryer'], ['High-Speed Kitchen Blender', 62000, 'blender'], ['Electric Breakfast Kettle', 26000, 'kettle'], ['Compact Espresso Machine', 165000, 'coffee-machine'], ['Digital Rice Cooker', 52000, 'cooker'], ['Two-Slice Breakfast Toaster', 34000, 'toaster'], ['Countertop Microwave Oven', 98000, 'microwave'], ['Portable Induction Cooker', 68000, 'cooker'], ['Compact Food Processor', 78000, 'blender'], ['Electric Sandwich Maker', 28500, 'toaster']
  ]],
  ['Smart Home', [
    ['Indoor Security Camera', 42000, 'security-camera'], ['Outdoor Security Camera', 68000, 'security-camera'], ['Video Doorbell Kit', 85000, 'security-camera'], ['Wi-Fi Smart Plug Pair', 24000, 'smart-plug'], ['Smart LED Bulb Starter Kit', 28000, 'bulb'], ['Motion Sensor Night Light', 15000, 'bulb'], ['Smart Speaker Hub', 68000, 'speaker'], ['Digital Door Lock', 145000, 'smart-lock'], ['Room Temperature Sensor', 19000, 'smart-home'], ['Smart LED Strip Kit', 26000, 'bulb']
  ]],
  ['Power', [
    ['Laptop Power Bank', 98000, 'power-bank'], ['Pocket 10000mAh Power Bank', 28000, 'power-bank'], ['Travel 20000mAh Power Bank', 42000, 'power-bank'], ['Four-Port USB-C Desktop Charger', 58000, 'charger'], ['Wireless Desk Charging Pad', 26000, 'charger'], ['Travel Universal Adapter', 24000, 'charger'], ['Surge-Protected Extension Strip', 22000, 'extension'], ['Desktop Backup UPS', 145000, 'ups'], ['Portable Power Station', 385000, 'power-station'], ['Foldable Solar Charging Panel', 145000, 'solar-panel']
  ]],
];
let index = 100;
const products = groups.flatMap(([category, items]) => items.map(([name, price, photoKey]) => {
  index++;
  return { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), sku: `NG-${index}`, category, price, photoKey, description: `${name} for ${category.toLowerCase()}. Demo catalogue item with an indicative NGN price and representative photography. Exact supplier specifications, pricing and availability must be confirmed before live sales.`, image_url: `/images/catalog/${photoKey}.webp`, inventory_status: 'in_stock', featured: false };
}));
if (products.length !== 100 || new Set(products.map(p => p.slug)).size !== 100) throw new Error('Expansion must contain exactly 100 unique products');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const rows = products.map(p => `  (${[p.name,p.slug,p.sku,p.description,p.category,p.price,p.image_url,p.inventory_status].map(quote).join(', ')}, false)`).join(',\n');
const sql = `-- Owner-requested 100-product demo expansion (D42). Draft prices in NGN.\n-- Additive and idempotent: preserve every existing product and never overwrite rows.\nbegin;\ninsert into public.products (name,slug,sku,description,category,price,image_url,inventory_status,featured)\nvalues\n${rows}\non conflict (slug) do nothing;\ncommit;\n`;
await mkdir('catalog', { recursive: true });
await writeFile('catalog/expansion.json', JSON.stringify(products,null,2)+'\n');
await writeFile('supabase/migrations/0012_catalog_expansion.sql', sql);
console.log(`Prepared ${products.length} products across ${groups.length} categories; SKUs NG-101 through NG-200.`);
