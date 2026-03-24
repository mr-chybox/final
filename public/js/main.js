/**
 * Poricito Bazar — Main JavaScript
 * Features: Product fetch, Add to Cart drawer, Quick Order, Checkout
 */
"use strict";

const API_BASE = window.location.origin;
let allProducts = [], currentFilter = "all", activeProduct = null;
let cart = {}; // { [productId]: { product, qty } }

/* ─── DOM REFS ─────────────────────────────────────── */
const productsGrid     = document.getElementById("productsGrid");
const productsLoader   = document.getElementById("productsLoader");
const cartBtn          = document.getElementById("cartBtn");
const cartCountEl      = document.getElementById("cartCount");
const footerYear       = document.getElementById("footerYear");
const filterBtns       = document.querySelectorAll(".filter-btn");
const cartOverlay      = document.getElementById("cartOverlay");
const cartDrawer       = document.getElementById("cartDrawer");
const cartCloseBtn     = document.getElementById("cartCloseBtn");
const cartDrawerCount  = document.getElementById("cartDrawerCount");
const cartEmpty        = document.getElementById("cartEmpty");
const cartItemsWrap    = document.getElementById("cartItemsWrapper");
const cartItemsList    = document.getElementById("cartItemsList");
const cartDrawerFooter = document.getElementById("cartDrawerFooter");
const cartSubtotalEl   = document.getElementById("cartSubtotal");
const cartTotalEl      = document.getElementById("cartTotal");
const checkoutBtn      = document.getElementById("checkoutBtn");
const clearCartBtn     = document.getElementById("clearCartBtn");
const cartShopNowBtn   = document.getElementById("cartShopNowBtn");
const orderQtyEl       = document.getElementById("orderQty");
const qtyMinus         = document.getElementById("qtyMinus");
const qtyPlus          = document.getElementById("qtyPlus");
const submitOrderBtn   = document.getElementById("submitOrderBtn");
const orderSuccess     = document.getElementById("orderSuccess");
const orderError       = document.getElementById("orderError");
const orderSuccessMsg  = document.getElementById("orderSuccessMsg");
const orderErrorMsg    = document.getElementById("orderErrorMsg");
const orderTotalBox    = document.getElementById("orderTotalBox");
const orderPreview     = document.getElementById("orderProductPreview");
const coName           = document.getElementById("coName");
const coPhone          = document.getElementById("coPhone");
const coAddress        = document.getElementById("coAddress");
const coSubmitBtn      = document.getElementById("coSubmitBtn");
const coSuccess        = document.getElementById("coSuccess");
const coError          = document.getElementById("coError");
const coSuccessMsg     = document.getElementById("coSuccessMsg");
const coErrorMsg       = document.getElementById("coErrorMsg");
const checkoutSummaryList  = document.getElementById("checkoutSummaryList");
const checkoutTotalValue   = document.getElementById("checkoutTotalValue");

let orderModal, checkoutModal;

