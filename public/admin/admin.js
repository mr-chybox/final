/**
 * Poricito Bazar — Admin Dashboard JS
 * ═══════════════════════════════════════════════════════════
 * Handles:
 *  1.  Auth guard — redirect to login if no JWT
 *  2.  Sidebar navigation & mobile toggle
 *  3.  Dashboard stats + recent orders
 *  4.  Orders table — paginated, filterable, status updatable
 *  5.  Products table — add / edit / soft-delete / stock toggle
 *  6.  Modal open/close helpers
 *  7.  Toast notification system
 * ═══════════════════════════════════════════════════════════
 */

"use strict";

/* ── Config ─────────────────────────────────────────────── */
const API   = window.location.origin + "/api";
const TOKEN = localStorage.getItem("pb_admin_token");

/* ── Auth guard ─────────────────────────────────────────── */
if (!TOKEN) {
  window.location.replace("./login.html");
}

/* ── State ──────────────────────────────────────────────── */
const state = {
  ordersPage:        1,
  ordersLimit:       10,
  ordersTotal:       0,
  ordersTotalPages:  0,
  ordersStatusFilter:"",
  editingOrderId:    null,
  editingProductId:  null,
};

/* ── Helpers ────────────────────────────────────────────── */
const $  = (id) => document.getElementById(id);
const authHeaders = () => ({
  "Content-Type":  "application/json",
  "Authorization": `Bearer ${TOKEN}`,
});

async function apiFetch(path, opts = {}) {
  const res  = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    ...opts,
  });
  const data = await res.json();
  if (res.status === 401 || res.status === 403) {
    // Token expired or invalid → back to login
    localStorage.removeItem("pb_admin_token");
    localStorage.removeItem("pb_admin_username");
    window.location.replace("./login.html");
    return;
  }
  return data;
}

