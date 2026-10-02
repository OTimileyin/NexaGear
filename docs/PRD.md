# NexaGear — Assignment 2 Product Requirements Document

**Project:** HNG Internship Assignment 2  
**Product Name:** NexaGear  
**Product Type:** E-commerce Web Application  
**Status:** Planning / Pre-Build  
**Primary Deliverable:** Working shop with checkout, persistent database, Google authentication, and Mailgun order confirmation emails

---

# 1. Product Concept

NexaGear is a modern e-commerce shop for developers, makers, electronics learners, robotics enthusiasts, and people building productive technology workspaces.

The store focuses on practical products such as:

- mechanical keyboards
- developer mice
- headphones
- USB-C hubs
- power banks
- desk accessories
- Arduino and electronics kits
- sensors
- robotics components
- soldering and prototyping tools

The visual identity should feel technical, modern, deliberate, and product-focused without looking like a generic AI-generated storefront.

---

# 2. Assignment Requirements

The assignment requires the product to include:

1. A shop website.
2. A checkout page.
3. Persistent application data using **Supabase or Neon**.
4. Confirmation emails sent using **Mailgun**.
5. Google authentication configured using **Google Cloud Console**.

These requirements are treated as mandatory.

---

# 3. Product Goal

The primary goal is to let a visitor:

> Browse NexaGear products, add products to a cart, authenticate with Google, complete checkout, have the order stored permanently in the database, and receive an order-confirmation email.

---

# 4. Target Users

## Primary Users

- software developers
- engineering and technology students
- electronics hobbyists
- robotics learners
- makers
- remote workers
- technology enthusiasts

## User Need

Users should be able to discover practical technical products and complete an order through a clear, reliable checkout flow.

---

# 5. Product Wedge

The first version should do one journey extremely well:

```text
Discover product
      ↓
View product
      ↓
Add to cart
      ↓
Review cart
      ↓
Sign in with Google
      ↓
Enter checkout details
      ↓
Submit order
      ↓
Persist order in database
      ↓
Send Mailgun confirmation
      ↓
Show order-success page
```

Everything else is secondary to making this journey work correctly.

---

# 6. MVP Scope

## 6.1 Storefront

The user can:

- view a polished shop homepage
- browse products
- see product image, name, description, category, and price
- view an individual product
- add products to the cart
- see cart quantity/state

## 6.2 Product Catalogue

Products should be stored in the database rather than being permanently hard-coded into UI components.

Initial catalogue categories may include:

- Developer Setup
- Audio
- Connectivity
- Power
- Electronics
- Robotics
- Prototyping

The project should seed enough products to make the storefront feel complete without creating an unnecessarily large catalogue.

Suggested initial catalogue: **8–12 products**.

---

# 7. Cart

Users can:

- add a product
- increase quantity
- decrease quantity
- remove a product
- view subtotal
- navigate to checkout

The cart may be browser-local before checkout.

A cart does not need to be persisted to the database for the MVP unless implementation simplicity makes that useful.

The completed order must be persisted.

---

# 8. Google Authentication

Google authentication is mandatory.

## Required behavior

- User can sign in with Google.
- Google OAuth credentials are created/configured through Google Cloud Console.
- Authentication secrets must never be exposed in frontend code.
- The authenticated user's identity is available during checkout.
- The application should preserve the user's authenticated session appropriately.
- Sign-out should work.

## Recommended implementation

Use **Clerk as the authentication provider with Google OAuth**, configured using Google OAuth credentials created in Google Cloud Console. Supabase remains the PostgreSQL database, authenticated with the Clerk session token via Clerk's first-party Supabase third-party-auth integration (not the legacy shared-JWT-template flow).

This satisfies:

- persistent PostgreSQL database (Supabase)
- authentication/session management (Clerk)
- Google OAuth integration (Google Cloud Console credentials, brokered through Clerk)

> **Approved architecture change — 2026-10-02 (DECISION_LOG D18).** This section originally recommended Supabase Auth with Google OAuth. The project's Supabase GoTrue service became unavailable on the free plan (`sessions_timebox` 503; see D17) and could not be repaired without a plan change. The approved decision is to authenticate with **Clerk** while keeping **Supabase** as the database and keeping Google OAuth credentials in **Google Cloud Console**.

> **Status note:** this is an approved architecture change, not yet a verified migration. Live Google sign-in through Clerk, the checkout wedge, and cross-user RLS isolation remain unverified until the migration checks pass (D18).

---

# 9. Database Decision

Use **Supabase PostgreSQL** for the MVP.

## Why Supabase

Supabase provides:

- PostgreSQL persistence
- convenient client/server libraries
- authentication integration
- Row Level Security support
- a manageable free development tier

