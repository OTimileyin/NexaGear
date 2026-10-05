/**
 * The deployment this app's carts belong to.
 *
 * Same value the website uses as `NEXT_PUBLIC_SITE_URL` on Vercel, written down
 * rather than read from the environment: a wrong shop URL is a broken link on
 * one screen, not a reason to make every build carry a fourth key. If the site
 * ever moves, this moves with it.
 */
export const SHOP_URL = "https://nexagear.vercel.app";
