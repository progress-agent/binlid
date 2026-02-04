const app = {
  spaces: [],
  items: [],
  currentView: 'items',
  currentSpaceId: null,

  async init() {
    await this.loadSpaces();
    await this.loadItems();
    this.updateItemCount();
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

  updateItemCount() {
    const countEl = document.getElementById('itemCount');
    if (countEl) {
      countEl.textContent = this.items.length;
    }
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
      this.updateItemCount();
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
      this.updateItemCount();
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
          <div class="empty-state-code">// SYSTEM READY</div>
          <div class="empty-state-title">No Storage Spaces</div>
          <p class="empty-state-text">Create your first storage location to begin tracking inventory.</p>
          <button class="btn btn-primary" onclick="app.showModal('space')" style="margin-top: 24px;">
            Initialize Space
          </button>
        </div>
      `;
      return;
    }

    if (this.items.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-code">// INVENTORY EMPTY</div>
          <div class="empty-state-title">No Items Tracked</div>
          <p class="empty-state-text">Add items to your storage spaces to begin tracking.</p>
        </div>
      `;
      return;
    }

    const itemsBySpace = {};
    for (const item of this.items) {
      if (!itemsBySpace[item.space_name]) {
        itemsBySpace[item.space_name] = [];
      }
      itemsBySpace[item.space_name].push(item);
    }

    let html = '';
    for (const [spaceName, items] of Object.entries(itemsBySpace)) {
      html += `
        <div class="section-header">
          <span class="section-title">${this.escapeHtml(spaceName)}</span>
          <span class="section-line"></span>
          <span class="status status-active">${items.length}</span>
        </div>
      `;
      
      html += items.map(item => `
        <div class="card" onclick="app.showMoveModal(${item.id}, '${item.name.replace(/'/g, "\\'")}')">
          <div class="card-header">
            <div>
              <div class="card-title">${this.escapeHtml(item.name)}</div>
              ${item.description ? `<div class="card-subtitle">${this.escapeHtml(item.description)}</div>` : ''}
            </div>
          </div>
          ${item.location_within_space ? `
            <div class="card-location">${this.escapeHtml(item.location_within_space)}</div>
          ` : ''}
        </div>
      `).join('');
    }

    content.innerHTML = html;
  },

  showModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (type === 'space') {
      title.textContent = 'Initialize Space';
      content.innerHTML = `
        <form onsubmit="app.createSpace(event)">
          <div class="form-group">
            <label class="form-label">Designation</label>
            <input type="text" class="form-input" name="name" placeholder="e.g., Garage, Cellar, Attic" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" name="description" placeholder="Storage parameters..."></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Initialize</button>
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
            <label class="form-label">Item Name</label>
            <input type="text" class="form-input" name="name" placeholder="e.g., Bin lid, Winter coat" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">Storage Location</label>
            <select class="form-select" name="space_id" required>
              <option value="">Select space...</option>
              ${spaceOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Position</label>
            <input type="text" class="form-input" name="location" placeholder="e.g., Shelf B, Back left">
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-textarea" name="description" placeholder="Additional specifications..."></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add to Inventory</button>
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

    title.innerHTML = `Relocate <span style="color: var(--accent);">${this.escapeHtml(itemName)}</span>`;
    content.innerHTML = `
      <form onsubmit="app.moveItem(event, ${itemId})">
        <div class="form-group">
          <label class="form-label">Destination</label>
          <select class="form-select" name="to_space_id" required autofocus>
            <option value="">Select destination...</option>
            ${spaceOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Transfer Notes</label>
          <input type="text" class="form-input" name="note" placeholder="Reason for relocation...">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Confirm Transfer</button>
        </div>
      </form>
    `;
  },

  hideModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
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
      alert('Initialization failed');
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
      alert('Failed to add item');
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
      alert('Transfer failed');
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
