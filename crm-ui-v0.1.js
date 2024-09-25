class DynamicTable extends HTMLElement {
  constructor() {
      super();
      this._state = { rows: [], columns: [] };
      this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
      return ['columns', 'rows', 'onedit', 'ondelete'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'columns') {
          this._state.columns = JSON.parse(newValue || '[]');
      }
      if (name === 'rows') {
          console.log({newValue});
          this._state.rows = JSON.parse(newValue || '[]');
      }
      if (name === 'onedit') {
          this._onEdit = eval(newValue);
      }
      if (name === 'ondelete') {
          this._onDelete = eval(newValue);
      }
      this.render();
  }

  connectedCallback() {
      this.render();
  }

  render() {
      const styles = `
          <style>
              div {
                  display: flex;
              }
              .table-container {
                  display: flex;
                  gap: 16px;
                  flex-direction: column;
                  background: #fff;
                  padding: 20px;
                  margin: 10px;
                  border-radius: 8px;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              }
              .table-header, .table-body {
                  flex-direction: column;
              }
              .table-row {
                  white-space: nowrap;
                  gap: 16px;
                  height: 45px;
                  align-items: center;
              }
              .table-header div, .table-row div {
                  flex: 1;
              }
              .table-row:nth-of-type(2n) {
                  background: rgba(0,0,0,0.05);
              }
              .no-results {
                  text-align: center;
                  color: #888;
                  font-style: italic;
              }
              .delete-btn, .edit-btn {
                  background: #e74c3c;
                  color: #fff;
                  border: none;
                  padding: 4px 8px;
                  border-radius: 4px;
                  cursor: pointer;
              }
              .delete-btn:hover, .edit-btn:hover {
                  background: #c0392b;
              }
              .edit-btn {
                  background: #2980b9;
                  margin-right: 8px;
              }
          </style>
      `;

      const rowsHtml = this._state.rows.map((row, rowIndex) => `
          <div class="table-row">
              ${this._state.columns.map((column, i) => `<div>${row[i] || ''}</div>`).join('')}
              <div>
                  <button class="edit-btn" data-index="${rowIndex}">Editar</button>
                  <button class="delete-btn" data-index="${rowIndex}">Eliminar</button>
              </div>
          </div>
      `).join('');

      const noResultsMessage = this._state.rows.length === 0 ? 
          `<div class="no-results">No se encontraron resultados</div>` : '';

      this.shadowRoot.innerHTML = `
          ${styles}
          <div class="table-container">
              <div class="table-header">
                  <div class="table-row">
                      ${this._state.columns.map(column => `<div>${column}</div>`).join('')}
                      <div>Acciones</div>
                  </div>
              </div>
              <div class="table-body">
                  ${rowsHtml || noResultsMessage}
              </div>
          </div>
      `;

      this.shadowRoot.querySelector('.table-body').addEventListener('click', this.handleAction.bind(this));
  }

  handleAction(event) {
      const rowIndex = event.target.getAttribute('data-index');
      const row = this._state.rows[rowIndex];
      if (event.target.classList.contains('edit-btn')) {
          this._onEdit && this._onEdit(row);
      } else if (event.target.classList.contains('delete-btn')) {
          this._onDelete && this._onDelete(row);
      }
  }
}

class LoginPage extends HTMLElement {
  constructor() {
      super();
      this._state = {
          endpoints: {
              login: null,
              forgotPassword: null,
              register: null,
          },
          csrfToken: null,
      };
      this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
      const endpoints = this.getAttribute('data-endpoints');
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      const csrfToken = metaTag ? metaTag.getAttribute('content') : 'No CSRF token found';
      console.log(csrfToken);
      if (endpoints) {
          try {
              this.updateState({ endpoints: JSON.parse(endpoints) });
          } catch (e) {
              console.error('Error parsing endpoints:', e);
          }
      }

      if (csrfToken) {
          this.updateState({ csrfToken });
      }

      
      
      this.render();
  }

