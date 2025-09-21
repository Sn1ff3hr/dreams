'use strict';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((key) => {
      const nested = value[key];
      if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
        deepFreeze(nested);
      }
    });
    Object.freeze(value);
  }
  return value;
};

const CENTS_PER_UNIT = 100;
const IVA_PERCENT = 15;
const LOCALE = 'en-US'; // Use en-US for USD currency formatting
let currentLang = 'es';

const OPTIONS = [
  { id:'op1', name:{es:'Opción 1',en:'Option 1'}, desc:{es:'Tortilla + Huevo + Chorizo + Bebida', en:'Tortilla + Eggs + Sausage + Drink'}, priceCents:320 },
  { id:'op2', name:{es:'Opción 2',en:'Option 2'}, desc:{es:'Tortilla + Chorizo + Bebida', en:'Tortilla + Sausage + Drink'}, priceCents:270 },
  { id:'op3', name:{es:'Opción 3',en:'Option 3'}, desc:{es:'Tortilla + Huevos + Bebida', en:'Tortilla + Eggs + Drink'}, priceCents:270 },
  { id:'op4', name:{es:'Opción 4',en:'Option 4'}, desc:{es:'2 Tortilla + 2 Huevos + 2 Chorizo + 2 Bebida', en:'2 Tortillas + 2 Eggs + 2 Sausages + 2 Drinks'}, priceCents:640 }
];
const EXTRAS = [
  { id:'ex_cafe', name:{es:'Café',en:'Coffee'}, priceCents:70 },
  { id:'ex_cola', name:{es:'Cola',en:'Cola'}, priceCents:70 },
  { id:'ex_chorizo', name:{es:'Chorizo',en:'Sausage'}, priceCents:50 },
  { id:'ex_huevo', name:{es:'Huevo',en:'Egg'}, priceCents:50 },
  { id:'ex_jugos', name:{es:'Jugos',en:'Juice'}, priceCents:100 },
  { id:'ex_tortilla', name:{es:'Tortilla',en:'Tortilla'}, priceCents:150 }
];

const ACTION_LABELS = {
  add:{ es:'+ Agregar', en:'+ Add' },
  rem:{ es:'− Quitar',  en:'− Remove' }
};

const EXTRA_THEME = {
  ex_cafe:'cafe',
  ex_cola:'cola',
  ex_chorizo:'chorizo',
  ex_huevo:'huevo',
  ex_jugos:'jugos',
  ex_tortilla:'tortilla'
};

deepFreeze(OPTIONS);
deepFreeze(EXTRAS);
deepFreeze(ACTION_LABELS);
deepFreeze(EXTRA_THEME);

const ACCEPTABLE_ROWS_LIMIT = 50;
const ORDER_RATE_LIMIT_MS = 1500;
const ORDER_PAYLOAD_LIMIT = 16000;
const MAX_QTY_PER_ITEM = 99;
let lastSubmissionTs = 0;

const cart = new Map();
const secureIdPattern = /^[a-z0-9_]+$/;
const allowedActions = new Set(['add','rem']);
const confirmTimers = new WeakMap();
const REQUEST_HEADERS = Object.freeze({
  'Content-Type':'text/plain'
});
const BASE_REQUEST_INIT = Object.freeze({
  method:'POST',
  headers:REQUEST_HEADERS,
  mode:'cors',
  cache:'no-store',
  credentials:'omit',
  redirect:'follow',
  referrerPolicy:'no-referrer'
});
const $ = (selector) => document.querySelector(selector);
const t = (value) => typeof value === 'string' ? value : value[currentLang];
const money = (cents) => (cents / CENTS_PER_UNIT).toLocaleString(LOCALE, { style:'currency', currency:'USD' });
const vatCents = (cents) => Math.floor((cents * IVA_PERCENT + CENTS_PER_UNIT / 2) / CENTS_PER_UNIT);
const actLabel = (act) => ACTION_LABELS[act]?.[currentLang] ?? ACTION_LABELS[act]?.es ?? '';

