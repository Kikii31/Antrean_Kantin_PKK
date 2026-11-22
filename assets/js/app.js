const API_URL = 'api/index.php';
const state = { orders: [] };
const $ = (id) => document.getElementById(id);
const statuses = ['Menunggu', 'Diproses', 'Siap diambil', 'Selesai'];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
function showToast(message, isError = false) {
  const toast = $('toast');
  toast.textContent = message;
  toast.style.background = isError ? '#b72f39' : '#24282e';
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3000);
}
async function apiGet(action) {
  const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, { headers: { Accept: 'application/json' } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Permintaan gagal.');
  return result.data;
}
async function apiPost(payload) {
  const response = await fetch(API_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Permintaan gagal.');
  return result;
}
function updateClock() {
  const now = new Date();
  $('clock').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  $('today').textContent = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function queueLabel(number) { return `A${String(number).padStart(3, '0')}`; }
function formatDate(value) {
  return new Date(String(value).replace(' ', 'T')).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function renderSummary(stats = {}) {
  $('total-orders').textContent = Number(stats.total_orders || 0).toLocaleString('id-ID');
  $('waiting-orders').textContent = Number(stats.waiting_orders || 0).toLocaleString('id-ID');
  $('processing-orders').textContent = Number(stats.processing_orders || 0).toLocaleString('id-ID');
  $('ready-orders').textContent = Number(stats.ready_orders || 0).toLocaleString('id-ID');
}
function statusClass(status) {
  if (status === 'Menunggu') return 'status-menunggu';
  if (status === 'Diproses') return 'status-diproses';
  if (status === 'Siap diambil') return 'status-siap';
  return 'status-selesai';
}
function renderOrders() {
  const keyword = $('search').value.trim().toLowerCase();
  const filter = $('status-filter').value;
  const filtered = state.orders.filter((order) => {
    const matchesText = `${queueLabel(order.queue_no)} ${order.customer_name} ${order.order_details}`.toLowerCase().includes(keyword);
    const matchesStatus = filter === 'Semua' || order.status === filter;
    return matchesText && matchesStatus;
  });
  $('queue-list').innerHTML = filtered.length ? filtered.map((order) => `
    <article class="queue-card ${order.status === 'Selesai' ? 'is-complete' : ''}">
      <div class="queue-card-top"><span class="queue-number">${queueLabel(order.queue_no)}</span><span class="status-badge ${statusClass(order.status)}">${escapeHTML(order.status)}</span></div>
      <div><div class="queue-customer">${escapeHTML(order.customer_name)}</div><div class="queue-detail">${escapeHTML(order.order_details)}</div><div class="queue-time">${formatDate(order.created_at)}</div></div>
      <div class="queue-actions">
        <select data-status-id="${order.id}" aria-label="Ubah status untuk ${escapeHTML(order.customer_name)}">${statuses.map((status) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select>
        <button class="btn-mini btn-delete" type="button" data-delete-order="${order.id}">Hapus</button>
      </div>
    </article>`).join('') : '<div class="queue-empty">Tidak ada pesanan yang sesuai.</div>';
}
async function loadDashboard() {
  try {
    const data = await apiGet('dashboard');
    state.orders = data.orders || [];
    renderSummary(data.stats || {});
    renderOrders();
  } catch (error) {
    $('queue-list').innerHTML = `<div class="queue-empty">${escapeHTML(error.message)}<br>Pastikan Apache dan MySQL XAMPP aktif, lalu import SQL.</div>`;
    showToast(error.message, true);
  }
}

$('order-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('create-order');
  button.disabled = true;
  try {
    const result = await apiPost({
      action: 'create_order',
      customer_name: $('customer-name').value.trim(),
      order_details: $('order-details').value.trim()
    });
    $('order-form').reset();
    $('new-queue-result').innerHTML = `<div><strong>Pesanan berhasil masuk antrean</strong><span>${escapeHTML(result.data.customer_name)} · ${escapeHTML(result.data.order_details)}</span></div><span class="queue-number">${escapeHTML(result.data.queue_label)}</span>`;
    $('new-queue-result').classList.add('show');
    $('status-filter').value = 'Semua';
    $('search').value = '';
    await loadDashboard();
    showToast(`Nomor antrean ${result.data.queue_label} berhasil dibuat.`);
  } catch (error) { showToast(error.message, true); }
  finally { button.disabled = false; }
});
$('queue-list').addEventListener('change', async (event) => {
  const select = event.target.closest('[data-status-id]');
  if (!select) return;
  const id = Number(select.dataset.statusId);
  const status = select.value;
  select.disabled = true;
  try {
    const result = await apiPost({ action: 'update_status', id, status });
    showToast(result.message);
    await loadDashboard();
  } catch (error) { showToast(error.message, true); await loadDashboard(); }
  finally { select.disabled = false; }
});
$('queue-list').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-order]');
  if (!button) return;
  const order = state.orders.find((item) => Number(item.id) === Number(button.dataset.deleteOrder));
  if (!order || !confirm(`Hapus antrean ${queueLabel(order.queue_no)} milik ${order.customer_name}?`)) return;
  try {
    const result = await apiPost({ action: 'delete_order', id: order.id });
    showToast(result.message);
    await loadDashboard();
  } catch (error) { showToast(error.message, true); }
});
$('search').addEventListener('input', renderOrders);
$('status-filter').addEventListener('change', renderOrders);
$('refresh-data').addEventListener('click', loadDashboard);
document.body.addEventListener('click', (event) => {
  const scrollButton = event.target.closest('[data-scroll]');
  if (scrollButton) document.getElementById(scrollButton.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) {
    $('status-filter').value = filterButton.dataset.filter;
    renderOrders();
    $('queue-panel').scrollIntoView({ behavior: 'smooth' });
  }
});
$('order-form').addEventListener('reset', () => $('new-queue-result').classList.remove('show'));

updateClock();
setInterval(updateClock, 30000);
loadDashboard();