  updateState(newState) {
      this._state = { ...this._state, ...newState };
      this.render();
  }

  serializeData(data) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, item));
      } else {
        params.append(key, value);
      }
    }
    return `${params.toString()}`;
  }

  handleLogin(event) {
      event.preventDefault();
      const formData = new FormData(this.shadowRoot.querySelector('form'));
      
      const data = {
        "user:email": [formData.get('user_email')],
        "user:password": [formData.get('user_password')],
        "_csrf": [formData.get('_csrf')], // Incluyendo el token CSRF en los datos enviados
      };
      const loginEndpoint = this._state.endpoints.login;

      if (loginEndpoint) {
          fetch(loginEndpoint, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: this.serializeData(data),
          })
          .then(response => {
            if (response.status === 200) {
                window.location.href = '/';
              } else {
                return this.shadowRoot.querySelector('.error-message').textContent = 'Invalid credentials'; // Handle unsuccessful login response
            }
        })
          .catch(error => console.error('Login error:', error));
      } else {
          console.error('Login endpoint is not set');
      }
  }

  render() {
      console.log('Attributes of', this.tagName.toLowerCase(), ':');
      Array.from(this.attributes).forEach(attr => {
          console.log(`${attr.name}: ${attr.value}`);
      });

      const styles = `
          <style>
              :host {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background-color: #f0f0f0;
                  font-family: Arial, sans-serif;
              }
              .login-container {
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                  width: 100%;
                  max-width: 400px;
              }
              h2 {
                  margin-bottom: 20px;
                  font-size: 24px;
                  text-align: center;
              }
              form {
                  display: flex;
                  flex-direction: column;
              }
              input {
                  margin-bottom: 15px;
                  padding: 10px;
                  font-size: 16px;
                  border: 1px solid #ccc;
                  border-radius: 4px;
              }
              button {
                  padding: 10px;
                  font-size: 16px;
                  background-color: #007BFF;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
              }
              button:hover {
                  background-color: #0056b3;
              }
              .links {
                  display: flex;
                  justify-content: space-between;
                  margin-top: 10px;
              }
              .links a {
                  color: #007BFF;
                  text-decoration: none;
                  font-size: 14px;
              }
              .links a:hover {
                  text-decoration: underline;
              }
              .error-message {
                  color: red;
                  text-align: center;
                  margin-bottom: 15px;
              }
          </style>
      `;

      const csrfInput = this._state.csrfToken 
          ? `<input type="hidden" name="_csrf" value="${this._state.csrfToken}">`
          : '';

      this.shadowRoot.innerHTML = `
          ${styles}
          <div class="login-container">
              <h2>Login</h2>
              <form>
                  <div class="error-message"></div>
                  ${csrfInput}
                  <input type="text" name="user_email" placeholder="Username" required autofocus>
                  <input type="password" name="user_password" placeholder="Password" required>
                  <button type="submit">Login</button>
              </form>
              <div class="links">
                  <a href="${this._state.endpoints.forgotPassword || '#'}">Forgot Password?</a>
                  <a href="${this._state.endpoints.register || '#'}">Register</a>
              </div>
          </div>
      `;

      this.shadowRoot.querySelector('form').addEventListener('submit', this.handleLogin.bind(this));
  }
}

class AttributesTest extends HTMLElement {
    constructor() {
      super();
  
      // Attach shadow DOM (optional)
      const shadow = this.attachShadow({ mode: 'open' });
  
      // Create a container for the text
      const container = document.createElement('div');
      container.textContent = 'ATTRIBUTES TEST';
  
      // Append the container to shadow DOM
      shadow.appendChild(container);
  
      // Log initial attributes
      this.logAttributes();
  
      // Observe changes to attributes dynamically using MutationObserver
      this.observeAttributes();
    }
  
    logAttributes() {
      // Log all current attributes
      const attributes = this.getAttributeNames();
      attributes.forEach((key) => console.log(this.getAttribute(key)))
    }
  