/* ─── INIT ─────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  orderModal    = new bootstrap.Modal(document.getElementById("orderModal"));
  checkoutModal = new bootstrap.Modal(document.getElementById("checkoutModal"));
  setFooterYear();
  setupScrollBehaviours();
  setupFilterBtns();
  setupCartDrawer();
  setupSingleOrderModal();
  setupCheckoutModal();
  setupBackToTop();
  createToast();
  fetchProducts();
});

/* ─── 1. FETCH ─────────────────────────────────────── */
async function fetchProducts() {
  try {
    const res  = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) throw new Error();
    const json = await res.json();
    allProducts = json.data;
  } catch {
    allProducts = [
      {id:1,name:"খাঁটি সরিষার তেল",price:400,unit:"লিটার",image:"./assets/images/products/mustard-oil.jpg",alt:"সরিষার তেল",category:"তেল",badge:"বেস্টসেলার",inStock:true},
      {id:2,name:"বিশুদ্ধ নারিকেল তেল",price:440,unit:"৮০০ml",image:"./assets/images/products/coconut-oil.jpg",alt:"নারিকেল তেল",category:"তেল",badge:null,inStock:true},
      {id:3,name:"প্রাকৃতিক হলুদের গুঁড়া",price:200,unit:"২০০গ্রাম",image:"./assets/images/products/turmeric-powder.jpg",alt:"হলুদ গুঁড়া",category:"মশলা",badge:"নতুন",inStock:true},
      {id:4,name:"দেশী সাল চিনি",price:120,unit:"কেজি",image:"./assets/images/products/cane-sugar.jpg",alt:"সাল চিনি",category:"চিনি",badge:null,inStock:true},
      {id:5,name:"আখের গুড়",price:180,unit:"কেজি",image:"./assets/images/products/jaggery.jpg",alt:"আখের গুড়",category:"চিনি",badge:null,inStock:true},
      {id:6,name:"খাঁটি মধু",price:650,unit:"৫০০ml",image:"./assets/images/products/honey.jpg",alt:"খাঁটি মধু",category:"মধু",badge:"প্রিমিয়াম",inStock:true},
      {id:7,name:"লাল চাল",price:90,unit:"কেজি",image:"./assets/images/products/red-rice.jpg",alt:"লাল চাল",category:"চাল",badge:null,inStock:false},
      {id:8,name:"ঘানি ভাঙা সরিষার তেল",price:520,unit:"লিটার",image:"./assets/images/products/cold-pressed-oil.jpg",alt:"ঘানি ভাঙা তেল",category:"তেল",badge:"অর্গানিক",inStock:true},
    ];
  }
  renderProducts(allProducts);
}

/* ─── 2. RENDER ────────────────────────────────────── */
function renderProducts(products) {
  if (productsLoader) productsLoader.remove();
  const filtered = currentFilter === "all" ? products : products.filter(p => p.category === currentFilter);
  if (!filtered.length) {
    productsGrid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted fs-5">এই ক্যাটাগরিতে কোনো পণ্য নেই।</p></div>`;
    return;
  }
  productsGrid.innerHTML = filtered.map(buildCard).join("");
  productsGrid.querySelectorAll(".btn-add-cart").forEach(btn =>
    btn.addEventListener("click", () => addToCart(+btn.dataset.productId)));
  productsGrid.querySelectorAll(".btn-quick-order").forEach(btn =>
    btn.addEventListener("click", () => openSingleOrderModal(+btn.dataset.productId)));
  syncCardButtons();
  productsGrid.querySelectorAll(".product-card").forEach((c, i) => {
    c.style.cssText = "opacity:0;transform:translateY(20px)";
    setTimeout(() => c.style.cssText = "transition:opacity .4s ease,transform .4s ease;opacity:1;transform:translateY(0)", i * 70);
  });
}

function buildCard(p) {
  const badge  = p.badge ? `<span class="product-badge badge-${{"নতুন":"new","প্রিমিয়াম":"premium","অর্গানিক":"organic"}[p.badge]||""}">${p.badge}</span>` : "";
  const qty    = cart[p.id]?.qty || 0;
  const added  = qty > 0;
  const actions = p.inStock ? `
    <div class="product-card-actions">
      <button class="btn-add-cart${added?" added":""}" data-product-id="${p.id}">
        ${added ? `<i class="bi bi-check-lg"></i> যোগ হয়েছে (${qty})` : `<i class="bi bi-cart-plus"></i> কার্টে যোগ করুন`}
      </button>
      <button class="btn-quick-order" data-product-id="${p.id}" title="দ্রুত অর্ডার">
        <i class="bi bi-lightning-charge-fill"></i>
      </button>
    </div>` : `<button class="btn-order" disabled>স্টক শেষ</button>`;
  return `
    <div class="col-xl-3 col-lg-4 col-md-6 col-sm-6">
      <div class="product-card${!p.inStock?" product-out-of-stock":""}">
        ${badge}
        <div class="product-img-wrapper">
          <img src="${p.image}" alt="${p.alt}" class="product-img" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <div class="product-img-placeholder" style="display:none">🛍️<small>ছবি যুক্ত করুন</small></div>
        </div>
        <div class="product-card-body">
          <h3 class="product-title">${p.name}</h3>
          <p class="product-price"><span class="price-number">৳${p.price}</span>/${p.unit}</p>
          ${actions}
        </div>
      </div>
    </div>`;
}

