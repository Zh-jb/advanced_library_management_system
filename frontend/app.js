// ========== 工具函数 ==========
const state = {
  token: localStorage.getItem('library_token') || '',
  user: null,
  bookPage: 1,
  recordPage: 1,
  lastBooks: [],
  lastReaders: [],
};

const $ = (id) => document.getElementById(id);

function toast(message, type = 'info') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 2600);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let detail = '请求失败';
    try { detail = (await response.json()).detail || detail; } catch (_) {}
    if (response.status === 401) logout(false);
    throw new Error(detail);
  }
  if (contentType.includes('text/csv')) return response.text();
  return response.json();
}

// ========== 视图切换 ==========
function switchView(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => {
    view.classList.remove('active-view');
    view.style.display = 'none';
  });
  const activeView = document.getElementById(viewName);
  if (activeView) {
    activeView.style.display = 'flex';
    activeView.classList.add('active-view');
  }
  const navs = document.querySelectorAll('.nav');
  navs.forEach(nav => {
    nav.classList.remove('active');
    if (nav.getAttribute('data-view') === viewName) nav.classList.add('active');
  });
  const titleMap = {
    dashboard: { title: '数据总览', subtitle: '多维度统计图表，借阅趋势一目了然' },
    books: { title: '图书管理', subtitle: '完成图书新增、删除、查询和修改' },
    readers: { title: '读者管理', subtitle: '维护读者基础信息与账号状态' },
    records: { title: '借还记录', subtitle: '记录每一次借书与还书操作' },
    overdue: { title: '逾期提醒', subtitle: '发现逾期借阅并生成提醒消息' }
  };
  if ($('pageTitle')) $('pageTitle').innerText = titleMap[viewName]?.title || '智慧图书管理系统';
  if ($('pageSubtitle')) $('pageSubtitle').innerText = titleMap[viewName]?.subtitle || '';
  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'books') loadBooks();
  if (viewName === 'readers') loadReaders();
  if (viewName === 'records') { loadBorrowOptions(); loadRecords(); }
  if (viewName === 'overdue') loadOverdue();
}

// ========== 登录/登出 ==========
function showApp() {
  $('loginPage').classList.add('hidden');
  $('appShell').classList.remove('hidden');
  $('currentUser').textContent = `${state.user.full_name}`;
  $('userRole').textContent = state.user.role === 'admin' ? '管理员' : '读者';
  $('userAvatar').textContent = state.user.full_name.charAt(0).toUpperCase();
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', state.user.role !== 'admin'));
  switchView('dashboard');
}
function showLogin() {
  $('loginPage').classList.remove('hidden');
  $('appShell').classList.add('hidden');
}
function logout(showMsg = true) {
  state.token = '';
  state.user = null;
  localStorage.removeItem('library_token');
  showLogin();
  if (showMsg) toast('已退出登录');
}
async function initAuth() {
  if (!state.token) return showLogin();
  try {
    state.user = await api('/api/auth/me');
    showApp();
  } catch (e) { showLogin(); }
}

function statusBadge(status) {
  const map = { borrowed: '借阅中', overdue: '已逾期', returned: '已归还' };
  return `<span class="badge ${status}">${map[status] || status}</span>`;
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[s]));
}

// ========== 数据总览 ==========
async function loadDashboard() {
  const [overview, category, trend, topBooks] = await Promise.all([
    api('/api/stats/overview'), api('/api/stats/category'), api('/api/stats/borrow-trend?days=14'), api('/api/stats/top-books')
  ]);
  document.getElementById('dashboardCount').innerText = overview.book_total || 0;
  document.getElementById('booksCount').innerText = overview.book_total || 0;
  document.getElementById('readersCount').innerText = overview.reader_total || 0;
  document.getElementById('recordsCount').innerText = (overview.borrowed + overview.returned) || 0;
  document.getElementById('overdueCount').innerText = overview.overdue || 0;
  const metrics = [
    { label: '馆藏图书', value: overview.book_total ?? '—' },
    { label: '读者数量', value: overview.reader_total ?? '—' },
    { label: '借阅中', value: overview.borrowed},
    { label: '已逾期', value: overview.overdue},
    { label: '已归还', value: overview.returned},
  ];
  $('metricGrid').innerHTML = metrics.map(m => `<div class="metric-card"><div><span>${m.icon} ${m.label}</span><strong>${m.value}</strong></div></div>`).join('');
  drawPie('categoryChart', category.items);
  drawBar('trendChart', trend.items);
  $('topBooks').innerHTML = topBooks.items.length ? `<div class="top-list">${topBooks.items.map((item, idx) => `<div class="top-item"><div class="rank">${idx+1}</div><div><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(item.category)}</small></div><div class="borrow-count">${item.borrow_count}次</div></div>`).join('')}</div>` : '<p>暂无借阅数据</p>';
}