Using Supabase also keeps the number of infrastructure providers smaller than combining Neon with a separate authentication solution.

---

# 10. Data Model

## Product

```text
Product
- id
- name
- slug
- description
- category
- price
- imageUrl
- inventoryStatus
- featured
- createdAt
- updatedAt
```

## Profile

```text
Profile
- id
- userId
- displayName
- email
- avatarUrl
- createdAt
- updatedAt
```

The Google-authenticated user's email is the primary identity reference.

## Order

```text
Order
- id
- userId
- status
- subtotal
- customerName
- customerEmail
- phone
- shippingAddress
- createdAt
- updatedAt
```

## OrderItem

```text
OrderItem
- id
- orderId
- productId
- productNameSnapshot
- unitPriceSnapshot
- quantity
- lineTotal
```

Product name and price snapshots are stored so historical orders remain meaningful if catalogue data changes later.

---

# 11. Order Status

The MVP may use:

```text
pending
confirmed
```

No payment-provider states were required by the assignment brief. **Amended 2026-10-02 (DECISION_LOG D22):** online payment was later added at the owner's instruction via Paystack, in **test mode only**. `orders.payment_status` is now a first-class state — `unpaid` (default, and every pre-amendment order) · `paid` · `failed` · `not_configured`. Payment is verified server-side against Paystack's API and never trusted from the browser.

---

# 12. Checkout

## Checkout fields

Collect only information necessary to represent a realistic physical-goods order:

- full name
- authenticated email
- phone number
- delivery address

The email field should be derived from the authenticated Google account where possible rather than asking users to retype it.

## Checkout summary

Show:

- items
- quantities
- unit prices
- subtotal
- delivery status/message
- final order total

If delivery fees are not part of the assignment, do not invent complicated shipping-rate logic.

Use either:

- free delivery for the demo, clearly stated, or
- no delivery fee calculation in the MVP.

---

# 13. Critical Pricing Rule

The browser must not be trusted as the authority for final order prices.

When checkout is submitted:

1. Client sends product IDs and requested quantities.
2. Server retrieves trusted product records from Supabase.
3. Server validates the products.
4. Server calculates unit prices and totals.
5. Server creates the order.
6. Server creates order items from trusted product data.

Never store an order total solely because the browser submitted that number.

---

# 14. Order Creation Flow

```text
User presses Place order
        ↓
Validate authentication
        ↓
Validate checkout form
        ↓
Prevent duplicate submission
        ↓
Send product IDs + quantities to server
        ↓
Server fetches trusted product prices
        ↓
Server calculates order total
        ↓
Create order
        ↓
Create order_items
        ↓
Commit successful order
        ↓
Attempt Mailgun confirmation
        ↓
Show success state
```

Order persistence must not depend on Mailgun succeeding.

---

# 15. Mailgun Confirmation Email

Mailgun is mandatory.

After an order is successfully created:

- send confirmation to the authenticated user's email
- include order reference
- include order date
- include purchased products
- include quantities
- include total
- include a simple confirmation message

## Security

The Mailgun API key must:

- exist only in secure server environment variables
- never be embedded into browser JavaScript
- never be committed to Git

## Failure handling

If:

```text
database order succeeds
+
Mailgun fails
```

the order must remain saved.

The success page may state that the order was received while the application logs or records that confirmation delivery failed.

Do not delete a valid order because email delivery failed.

---

# 16. Duplicate Submission Protection

Checkout must prevent accidental duplicate orders.

At minimum:

- disable the Place Order button while submission is in progress
- prevent repeated client submission
- design server-side order creation defensively

If an idempotency mechanism is introduced, document it.

---

# 17. Main Pages

## `/`

Shop homepage.

Suggested content:

- NexaGear hero
- featured products
- selected categories
- shop CTA
- concise brand story

## `/shop`

Product catalogue.

## `/product/[slug]`

Product detail page.

## `/cart`

Cart management.

## `/checkout`

Authenticated checkout.

If unauthenticated, prompt/redirect to Google sign-in while preserving the intended checkout flow.

## `/order/success`

Order confirmation page.

Should not fabricate an order. It should display data from the actual completed order/session.

## `/account` — optional within MVP

May show basic authenticated-user information and order history if time allows.

Order history is useful but not required unless HNG grading expects it.

---

# 18. Authentication Journey

```text
Browse anonymously
      ↓
Add to cart
      ↓
Checkout
      ↓
Not authenticated?
      ↓
Continue with Google
      ↓
Google OAuth
      ↓
Return to NexaGear
      ↓
Continue checkout
```

Do not force authentication merely to browse products.

---

