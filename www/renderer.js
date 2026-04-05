// ===== PLATFORM DETECTION =====
const isElectron = typeof window.api !== 'undefined' && window.api.loadTasks;

// Storage abstraction: Electron uses IPC, web/mobile uses localStorage
const storage = {
  async load() {
    if (isElectron) return await window.api.loadTasks();
    try {
      return JSON.parse(localStorage.getItem('tasks') || '[]');
    } catch { return []; }
  },
  async save(data) {
    if (isElectron) return await window.api.saveTasks(data);
    localStorage.setItem('tasks', JSON.stringify(data));
  }
};

// ===== STATE =====
let tasks = [];
let currentFilter = 'all';
let currentTag = '';
let searchQuery = '';
let sidebarOpen = false;

const TAG_NAMES = {
  is: 'İş',
  kisisel: 'Kişisel',
  alisveris: 'Alışveriş',
  saglik: 'Sağlık',
  egitim: 'Eğitim'
};

// ===== DOM ELEMENTS =====
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const taskTitle = document.getElementById('task-title');
const taskDate = document.getElementById('task-date');
const taskPriority = document.getElementById('task-priority');
const taskTag = document.getElementById('task-tag');
const btnAdd = document.getElementById('btn-add');
const searchInput = document.getElementById('search-input');

// Modal elements
const editModal = document.getElementById('edit-modal');
const editId = document.getElementById('edit-id');
const editTitle = document.getElementById('edit-title');
const editDescription = document.getElementById('edit-description');
const editDate = document.getElementById('edit-date');
const editPriority = document.getElementById('edit-priority');
const editTag = document.getElementById('edit-tag');

// ===== INIT =====
async function init() {
  // Hide titlebar on mobile/web
  if (!isElectron) {
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.display = 'none';
  }

  tasks = await storage.load();
  render();
  setupEventListeners();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Add task
  btnAdd.addEventListener('click', addTask);
  taskTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    render();
  });

  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      currentTag = '';
      document.querySelectorAll('.tag-filter').forEach(t => t.classList.remove('active'));
      updateViewTitle();
      render();
    });
  });

  // Tag filters
  document.querySelectorAll('.tag-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (currentTag === tag) {
        currentTag = '';
        btn.classList.remove('active');
      } else {
        document.querySelectorAll('.tag-filter').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        currentTag = tag;
      }
      currentFilter = 'all';
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-filter="all"]').classList.add('active');
      render();
    });
  });

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', saveEdit);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Mobile sidebar toggle
  const menuBtn = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebarOpen = !sidebarOpen;
      sidebar.classList.toggle('open', sidebarOpen);
      overlay.classList.toggle('visible', sidebarOpen);
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebarOpen = false;
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }

  // Close sidebar on nav item click (mobile)
  document.querySelectorAll('.nav-item, .tag-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebarOpen = false;
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      }
    });
  });
}

// ===== TASK OPERATIONS =====
function addTask() {
  const title = taskTitle.value.trim();
  if (!title) {
    taskTitle.focus();
    return;
  }

  const task = {
    id: Date.now().toString(),
    title,
    description: '',
    date: taskDate.value || '',
    priority: taskPriority.value,
    tag: taskTag.value,
    completed: false,
    important: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  save();

  // Reset form
  taskTitle.value = '';
  taskDate.value = '';
  taskPriority.value = 'medium';
  taskTag.value = '';
  taskTitle.focus();

  render();
}

function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    save();
    render();
  }
}

function toggleImportant(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.important = !task.important;
    save();
    render();
  }
}

function deleteTask(id) {
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.style.transform = 'translateX(100px)';
    card.style.opacity = '0';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    }, 200);
  }
}

function openEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editId.value = task.id;
  editTitle.value = task.title;
  editDescription.value = task.description || '';
  editDate.value = task.date || '';
  editPriority.value = task.priority;
  editTag.value = task.tag || '';

  editModal.style.display = 'flex';
  editTitle.focus();
}