function flashConfirmation(btn){
  if(!btn) return;
  btn.classList.add('confirming');
  const existingTimer = confirmTimers.get(btn);
  if(existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(()=>{
    btn.classList.remove('confirming');
    confirmTimers.delete(btn);
  }, 3000);
  confirmTimers.set(btn, timer);
}

function add(item){
  const id = item.id;
  const line = cart.get(id) || { ...item, qty:0 };
  const safeQty = Number.isFinite(line.qty) && line.qty >= 0 ? line.qty : 0;
  if(safeQty >= MAX_QTY_PER_ITEM){
    showToast(`Límite de ${MAX_QTY_PER_ITEM} unidades por artículo`);
    return;
  }
  const nextQty = safeQty + 1;
  line.qty = nextQty;
  line.priceCents = Number.isFinite(item.priceCents) && item.priceCents >= 0 ? Math.trunc(item.priceCents) : 0;
  line.name = item.name;
  cart.set(id, line);
  const btn = document.querySelector(`button[data-act="add"][data-id="${id}"]`);
  if(btn){ btn.classList.add('btn-adding'); setTimeout(()=>btn.classList.remove('btn-adding'), 1200); }
  render();
}
function rem(item){
  if(!cart.has(item.id)) return;
  const line = cart.get(item.id);
  const safeQty = Number.isFinite(line.qty) && line.qty > 0 ? line.qty : 0;
  const nextQty = safeQty - 1;
  if(nextQty <= 0){
    cart.delete(item.id);
  } else {
    line.qty = nextQty;
    cart.set(item.id, line);
  }
  render();
}

function buildOptions(){
  const host = $('#opts'); host.innerHTML='';
  OPTIONS.forEach((o,i)=>{
    const variant = 'cafe';
    const badgeClass = 1;
    const el = document.createElement('article');
    el.className = `card option-card card--${variant}`;
    el.innerHTML = `
      <div class="option-header">
        <span class="badge badge--${badgeClass}">${i + 1}</span>
        <div>
          <h3 class="option-title">${t(o.name)}</h3>
          <p class="desc">${t(o.desc)}</p>
        </div>
      </div>
      <hr class="edge--${variant}" />
      <div class="option-footer">
        <span class="price">${money(o.priceCents)}</span>
        <div class="actions">
          <button type="button" class="btn btn--${variant}" data-act="rem" data-id="${o.id}">${actLabel('rem')}</button>
          <button type="button" class="btn btn--${variant}" data-act="add" data-id="${o.id}">${actLabel('add')}</button>
        </div>
      </div>`;
    host.appendChild(el);
  });
}
function buildExtras(){
  const host = $('#extras'); host.innerHTML='';
  EXTRAS.forEach(e=>{
    const variant = EXTRA_THEME[e.id] || 'cafe';
    const row = document.createElement('div');
    row.className = `extra-row edge--${variant}`;
    row.innerHTML = `
      <div class="extra-info">
        <span>${t(e.name)}</span>
        <span class="price-chip">${money(e.priceCents)}</span>
      </div>
      <div class="actions">
        <button type="button" class="btn btn--${variant}" data-act="rem" data-id="${e.id}">${actLabel('rem')}</button>
        <button type="button" class="btn btn--${variant}" data-act="add" data-id="${e.id}">${actLabel('add')}</button>
      </div>`;
    host.appendChild(row);
  });
}

function render(){
  const host = $('#cart');
  host.innerHTML = '';
  let subtotal = 0;
  cart.forEach((item)=>{
    const qty = Number.isFinite(item.qty) && item.qty > 0 ? Math.trunc(item.qty) : 0;
    if(!qty) return;
    const price = Number.isFinite(item.priceCents) && item.priceCents >= 0 ? Math.trunc(item.priceCents) : 0;
    const rowSubtotal = price * qty;
    subtotal += rowSubtotal;
    const row = document.createElement('div');
    row.className = 'line';
    row.innerHTML = `
      <div>${t(item.name)}</div>
      <div class="qtybox">
        <button type="button" class="btn" data-act="rem" data-id="${item.id}">−</button>
        <span>${qty}</span>
        <button type="button" class="btn" data-act="add" data-id="${item.id}">+</button>
      </div>
      <div>${money(rowSubtotal)}</div>`;
    host.appendChild(row);
  });

  const vat = vatCents(subtotal);
  const total = subtotal + vat;
  $('#subtotal').textContent = money(subtotal);
  $('#vat').textContent = money(vat);
  $('#total').textContent = money(total);
}

$('#lang').addEventListener('click', (event)=>{
  flashConfirmation(event.currentTarget);
  currentLang = currentLang==='es' ? 'en' : 'es';
  $('#lang').textContent = currentLang.toUpperCase();
  buildOptions(); buildExtras(); render();
});
$('#theme').addEventListener('click', (event)=>{
  flashConfirmation(event.currentTarget);
  const root = document.documentElement;
  const cur = root.getAttribute('data-theme') || 'dark';
  const next = cur==='dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  $('#theme').textContent = next==='light' ? 'Light' : 'Dark';
});

document.body.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  flashConfirmation(btn);
  const id = btn.getAttribute('data-id') ?? '';
  const act = btn.getAttribute('data-act') ?? '';
  if(!secureIdPattern.test(id) || !allowedActions.has(act)) return;
  const item = OPTIONS.find(x=>x.id===id) || EXTRAS.find(x=>x.id===id) || cart.get(id);
  if(!item) return;
  const normalizedName = typeof item.name === 'object' ? (item.name?.[currentLang] ?? item.name?.es ?? '') : item.name;
  const safeName = String(normalizedName ?? '').replace(/[<>]/g, '');
  const priceCents = Number.isFinite(item.priceCents) && item.priceCents >= 0 ? Math.trunc(item.priceCents) : 0;
  const payload = { id:item.id, name:safeName, priceCents };
  act==='add' ? add(payload) : rem(payload);
});