function syncCardButtons() {
  productsGrid.querySelectorAll(".btn-add-cart").forEach(btn => {
    const qty = cart[+btn.dataset.productId]?.qty || 0;
    btn.classList.toggle("added", qty > 0);
    btn.innerHTML = qty > 0
      ? `<i class="bi bi-check-lg"></i> যোগ হয়েছে (${qty})`
      : `<i class="bi bi-cart-plus"></i> কার্টে যোগ করুন`;
  });
}

/* ─── 3. CART LOGIC ────────────────────────────────── */
function addToCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p || !p.inStock) return;
  cart[id] ? cart[id].qty++ : (cart[id] = { product: p, qty: 1 });
  refreshCartUI();
  syncCardButtons();
  showToast(`"${p.name}" কার্টে যোগ হয়েছে`);
}

function removeFromCart(id) {
  delete cart[id];
  refreshCartUI();
  syncCardButtons();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) { removeFromCart(id); return; }
  syncCardButtons();
  renderCartItems();
  refreshTotals();
  refreshBadge();
}

function clearCart() {
  cart = {};
  refreshCartUI();
  syncCardButtons();
}

function subtotalValue() {
  return Object.values(cart).reduce((s, i) => s + i.product.price * i.qty, 0);
}
function totalItems() {
  return Object.values(cart).reduce((s, i) => s + i.qty, 0);
}
function fmt(n) { return "৳" + n.toLocaleString("bn-BD"); }

function refreshBadge() {
  const n = totalItems();
  cartCountEl.textContent = n;
  cartCountEl.style.display = n > 0 ? "flex" : "none";
  cartCountEl.style.transform = "scale(1.5)";
  setTimeout(() => cartCountEl.style.transform = "scale(1)", 250);
}

function refreshTotals() {
  const sub = subtotalValue();
  if (cartSubtotalEl) cartSubtotalEl.textContent = fmt(sub);
  if (cartTotalEl)    cartTotalEl.textContent    = fmt(sub);
}

function refreshCartUI() {
  refreshBadge();
  renderCartItems();
  refreshTotals();
  const empty = Object.keys(cart).length === 0;
  cartEmpty.style.display        = empty ? "flex"  : "none";
  cartItemsWrap.style.display    = empty ? "none"  : "block";
  cartDrawerFooter.style.display = empty ? "none"  : "flex";
  cartDrawerCount.textContent    = `${totalItems()}টি পণ্য`;
}