# 19. Architecture

Recommended architecture:

```text
Browser
   │
   ├── Storefront UI
   ├── Cart state
   └── Google auth session
   │
   ▼
Next.js application
   │
   ├── Server-side order endpoint/action
   ├── trusted price calculation
   ├── Mailgun integration
   └── authentication validation
   │
   ├─────────────► Supabase
   │                 ├── PostgreSQL
   │                 └── Auth
   │
   └─────────────► Mailgun
                     └── Confirmation email
```

---

# 20. Recommended Technology Stack

## Framework

**Next.js + JavaScript or TypeScript**

Recommended: **TypeScript** because the application now has database records, authentication, server code, third-party integration, and transactional data.

If assignment constraints require JavaScript, JavaScript remains acceptable.

## Database

**Supabase PostgreSQL**

## Authentication

**Supabase Auth + Google OAuth credentials from Google Cloud Console**

## Email

**Mailgun**

## Styling

Choose one coherent approach during implementation planning.

Options:

- CSS Modules / modern CSS
- Tailwind CSS if deliberately selected

Do not introduce multiple competing styling systems.

## Deployment

**Vercel**

---

# 21. Environment Variables

Expected environment variables will likely include values such as:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY
MAILGUN_API_KEY
MAILGUN_DOMAIN
MAILGUN_FROM_EMAIL