// ========== 图表绘制 ==========
// ========== 饼图（糖果色，无 hover 高亮） ==========
function drawPie(canvasId, items) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = 220;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const total = items.reduce((sum, x) => sum + Number(x.value), 0) || 1;
  if (total === 0) {
    ctx.fillStyle = '#999';
    ctx.font = '14px "Source Sans 3", sans-serif';
    ctx.fillText('暂无数据', width/2-30, height/2);
    return;
  }

  // 按数值从大到小排序
  const sortedItems = [...items].sort((a,b) => Number(b.value) - Number(a.value));
  const candyColors = ['#FF6B6B', '#FFB347', '#FFD966', '#A2E1B0', '#77C3F2', '#D9A5E6', '#F5A3C7', '#BCE5FF', '#C9E4DE', '#FADADD'];
  const colors = sortedItems.map((_, idx) => candyColors[idx % candyColors.length]);

  const cx = 110, cy = height/2, r = 70;
  let startAngle = -Math.PI / 2;

  // 绘制扇形
  let start = startAngle;
  for (let i = 0; i < sortedItems.length; i++) {
    const angle = (Number(sortedItems[i].value) / total) * Math.PI * 2;
    const end = start + angle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    start = end;
  }

  // 中心白点
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#DDDDDD';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 右侧图例
  const legendX = cx + r + 15;
  const legendStartY = cy - (sortedItems.length * 18) / 2;
  ctx.font = '11px "Source Sans 3", sans-serif';
  for (let i = 0; i < sortedItems.length; i++) {
    const item = sortedItems[i];
    const y = legendStartY + i * 20;
    ctx.fillStyle = colors[i];
    ctx.fillRect(legendX, y, 12, 12);
    ctx.fillStyle = '#666666';
    ctx.fillText(`${item.name}: ${item.value}`, legendX + 18, y + 10);
  }
}

// ========== 柱状图（淡黄色，无 hover 高亮） ==========
function drawBar(canvasId, items) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = 220;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  if (!items.length) {
    ctx.fillStyle = '#999';
    ctx.font = '14px "Source Sans 3", sans-serif';
    ctx.fillText('暂无借阅数据', width/2-70, height/2);
    return;
  }

  const pad = { left: 45, right: 20, top: 20, bottom: 30 };
  const graphW = width - pad.left - pad.right;
  const graphH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...items.map(x => Number(x.count)));
  const gap = 10;
  const barW = (graphW - gap * (items.length - 1)) / items.length;
  const barColor = '#FFD966';  // 淡黄色

  // 虚线网格
  ctx.save();
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (graphH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = '#888888';
    ctx.font = '10px "Source Sans 3", sans-serif';
    ctx.fillText(Math.round(max * (1 - i/4)), pad.left - 18, y + 4);
  }
  ctx.setLineDash([]);

  let maxCount = -Infinity, maxIndex = -1;
  for (let i = 0; i < items.length; i++) {
    const count = Number(items[i].count);
    if (count > maxCount) { maxCount = count; maxIndex = i; }
    const barH = (count / max) * graphH;
    const x = pad.left + i * (barW + gap);
    const y = pad.top + graphH - barH;
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barW, Math.max(barH, 2));
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barW, Math.max(barH, 2));

    // X轴日期
    ctx.fillStyle = '#666666';
    ctx.font = '10px "Source Sans 3", sans-serif';
    let label = items[i].day;
    if (label.length > 5) label = label.slice(5);
    ctx.fillText(label, x + barW/2 - 12, height - pad.bottom + 10);
  }

  // 最高柱子数值标签
  if (maxIndex !== -1) {
    const count = Number(items[maxIndex].count);
    const barH = (count / max) * graphH;
    const x = pad.left + maxIndex * (barW + gap);
    const y = pad.top + graphH - barH;
    ctx.fillStyle = '#E6B800';
    ctx.font = 'bold 11px "Source Sans 3", sans-serif';
    ctx.fillText(count, x + barW/2 - 6, y - 6);
  }
  ctx.restore();
}