    observeAttributes() {
      // Create a MutationObserver to watch for attribute changes
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes') {
            console.log(`Attribute '${mutation.attributeName}' changed`);
            this.logAttributes();
          }
        });
      });
  
      // Start observing this element for attribute changes
      observer.observe(this, {
        attributes: true // This observes only attribute changes
      });
    }
}

class CandidateCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    set candidate(value) {
        console.log({value});
        this._candidate = value;
        this.render();
    }

    render() {
        const styles = `
            <style>
                .card { 
                    border: 1px solid #e0e0e0; 
                    border-radius: 8px;
                    padding: 15px; 
                    margin-bottom: 15px; 
                    transition: all 0.3s; 
                    background-color: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .card:hover {
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                    transform: translateY(-2px);
                }
                h3 { 
                    margin-top: 0; 
                    color: #2c3e50;
                    font-size: 1.1em;
                }
                p { 
                    margin: 5px 0; 
                    color: #34495e;
                    font-size: 0.9em;
                }
                :host(.dragging) .card { 
                    opacity: 0.5; 
                    transform: scale(0.95);
                    box-shadow: 0 0 10px rgba(0,0,0,0.2);
                }
                :host(.appearing) .card {
                    animation: appear 0.3s forwards;
                }
                @keyframes appear {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>
        `;

        console.log(this._candidate);

        this.shadowRoot.innerHTML = `
            ${styles}
            <div class="card">
                <h3>${this._candidate.name}</h3>
                <p>ID: ${this._candidate.id}</p>
                <p>Status: ${this._candidate.status}</p>
                <p>Phone: ${this._candidate.phone}</p>
            </div>
        `;
    }
}

class BoardComponent extends HTMLElement {
    constructor() {
        super();
        this._candidates = JSON.parse(this.getAttribute('data-candidates'));
        console.log(this._candidates);
        console.log( JSON.parse(this.getAttribute('data-candidates')));
        this.onUpdateState = null;
        this.draggedElement = null;
        this.insertionPoint = null;
        this.columns = []
    }

    set candidates(value) {
        this._candidates = value;
        this.columns = new Set(); // Usamos un Set para evitar duplicados
      
        value.forEach(candidate => {
            this.columns.add(candidate.status);
        });
      
        this.render();
    }
    

    connectedCallback() {
        this.render();
    }

    render() {
        const styles = `
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    background-color: #f0f4f8;
                    margin: 0;
                    padding: 20px;
                }

                .board {
                    display: flex;
                    gap: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                    max-width: 2000px;
                    overflow: hidden;
                    overflow-x: hidden;
                    overflow-x: scroll;
                }

                .column {
                    flex: 1;
                    background-color: #ffffff;
                    border-radius: 8px;
                    flex-direction: column;

                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    padding: 20px;
                    min-width: 250px;
                }

                h2 {
                    text-align: center;
                    color: #2c3e50;
                    font-size: 1.2em;
                    margin-top: 0;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #ecf0f1;
                }

                candidate-card {
                    cursor: move;
                    transition: transform 0.3s, box-shadow 0.3s, margin 0.3s, opacity 0.3s;
                    display: block;
                    margin-bottom: 15px;
                }

                .dragging {
                    opacity: 0.5;
                    background-color: #ecf0f1 !important;
                }

                .insertion-point {
                    height: 3px;
                    background-color: #3498db;
                    transition: all 0.2s;
                    border-radius: 3px;
                }

                .disappearing {
                    opacity: 0;
                    transform: scale(0.8);
                    transition: opacity 0.3s, transform 0.3s;
                }

                .appearing {
                    animation: appear 0.3s forwards;
                }

                @keyframes appear {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .push-down {
                    animation: pushDown 0.3s forwards;
                }

                @keyframes pushDown {
                    from {
                        transform: translateY(0);
                    }
                    to {
                        transform: translateY(100%);
                    }
                }
            </style>
        `
        this.innerHTML = `
        ${styles}
            <style>
                board-component {
                    display: flex;
                    height: 100%;
                }

                .board {
                    width: 100%;
                    display: flex;
                    gap: 8px;
                }
            </style>
            <div class="board">
                ${this.generateColumns()}
                
            </div>
        `;
        this.populateColumns();
    }