const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyXrbBry5Cmn0RqvDl2lGfhRWBueYvhBSjTk_E83HchPRuacNxa-_DBBjpW8wjjfGMtxw/exec';
const loader = $('#loader');
const toast = $('#toast');
const acceptBtn = $('#accept');
function showToast(msg, ms=1800){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), ms);
}

function formatTimestamp(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
}

if (acceptBtn) acceptBtn.addEventListener('click', async (event) => {
  flashConfirmation(event.currentTarget);
  if (cart.size === 0) { showToast('Carrito vacío'); return; }
  const now = Date.now();
  if (now - lastSubmissionTs < ORDER_RATE_LIMIT_MS) {
    showToast('Espera un momento antes de reenviar.');
    return;
  }

  const rows = [];
  const submissionDate = new Date();
  const timestamp = formatTimestamp(submissionDate);
  const timestampISO = submissionDate.toISOString();
  cart.forEach(item => {
    const qty = Number.isFinite(item.qty) && item.qty > 0 ? Math.trunc(item.qty) : 0;
    if (!qty) return;
    const price = Number.isFinite(item.priceCents) && item.priceCents >= 0 ? Math.trunc(item.priceCents) : 0;
    const rowSubtotal = price * qty;
    const rowVAT = vatCents(rowSubtotal);
    const rowTotal = rowSubtotal + rowVAT;
    rows.push({
      timestamp,
      timestamp_iso: timestampISO,
      item: item.name,
      qty,
      subtotal: money(rowSubtotal),
      vat: money(rowVAT),
      total: money(rowTotal)
    });
  });

  if (rows.length === 0) { showToast('Carrito vacío'); return; }
  if (rows.length > ACCEPTABLE_ROWS_LIMIT) { showToast('Demasiados artículos en un solo pedido'); return; }
  const payload = JSON.stringify(rows);
  if (payload.length > ORDER_PAYLOAD_LIMIT) { showToast('El pedido excede el tamaño permitido'); return; }

  loader.style.display = 'flex';
  acceptBtn.disabled = true;
  acceptBtn.setAttribute('aria-busy', 'true');
  lastSubmissionTs = now;
  try {
    const res = await fetch(ENDPOINT, { ...BASE_REQUEST_INIT, body: payload });
    const text = await res.text();
    if (res.ok && text.includes('Success')) {
      showToast('¡Pedido enviado con éxito!');
      cart.clear();
      render();
      acceptBtn.focus();
    } else {
      showToast(`Error al enviar: ${text || 'Sin respuesta del servidor'}`);
      console.error('Server response:', text);
    }
  } catch (err) {
    showToast(`No se pudo conectar: ${err.message}`);
    console.error('Fetch error:', err);
  } finally {
    loader.style.display = 'none';
    acceptBtn.disabled = false;
    acceptBtn.removeAttribute('aria-busy');
  }
});

(function init(){
  document.documentElement.setAttribute('data-theme', 'light');
  buildOptions(); buildExtras(); render();
})();
