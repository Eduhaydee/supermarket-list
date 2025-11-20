const form = document.getElementById("itemForm");
const listContainer = document.getElementById("itemsList");
const totalEl = document.getElementById("grandTotal");
const exportBtn = document.getElementById("exportJson");
const submitBtn = document.getElementById("submitBtn");
const cancelEditSecondary = document.getElementById("cancelEditSecondary");
const editBanner = document.getElementById("editBanner");
const editName = document.getElementById("editName");
const openFormButtons = [
  document.getElementById("openFormHeader"),
].filter(Boolean);
const formModal = document.getElementById("formModal");
const closeForm = document.getElementById("closeForm");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const pagination = document.getElementById("pagination");
const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalClose = document.getElementById("modalClose");
const footerTotal = document.getElementById("footerTotal");
const unitPriceInput = document.getElementById("unitPrice");
const cartCount = document.getElementById("cartCount");
const cartTotalHeader = document.getElementById("cartTotalHeader");

const STORAGE_KEY = "shopping-list-items-v1";
const FALLBACK_IMAGE = "../assets/img/image_not_available.png";
const CART_STORAGE_KEY = "mini-store-cart-v1";
const PAGE_SIZE = 12;

let items = [];
let editingId = null;
let currentPage = 1;
let searchTerm = "";

function getImageOrFallback(value) {
  const parsed = (value || "").toString().trim();
  return parsed || FALLBACK_IMAGE;
}

async function loadItems() {
  // carrega o que já existe no navegador
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    items = saved ? JSON.parse(saved) : [];
    items = items.map((item) => ({
      ...item,
      image: getImageOrFallback(item.image),
    }));
  } catch (error) {
    console.error("Erro ao carregar itens:", error);
    items = [];
  }

  // tenta complementar com o json base em /store caso não exista algo no storage
  try {
    const response = await fetch("./store/lista-compras.json");
    if (!response.ok) throw new Error("Falha ao buscar JSON base");
    const data = await response.json();
    const seedItems = Array.isArray(data.items) ? data.items : [];
    // evita duplicar por id
    const existingIds = new Set(items.map((item) => item.id));
    const merged = [...items];
    seedItems.forEach((item) => {
      if (!existingIds.has(item.id)) {
        merged.push({
          ...item,
          image: getImageOrFallback(item.image),
          purchased: item.purchased || false,
          unavailable: item.unavailable || false,
        });
      }
    });
    items = merged.map((item) => ({
      ...item,
      image: getImageOrFallback(item.image),
    }));
    persistItems();
  } catch (error) {
    console.warn("Não foi possível carregar os itens base do JSON:", error);
  }
}

function persistItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function parseCurrencyInput(rawValue) {
  const digits = (rawValue || "").toString().replace(/\D/g, "");
  const numeric = digits ? Number(digits) / 100 : 0;
  const display = numeric.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return { numeric, display };
}

function formatPriceField() {
  const { display } = parseCurrencyInput(unitPriceInput.value);
  unitPriceInput.value = display ? `R$ ${display}` : "";
}

function itemTotal(item) {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unitPrice) || 0;
  return quantity * unitPrice;
}

function updateTotal() {
  const total = items
    .filter((item) => !item.unavailable)
    .reduce((sum, item) => sum + itemTotal(item), 0);
  totalEl.textContent = formatCurrency(total);
  if (footerTotal) footerTotal.textContent = formatCurrency(total);
}

function updateCartCount() {
  if (!cartCount) return;
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const totalQty = Array.isArray(parsed)
      ? parsed.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      : 0;
    cartCount.textContent = totalQty;
    const totalValue = Array.isArray(parsed)
      ? parsed.reduce(
          (sum, item) =>
            sum + (Number(item.paidPrice) || Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
          0
        )
      : 0;
    if (cartTotalHeader) cartTotalHeader.textContent = formatCurrency(totalValue);
  } catch (_error) {
    cartCount.textContent = "0";
    if (cartTotalHeader) cartTotalHeader.textContent = formatCurrency(0);
  }
}

function renderEmptyState() {
  listContainer.innerHTML = `
    <div class="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-slate-500 shadow-sm">
      Nenhum item adicionado ainda. Cadastre algo acima para começar.
    </div>
  `;
}

function statusClasses(item) {
  if (item.unavailable) return "border-red-200 ring ring-red-100 bg-red-50/60";
  if (item.purchased)
    return "border-emerald-100 ring ring-emerald-50 bg-emerald-50/60";
  return "border-slate-100 ring-1 ring-slate-100 bg-white/80";
}