    generateColumns() {
        this.columns = new Set(); // Usamos un Set para evitar duplicados
      
        this._candidates.forEach(candidate => {
            this.columns.add(candidate.status);
        });
      
        let columns = ``
        this.columns.forEach(column => {
            columns = `${columns} <div class="column" id="${column}Column" ondragover="event.preventDefault()" ondrop="this.closest('board-component').handleDrop(event, '${column}')"><h2>${column}</h2></div>`
        });
        return columns
    }

    populateColumns() {
        const columns =  {}      
        this.columns.forEach((col) => {
            columns[col] = this.querySelector(`#${col}Column`)
        })

        this._candidates.forEach(candidate => {
            const card = document.createElement('candidate-card');
            card.candidate = candidate;
            card.id = candidate.id;
            card.draggable = true;

            card.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', candidate.id);
                card.classList.add('dragging');
                this.draggedElement = card;
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                this.draggedElement = null;
                if (this.insertionPoint) {
                    this.insertionPoint.remove();
                    this.insertionPoint = null;
                }
            });
            console.log({candidate}, candidate.status);
            columns[candidate.status].appendChild(card);
        });

        Object.values(columns).forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault();
                const afterElement = this.getDragAfterElement(column, e.clientY);
                if (this.insertionPoint) this.insertionPoint.remove();
                this.insertionPoint = document.createElement('div');
                this.insertionPoint.className = 'insertion-point';
                if (afterElement == null) {
                    column.appendChild(this.insertionPoint);
                } else {
                    column.insertBefore(this.insertionPoint, afterElement);
                }
            });

            column.addEventListener('dragleave', e => {
                if (e.target === column && this.insertionPoint) {
                    this.insertionPoint.remove();
                    this.insertionPoint = null;
                }
            });
        });
    }

    getDragAfterElement(column, y) {
        const draggableElements = [...column.querySelectorAll('candidate-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    handleDrop(event, newStatus) {
        event.preventDefault();
        console.log('drop');
        const candidateId = event.dataTransfer.getData('text');
        const candidate = this._candidates.find(c => c.id === candidateId);
        const column = event.target.closest('.column');
        const cards = [...column.querySelectorAll('candidate-card')];
        const newIndex = this.insertionPoint ? cards.indexOf(this.insertionPoint.nextElementSibling) : cards.length;
        console.log(
             {
                event,
                candidateId,
                candidate,
                column,
                cards,
                newIndex
             }
        );

        if (candidate) {
            const oldIndex = this._candidates.findIndex(c => c.id === candidateId);
            this._candidates.splice(oldIndex, 1);
            
            candidate.status = newStatus;
            this._candidates.splice(newIndex, 0, candidate);
            
            // Immediately update the DOM to reflect the new order
            this.render();
            
            // Apply animation after the DOM has been updated
            requestAnimationFrame(() => {
                const newCard = document.getElementById(candidateId);
                newCard.classList.add('appearing');
                
                // Push down cards below
                const cardsBelow = cards.slice(newIndex + 1);
                cardsBelow.forEach(card => {
                    card.classList.add('push-down');
                    setTimeout(() => card.classList.remove('push-down'), 300);
                });
            });
            
            console.log({ candidateId, newStatus, newIndex });

            if (this.onUpdateState) {
                this.onUpdateState({ candidateId, newStatus, newIndex });
            }
        }

        if (this.insertionPoint) {
            this.insertionPoint.remove();
            this.insertionPoint = null;
        }
    }
}

customElements.define('candidate-card', CandidateCard);

customElements.define('board-component', BoardComponent);

customElements.define('attributes-test', AttributesTest);

customElements.define('login-page', LoginPage);

customElements.define('dynamic-table', DynamicTable);