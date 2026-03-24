# পরিচিত বাজার — Poricito Bazar
## Full-Stack Bengali E-Commerce Website

A complete, responsive Bengali e-commerce landing page with a Node.js/Express backend API.

---

## 📁 Project Structure

```
poricito-bazar/
│
├── server.js                   ← Express backend (API + static file server)
├── package.json
│
└── public/                     ← All frontend files (served statically)
    ├── index.html              ← Main page
    ├── css/
    │   └── style.css           ← All custom styles
    ├── js/
    │   └── main.js             ← All frontend logic
    └── assets/
        └── images/
            ├── logo.png                    ← Site logo (60×60px)
            ├── hero-bg.jpg                 ← Hero background (1920×700px)
            ├── hero-mustard.png            ← Hero floating ingredient (PNG, transparent bg)
            ├── hero-coconut.png            ← Hero floating ingredient (PNG, transparent bg)
            ├── hero-turmeric.png           ← Hero floating ingredient (PNG, transparent bg)
            ├── hero-sugarcane.png          ← Hero floating ingredient (PNG, transparent bg)
            ├── about-farm.jpg              ← About section image (600×500px)
            │
            ├── products/
            │   ├── mustard-oil.jpg         ← Product image (300×300px)
            │   ├── coconut-oil.jpg
            │   ├── turmeric-powder.jpg
            │   ├── cane-sugar.jpg
            │   ├── jaggery.jpg
            │   ├── honey.jpg
            │   ├── red-rice.jpg
            │   └── cold-pressed-oil.jpg
            │
            └── payment/
                ├── bkash.png               ← Payment logo (80×30px, transparent bg)
                ├── nagad.png
                ├── rocket.png
                └── mastercard.png
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
cd poricito-bazar
npm install
```

### 2. Start the server
```bash
# Production
npm start

# Development (auto-reload with nodemon)
npm run dev
```

### 3. Open in browser
```
http://localhost:3000
```

> **Note:** The frontend also works without the server — just open `public/index.html`
> directly in a browser. It will automatically use fallback product data.

---

## 🌐 API Endpoints

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | `/api/products`           | All products (supports `?category=` filter) |
| GET    | `/api/products/popular`   | First 4 in-stock products          |
| GET    | `/api/products/:id`       | Single product by ID               |
| POST   | `/api/orders`             | Place an order                     |
| POST   | `/api/contact`            | Submit a contact form              |

### Example: Fetch all oil products
```
GET /api/products?category=তেল
```

### Example: Place an order
```json
POST /api/orders
{
  "productId": 1,
  "quantity": 2,
  "customerName": "রহিম উদ্দিন",
  "phone": "01712345678",
  "address": "৪৫ মতিঝিল, ঢাকা"
}
```

---

## 🖼️ Adding Your Images

All `<img>` tags have clear `src` paths. Simply drop your images into the correct folder:

### Site Logo
- **Path:** `public/assets/images/logo.png`
- **Size:** 60×60px or square, transparent PNG preferred

### Hero Section
| File                          | Description                        | Recommended Size |
|-------------------------------|------------------------------------|------------------|
| `hero-bg.jpg`                 | Background landscape photo         | 1920×700px       |
| `hero-mustard.png`            | Mustard flowers/seeds (transparent) | 400×400px PNG   |
| `hero-coconut.png`            | Coconut halved (transparent)       | 500×500px PNG    |
| `hero-turmeric.png`           | Turmeric roots (transparent)       | 400×400px PNG    |
| `hero-sugarcane.png`          | Sugarcane stalks (transparent)     | 300×500px PNG    |

### Product Images
- **Path:** `public/assets/images/products/[name].jpg`
- **Size:** 300×300px minimum, square format recommended
- **Tip:** Use `object-fit: contain` (already set in CSS) so any size works

### Payment Logos
- **Path:** `public/assets/images/payment/[name].png`
- **Size:** ~80×30px, transparent background
- **Note:** Logos are rendered white in the footer (CSS: `filter: brightness(0) invert(1)`)
  - If you want coloured logos in the footer, remove that filter from `.payment-logo` in `style.css`

---

## 🎨 Customisation

### Changing Colors
All brand colours are CSS variables in `style.css`:
```css
:root {
  --pb-orange:       #e07b2e;  /* Primary CTA colour */
  --pb-green:        #3a7d44;  /* Accent / highlight */
  --pb-yellow:       #f9c74f;  /* Decorative accent */
  --pb-cream:        #fdf6ec;  /* Light background */
  --pb-footer-bg:    #1c2b1e;  /* Footer dark background */
}
```

### Adding More Products
Edit the `products` array in `server.js`. Each product object:
```js
{
  id:       9,
  name:     "নতুন পণ্যের নাম",
  nameEn:   "New Product Name",
  price:    300,
  unit:     "কেজি",
  image:    "./assets/images/products/new-product.jpg",
  alt:      "Image alt text",
  category: "তেল",   // used for filter tabs
  badge:    "নতুন",  // or null for no badge
  inStock:  true,
}
```

### Adding a Category Filter Tab
In `index.html`, add a new button:
```html
<button class="filter-btn" data-filter="চাল">চাল</button>
```
The `data-filter` value must match the `category` field in the product data.

---

## 🔧 Production Notes

- Replace the in-memory `products` array in `server.js` with a real database (MongoDB, PostgreSQL, etc.)
- Add authentication middleware for an admin panel
- Implement proper order management and email notifications
- Consider adding a `.env` file for `PORT`, database URLs, and API keys
- Use `pm2` or a similar process manager for deployment

---

## 📞 Contact Info in Footer
Update the contact details directly in `index.html` (search for `mail.porichito@gmail.com`).

---

**Technology Stack:** HTML5 · CSS3 · Bootstrap 5 · Node.js · Express.js