// ========== 图书管理 ==========
async function loadBooks() {
  const search = encodeURIComponent($('bookSearch').value || '');
  const category = encodeURIComponent($('categoryFilter').value || '');
  const data = await api(`/api/books?search=${search}&category=${category}&page=${state.bookPage}&page_size=8`);
  state.lastBooks = data.items;
  $('bookTotalText').textContent = `共 ${data.total} 本`;
  $('bookPageText').textContent = `第 ${data.page} 页 / 共 ${Math.max(1, Math.ceil(data.total / data.page_size))} 页`;
  $('categoryFilter').innerHTML = '<option value="">全部分类</option>' + data.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  $('categoryFilter').value = decodeURIComponent(category);
  $('bookTable').innerHTML = `<thead><tr><th>ID</th><th>ISBN</th><th>书名</th><th>作者</th><th>分类</th><th>库存</th><th>位置</th><th>操作</th></tr></thead><tbody>${data.items.map(book => `<tr><td>${book.id}</td><td>${escapeHtml(book.isbn)}</td><td>${escapeHtml(book.title)}</td><td>${escapeHtml(book.author)}</td><td>${escapeHtml(book.category)}</td><td>${book.available_count}/${book.total_count}</td><td>${escapeHtml(book.shelf_location)}</td><td class="row-actions"><button class="btn btn-outline-sm" onclick="quickBorrow(${book.id})">借阅</button>${state.user.role === 'admin' ? `<button class="btn btn-outline-sm" onclick="editBook(${book.id})">编辑</button><button class="btn btn-outline-sm" onclick="deleteBook(${book.id})">删除</button>` : ''}</td></tr>`).join('')}</tbody>`;
}
function resetBookForm() { $('bookForm').reset(); $('bookId').value = ''; $('bookFormTitle').textContent = '新增图书'; }
function editBook(id) {
  const book = state.lastBooks.find(x=>x.id===id);
  if(!book) return;
  $('bookId').value=book.id; $('bookIsbn').value=book.isbn; $('bookTitle').value=book.title; $('bookAuthor').value=book.author; $('bookPublisher').value=book.publisher;
  $('bookCategory').value=book.category; $('bookTotal').value=book.total_count; $('bookAvailable').value=book.available_count; $('bookShelf').value=book.shelf_location; $('bookDescription').value=book.description;
  $('bookFormTitle').textContent = `编辑图书 #${book.id}`; toast('已填入表单，可修改后保存');
}
async function deleteBook(id) {
  if(!confirm('确认删除该图书？未归还图书不允许删除。')) return;
  try{ await api(`/api/books/${id}`,{method:'DELETE'}); toast('删除成功','success'); loadBooks(); } catch(e){ toast(e.message,'error'); }
}
async function quickBorrow(bookId) { switchView('records'); setTimeout(()=>{ $('borrowBook').value=bookId; toast('已选择图书，请确认借阅信息'); },100); }

// ========== 读者管理 ==========
async function loadReaders() {
  if(state.user.role !== 'admin') return;
  const data = await api(`/api/readers?search=${encodeURIComponent($('readerSearch').value||'')}&page=1&page_size=50`);
  state.lastReaders = data.items;
  $('readerTable').innerHTML = `<thead><tr><th>ID</th><th>用户名</th><th>姓名</th><th>手机</th><th>邮箱</th><th>院系</th><th>状态</th><th>操作</th></tr></thead><tbody>${data.items.map(r => `<tr><td>${r.id}</td><td>${escapeHtml(r.username)}</td><td>${escapeHtml(r.full_name)}</td><td>${escapeHtml(r.phone)}</td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.department)}</td><td>${r.status==='active'?'正常':'冻结'}</td><td class="row-actions"><button class="btn btn-outline-sm" onclick="editReader(${r.id})">编辑</button><button class="btn btn-outline-sm" onclick="deleteReader(${r.id})">删除</button></td></tr>`).join('')}</tbody>`;
}
function resetReaderForm() { $('readerForm').reset(); $('readerId').value=''; $('readerUsername').disabled=false; }
function editReader(id) {
  const r = state.lastReaders.find(x=>x.id===id);
  if(!r) return;
  $('readerId').value=r.id; $('readerUsername').value=r.username; $('readerUsername').disabled=true; $('readerPassword').value='';
  $('readerFullName').value=r.full_name; $('readerStatus').value=r.status; $('readerPhone').value=r.phone; $('readerEmail').value=r.email; $('readerDepartment').value=r.department;
}
async function deleteReader(id) {
  if(!confirm('确认删除该读者？存在未还图书时不允许删除。')) return;
  try{ await api(`/api/readers/${id}`,{method:'DELETE'}); toast('删除成功','success'); loadReaders(); loadBorrowOptions(); } catch(e){ toast(e.message,'error'); }
}

