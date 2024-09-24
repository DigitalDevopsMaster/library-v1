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
      console.log('Updated component attributes:', attributes);
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
  
  // Define the custom element
  customElements.define('attributes-test', AttributesTest);
  

customElements.define('login-page', LoginPage);

customElements.define('dynamic-table', DynamicTable);