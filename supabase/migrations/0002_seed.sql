-- NexaGear — 0002 seed catalogue
-- 11 original/generic seed products (PRD §28) covering all seven categories.
-- Product names are project seed concepts, not claims about real inventory or brands (PRD §28).
-- Image files are original SVG line art under /public/images/products/ (see DECISION_LOG D13).
-- Idempotent: safe to re-run.

insert into public.products
  (name, slug, sku, description, category, price, image_url, inventory_status, featured)
values
  ('Compact Mechanical Keyboard', 'compact-mechanical-keyboard', 'NG-001',
   'A 65-percent mechanical keyboard with hot-swappable switches, PBT keycaps, and a detachable USB-C cable. Built for long typing sessions without giving up desk space.',
   'Developer Setup', 89.00, '/images/products/compact-mechanical-keyboard.svg', 'in_stock', true),

  ('Developer Precision Mouse', 'developer-precision-mouse', 'NG-002',
   'A quiet-click precision mouse with a sculpted shape, adjustable tracking, and side buttons you can remap per application.',
   'Developer Setup', 59.00, '/images/products/developer-precision-mouse.svg', 'in_stock', false),

  ('Adjustable Laptop Stand', 'adjustable-laptop-stand', 'NG-003',
   'An anodized aluminum stand that lifts your laptop to eye level, folds flat for travel, and keeps airflow open underneath.',
   'Developer Setup', 42.00, '/images/products/adjustable-laptop-stand.svg', 'in_stock', false),

  ('Studio Monitoring Headphones', 'studio-monitoring-headphones', 'NG-004',
   'Closed-back monitoring headphones with replaceable earpads, a coiled cable, and a flat response that tells you what the mix actually sounds like.',
   'Audio', 79.00, '/images/products/studio-monitoring-headphones.svg', 'in_stock', true),

  ('USB-C 8-in-1 Hub', 'usb-c-8-in-1-hub', 'NG-005',
   'Eight ports in one aluminum block: HDMI, two USB-A, SD and microSD, Ethernet, and 100W power delivery passthrough over a braided USB-C cable.',
   'Connectivity', 45.00, '/images/products/usb-c-8-in-1-hub.svg', 'in_stock', true),

  ('GaN Fast Charger', 'gan-fast-charger', 'NG-006',
   'A pocket-size gallium-nitride charger with two USB-C ports and one USB-A port. Charges a laptop and a phone from one brick.',
   'Power', 39.00, '/images/products/gan-fast-charger.svg', 'in_stock', false),

  ('Portable Power Bank', 'portable-power-bank', 'NG-007',
   'A 20,000mAh power bank with USB-C passthrough charging and a clear side readout so you know exactly how much charge is left.',
   'Power', 49.00, '/images/products/portable-power-bank.svg', 'in_stock', false),

  ('Arduino Starter Kit', 'arduino-starter-kit', 'NG-008',
   'A microcontroller board plus the parts to get moving: breadboard, jumper wires, LEDs, resistors, and a printed project booklet from blink to sensors.',
   'Electronics', 65.00, '/images/products/arduino-starter-kit.svg', 'in_stock', true),

  ('Sensor Exploration Pack', 'sensor-exploration-pack', 'NG-009',
   'Twelve sensor modules — temperature, humidity, motion, light, distance, and more — with pinouts printed on each board so you can wire without a datasheet hunt.',
   'Electronics', 34.00, '/images/products/sensor-exploration-pack.svg', 'in_stock', false),

  ('Soldering & Prototyping Kit', 'soldering-prototyping-kit', 'NG-010',
   'A temperature-controlled soldering iron, desoldering braid, flux pen, precision tip set, and a stack of prototyping boards in one case.',
   'Prototyping', 55.00, '/images/products/soldering-prototyping-kit.svg', 'in_stock', false),

  ('Robot Chassis & Motor Bundle', 'robot-chassis-motor-bundle', 'NG-011',
   'A cut-acrylic two-wheel chassis with gear motors, a motor driver board, casters, and the hardware to build a driving base in an afternoon.',
   'Robotics', 58.00, '/images/products/robot-chassis-motor-bundle.svg', 'in_stock', false)

on conflict (slug) do update
  set name            = excluded.name,
      sku             = excluded.sku,
      description     = excluded.description,
      category        = excluded.category,
      price           = excluded.price,
      image_url       = excluded.image_url,
      inventory_status = excluded.inventory_status,
      featured        = excluded.featured,
      updated_at      = now();