// ========== 借还记录 ==========
async function loadBorrowOptions() {
  const books = await api('/api/books?page=1&page_size=100');
  $('borrowBook').innerHTML = books.items.map(b=>`<option value="${b.id}">${escapeHtml(b.title)}（可借 ${b.available_count}）</option>`).join('');
  if(state.user.role === 'admin'){
    const readers = await api('/api/readers?page=1&page_size=100');
    $('borrowReader').innerHTML = readers.items.map(r=>`<option value="${r.id}">${escapeHtml(r.full_name)} / ${escapeHtml(r.username)}</option>`).join('');
  }
}
async function loadRecords() {
  const status = encodeURIComponent($('recordStatus').value || '');
  const keyword = encodeURIComponent($('recordKeyword').value || '');
  console.log('加载借还记录，参数:', {status, keyword, page: state.recordPage});
  try {
    const data = await api(`/api/borrow-records?status=${status}&keyword=${keyword}&page=${state.recordPage}&page_size=8`);
    console.log('借还记录返回:', data);
    $('recordPageText').textContent = `第 ${data.page} 页 / 共 ${Math.max(1, Math.ceil(data.total / data.page_size))} 页`;
    if(!data.items || data.items.length===0){
      $('recordTable').innerHTML = `<thead><tr><th>ID</th><th>图书</th><th>读者</th><th>借出日期</th><th>应还日期</th><th>归还日期</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td colspan="8">暂无借还记录</td></tr></tbody>`;
      return;
    }
    $('recordTable').innerHTML = `<thead><tr><th>ID</th><th>图书</th><th>读者</th><th>借出日期</th><th>应还日期</th><th>归还日期</th><th>状态</th><th>操作</th></tr></thead><tbody>${data.items.map(r => `<tr><td>${r.id}</td><td>${escapeHtml(r.book_title)}</td><td>${escapeHtml(r.reader_name)}</td><td>${r.borrow_date}</td><td>${r.due_date}</td><td>${r.return_date||'-'}</td><td>${statusBadge(r.status)}</td><td>${r.status !== 'returned' ? `<button class="btn btn-outline-sm" onclick="returnBook(${r.id})">归还</button>` : '-'}</td></tr>`).join('')}</tbody>`;
  } catch(err) {
    console.error('加载借还记录失败:', err);
    toast('加载借还记录失败: ' + err.message, 'error');
  }
}
async function returnBook(recordId) {
  if(!confirm('确认归还这本书？')) return;
  try{ await api(`/api/borrow-records/${recordId}/return`,{method:'PATCH'}); toast('归还成功，库存已恢复','success'); loadRecords(); loadDashboard(); } catch(e){ toast(e.message,'error'); }
}

// ========== 逾期提醒 ==========
async function loadOverdue() {
  const data = await api('/api/overdue');
  $('overdueTable').innerHTML = `<thead><tr><th>记录ID</th><th>图书</th><th>读者</th><th>应还日期</th><th>逾期天数</th><th>状态</th></tr></thead><tbody>${data.items.map(r => `<tr><td>${r.id}</td><td>${escapeHtml(r.book_title)}</td><td>${escapeHtml(r.reader_name)}</td><td>${r.due_date}</td><td>${Math.max(r.overdue_days,1)}</td><td>${statusBadge(r.status)}</td></tr>`).join('') || '<tr><td colspan="6">暂无逾期记录</td></tr>'}</tbody>`;
}
async function generateReminders() {
  try{
    const data = await api('/api/reminders/generate',{method:'POST'});
    $('reminderMessages').innerHTML = data.items.map(x=>`<div class="reminder-msg">${escapeHtml(x.message)}</div>`).join('') || '<div class="reminder-msg">暂无需要提醒的逾期记录。</div>';
    toast(`已生成 ${data.total} 条提醒`,'success');
  } catch(err){ toast(err.message,'error'); }
}

