const cartContainer = document.getElementById("cartContainer");
const cartTotalEl = document.getElementById("cartTotal");
const clearCartBtn = document.getElementById("clearCart");

const CART_STORAGE_KEY = "mini-store-cart-v1";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=640&q=80";

let cart = [];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function parseCurrencyInput(rawValue) {
  const digits = (rawValue || "").toString().replace(/\D/g, "");
  const numeric = digits ? Number(digits) / 100 : 0;
  const display = numeric.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return { numeric, display: display ? `R$ ${display}` : "" };
}

function discountPercent(original, paid) {
  if (!original) return 0;
  const diff = ((original - paid) / original) * 100;
  return Number.isFinite(diff) ? diff : 0;
}

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    cart = stored ? JSON.parse(stored) : [];
  } catch (error) {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function renderCart() {
  if (!cart.length) {
    cartContainer.innerHTML = `<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">Seu carrinho está vazio.</div>`;
    cartTotalEl.textContent = formatCurrency(0);
    saveCart();
    return;
  }

  cartContainer.innerHTML = cart
    .map((item) => {
      const original = Number(item.unitPrice) || 0;
      const paid = Number(item.paidPrice) || 0;
      const qty = Number(item.quantity) || 1;
      const total = paid * qty;
      const discount = discountPercent(original, paid);
      const discountLabel = `${discount > 0 ? "-" : ""}${Math.abs(discount).toFixed(1)}%`;

      return `
        <article class="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
          <div class="flex items-start gap-3">
            <div class="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <img src="${item.image || FALLBACK_IMAGE}" alt="Imagem de ${item.name}" class="h-full w-full object-cover" onerror="this.src='${FALLBACK_IMAGE}'">
            </div>
            <div class="flex flex-1 flex-col">
              <p class="text-sm font-semibold text-slate-900 leading-tight">${item.name}</p>
              <p class="text-[11px] text-slate-500">${item.brand || ""}</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 text-[12px] text-slate-700">
            <div class="flex flex-col gap-1">
              <span class="font-semibold text-slate-700">Orig.</span>
              <span class="text-sm font-semibold text-slate-900">${formatCurrency(original)}</span>
            </div>
            <label class="flex flex-col gap-1">
              <span class="font-semibold text-slate-700">Qtd</span>
              <input type="number" min="1" step="1" value="${qty}" data-id="${item.id}" class="qty-input w-full rounded-lg border border-slate-200 px-2 py-2 text-right text-sm shadow-inner">
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-semibold text-slate-700">Pago</span>
              <input type="text" inputmode="decimal" autocomplete="off" value="${formatCurrency(paid)}" data-id="${item.id}" class="paid-input currency-input w-full rounded-lg border border-emerald-200 px-2 py-2 text-right text-sm shadow-inner">
            </label>
          </div>

          <div class="flex items-center justify-between text-sm">
            <div class="flex flex-col gap-1">
              <span class="font-semibold text-slate-700">% Desc.</span>
              <span class="${discount > 0 ? "text-emerald-600" : "text-slate-700"} font-semibold">${discountLabel}</span>
            </div>
            <div class="flex flex-col gap-1 items-end">
              <span class="font-semibold text-slate-700">Total</span>
              <span class="text-sm font-semibold text-emerald-700">${formatCurrency(total)}</span>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-500">
            <button class="remove-btn font-semibold text-red-500" data-id="${item.id}">Excluir</button>
            <span>Preco original e fixo para comparacao</span>
          </div>
        </article>
      `;
    })
    .join("");

  const totalCart = cart.reduce((sum, item) => sum + (Number(item.paidPrice) || 0) * (Number(item.quantity) || 1), 0);
  cartTotalEl.textContent = formatCurrency(totalCart);
  saveCart();
}

function updateQuantity(id, value) {
  const qty = Math.max(1, Number(value) || 1);
  cart = cart.map((item) => (item.id === id ? { ...item, quantity: qty } : item));
  renderCart();
}

function updatePaid(id, value) {
  const paid = Math.max(0, Number(value) || 0);
  cart = cart.map((item) => (item.id === id ? { ...item, paidPrice: paid } : item));
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function removeItem(id) {
  cart = cart.filter((item) => item.id !== id);
  renderCart();
}

cartContainer.addEventListener("input", (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  if (event.target.classList.contains("qty-input")) {
    updateQuantity(id, event.target.value);
    return;
  }
  if (event.target.classList.contains("paid-input")) {
    const { display } = parseCurrencyInput(event.target.value);
    event.target.value = display;
  }
});

cartContainer.addEventListener("focusin", (event) => {
  if (event.target.classList.contains("paid-input")) {
    event.target.value = "";
  }
});

cartContainer.addEventListener("focusout", (event) => {
  const id = event.target.dataset.id;
  if (!id || !event.target.classList.contains("paid-input")) return;
  const { display, numeric } = parseCurrencyInput(event.target.value);
  event.target.value = display;
  updatePaid(id, numeric);
});

cartContainer.addEventListener("click", (event) => {
  const id = event.target.dataset.id;
  if (!id || !event.target.classList.contains("remove-btn")) return;
  removeItem(id);
});

clearCartBtn.addEventListener("click", clearCart);

loadCart();
renderCart();