function fmtCurrency(n) {
  return "৳" + Number(n).toLocaleString("en-IN");
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("bn-BD", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function statusBadge(status) {
  const labels = {
    pending:   "Pending",
    confirmed: "Confirmed",
    shipped:   "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return `<span class="status-badge status-${status}">${labels[status] || status}</span>`;
}

/* ── Toast ──────────────────────────────────────────────── */
function showToast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast${type === "error" ? " error" : ""}`;
  el.innerHTML = `<i class="bi bi-${type === "error" ? "exclamation-triangle-fill" : "check-circle-fill"}"></i><span>${msg}</span>`;
  $("toastContainer").appendChild(el);
  requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add("show")); });
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

/* ── Modal helpers ──────────────────────────────────────── */
function openModal(id)  { $(id).classList.add("open");  document.body.style.overflow = "hidden"; }
function closeModal(id) { $(id).classList.remove("open"); document.body.style.overflow = ""; }

/* ═══════════════════════════════════════════════════════════
   1. SIDEBAR & NAVIGATION
═══════════════════════════════════════════════════════════ */
const pages = ["dashboard", "orders", "products", "users"];

function navigateTo(page) {
  // Update sidebar active state
  document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  // Show / hide page sections
  pages.forEach(p => {
    const el = $(`page-${p}`);
    if (el) el.classList.toggle("active", p === page);
  });

  // Update topbar title
  const titles = {
    dashboard: "ড্যাশবোর্ড",
    orders:    "অর্ডার ব্যবস্থাপনা",
    products:  "পণ্য ব্যবস্থাপনা",
    users:     "নিবন্ধিত ব্যবহারকারী",
  };
  $("topbarTitle").textContent = titles[page] || page;

  // Lazy-load page data
  if (page === "dashboard") loadDashboard();
  if (page === "orders")    loadOrders();
  if (page === "products")  loadProducts();
  if (page === "users")     loadUsers();

  closeSidebar();
}

document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
  btn.addEventListener("click", () => navigateTo(btn.dataset.page));
});

$("dashViewAllBtn").addEventListener("click", () => navigateTo("orders"));

// Mobile sidebar
function openSidebar()  { $("sidebar").classList.add("open");  $("sidebarOverlay").classList.add("show"); }
function closeSidebar() { $("sidebar").classList.remove("open"); $("sidebarOverlay").classList.remove("show"); }
$("sidebarToggle").addEventListener("click", openSidebar);
$("sidebarOverlay").addEventListener("click", closeSidebar);

// Logout
$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("pb_admin_token");
  localStorage.removeItem("pb_admin_username");
  window.location.replace("./login.html");
});

// Admin name in topbar
const savedUsername = localStorage.getItem("pb_admin_username") || "Admin";
$("adminName").textContent  = savedUsername;
$("adminAvatar").textContent = savedUsername.charAt(0).toUpperCase();

/* ═══════════════════════════════════════════════════════════
   2. DASHBOARD
═══════════════════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const data = await apiFetch("/admin/dashboard");
    if (!data?.success) return;

    const { orders, products } = data.data;

    // Fetch user total for dashboard card
    let userTotal = 0;
    try {
      const ud = await apiFetch("/admin/users?page=1&limit=1");
      if (ud?.success) { userTotal = ud.total; $("usersBadge").textContent = userTotal; }
    } catch {}

    $("statsGrid").innerHTML = `
      <div class="stat-card">
        <div class="stat-icon orange"><i class="bi bi-bag-fill"></i></div>
        <div class="stat-body">
          <div class="stat-label">মোট অর্ডার</div>
          <div class="stat-value">${orders.total_orders}</div>
          <div class="stat-sub">Pending: ${orders.pending}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green"><i class="bi bi-currency-dollar"></i></div>
        <div class="stat-body">
          <div class="stat-label">মোট রাজস্ব</div>
          <div class="stat-value">${fmtCurrency(orders.total_revenue)}</div>
          <div class="stat-sub">Delivered: ${fmtCurrency(orders.delivered_revenue)}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><i class="bi bi-people-fill"></i></div>
        <div class="stat-body">
          <div class="stat-label">নিবন্ধিত ব্যবহারকারী</div>
          <div class="stat-value">${userTotal}</div>
          <div class="stat-sub">মোট অ্যাকাউন্ট</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple"><i class="bi bi-box-seam-fill"></i></div>
        <div class="stat-body">
          <div class="stat-label">মোট পণ্য</div>
          <div class="stat-value">${products.total}</div>
          <div class="stat-sub">In-Stock: ${products.in_stock}</div>
        </div>
      </div>
    `;

    // Update pending badge
    $("pendingBadge").textContent = orders.pending;

    // Load recent orders
    const recent = await apiFetch("/admin/orders?page=1&limit=8");
    if (recent?.success) renderRecentOrders(recent.data);

  } catch (err) {
    showToast("ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে।", "error");
  }
}

function renderRecentOrders(orders) {
  const tbody = $("recentOrdersTbody");
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-inbox"></i></div><p>কোনো অর্ডার নেই।</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><code style="font-size:0.78rem;color:var(--orange)">${o.orderRef}</code></td>
      <td>${o.customerName}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.productName}</td>
      <td style="font-family:var(--font-en)">${o.quantity}</td>
      <td style="font-family:var(--font-en);font-weight:600">${fmtCurrency(o.totalPrice)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-family:var(--font-en);color:var(--text-mid);font-size:0.82rem">${fmtDate(o.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" onclick="openOrderModal(${o.id})" title="বিবরণ ও আপডেট">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteOrder(${o.id},'${o.orderRef}')" title="অর্ডার ডিলিট করুন">
            <i class="bi bi-trash3-fill"></i>
          </button>
        </div>
      </td>
    </tr>`).join("");
}

/* ═══════════════════════════════════════════════════════════
   3. ORDERS PAGE
═══════════════════════════════════════════════════════════ */
async function loadOrders(page = state.ordersPage) {
  state.ordersPage = page;
  const statusParam = state.ordersStatusFilter
    ? `&status=${state.ordersStatusFilter}` : "";

  try {
    const data = await apiFetch(
      `/admin/orders?page=${page}&limit=${state.ordersLimit}${statusParam}`
    );
    if (!data?.success) return;

    state.ordersTotal      = data.total;
    state.ordersTotalPages = data.totalPages;

    renderOrdersTable(data.data);
    renderOrdersPagination();
  } catch {
    showToast("অর্ডার লোড করতে সমস্যা।", "error");
  }
}

function renderOrdersTable(orders) {
  const tbody = $("ordersTbody");
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-inbox"></i></div><p>কোনো অর্ডার পাওয়া যায়নি।</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((o, i) => `
    <tr>
      <td style="color:var(--text-light);font-family:var(--font-en)">${((state.ordersPage - 1) * state.ordersLimit) + i + 1}</td>
      <td><code style="font-size:0.78rem;color:var(--orange);background:var(--orange-pale);padding:2px 6px;border-radius:4px">${o.orderRef}</code></td>
      <td>
        <div style="font-weight:600">${o.customerName}</div>
        <div style="font-size:0.78rem;color:var(--text-mid)">${o.address.substring(0, 35)}${o.address.length > 35 ? "…" : ""}</div>
      </td>
      <td style="font-family:var(--font-en)">${o.phone}</td>
      <td>
        <div style="font-weight:500;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.productName}</div>
      </td>
      <td style="font-family:var(--font-en);text-align:center">${o.quantity}</td>
      <td style="font-family:var(--font-en);font-weight:700;color:var(--orange)">${fmtCurrency(o.totalPrice)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-family:var(--font-en);color:var(--text-mid);font-size:0.82rem;white-space:nowrap">${fmtDate(o.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" onclick="openOrderModal(${o.id})" title="বিবরণ ও আপডেট">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteOrder(${o.id},'${o.orderRef}')" title="অর্ডার ডিলিট করুন">
            <i class="bi bi-trash3-fill"></i>
          </button>
        </div>
      </td>
    </tr>`).join("");
}

function renderOrdersPagination() {
  $("ordersPageInfo").textContent =
    `${state.ordersTotal} অর্ডারের মধ্যে ${((state.ordersPage - 1) * state.ordersLimit) + 1}–${Math.min(state.ordersPage * state.ordersLimit, state.ordersTotal)} দেখাচ্ছে`;

  const container = $("ordersPaginationBtns");
  container.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
  prevBtn.disabled  = state.ordersPage === 1;
  prevBtn.onclick   = () => loadOrders(state.ordersPage - 1);
  container.appendChild(prevBtn);

  // Show up to 5 page buttons
  const start = Math.max(1, state.ordersPage - 2);
  const end   = Math.min(state.ordersTotalPages, start + 4);
  for (let p = start; p <= end; p++) {
    const btn = document.createElement("button");
    btn.className = `page-btn${p === state.ordersPage ? " active" : ""}`;
    btn.textContent = p;
    btn.onclick     = () => loadOrders(p);
    container.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
  nextBtn.disabled  = state.ordersPage >= state.ordersTotalPages;
  nextBtn.onclick   = () => loadOrders(state.ordersPage + 1);
  container.appendChild(nextBtn);
}

// Status filter
$("orderStatusFilter").addEventListener("change", (e) => {
  state.ordersStatusFilter = e.target.value;
  state.ordersPage         = 1;
  loadOrders();
});

$("refreshOrdersBtn").addEventListener("click", () => loadOrders(1));

// ── Order Detail Modal ──────────────────────────────────
window.openOrderModal = async (orderId) => {
  state.editingOrderId = orderId;
  openModal("orderModal");
  $("orderModalBody").innerHTML = `<div style="text-align:center;padding:30px"><div class="skeleton" style="height:200px;border-radius:10px"></div></div>`;

  try {
    const data = await apiFetch(`/admin/orders/${orderId}`);
    if (!data?.success) throw new Error(data?.message);
    const o = data.data;

    $("orderModalBody").innerHTML = `
      <!-- Order summary -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div>
          <div style="font-size:0.75rem;color:var(--text-light);margin-bottom:3px">অর্ডার রেফ</div>
          <code style="color:var(--orange);font-size:0.9rem">${o.orderRef}</code>
        </div>
        <div>
          <div style="font-size:0.75rem;color:var(--text-light);margin-bottom:3px">তারিখ</div>
          <div style="font-size:0.88rem">${fmtDate(o.createdAt)}</div>
        </div>
        <div>
          <div style="font-size:0.75rem;color:var(--text-light);margin-bottom:3px">গ্রাহক</div>
          <div style="font-weight:600">${o.customerName}</div>
        </div>
        <div>
          <div style="font-size:0.75rem;color:var(--text-light);margin-bottom:3px">ফোন</div>
          <div style="font-family:var(--font-en)">${o.phone}</div>
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:0.75rem;color:var(--text-light);margin-bottom:3px">ঠিকানা</div>
          <div style="font-size:0.88rem">${o.address}</div>
        </div>
      </div>

      <!-- Product info -->
      <div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:0.75rem;color:var(--text-light)">পণ্য</div>
          <div style="font-weight:600">${o.productName}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:0.75rem;color:var(--text-light)">পরিমাণ</div>
          <div style="font-family:var(--font-en);font-weight:700;font-size:1.1rem">${o.quantity}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.75rem;color:var(--text-light)">মোট মূল্য</div>
          <div style="font-family:var(--font-en);font-weight:700;font-size:1.2rem;color:var(--orange)">${fmtCurrency(o.totalPrice)}</div>
        </div>
      </div>

      <!-- Status update -->
      <div class="form-group">
        <label class="form-label">স্ট্যাটাস আপডেট করুন</label>
        <select class="form-control" id="modalStatusSelect">
          <option value="pending"   ${o.status==="pending"   ? "selected" : ""}>⏳ Pending</option>
          <option value="confirmed" ${o.status==="confirmed" ? "selected" : ""}>✅ Confirmed</option>
          <option value="shipped"   ${o.status==="shipped"   ? "selected" : ""}>🚚 Shipped</option>
          <option value="delivered" ${o.status==="delivered" ? "selected" : ""}>📦 Delivered</option>
          <option value="cancelled" ${o.status==="cancelled" ? "selected" : ""}>❌ Cancelled</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">অ্যাডমিন নোট (ঐচ্ছিক)</label>
        <textarea class="form-control" id="modalAdminNote" rows="2"
                  placeholder="গ্রাহকের সাথে যোগাযোগ করা হয়েছে…">${o.adminNote || ""}</textarea>
      </div>`;
  } catch {
    $("orderModalBody").innerHTML = `<div class="empty-state"><p>অর্ডার লোড করতে সমস্যা হয়েছে।</p></div>`;
  }
};

$("orderModalSave").addEventListener("click", async () => {
  const status    = $("modalStatusSelect")?.value;
  const adminNote = $("modalAdminNote")?.value?.trim();
  if (!status || !state.editingOrderId) return;

  try {
    const data = await apiFetch(`/admin/orders/${state.editingOrderId}/status`, {
      method: "PATCH",
      body:   JSON.stringify({ status, adminNote }),
    });
    if (!data?.success) throw new Error(data?.message);

    showToast("অর্ডার স্ট্যাটাস আপডেট হয়েছে।");
    closeModal("orderModal");
    loadOrders();
    loadDashboard();
  } catch (err) {
    showToast(err.message || "আপডেট করতে সমস্যা হয়েছে।", "error");
  }
});

["orderModalClose","orderModalCancel"].forEach(id =>
  $(id).addEventListener("click", () => closeModal("orderModal"))
);

// ── Delete order ─────────────────────────────────────────
window.deleteOrder = async (id, orderRef) => {
  if (!confirm(`অর্ডার "${orderRef}" স্থায়ীভাবে ডিলিট করতে চান? এই কাজটি ফেরানো যাবে না।`)) return;
  try {
    const data = await apiFetch(`/admin/orders/${id}`, { method: "DELETE" });
    if (!data?.success) throw new Error(data?.message);
    showToast(data.message || "অর্ডার ডিলিট হয়েছে।");
    loadOrders();
    loadDashboard();
  } catch (err) {
    showToast(err.message || "অর্ডার ডিলিট করতে সমস্যা হয়েছে।", "error");
  }
};

/* ═══════════════════════════════════════════════════════════
   4. PRODUCTS PAGE
═══════════════════════════════════════════════════════════ */
async function loadProducts() {
  try {
    const data = await apiFetch("/products");
    if (!data?.success) return;
    renderProductsTable(data.data);
  } catch {
    showToast("পণ্য লোড করতে সমস্যা।", "error");
  }
}

function renderProductsTable(products) {
  const tbody = $("productsTbody");
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-box-seam"></i></div><p>কোনো পণ্য নেই।</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = products.map((p, i) => `
    <tr>
      <td style="color:var(--text-light);font-family:var(--font-en)">${i + 1}</td>
      <td>
        <img src="${p.image}" alt="${p.alt || p.name}" class="product-thumb"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2246%22 height=%2246%22><text y=%2234%22 font-size=%2230%22>🛍️</text></svg>'" />
      </td>
      <td>
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:0.75rem;color:var(--text-light)">${p.nameEn || ""}</div>
      </td>
      <td><span style="background:var(--cream);border:1px solid var(--border);padding:2px 8px;border-radius:6px;font-size:0.78rem">${p.category || "—"}</span></td>
      <td style="font-family:var(--font-en);font-weight:600;color:var(--orange)">${fmtCurrency(p.price)}</td>
      <td style="color:var(--text-mid)">${p.unit}</td>
      <td>${p.badge ? `<span style="background:var(--orange-pale);color:var(--orange-dark);padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:600">${p.badge}</span>` : "—"}</td>
      <td>
        <label class="stock-toggle" title="${p.inStock ? "স্টকে আছে" : "স্টকে নেই"}">
          <input type="checkbox" ${p.inStock ? "checked" : ""} onchange="toggleStock(${p.id}, this.checked)" />
          <span class="stock-slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" onclick="openEditProduct(${p.id})" title="সম্পাদনা">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="softDeleteProduct(${p.id},'${p.name}')" title="সরান">
            <i class="bi bi-trash3-fill"></i>
          </button>
        </div>
      </td>
    </tr>`).join("");
}

// ── Stock toggle ────────────────────────────────────────
window.toggleStock = async (productId, inStock) => {
  try {
    const data = await apiFetch(`/admin/products/${productId}`, {
      method: "PUT",
      body:   JSON.stringify({ inStock }),
    });
    if (!data?.success) throw new Error(data?.message);
    showToast(`স্টক স্ট্যাটাস আপডেট হয়েছে।`);
  } catch (err) {
    showToast(err.message, "error");
    loadProducts(); // revert toggle on error
  }
};

// ── Soft delete ─────────────────────────────────────────
window.softDeleteProduct = async (id, name) => {
  if (!confirm(`"${name}" স্টক থেকে সরাতে চান?`)) return;
  try {
    const data = await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
    if (!data?.success) throw new Error(data?.message);
    showToast(data.message || "পণ্য সরানো হয়েছে।");
    loadProducts();
  } catch (err) {
    showToast(err.message, "error");
  }
};

// ── Add product button ──────────────────────────────────
$("addProductBtn").addEventListener("click", () => {
  state.editingProductId = null;
  $("productModalTitle").innerHTML = '<i class="bi bi-plus-circle-fill"></i> নতুন পণ্য যোগ করুন';
  $("productId").value   = "";
  $("pName").value       = "";
  $("pNameEn").value     = "";
  $("pPrice").value      = "";
  $("pUnit").value       = "";
  $("pCategory").value   = "";
  $("pBadge").value      = "";
  $("pImage").value      = "";
  $("pAlt").value        = "";
  $("pInStock").checked  = true;
  $("productModalError").style.display = "none";
  openModal("productModal");
});

// ── Edit product ────────────────────────────────────────
window.openEditProduct = async (id) => {
  state.editingProductId = id;
  openModal("productModal");
  $("productModalTitle").innerHTML = '<i class="bi bi-pencil-fill"></i> পণ্য সম্পাদনা';

  try {
    const data = await apiFetch(`/products/${id}`);
    if (!data?.success) throw new Error();
    const p = data.data;
    $("productId").value  = p.id;
    $("pName").value      = p.name;
    $("pNameEn").value    = p.nameEn    || "";
    $("pPrice").value     = p.price;
    $("pUnit").value      = p.unit;
    $("pCategory").value  = p.category  || "";
    $("pBadge").value     = p.badge     || "";
    $("pImage").value     = p.image     || "";
    $("pAlt").value       = p.alt       || "";
    $("pInStock").checked = p.inStock;
  } catch {
    showToast("পণ্য লোড করতে সমস্যা।", "error");
    closeModal("productModal");
  }
};

// ── Save product (create / update) ─────────────────────
$("productModalSave").addEventListener("click", async () => {
  const errEl = $("productModalError");
  errEl.style.display = "none";

  const name    = $("pName").value.trim();
  const price   = $("pPrice").value.trim();
  const unit    = $("pUnit").value.trim();

  if (!name || !price || !unit) {
    errEl.textContent     = "পণ্যের নাম, মূল্য এবং একক আবশ্যক।";
    errEl.style.display   = "block";
    return;
  }

  const payload = {
    name,
    nameEn:   $("pNameEn").value.trim()  || undefined,
    price:    parseFloat(price),
    unit,
    image:    $("pImage").value.trim()   || undefined,
    altText:  $("pAlt").value.trim()     || undefined,
    category: $("pCategory").value       || undefined,
    badge:    $("pBadge").value          || undefined,
    inStock:  $("pInStock").checked,
  };

  const isEdit  = !!state.editingProductId;
  const url     = isEdit
    ? `/admin/products/${state.editingProductId}`
    : "/admin/products";
  const method  = isEdit ? "PUT" : "POST";

  try {
    const data = await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
    if (!data?.success) throw new Error(data?.message);
    showToast(isEdit ? "পণ্য আপডেট হয়েছে।" : "নতুন পণ্য যোগ হয়েছে।");
    closeModal("productModal");
    loadProducts();
  } catch (err) {
    errEl.textContent   = err.message || "সংরক্ষণ করতে সমস্যা হয়েছে।";
    errEl.style.display = "block";
  }
});

["productModalClose","productModalCancel"].forEach(id =>
  $(id).addEventListener("click", () => closeModal("productModal"))
);

// Close modals on overlay click
["orderModal","productModal"].forEach(id =>
  $(id).addEventListener("click", (e) => {
    if (e.target === $(id)) closeModal(id);
  })
);

// ESC to close any open modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    ["orderModal","productModal"].forEach(closeModal);
  }
});

/* ═══════════════════════════════════════════════════════════
   5. GLOBAL SEARCH
═══════════════════════════════════════════════════════════ */
let searchTimeout;
$("globalSearch").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim();
  if (!q) return;
  searchTimeout = setTimeout(() => {
    // Navigate to orders tab and filter by order ref / phone
    navigateTo("orders");
    apiFetch(`/admin/orders?orderRef=${encodeURIComponent(q)}&page=1&limit=10`)
      .then(data => { if (data?.success) renderOrdersTable(data.data); });
  }, 400);
});


/* ═══════════════════════════════════════════════════════════
   6. USERS PAGE
═══════════════════════════════════════════════════════════ */
const usersState = { page:1, limit:15, total:0, totalPages:0, search:"" };

async function loadUsers(page = usersState.page) {
  usersState.page = page;
  const q = usersState.search ? `&search=${encodeURIComponent(usersState.search)}` : "";
  try {
    const data = await apiFetch(`/admin/users?page=${page}&limit=${usersState.limit}${q}`);
    if (!data?.success) return;
    usersState.total      = data.total;
    usersState.totalPages = data.totalPages;
    renderUsersTable(data.data);
    renderUsersPagination();
    $("usersBadge").textContent = data.total;
  } catch {
    showToast("ব্যবহারকারী লোড করতে সমস্যা।", "error");
  }
}

function renderUsersTable(users) {
  const tbody = $("usersTbody");
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon"><i class="bi bi-people"></i></div><p>কোনো ব্যবহারকারী পাওয়া যায়নি।</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map((u, i) => `
    <tr>
      <td style="color:var(--text-light);font-family:var(--font-en)">${((usersState.page-1)*usersState.limit)+i+1}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-en);font-weight:700;font-size:0.85rem;flex-shrink:0">
            ${(u.fullName||'?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;font-size:0.88rem">${u.fullName}</div>
            <div style="font-size:0.72rem;color:var(--text-light)">ID: ${u.id}</div>
          </div>
        </div>
      </td>
      <td style="font-size:0.83rem;color:var(--text-mid)">${u.email}</td>
      <td style="font-family:var(--font-en);font-size:0.83rem">${u.phone || '—'}</td>
      <td>
        ${u.district ? `<span style="background:var(--cream);border:1px solid var(--border);padding:2px 8px;border-radius:6px;font-size:0.75rem">${u.district}</span>` : '—'}
      </td>
      <td>
        <span style="background:var(--orange-pale);color:var(--orange-dark);padding:3px 10px;border-radius:20px;font-family:var(--font-en);font-weight:700;font-size:0.8rem">
          ${u.orderCount}
        </span>
      </td>
      <td style="font-family:var(--font-en);color:var(--text-mid);font-size:0.8rem;white-space:nowrap">
        ${fmtDate(u.createdAt)}
      </td>
      <td style="font-family:var(--font-en);color:var(--text-light);font-size:0.78rem">
        ${u.lastLogin ? fmtDate(u.lastLogin) : 'কখনো না'}
      </td>
      <td>
        <span class="status-badge ${u.isActive ? 'status-delivered' : 'status-cancelled'}">
          ${u.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
        </span>
      </td>
    </tr>`).join("");
}

function renderUsersPagination() {
  $("usersPageInfo").textContent =
    `${usersState.total} জনের মধ্যে ${((usersState.page-1)*usersState.limit)+1}–${Math.min(usersState.page*usersState.limit, usersState.total)} দেখাচ্ছে`;

  const container = $("usersPaginationBtns");
  container.innerHTML = "";

  const prev = document.createElement("button");
  prev.className = "page-btn";
  prev.innerHTML = '<i class="bi bi-chevron-left"></i>';
  prev.disabled  = usersState.page === 1;
  prev.onclick   = () => loadUsers(usersState.page - 1);
  container.appendChild(prev);

  const start = Math.max(1, usersState.page - 2);
  const end   = Math.min(usersState.totalPages, start + 4);
  for (let p = start; p <= end; p++) {
    const btn = document.createElement("button");
    btn.className   = `page-btn${p === usersState.page ? " active" : ""}`;
    btn.textContent = p;
    btn.onclick     = () => loadUsers(p);
    container.appendChild(btn);
  }

  const next = document.createElement("button");
  next.className = "page-btn";
  next.innerHTML = '<i class="bi bi-chevron-right"></i>';
  next.disabled  = usersState.page >= usersState.totalPages;
  next.onclick   = () => loadUsers(usersState.page + 1);
  container.appendChild(next);
}

let usersSearchTimer;
function searchUsers(q) {
  clearTimeout(usersSearchTimer);
  usersSearchTimer = setTimeout(() => {
    usersState.search = q;
    usersState.page   = 1;
    loadUsers();
  }, 380);
}

/* ═══════════════════════════════════════════════════════════
   INIT — load the default page
═══════════════════════════════════════════════════════════ */
loadDashboard();
