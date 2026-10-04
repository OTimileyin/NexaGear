# Sample data

Fictional orders so a reviewer can see order tracking and a populated admin
dashboard without buying anything. Introduced in `DECISION_LOG.md` D25; schema
in `migrations/0009_sample_data.sql`.

## Seed

```bash
npx supabase db query --linked "$(grep -v '^[[:space:]]*--' supabase/sample-data/seed.sql | tr '\n' ' ')"
```

Re-runnable: it deletes every existing sample order first and rebuilds them, so
it never accumulates duplicates. Real orders are never touched.

## Remove

```bash
npx supabase db query --linked "delete from public.orders where is_sample;"
```

`order_items.order_id` is `on delete cascade`, so the line items go with their
order and nothing else is affected.

## Why the command looks like that

Two traps in `supabase db query --linked`, both hit while writing this:

1. It **truncates multi-line SQL at the first newline** when the SQL is passed
   *as an argument*. A `create function` sent from a file fails with the
   misleading `42P13: no language specified` — the identical statement on one
   line succeeds.
2. It **parses a leading `--` comment as a flag** and fails with
   `Unrecognized flag` when passed as an argument.

Both traps come from passing SQL **as an argument**. **Prefer `--file`** and
neither applies:

```bash
npx --no-install supabase db query --linked --file path/to/script.sql
```

`--file` keeps comments, keeps newlines, and has no length limit — passing SQL
as an argument is also capped by the operating system's command-line limit, so
`supabase/verify/0011_server_cart.sql` **cannot** be run the old way at all
("The command line is too long"). The `tr '\n' ' '` recipe below is kept only
for historical context and for one-liners.

Control worth knowing: with `--file`, a failing script *does* report its error
(`unexpected status 400: ... ERROR: P0001: <your message>`). So silence from a
`--file` run means it passed, rather than that it never executed — but a script
that prints a row on success is better evidence than silence, and 0011 ends with
`select 'SERVER CART TESTS PASSED'` for exactly that reason.

## What the seed guarantees

- **Prices come from the `products` table**, never hard-coded, and each order's
  `subtotal` is the sum of its own `line_total`s — the D21 invariant
  (`subtotal = sum(order_items.line_total)`) holds by construction. The seeder
  asserts it before finishing and raises if it ever does not.
- **No real people.** Customers use `@example.invalid` addresses (RFC 2606
  reserves `.invalid`, so these can never reach a real mailbox) and an address
  line that states it is demo data.
- **Sample rows cannot be created or promoted by the app.** `is_sample` and
  `sample_ref` have no INSERT/UPDATE policy and no column grant for any
  application role, so no user can turn a real order into a public sample one.
  Only someone running SQL against the database can.
- **Sample rows are excluded from every total** in the admin dashboard — see
  `summariseOrders` in `lib/admin.ts` and its tests.