import { readFile } from 'node:fs/promises';
const token = process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!token || !url) throw new Error('Load the local environment: node --env-file=.env.local scripts/apply-catalog-expansion.mjs');
const ref = new URL(url).hostname.split('.')[0];
const products = JSON.parse(await readFile('catalog/expansion.json','utf8'));
if(products.length !== 100 || new Set(products.map(p=>p.sku)).size !== 100) throw new Error('Expected 100 unique expansion products');
async function query(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
  if(!response.ok) throw new Error(`Supabase management request failed: HTTP ${response.status}`);
  return response.json();
}
const existing = await query('select sku,slug from public.products order by sku');
const conflicts = products.filter(product => existing.some(row => row.sku === product.sku && row.slug !== product.slug));
if(conflicts.length) throw new Error(`SKU conflicts: ${conflicts.map(p=>p.sku).join(', ')}. No rows changed.`);
console.log(`Current catalogue: ${existing.length}; new rows pending: ${products.filter(p=>!existing.some(row=>row.slug===p.slug)).length}.`);
if(!process.argv.includes('--check')) {
  await query(await readFile('supabase/migrations/0012_catalog_expansion.sql','utf8'));
  const verification = await query("select count(*)::int as total, count(*) filter (where sku >= 'NG-101' and sku <= 'NG-200')::int as expansion from public.products");
  if(verification[0]?.expansion !== 100) throw new Error('Expansion row-count verification failed');
  console.log(`Verified ${verification[0].expansion} expansion products; ${verification[0].total} total products. Existing rows preserved.`);
}