function renderCartItems() {
  cartItemsList.innerHTML = "";
  Object.values(cart).forEach(({ product: p, qty }) => {
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <img src="${p.image}" alt="${p.alt}" class="cart-item-img"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2262%22 height=%2262%22><text y=%2244%22 font-size=%2240%22>🛍️</text></svg>'"/>
      <div class="cart-item-body">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">৳${p.price}/${p.unit}</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" data-id="${p.id}" data-delta="-1">−</button>
          <span class="cart-qty-num">${qty}</span>
          <button class="cart-qty-btn" data-id="${p.id}" data-delta="1">+</button>
        </div>
      </div>
      <span class="cart-item-line-total">${fmt(p.price * qty)}</span>
      <button class="cart-item-remove" data-id="${p.id}"><i class="bi bi-trash3"></i></button>`;
    cartItemsList.appendChild(li);
  });
  cartItemsList.querySelectorAll(".cart-qty-btn").forEach(b =>
    b.addEventListener("click", () => changeQty(+b.dataset.id, +b.dataset.delta)));
  cartItemsList.querySelectorAll(".cart-item-remove").forEach(b =>
    b.addEventListener("click", () => removeFromCart(+b.dataset.id)));
}

/* ─── 4. CART DRAWER ───────────────────────────────── */
function setupCartDrawer() {
  cartBtn.addEventListener("click", openDrawer);
  cartCloseBtn.addEventListener("click", closeDrawer);
  cartOverlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => e.key === "Escape" && closeDrawer());
  cartShopNowBtn.addEventListener("click", () => { closeDrawer(); document.getElementById("products").scrollIntoView({behavior:"smooth"}); });
  clearCartBtn.addEventListener("click", () => { if (confirm("কার্ট খালি করবেন?")) clearCart(); });
  checkoutBtn.addEventListener("click", openCheckoutModal);
}

function openDrawer() {
  refreshCartUI();
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
}
function closeDrawer() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("active");
  document.body.style.overflow = "";
}

/* ─── 5. SINGLE ORDER MODAL ────────────────────────── */
function setupSingleOrderModal() {
  qtyMinus.addEventListener("click", () => { const v = +orderQtyEl.value||1; if (v>1){orderQtyEl.value=v-1;updSingleTotal();} });
  qtyPlus.addEventListener("click",  () => { const v = +orderQtyEl.value||1; if (v<99){orderQtyEl.value=v+1;updSingleTotal();} });
  orderQtyEl.addEventListener("input", updSingleTotal);
  submitOrderBtn.addEventListener("click", submitSingleOrder);
}

function openSingleOrderModal(id) {
  activeProduct = allProducts.find(p => p.id === id);
  if (!activeProduct) return;
  document.getElementById("orderName").value = "";
  document.getElementById("orderPhone").value = "";
  document.getElementById("orderAddress").value = "";
  orderQtyEl.value = 1;
  orderSuccess.classList.add("d-none");
  orderError.classList.add("d-none");
  submitOrderBtn.disabled = false;
  submitOrderBtn.innerHTML = '<i class="bi bi-bag-check me-2"></i>অর্ডার নিশ্চিত করুন';
  orderPreview.innerHTML = `
    <img src="${activeProduct.image}" alt="${activeProduct.alt}"
         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22><text y=%2244%22 font-size=%2240%22>🛍️</text></svg>'" />
    <div class="order-product-info">
      <div class="order-product-name">${activeProduct.name}</div>
      <div class="order-product-price">৳${activeProduct.price} / ${activeProduct.unit}</div>
    </div>`;
  updSingleTotal();
  orderModal.show();
}

function updSingleTotal() {
  if (!activeProduct) return;
  const qty = Math.max(1, +orderQtyEl.value||1);
  orderTotalBox.innerHTML = `
    <span class="order-total-label">মোট মূল্য (${qty} ${activeProduct.unit})</span>
    <span class="order-total-value">${fmt(activeProduct.price * qty)}</span>`;
}

async function submitSingleOrder() {
  const name    = document.getElementById("orderName").value.trim();
  const phone   = document.getElementById("orderPhone").value.trim();
  const address = document.getElementById("orderAddress").value.trim();
  const qty     = +orderQtyEl.value||1;
  orderSuccess.classList.add("d-none"); orderError.classList.add("d-none");
  if (!name||!phone||!address) { orderErrorMsg.textContent="সমস্ত তথ্য পূরণ করুন।"; orderError.classList.remove("d-none"); return; }
  if (!/^01[3-9]\d{8}$/.test(phone)) { orderErrorMsg.textContent="সঠিক মোবাইল নম্বর দিন।"; orderError.classList.remove("d-none"); return; }
  submitOrderBtn.disabled = true;
  submitOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>পাঠানো হচ্ছে...';
  try {
    const res  = await fetch(`${API_BASE}/api/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:activeProduct.id,quantity:qty,customerName:name,phone,address})});
    const json = await res.json();
    const id   = json.success ? json.data.orderId : `PB-${Date.now()}`;
    orderSuccessMsg.textContent = `অর্ডার নম্বর: ${id} — ধন্যবাদ!`;
    orderSuccess.classList.remove("d-none");
  } catch {
    orderSuccessMsg.textContent = `অর্ডার নম্বর: PB-${Date.now()} — ধন্যবাদ!`;
    orderSuccess.classList.remove("d-none");
  }
  submitOrderBtn.innerHTML = '<i class="bi bi-bag-check me-2"></i>অর্ডার নিশ্চিত করুন';
}

