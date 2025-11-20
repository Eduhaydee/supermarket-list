const productsList = document.getElementById("productsList");
const productsCount = document.getElementById("productsCount");
const cartTotalEl = document.getElementById("cartTotal");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const cartCount = document.getElementById("cartCount");

const FALLBACK_IMAGE = "../assets/img/image_not_available.png";
const CART_STORAGE_KEY = "mini-store-cart-v1";

let products = [];
let filteredProducts = [];
let cart = [];
let searchTerm = "";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    cart = stored ? JSON.parse(stored) : [];
  } catch (_err) {
    cart = [];
  }
  updateCartCount();
}

function loadProducts() {
  try {
    const stored = localStorage.getItem("shopping-list-items-v1");
    const parsed = stored ? JSON.parse(stored) : [];
    products = parsed.filter((item) => !item.unavailable);
  } catch (_err) {
    products = [];
  }
  filteredProducts = products;
  loadCart();
  renderProducts();
  updateCartTotal();
}

function isInCart(id) {
  return cart.some((item) => item.id === id);
}

function renderProducts() {
  const items = filteredProducts;
  productsCount.textContent = `${items.length} itens`;

  if (!items.length) {
    productsList.innerHTML = `<p class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">Nenhum produto encontrado.</p>`;
    return;
  }

  productsList.innerHTML = items
    .map(
      (product) => `
      <article class="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
        <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
          <img src="${product.image || FALLBACK_IMAGE}" alt="Imagem de ${
        product.name
      }" class="h-full w-full object-cover" onerror="this.src='${FALLBACK_IMAGE}'">
        </div>
        <div class="flex flex-1 flex-col gap-1">
          <p class="text-sm font-semibold text-slate-900">${product.name}</p>
          <p class="text-xs font-medium text-slate-500">${
            product.brand || ""
          }</p>
          <p class="text-sm font-semibold text-emerald-700">${formatCurrency(
            product.unitPrice
          )}</p>
          <button class="add-btn self-start rounded-full px-3 py-2 text-xs font-semibold text-white shadow hover:-translate-y-0.5 hover:shadow-md ${
            isInCart(product.id)
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-emerald-600"
          }" data-id="${product.id}" ${
        isInCart(product.id) ? "disabled" : ""
      }>Comprar</button>
        </div>
      </article>
    `
    )
    .join("");
}

function updateCartTotal() {
  const totalCart = cart.reduce(
    (sum, item) =>
      sum +
      (Number(item.paidPrice) || Number(item.unitPrice) || 0) *
        (Number(item.quantity) || 0),
    0
  );
  cartTotalEl.textContent = formatCurrency(totalCart);
  saveCart();
  updateCartCount();
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  const qtyToAdd = Number(product.quantity) || 1;
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity = (existing.quantity || 0) + qtyToAdd;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      unitPrice: Number(product.unitPrice) || 0,
      paidPrice: Number(product.unitPrice) || 0,
      quantity: qtyToAdd,
    });
  }
  updateCartTotal();
  renderProducts();
}

function updateCartCount() {
  if (!cartCount) return;
  const total = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  cartCount.textContent = total;
}

function applySearch(term) {
  searchTerm = term.toLowerCase();
  filteredProducts = products.filter((item) => {
    if (!searchTerm) return true;
    return (
      (item.name || "").toLowerCase().includes(searchTerm) ||
      (item.brand || "").toLowerCase().includes(searchTerm)
    );
  });
  renderProducts();
}

productsList.addEventListener("click", (event) => {
  const btn = event.target.closest(".add-btn");
  if (!btn) return;
  addToCart(btn.dataset.id);
});

searchInput.addEventListener("input", (event) => {
  applySearch(event.target.value.trim());
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  applySearch("");
});

try {
  loadProducts();
} catch (_error) {
  productsList.innerHTML = `<p class="rounded-xl border border-dashed border-red-200 bg-red-50 px-3 py-6 text-center text-sm text-red-700">Erro ao carregar produtos.</p>`;
}