function renderItems() {
  const filtered = items.filter((item) => {
    if (!searchTerm) return true;
    const needle = searchTerm.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(needle) ||
      (item.brand || "").toLowerCase().includes(needle)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentItems = filtered.slice(start, start + PAGE_SIZE);

  if (!filtered.length) {
    renderEmptyState();
    updateTotal();
    pagination.innerHTML = "";
    return;
  }

  listContainer.innerHTML = currentItems
    .map((item) => {
      const total = formatCurrency(itemTotal(item));
      const unavailableTag = item.unavailable
        ? `<span class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">Indisponível</span>`
        : "";
      const purchasedTag = item.purchased
        ? `<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Comprado</span>`
        : "";
      const brandLine = item.brand
        ? `<p class="text-sm font-medium text-slate-600">${item.brand}</p>`
        : "";
      const nameClass = item.unavailable
        ? "line-through text-red-700"
        : item.purchased
        ? "line-through text-emerald-800"
        : "text-slate-900";

      return `
        <article class="group flex flex-col gap-4 rounded-2xl border bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${statusClasses(
          item
        )}" data-id="${item.id}">
          <button type="button" class="item-image relative h-44 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner transition hover:scale-[1.01] cursor-zoom-in" data-src="${
            item.image || FALLBACK_IMAGE
          }">
            <img src="${item.image || FALLBACK_IMAGE}" alt="Imagem de ${
        item.name
      }" class="h-full w-full object-cover" onerror="this.src='${FALLBACK_IMAGE}'">
            <span class="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 group-hover:backdrop-brightness-75"></span>
          </button>

          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex flex-col gap-1">
                <p class="text-base font-semibold ${nameClass}">${item.name}</p>
                ${brandLine}
                <p class="text-xs uppercase tracking-wide text-slate-500">${
                  item.unitType === "kg" ? "Preço por kg" : "Preço por unidade"
                }</p>
                <div class="flex gap-2">${purchasedTag}${unavailableTag}</div>
              </div>
              <div class="flex flex-col gap-2">
                <button type="button" class="edit-btn rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700" data-id="${
                  item.id
                }">Editar</button>
                <button type="button" class="delete-btn rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600" data-id="${
                  item.id
                }">Remover</button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-sm text-slate-700">
              <div class="rounded-xl bg-white/70 px-3 py-2 shadow-inner ring-1 ring-slate-100">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Quantidade</p>
                <p class="font-semibold">${item.quantity} ${item.unitType}</p>
              </div>
              <div class="rounded-xl bg-white/70 px-3 py-2 shadow-inner ring-1 ring-slate-100">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Valor unit.</p>
                <p class="font-semibold">${formatCurrency(item.unitPrice)}</p>
              </div>
              <div class="col-span-2 rounded-xl bg-white/80 px-3 py-2 shadow-inner ring-1 ring-slate-100">
                <p class="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                <p class="text-lg font-semibold text-emerald-700">${total}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-4 text-sm text-slate-700">
              <label class="inline-flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 shadow-inner ring-1 ring-slate-100">
                <input type="checkbox" class="purchased-toggle h-4 w-4 accent-emerald-500" data-id="${
                  item.id
                }" ${item.purchased ? "checked" : ""}>
                <span class="font-medium">Comprado</span>
              </label>
              <label class="inline-flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 shadow-inner ring-1 ring-slate-100">
                <input type="checkbox" class="unavailable-toggle h-4 w-4 accent-red-500" data-id="${
                  item.id
                }" ${item.unavailable ? "checked" : ""}>
                <span class="font-medium">Indisponível</span>
              </label>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  renderPagination(totalPages);
  updateTotal();
}

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }
  let buttons = "";
  for (let page = 1; page <= totalPages; page++) {
    const isActive = page === currentPage;
    buttons += `<button data-page="${page}" class="page-btn rounded-full border px-3 py-1 text-xs font-semibold transition ${
      isActive
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-100 hover:text-emerald-700"
    }">${page}</button>`;
  }
  pagination.innerHTML = buttons;
}

function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const name = (formData.get("itemName") || "").toString().trim();
  const brand = (formData.get("brand") || "").toString().trim();
  const image = getImageOrFallback(formData.get("photoUrl"));
  const quantity = Number(formData.get("quantity")) || 0;
  const unitPriceRaw = (formData.get("unitPrice") || "").toString();
  const unitPrice = parseCurrencyInput(unitPriceRaw).numeric;
  const unitType = formData.get("unitType") || "unidade";

  if (!name) return;

  if (editingId) {
    items = items.map((item) =>
      item.id === editingId
        ? { ...item, name, brand, image, quantity, unitPrice, unitType }
        : item
    );
    persistItems();
    renderItems();
    resetEditState();
    return;
  }

  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name,
    brand,
    image,
    quantity,
    unitPrice,
    unitType,
    purchased: false,
    unavailable: false,
  };

  items = [...items, newItem];
  persistItems();
  renderItems();
  form.reset();
  unitPriceInput.value = "";
  form.itemName.focus();
}