/* ─── 6. CHECKOUT MODAL ────────────────────────────── */
function setupCheckoutModal() {
  coSubmitBtn.addEventListener("click", submitCartOrder);
}

function openCheckoutModal() {
  closeDrawer();
  if (!Object.keys(cart).length) return;
  // Save cart to sessionStorage and navigate to checkout page
  sessionStorage.setItem('pb_cart', JSON.stringify(cart));
  window.location.href = './checkout.html';
}

async function submitCartOrder() {
  const name    = coName.value.trim();
  const phone   = coPhone.value.trim();
  const address = coAddress.value.trim();
  coSuccess.classList.add("d-none"); coError.classList.add("d-none");
  if (!name||!phone||!address) { coErrorMsg.textContent="সমস্ত তথ্য পূরণ করুন।"; coError.classList.remove("d-none"); return; }
  if (!/^01[3-9]\d{8}$/.test(phone)) { coErrorMsg.textContent="সঠিক মোবাইল নম্বর দিন।"; coError.classList.remove("d-none"); return; }
  coSubmitBtn.disabled = true;
  coSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>পাঠানো হচ্ছে...';
  const orderId = `PB-${Date.now()}`;
  try {
    for (const {product:p,qty} of Object.values(cart)) {
      await fetch(`${API_BASE}/api/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:p.id,quantity:qty,customerName:name,phone,address})});
    }
  } catch {}
  coSuccessMsg.textContent = `অর্ডার নম্বর: ${orderId} — ধন্যবাদ! শীঘ্রই যোগাযোগ করব।`;
  coSuccess.classList.remove("d-none");
  clearCart();
  coSubmitBtn.innerHTML = '<i class="bi bi-bag-check me-2"></i>অর্ডার নিশ্চিত করুন';
}

/* ─── 7. FILTER BUTTONS ────────────────────────────── */
function setupFilterBtns() {
  filterBtns.forEach(btn => btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    productsGrid.innerHTML = "";
    renderProducts(allProducts);
  }));
}

/* ─── 8. SCROLL / NAV ──────────────────────────────── */
function setupScrollBehaviours() {
  const header   = document.querySelector(".site-header");
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 20);
    let cur = "";
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
    navLinks.forEach(l => l.classList.toggle("active", l.getAttribute("href") === `#${cur}`));
    const btt = document.querySelector(".back-to-top");
    if (btt) btt.classList.toggle("visible", window.scrollY > 400);
  });
}

/* ─── 9. BACK TO TOP ───────────────────────────────── */
function setupBackToTop() {
  const btn = document.createElement("button");
  btn.className = "back-to-top"; btn.setAttribute("aria-label","উপরে যান");
  btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
  btn.addEventListener("click", () => window.scrollTo({top:0,behavior:"smooth"}));
  document.body.appendChild(btn);
}

/* ─── 10. TOAST ─────────────────────────────────────── */
let toastEl, toastTimer;
function createToast() {
  toastEl = document.createElement("div");
  toastEl.className = "cart-toast";
  toastEl.innerHTML = `<i class="bi bi-check-circle-fill"></i><span id="toastMsg"></span>`;
  document.body.appendChild(toastEl);
}
function showToast(msg) {
  document.getElementById("toastMsg").textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

/* ─── 11. FOOTER YEAR ───────────────────────────────── */
function setFooterYear() { if (footerYear) footerYear.textContent = new Date().getFullYear(); }
