const app = {
  spaces: [],
  items: [],
  currentView: 'items',
  currentSpaceId: null,

  async init() {
    await this.loadSpaces();
    await this.loadItems();
    this.render();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.search(e.target.value);
    });

    // Close modal on overlay click
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') {
        this.hideModal();
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal();
      }
    });
  },

  async loadSpaces() {
    try {
      const response = await fetch('/api/spaces');
      this.spaces = await response.json();
    } catch (err) {
      console.error('Failed to load spaces:', err);
      this.spaces = [];
    }
  },

  async loadItems(spaceId = null) {
    try {
      const url = spaceId ? `/api/items?space_id=${spaceId}` : '/api/items';
      const response = await fetch(url);
      this.items = await response.json();
    } catch (err) {
      console.error('Failed to load items:', err);
      this.items = [];
    }
  },

  async search(query) {
    if (!query.trim()) {
      await this.loadItems(this.currentSpaceId);
      this.render();
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      this.items = await response.json();
      this.render();
    } catch (err) {
      console.error('Search failed:', err);
    }
  },

  render() {
    const content = document.getElementById('content');
    
    if (this.spaces.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>No spaces yet</h3>
          <p>Create your first storage space to start tracking items.</p>
          <button class="btn btn-primary" onclick="app.showModal('space')" style="margin-top: 16px;">
            Create Space
          </button>
        </div>
      `;
      return;
    }

    if (this.items.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>No items yet</h3>
          <p>Add items to track what's in your storage spaces.</p>
        </div>
      `;
      return;
    }

    content.innerHTML = this.items.map(item => `
      <div class="card" onclick="app.showMoveModal(${item.id}, '${item.name.replace(/'/g, "\\'")}')">
        <div class="card-header">
          <div>
            <div class="card-title">${this.escapeHtml(item.name)}</div>
            ${item.description ? `<div class="card-subtitle">${this.escapeHtml(item.description)}</div>` : ''}
          </div>
          <span class="badge">${this.escapeHtml(item.space_name)}</span>
        </div>
        ${item.location_within_space ? `
          <div class="card-meta">📍 ${this.escapeHtml(item.location_within_space)}</div>
        ` : ''}
      </div>
    `).join('');
  },

  showModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (type === 'space') {
      title.textContent = 'Add Space';
      content.innerHTML = `
        <form onsubmit="app.createSpace(event)">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" class="form-input" name="name" placeholder="e.g., Garage, Cupboard under stairs" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <textarea class="form-textarea" name="description" placeholder="What's stored here?"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Space</button>
          </div>
        </form>
      `;
    } else if (type === 'item') {
      title.textContent = 'Add Item';
      const spaceOptions = this.spaces.map(s => 
        `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`
      ).join('');
      
      content.innerHTML = `
        <form onsubmit="app.createItem(event)">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input type="text" class="form-input" name="name" placeholder="e.g., Bin lid, Winter coat" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Space</label>
            <select class="form-select" name="space_id" required>
              <option value="">Select a space...</option>
              ${spaceOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Location within space</label>
            <input type="text" class="form-input" name="location" placeholder="e.g., Back left, Top shelf">
          </div>
          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <textarea class="form-textarea" name="description" placeholder="Any details about this item..."></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Item</button>
          </div>
        </form>
      `;
    }
  },

  showMoveModal(itemId, itemName) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const spaceOptions = this.spaces.map(s => 
      `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`
    ).join('');

    title.textContent = 'Move Item';
    content.innerHTML = `
      <p style="margin-bottom: 16px; color: var(--text-secondary);">Moving: <strong>${this.escapeHtml(itemName)}</strong></p>
      <form onsubmit="app.moveItem(event, ${itemId})">
        <div class="form-group">
          <label class="form-label">Move to</label>
          <select class="form-select" name="to_space_id" required autofocus>
            <option value="">Select destination...</option>
            ${spaceOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Note (optional)</label>
          <input type="text" class="form-input" name="note" placeholder="e.g., Moving for spring cleaning">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Move Item</button>
        </div>
      </form>
    `;
  },

  hideModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  async createSpace(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value,
      description: form.description.value
    };

    try {
      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await this.loadSpaces();
        this.hideModal();
        this.render();
      }
    } catch (err) {
      console.error('Failed to create space:', err);
      alert('Failed to create space. Please try again.');
    }
  },

  async createItem(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value,
      space_id: parseInt(form.space_id.value),
      location_within_space: form.location.value,
      description: form.description.value
    };

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await this.loadItems(this.currentSpaceId);
        this.hideModal();
        this.render();
      }
    } catch (err) {
      console.error('Failed to create item:', err);
      alert('Failed to add item. Please try again.');
    }
  },

  async moveItem(e, itemId) {
    e.preventDefault();
    const form = e.target;
    const data = {
      to_space_id: parseInt(form.to_space_id.value),
      note: form.note.value
    };

    try {
      const response = await fetch(`/api/items/${itemId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await this.loadItems(this.currentSpaceId);
        this.hideModal();
        this.render();
      }
    } catch (err) {
      console.error('Failed to move item:', err);
      alert('Failed to move item. Please try again.');
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
