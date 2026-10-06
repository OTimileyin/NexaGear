# NexaGear catalogue expansion

The owner requested 100 additional products spanning content-creation equipment, developer gadgets and home appliances. `expansion.json` contains exactly 100 entries in ten groups, with SKUs `NG-101` through `NG-200`.

These are **demo products**. Names are generic, NGN prices are indicative drafts, and availability is a demo state rather than verified supplier stock. Supplier specifications, purchase prices, availability, delivery and returns terms must be confirmed before live sales. Existing products were preserved; this expansion did not reprice the original 11.

Forty-four actual photographs are shared across related product types. They are representative category imagery, not exact SKU photos or brand endorsements. Credits and source/license links are stored in `public/images/catalog/credits.json` and copied to `mobile/assets/catalog/credits.json`. New mobile photos are bundled locally, so they do not depend on the website's image host.

The database insert is additive and idempotent:

```powershell
node --env-file=.env.local scripts/apply-catalog-expansion.mjs --check
node --env-file=.env.local scripts/apply-catalog-expansion.mjs
```

The script uses `SUPABASE_ACCESS_TOKEN` from the ignored local environment. It checks SKU collisions before inserting, preserves existing rows and verifies exactly 100 expansion records. It never uses the service-role key or modifies RLS. The applied SQL lives in `supabase/migrations/0012_catalog_expansion.sql`.

Observed database result: **100 expansion records; 111 products total**.

Regenerate the manifest/migration with `node scripts/prepare-catalog-expansion.mjs`. Photo sourcing is recorded in `scripts/source-catalog-photos.mjs`, including reviewed selections. Before rerunning image sourcing, review the resulting contact sheet and credits; search relevance is not proof that a photo depicts the intended product.

No reviews, sales counts, coupons, discounts or delivery guarantees are seeded.