NEXT_PUBLIC_SITE_URL
```

Exact variable names should be finalized during implementation.

Never commit real values.

Commit `.env.example` with placeholders only.

---

# 22. Security Boundaries

## Browser

May know:

- public product data
- public Supabase configuration intended for browser use
- current user's authenticated session
- local cart state

Must not know:

- Mailgun API key
- Supabase service-role key
- server-only secrets

## Server

Responsible for:

- authenticated order creation
- trusted price lookup
- order totals
- privileged database operations where required
- Mailgun sending

## Database

Must enforce appropriate access restrictions.

Use Row Level Security where appropriate.

---

# 23. System Invariants

These properties must remain true:

1. Mailgun secrets never enter frontend bundles.
2. Supabase service-role credentials never enter frontend bundles.
3. Users cannot access another user's private order data.
4. Final order prices come from trusted server/database product records.
5. A failed email does not erase a valid order.
6. One checkout interaction should not create accidental duplicate orders.
7. Products displayed as order items preserve historical name/price snapshots.
8. Authentication state must be validated before creating an order for a user.
9. No fake payment success state is shown. Payment is real Paystack **test-mode** processing added after the MVP (D22), so a paid state is only ever shown when Paystack's API has confirmed the transaction server-side and the amount matches the database total. With no key configured the store says so plainly and never implies money moved.

---

# 24. Failure Modes

## Google sign-in fails

User sees a clear authentication error and can retry.

Cart must remain intact where practical.

## Supabase unavailable

Do not pretend checkout succeeded.

Show a clear retryable error.

## Product no longer exists

Block order creation for that item and tell the user the cart needs review.

## Price changes before checkout

Use the trusted current price and update/notify the user before final order confirmation when practical.

## Duplicate click

Prevent duplicate checkout submission.

## Mailgun unavailable

Persist the valid order and report/log confirmation-email failure separately.

## Invalid checkout form

Do not submit until required fields are valid.

---

# 25. Accessibility

Target WCAG 2.2 AA.

At minimum:

- semantic headings
- keyboard-operable navigation
- labeled form fields
- visible focus states
- adequate color contrast
- useful validation errors
- accessible cart quantity controls
- meaningful alt text
- reduced-motion support
- no information conveyed by color alone

---

# 26. Design Direction

NexaGear should not look like a generic AI-generated store.

## Brand character

- precise
- technical
- modern
- tactile
- confident
- maker-oriented
- premium without luxury clichés

## Visual inspiration

The interface should take cues from:

- electronics packaging
- engineering workbenches
- industrial labels
- technical product photography
- modern developer hardware

Do not default automatically to:

- purple gradients
- generic SaaS cards
- glassmorphism everywhere
- three identical feature cards
- fake testimonials
- fake user statistics
- random glowing backgrounds

The product photography and catalogue should be the strongest visual content.

---

# 27. Design Two-Pass Requirement

Before frontend implementation:

## Pass 1

Create:

- color system
- typography proposal
- layout system
- product-card system
- checkout layout
- cart layout
- one memorable NexaGear-specific design idea

## Pass 2

Critique it:

- Could this be any generic tech shop?
- Does the design connect to developer/maker culture?
- Are there too many cards?
- Is the product photography prominent enough?
- Is visual decoration replacing usability?
- Does mobile checkout remain clear?

Revise before building if needed.

---

# 28. Seed Product Direction

Suggested sample products:

1. Compact Mechanical Keyboard
2. Developer Precision Mouse
3. USB-C 8-in-1 Hub
4. GaN Fast Charger
5. Portable Power Bank
6. Studio Monitoring Headphones
7. Arduino Starter Kit
8. Sensor Exploration Pack
9. Soldering & Prototyping Kit
10. Adjustable Laptop Stand

These are project seed concepts, not claims about real inventory or brands.

Use original/generic product names unless licensed brand assets are deliberately added.

---

# 29. Product Images

Use:

- original assets
- properly licensed stock/product images
- appropriately licensed generated imagery

Do not scrape copyrighted product images from random retailers.

Record image sources and licenses where applicable.

---

# 30. Privacy

Only collect information necessary for:

- authentication
- checkout
- order fulfillment/demo order representation
- transactional email

Do not add analytics or marketing tracking automatically.

If analytics are added later:

- document provider
- update privacy disclosures
- review consent requirements

---

# 31. Legal Pages

Before public production launch, prepare accurate:

- Privacy Policy
- Terms of Use
- Cookie/Storage Policy
- Refund/Returns information if the product is represented as a real commercial store

Because the HNG project may be a demonstration rather than a real commercial operation, legal pages must not pretend NexaGear is a registered business or make unsupported commercial commitments.

Mark draft or demo-specific limitations clearly where necessary.

---

# 32. Out of Scope for Assignment MVP

Unless HNG explicitly requires them, do not add:

- payment gateway
- Stripe
- Paystack
- Flutterwave
- cryptocurrency payments
- admin dashboard
- real warehouse inventory
- live shipping API
- discount system
- coupons
- product reviews
- wishlist
- social login providers other than Google
- complex recommendation engine
- AI shopping assistant
- multi-vendor marketplace
- realtime chat
- notifications
- elaborate CMS

These can be future enhancements.

---

# 33. Testing Requirements

## Storefront

- products load
- product detail works
- images load
- empty/error states work

## Cart

- add
- increment
- decrement
- remove
- subtotal calculation
- cart survives expected navigation

## Authentication

- Google sign-in
- callback
- session persistence
- sign-out
- checkout auth gate

## Checkout

- form validation
- successful order
- trusted total calculation
- order persistence
- order items persistence
- duplicate-submission protection

## Email

- confirmation sent after valid order
- Mailgun failure handled separately from order persistence

## Database

- products persist
- orders persist
- order items persist
- user/order ownership restrictions verified

## Accessibility

- keyboard-only checkout
- visible focus
- labels
- errors
- contrast

## Production

- build passes
- console clean
- no secrets in bundle
- direct route loads
- mobile test
- production email/config review

---

# 34. MVP Acceptance Criteria

The assignment is complete when:

- [ ] Shop homepage is functional.
- [ ] Products are displayed from persistent data.
- [ ] Users can add products to a cart.
- [ ] Cart totals update correctly.
- [ ] Checkout page exists and works.
- [ ] Google authentication works using credentials configured through Google Cloud Console.
- [ ] Order is persisted in Supabase.
- [ ] Order items are persisted in Supabase.
- [ ] Final totals are calculated from trusted product records.
- [ ] Duplicate order submission is prevented reasonably.
- [ ] Mailgun sends confirmation for successful orders.
- [ ] Mailgun secrets are server-only.
- [ ] Email failure does not delete/rollback an otherwise valid order.
- [ ] Mobile layout works.
- [ ] Keyboard interaction works.
- [ ] Production build passes.
- [ ] No secrets are committed.
- [ ] Deployment is publicly accessible if HNG requires a live URL.

---

# 35. Definition of Done

NexaGear Assignment 2 is done when a reviewer can:

```text
Open shop
↓
Browse products
↓
Add items
↓
Open checkout
↓
Authenticate with Google
↓
Submit valid order
↓
See success confirmation
↓
Find the order in Supabase
↓
Receive the Mailgun confirmation email
```

without fake states, hard-coded success, or exposed secrets.

---

# 36. Future Enhancements

After the assignment is accepted, possible next phases include:

- order history
- payment integration
- inventory management
- admin catalogue management
- product search
- filters
- wishlist
- real shipping calculation
- transactional email templates
- purchase analytics
- recommendations

These are intentionally deferred from the assignment MVP.

---

# 37. Project North Star

> **A checkout is only successful when the order is genuinely persisted and the user receives a trustworthy result.**

---

# 38. One-Sentence Product Description

**NexaGear is a modern shop for developer, electronics, robotics, and workspace gear with a simple authenticated checkout and reliable order confirmation experience.**