function closeModal() {
  editModal.style.display = 'none';
}

function saveEdit() {
  const id = editId.value;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.title = editTitle.value.trim() || task.title;
  task.description = editDescription.value.trim();
  task.date = editDate.value;
  task.priority = editPriority.value;
  task.tag = editTag.value;

  save();
  closeModal();
  render();
}

async function save() {
  await storage.save(tasks);
}

// ===== FILTERING =====
function getFilteredTasks() {
  let filtered = [...tasks];

  // Search
  if (searchQuery) {
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(searchQuery) ||
      (t.description && t.description.toLowerCase().includes(searchQuery))
    );
  }

  // Tag filter
  if (currentTag) {
    filtered = filtered.filter(t => t.tag === currentTag);
  }

  // Category filter
  const today = new Date().toISOString().split('T')[0];

  switch (currentFilter) {
    case 'today':
      filtered = filtered.filter(t => t.date === today);
      break;
    case 'important':
      filtered = filtered.filter(t => t.important);
      break;
    case 'completed':
      filtered = filtered.filter(t => t.completed);
      break;
    default:
      // Show active tasks first, completed at bottom
      filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return 0;
      });
  }

  return filtered;
}

// ===== RENDERING =====
function render() {
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    taskList.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    taskList.style.display = 'flex';
    emptyState.style.display = 'none';

    taskList.innerHTML = filtered.map(task => createTaskCard(task)).join('');

    // Attach event listeners
    taskList.querySelectorAll('.task-checkbox input').forEach(cb => {
      cb.addEventListener('change', () => toggleComplete(cb.dataset.id));
    });
    taskList.querySelectorAll('.btn-star').forEach(btn => {
      btn.addEventListener('click', () => toggleImportant(btn.dataset.id));
    });
    taskList.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openEdit(btn.dataset.id));
    });
    taskList.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteTask(btn.dataset.id));
    });
  }

  updateCounts();
}

function createTaskCard(task) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.date && task.date < today && !task.completed;

  let dateDisplay = '';
  if (task.date) {
    const d = new Date(task.date + 'T00:00:00');
    const formatted = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    dateDisplay = `
      <span class="task-date ${isOverdue ? 'overdue' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${formatted}
      </span>`;
  }

  let tagDisplay = '';
  if (task.tag && TAG_NAMES[task.tag]) {
    tagDisplay = `<span class="task-tag ${task.tag}">${TAG_NAMES[task.tag]}</span>`;
  }

  return `
    <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <label class="task-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
        <span class="checkmark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
      </label>
      <div class="priority-indicator ${task.priority}"></div>
      <div class="task-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          ${dateDisplay}
          ${tagDisplay}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn btn-star ${task.important ? 'active' : ''}" data-id="${task.id}" title="Önemli">
          <svg viewBox="0 0 24 24" fill="${task.important ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="task-action-btn btn-edit" data-id="${task.id}" title="Düzenle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="task-action-btn btn-delete" data-id="${task.id}" title="Sil">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateCounts() {
  const today = new Date().toISOString().split('T')[0];
  const active = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  document.getElementById('count-all').textContent = tasks.length;
  document.getElementById('count-today').textContent = tasks.filter(t => t.date === today).length;
  document.getElementById('count-important').textContent = tasks.filter(t => t.important).length;
  document.getElementById('count-completed').textContent = completed.length;

  document.getElementById('stat-active').textContent = active.length;
  document.getElementById('stat-done').textContent = completed.length;
}

function updateViewTitle() {
  const titles = {
    all: ['Tüm Görevler', 'Görevlerini yönet ve organize et'],
    today: ['Bugün', 'Bugünkü görevlerin'],
    important: ['Önemli', 'Yıldızlı görevlerin'],
    completed: ['Tamamlanan', 'Bitirdiğin görevler']
  };

  const [title, subtitle] = titles[currentFilter] || titles.all;
  document.getElementById('view-title').textContent = title;
  document.getElementById('view-subtitle').textContent = subtitle;
}

// ===== START =====
init();