function toggleFlag(id, key, value) {
  items = items.map((item) =>
    item.id === id ? { ...item, [key]: value } : item
  );
  persistItems();
  renderItems();
}

function deleteItem(id) {
  items = items.filter((item) => item.id !== id);
  persistItems();
  renderItems();
}

function startEdit(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  editingId = id;
  form.itemName.value = item.name || "";
  form.brand.value = item.brand || "";
  form.photoUrl.value =
    item.image && item.image !== FALLBACK_IMAGE ? item.image : "";
  form.quantity.value = item.quantity ?? "";
  form.unitPrice.value = item.unitPrice
    ? `R$ ${formatCurrency(item.unitPrice).replace("R$", "").trim()}`
    : "";
  form.unitType.value = item.unitType || "unidade";

  submitBtn.textContent = "Salvar alterações";
  editName.textContent = item.name;
  editBanner.classList.remove("hidden");
  cancelEditSecondary.classList.remove("hidden");
  openFormModal();
  form.itemName.focus();
}

function resetEditState() {
  editingId = null;
  submitBtn.textContent = "Adicionar à lista";
  editName.textContent = "";
  editBanner.classList.add("hidden");
  cancelEditSecondary.classList.add("hidden");
  form.reset();
}

function exportAsJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    currency: "BRL",
    total: items
      .filter((item) => !item.unavailable)
      .reduce((sum, item) => sum + itemTotal(item), 0),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand || "",
      image: item.image,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitType: item.unitType,
      purchased: item.purchased,
      unavailable: item.unavailable,
      total: itemTotal(item),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lista-compras.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function openModal(src, name) {
  modalImage.src = src;
  modalImage.alt = `Imagem ampliada de ${name}`;
  modal.classList.remove("hidden", "pointer-events-none");
  document.body.classList.add("overflow-hidden");
}

function closeModal() {
  modal.classList.add("hidden", "pointer-events-none");
  modalImage.src = "";
  document.body.classList.remove("overflow-hidden");
}

function openFormModal() {
  formModal.classList.remove("hidden", "pointer-events-none");
  document.body.classList.add("overflow-hidden");
}

function closeFormModal() {
  formModal.classList.add("hidden", "pointer-events-none");
  document.body.classList.remove("overflow-hidden");
  resetEditState();
}

form.addEventListener("submit", handleSubmit);

listContainer.addEventListener("change", (event) => {
  const target = event.target;
  const id = target.dataset.id;
  if (target.classList.contains("purchased-toggle")) {
    toggleFlag(id, "purchased", target.checked);
  }
  if (target.classList.contains("unavailable-toggle")) {
    toggleFlag(id, "unavailable", target.checked);
  }
});

listContainer.addEventListener("click", (event) => {
  const target = event.target;
  const card = target.closest("article");
  const id = card?.dataset.id;

  if (target.classList.contains("delete-btn") && id) {
    deleteItem(id);
    return;
  }

  if (target.classList.contains("edit-btn") && id) {
    startEdit(id);
    return;
  }

  if (
    target.classList.contains("item-image") ||
    target.closest(".item-image")
  ) {
    const imageButton = target.classList.contains("item-image")
      ? target
      : target.closest(".item-image");
    const src = imageButton.dataset.src || FALLBACK_IMAGE;
    const name = card
      ? card.querySelector("p.text-base")?.textContent || "produto"
      : "produto";
    openModal(src, name);
  }
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

if (exportBtn) {
  exportBtn.addEventListener("click", exportAsJson);
}
cancelEditSecondary.addEventListener("click", resetEditState);
unitPriceInput.addEventListener("input", formatPriceField);
openFormButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    openFormModal();
  })
);
closeForm.addEventListener("click", closeFormModal);
formModal.addEventListener("click", (event) => {
  if (event.target === formModal) {
    closeFormModal();
  }
});
searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  currentPage = 1;
  renderItems();
});
clearSearch.addEventListener("click", () => {
  searchTerm = "";
  searchInput.value = "";
  currentPage = 1;
  renderItems();
});
pagination.addEventListener("click", (event) => {
  const button = event.target.closest(".page-btn");
  if (!button) return;
  const page = Number(button.dataset.page);
  if (!Number.isNaN(page)) {
    currentPage = page;
    renderItems();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closeModal();
  }
  if (event.key === "Escape" && !formModal.classList.contains("hidden")) {
    closeFormModal();
  }
});

async function init() {
  await loadItems();
  renderItems();
  updateCartCount();
}

init();

window.addEventListener("storage", (event) => {
  if (event.key === CART_STORAGE_KEY) {
    updateCartCount();
  }
});