// ========== 导出 ==========
function downloadCsv(filename,text){
  const blob = new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

// ========== 事件绑定 ==========
$('loginForm').addEventListener('submit', async(e)=>{
  e.preventDefault();
  try{
    const data = await api('/api/auth/login',{method:'POST',body:JSON.stringify({username:$('loginUsername').value,password:$('loginPassword').value})});
    state.token=data.token; state.user=data.user; localStorage.setItem('library_token',state.token); toast('登录成功','success'); showApp();
  } catch(err){ toast(err.message,'error'); }
});
$('logoutBtn').addEventListener('click',()=>logout(true));
document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
$('bookSearchBtn').addEventListener('click',()=>{ state.bookPage=1; loadBooks(); });
$('categoryFilter').addEventListener('change',()=>{ state.bookPage=1; loadBooks(); });
$('bookPrev').addEventListener('click',()=>{ if(state.bookPage>1){ state.bookPage--; loadBooks(); } });
$('bookNext').addEventListener('click',()=>{ state.bookPage++; loadBooks(); });
$('resetBookForm').addEventListener('click',resetBookForm);
$('bookForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const payload = {
    isbn:$('bookIsbn').value, title:$('bookTitle').value, author:$('bookAuthor').value, publisher:$('bookPublisher').value,
    category:$('bookCategory').value, total_count:Number($('bookTotal').value), available_count:$('bookAvailable').value===''?null:Number($('bookAvailable').value),
    shelf_location:$('bookShelf').value, description:$('bookDescription').value
  };
  if(payload.available_count!==null && payload.available_count>payload.total_count) return toast('可借数量不能大于馆藏总数','error');
  try{
    const id=$('bookId').value;
    await api(id?`/api/books/${id}`:'/api/books',{method:id?'PUT':'POST',body:JSON.stringify(payload)});
    toast('图书保存成功','success'); resetBookForm(); loadBooks(); loadDashboard();
  } catch(err){ toast(err.message,'error'); }
});
$('readerSearchBtn').addEventListener('click',loadReaders);
$('resetReaderForm').addEventListener('click',resetReaderForm);
$('readerForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const id=$('readerId').value;
  const payload = { full_name:$('readerFullName').value, phone:$('readerPhone').value, email:$('readerEmail').value, department:$('readerDepartment').value, status:$('readerStatus').value };
  if(!id){ payload.username=$('readerUsername').value; payload.password=$('readerPassword').value; if(!payload.password || payload.password.length<6) return toast('新增读者密码至少 6 位','error'); }
  else if($('readerPassword').value) payload.password=$('readerPassword').value;
  try{ await api(id?`/api/readers/${id}`:'/api/readers',{method:id?'PUT':'POST',body:JSON.stringify(payload)}); toast('读者保存成功','success'); resetReaderForm(); loadReaders(); loadBorrowOptions(); } catch(err){ toast(err.message,'error'); }
});
$('borrowForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const payload = { book_id:Number($('borrowBook').value), days:Number($('borrowDays').value), remark:$('borrowRemark').value };
  if(state.user.role === 'admin') payload.reader_id = Number($('borrowReader').value);
  try{ await api('/api/borrow-records',{method:'POST',body:JSON.stringify(payload)}); toast('借书登记成功','success'); loadBorrowOptions(); loadRecords(); loadBooks(); loadDashboard(); } catch(err){ toast(err.message,'error'); }
});
$('recordSearchBtn').addEventListener('click',()=>{ state.recordPage=1; loadRecords(); });
$('recordPrev').addEventListener('click',()=>{ if(state.recordPage>1){ state.recordPage--; loadRecords(); } });
$('recordNext').addEventListener('click',()=>{ state.recordPage++; loadRecords(); });
$('refreshOverdueBtn').addEventListener('click',loadOverdue);
$('generateRemindersBtn').addEventListener('click',generateReminders);
$('exportBooksBtn').addEventListener('click',async()=>downloadCsv('books.csv',await api('/api/export/books')));
$('exportRecordsBtn').addEventListener('click',async()=>downloadCsv('borrow_records.csv',await api('/api/export/borrow-records')));

initAuth();