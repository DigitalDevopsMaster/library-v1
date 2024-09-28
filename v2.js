let config

export const navigate = (url) => {
  document.querySelectorAll('layout-header header nav a').forEach((a) => a.className = "")
  const open = document.querySelector('.open')
  // button.className =  'active'

  const menuButton = document.querySelector('burguer-menu-button').shadowRoot.querySelector('.open')

  open?.classList.remove('open')
  menuButton?.classList.remove('open')
  window.history.pushState({}, '', `${url}`);

  setTimeout(() => {
    
    if (url.includes('#')) {
      const [baseUrl, hash] = url.split('#');
      const targetElement = document.getElementById(hash);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      const layout = document.querySelector('web-layout-00') || document.querySelector('app-layout')
      layout.scroll({
        top: 0,
        left: 0,
        behavior: 'smooth' // O 'auto' para un scroll instantáneo
      });
    }
  }, 0);


  const eventoPopstate = new Event('popstate');
  window.dispatchEvent(eventoPopstate);
}

export const scrollTo = (pos) => {
  const layout = document.querySelector('web-layout-00') || document.querySelector('app-layout')
  layout.scrollTo(pos);
}

export const loadFrontend = async (cfg) => {
  const scripts = [];
  config = { ...cfg, pages: [] }
  var isMobile = window.innerWidth > config.layout.breakpoint ? 'desktop' : 'mobile'
  document.body.innerHTML = `<${config.layout.type} class="${isMobile}"/>`
  
  function compareByIndex(a, b) {
    return a.config.index - b.config.index;
  }

  try {
    const response = await fetch('/api/getPages');
    const data = await response.json();
    for (const component of data.components) {
      const JScontent = await getJScontent(component);
      if (JScontent) {
        const regex = /class\s+([^\s{]+)\s*{/;
        const match = regex.exec(JScontent);
        const className = match ? match[1] : null;

        // Reemplazar la declaración de la clase con una cadena vacía y eliminar la llave de cierre de la clase
        const scriptText = JScontent.replace(/^class\s+[^\s{]+\s*{/, '').replace(/\}$/, '');

        // Crear un nuevo elemento de script para la clase
        const script = document.createElement('script');
        script.textContent = `
          class ${className} extends HTMLElement {
            ${scriptText}
            getConfig(prop) {
              if (prop) {
                return JSON.parse(this.getAttribute('config'))[prop];
              }
              return JSON.parse(this.getAttribute('config'));
            }
          }
          customElements.define('${className.toLocaleLowerCase()}-page', ${className});
        `;

        // Agregar el nuevo script a la lista de scripts
        scripts.push(script);

        const configRegex = /this\.config\s*=\s*({[^}]+})/;

        // Ejecutar la expresión regular en el texto del código para encontrar la asignación de this.config
        const matchConfigRegex = configRegex.exec(scriptText);

        // Extraer el contenido dentro de this.config si se encuentra
        let pageConfig = null;
        if (matchConfigRegex && matchConfigRegex[1]) {
          // El contenido dentro de las llaves se encuentra en el grupo de captura 1
          const configContent = matchConfigRegex[1];
          const jsonString = configContent.replace(/'/g, '"');
          // Quitamos las comillas dobles de las palabras reservadas
          const fixedJsonString = jsonString.replace(/"\s*:\s*"/g, '": "');
          // Agregamos comillas dobles a los nombres de las propiedades que no las tienen
          const validJsonString = fixedJsonString.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
          // Parseamos la cadena JSON válida a un objeto JavaScript
          pageConfig = JSON.parse(validJsonString);
        }
        const name = component.replace('.js', "")
        const componentTag = `${name}-page`
        const componentNode = document.createElement(componentTag)
        componentNode.setAttribute('config', JSON.stringify(config))
        config.pages.push({
          name,
          component: componentNode,
          config: {
            ...pageConfig,
            index: typeof pageConfig.index === "number"
              ? pageConfig.index
              : 100
          }
        })
      }
    }
    const pages = config.pages.sort(compareByIndex);
    const nav = document.querySelector('nav')
    const header = document.querySelector('header')
    const menuButton = document.createElement('burguer-menu-button')
    const navLogo = document.createElement('div')
    navLogo.className = "nav-logo"
    navLogo.innerHTML = `
      <img src="${config.contactInfo.logo}">
    `
    navLogo.onclick = () => {
      navigate('/')
    }


    const isAuthenticated = await checkSession(localStorage.getItem('token'));
    pages.forEach(({ config }) => {
      const button = document.createElement('a')
      button.href = `${config.route}`
      button.className = config.route === window.location.pathname ? 'active' : ''
      button.innerText = config.name
      button.onclick = (e) => {
        e.preventDefault()
        navigate(config.route)
        
      }

      if(!config.disableMenuButton) {
        if (!config.protected||(config.protected && isAuthenticated)) {
          nav.append(button)
        }
      } else if (config.disableMenuButton === "auth") {
        if (!isAuthenticated) {
          nav.append(button)
        }
      }
    });
    nav.append(navLogo)

    
    
    menuButton.addEventListener('menu-click', (e) => {
      const isOpen = menuButton.shadowRoot.querySelector('button').classList.contains('open')
      if (isMobile) {
        if (isOpen) {
          nav.classList.remove('open');
        } else {
          nav.classList.add('open');
        }
      }
    });
    header.append(menuButton)
  } catch (error) {
    console.error('Error:', error);
  }

  if (config.layout.showWhastappFloatingButton) {
    const whatsappFloattingButton = document.createElement('whatsapp-floating-button')
    whatsappFloattingButton.setAttribute('tel', config.contactInfo.phone.replace(")", "").replace("(", "").replace(" ", "").replace("-", ""))
    document.body.append(whatsappFloattingButton)
  }
  // Agregar todos los scripts al documento una vez que se hayan procesado todos los componentes
  let scriptsInnerHtml = ""
  for (const script of scripts) { scriptsInnerHtml = `${scriptsInnerHtml || ''} ${script.innerHTML}` }
  const rootScript = document.createElement('script')
  rootScript.innerHTML = scriptsInnerHtml
  document.head.append(rootScript)
  renderRoute()
}

async function getJScontent(nombreArchivo) {
  try {
    // Realizar una solicitud fetch para obtener el contenido del archivo
    const response = await fetch(`pages/${nombreArchivo}`);
    
    // Verificar si la solicitud fue exitosa
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo ${nombreArchivo}`);
    }

    // Obtener el contenido del archivo como texto
    const contenido = await response.text();
    return contenido;
  } catch (error) {
    console.error(error.message);
    return null;
  }
}

async function checkSession(token) {

  try {
    const response = await fetch('/api/session', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Envía el token almacenado en localStorage
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo verificar la sesión');
    }
    const data = await response.json();
    return true;
    // Aquí puedes manejar la respuesta según tus necesidades
    // Por ejemplo, actualizar el UI con información del usuario autenticado

  } catch (error) {
    console.error('Error al verificar sesión:', error);
    // Manejo de errores
    return null;
  }
};
async function renderRoute() {
  const topbarHeight = 48
  const pathname = window.location.pathname
  const isAuthenticated = await checkSession(localStorage.getItem('token'));



  const currentPage = config.pages.find(({ config: pageConfig }) => {
    return pageConfig.route === pathname
  })
  if (!currentPage ) {
    document.querySelector("layout-content").innerHTML = `
      <page-not-found />
    `
  } else {
    if (isAuthenticated || !currentPage.config.protected) {
      const header = document.querySelector('layout-header');
      header.classList.add('scrolled')
  
      document.head.querySelector('title').innerText = `${config.contactInfo.companyName} - ${currentPage.config.name}`
      // if (window.location.pathname !== "/") {
      //   header.classList.add('scrolled')
      //   header.classList.remove('origin')
      // } else {
      //   header.classList.add('origin')
      //   header.classList.remove('scrolled')
      // }
      document.querySelector("layout-content").innerHTML = `
        ${window.location.pathname === "/" ? `
          <style>
            .hero {
              padding-top: ${topbarHeight}px;
              height: 50vh;
              background: ${config.palette.primaryColor};
              display: flex;
              justify-content: center;
              align-items: center;
            }
  
            .hero .hero-logo-container {
              width: calc(100% - 32px);
              max-width: 500px;
              
            }
  
            .hero .hero-logo-container img {
              width: 100%;
            }

            layout-footer, layout-header {
              display: ${currentPage.config.hideLayout ? "none" : "flex" };
              
            }
          </style>
          ` : 
          `
            layout-footer, layout-header {
              display: ${currentPage.config.hideLayout ? "none" : "flex" };
              
            }
          `

        
        }
          
        ${currentPage.component.outerHTML}
        `;
        // <div class="hero">
        //   <div class="hero-logo-container">
        //     <img src="${config.contactInfo.logo}" >
        //   </div>
        // </div>
      
    } else {
      document.querySelector("layout-content").innerHTML = `
        <page-not-authorized />
      `
    }
  }
}

function getWidthOnResize(node, callback) {
  const observer = new ResizeObserver(entries => {
    const newWidth = entries[0].contentRect.width;
    callback(newWidth);
  });
  observer.observe(node);
  return observer;
}

function getScrollPosition(node, callback) {
  const scrollHandler = () => {
    const scrollTop = node.scrollTop;
    const scrollLeft = node.scrollLeft;
    callback({ scrollTop, scrollLeft });
  };
  node.addEventListener('scroll', scrollHandler);
  scrollHandler();
  return () => {
    node.removeEventListener('scroll', scrollHandler);
  };
}

class PageNotFound extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        page-not-found  {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }
      </style>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="100%" height="100%" fill="none"/>
        <circle cx="150" cy="80" r="40" fill="#ff6347"/>
        <text x="150" y="90" font-size="40" fill="#ffffff" text-anchor="middle" alignment-baseline="middle">!</text>
        <text x="150" y="150" font-size="18" fill="#333333" text-anchor="middle" alignment-baseline="middle">Página no encontrada</text>
      </svg>
    `;
  }
}

class PageNotAuthorized extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <style>
        page-not-authorized {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }
      </style>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect width="100%" height="100%" fill="none"/>
        <circle cx="150" cy="80" r="40" fill="#ff6347"/>
        <text x="150" y="90" font-size="40" fill="#ffffff" text-anchor="middle" alignment-baseline="middle">X</text>
        <text x="150" y="150" font-size="18" fill="#333333" text-anchor="middle" alignment-baseline="middle">No autorizado</text>
      </svg>
    `;
  }
}

class WebLayout00 extends HTMLElement {
  connectedCallback() {
    getWidthOnResize(document.body, this.onResize)
    const resetCSS = `
      html, body, div, span, applet, object, iframe,
      h1, h2, h3, h4, h5, h6, p, blockquote, pre,
      a, abbr, acronym, address, big, cite, code,
      del, dfn, em, img, ins, kbd, q, s, samp,
      small, strike, strong, sub, sup, tt, var,
      b, u, i, center,
      dl, dt, dd, ol, ul, li,
      fieldset, form, label, legend,
      table, caption, tbody, tfoot, thead, tr, th, td,
      article, aside, canvas, details, embed, 
      figure, figcaption, footer, header, hgroup, 
      menu, nav, output, ruby, section, summary,
      time, mark, audio, video {
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 100%;
        font: inherit;
        vertical-align: baseline;
        display: flex;
      }
      body {
        line-height: 1;
      }
      ol, ul {
        list-style: none;
      }
      blockquote, q {
        quotes: none;
      }
      blockquote:before, blockquote:after,
      q:before, q:after {
        content: '';
        content: none;
      }
      table {
        border-collapse: collapse;
        border-spacing: 0;
      }
    `
    this.topbarHeight = 48

    this.innerHTML = `
      <style>
        ${resetCSS}
        * {
          box-sizing: border-box;
        }
        web-layout-00 {
          display: flex;
          flex-direction: column;
          width: 100vw;    
          height: 100vh;
          overflow: scroll;   
        }
        layout-header {
          display: flex;
          justify-content: center;
          background: ${config.palette.primaryColor};
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1;
          width: 100%;
        } 
        layout-header header {
          transition: ease-in-out .3s all; 
          padding: 0 16px;
          display: flex;
          flex: 1;
          max-width: ${config.layout.maxWidth}px;
          height: ${this.topbarHeight}px;
          justify-content: space-between;
        }
        layout-header.origin header .logo-container {
          visibility: hidden;
          opacity: 0;
        }
        layout-header.scrolled header .logo-container {
          visibility: visible;
          opacity: 1;
        }
        layout-header header .logo-container {
          transition: all ease-in-out .3s;
          visibility: hidden;
          opacity: 0;
          height: 100%;
        }
        layout-header header nav {
          display: flex;
          left: 0;
          z-index: 10;
          gap: 8px;
          transition: .3s all ease-in-out;
        }
        layout-header header nav .nav-logo {
          justify-content: center;
        }
        layout-header header nav .nav-logo  img{
          object-fit: contain;
          width: 100%;
        }
        .desktop layout-header header nav .nav-logo {
          display: none;
        }
        .desktop layout-header header .overlay {
          display: none;
        }
        .mobile layout-header header .overlay {
          display: flex;
        }
        .mobile layout-header header nav + .overlay {
          position: fixed;
          background: ${config.palette.primaryColor};
          width: 100%;
          height: 100vh;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          left: 0;
          visibility: hidden;
          transition: ease-in-out .3s all;
        }
        .mobile layout-header header nav.open + .overlay {
          opacity: .8;
          visibility: visible;
        }
        .mobile layout-header header nav {
          position: fixed;
          background: ${config.palette.backgroundSecondaryColor};
          width: 100%;
          flex-direction: column;
          overflow: hidden;
        }
        .mobile layout-header header nav.open {
          transform: translateY(0);
        }
        .mobile layout-header header nav {
          align-items: center;
          transform-origin: top;
          transform: translateY(-100%);
          justify-content: center;
          padding: 48px 32px;
          gap: 32px;
        }
        .mobile layout-header header nav a {
          color: ${config.palette.textColor};
          text-decoration: none;
          justify-content: space-between;
          display: flex;
          border: 2px solid ${config.palette.textSecondaryColor};
          padding: 16px;
        }
        layout-header header nav a {
          color: ${config.palette.textColor};
          text-decoration: none;
          justify-content: center;
          align-items: center;
          padding: 16px;
          display: flex;
        }
        layout-header header nav a.active {
          border-bottom: 2px solid white;
        }
        layout-header header burguer-menu-button {
          z-index: 11;
        }
        .desktop layout-header header burguer-menu-button {
          display: none;
        }
        layout-header header .logo-container img {
          cursor: pointer;
          object-fit: contain;
          height: 100%;
        }
        layout-content {
          transition: ease-in-out .3s all; 
          flex: 1;
          flex-direction: column;
          display: flex;
          padding-top: 48px;
        }
        layout-content.scrolled{
          padding-top: ${this.topbarHeight}px;
        }
        layout-content.origin{
          padding-top: 0;
        }
        .header-full-screen {
        }
   

      </style>
      <layout-header>
        <header>
          <div class="logo-container">
            <img src="${config.contactInfo.logo}" >
          </div>
          <nav></nav>
          <div class="overlay"></div>
        </header>
      </layout-header>
      <layout-content></layout-content>
      <layout-footer></layout-footer>
    `;

    
    document.querySelector('.logo-container').onclick = () => {
      navigate("/")
    }
    document.querySelector('.overlay').onclick = () => {
      document.querySelector('burguer-menu-button').shadowRoot.querySelector('button').click()
    }
    getScrollPosition(document.querySelector('web-layout-00'), (e) => this.onScroll(e))
    document.querySelector('img').addEventListener('wheel', (event) => {
      event.stopPropagation();
      document.querySelector('web-layout-00').scrollTop += event.deltaY;
    });
    this.onResize(window.innerWidth)
  }
  onResize(e) {
    const isMobile = e < config.layout.breakpoint;
    const layout = document.querySelector('web-layout-00');
    const hasMobileClass = layout.classList.contains('mobile');
    if (isMobile != hasMobileClass) {
      layout.classList.add(isMobile ? 'mobile' : 'desktop')
      layout.classList.remove(!isMobile ? 'mobile' : 'desktop')
    }
  }
  onScroll(e) {
    const header = document.querySelector('layout-header');
    const isHome = window.location.pathname === "/";
    // if (isHome) {
    //   if (e.scrollTop > window.innerHeight / 2) {
    //     header.classList.add('scrolled')
    //     header.classList.remove('origin')
    //   } else {
    //     header.classList.add('origin')
    //     header.classList.remove('scrolled')
    //   }
    // }
    const pathname = window.location.pathname
    const currentPage = config.pages.find(({ config: pageConfig }) => {
      return pageConfig.route === pathname
    })
    document.querySelector(`${currentPage?.name}-page`)?.setAttribute('scroll-position', e.scrollTop)
  }
}

class AppLayout extends HTMLElement {
  connectedCallback() {
    getWidthOnResize(document.body, this.onResize)
    const resetCSS = `
      html, body, div, span, applet, object, iframe,
      h1, h2, h3, h4, h5, h6, p, blockquote, pre,
      a, abbr, acronym, address, big, cite, code,
      del, dfn, em, img, ins, kbd, q, s, samp,
      small, strike, strong, sub, sup, tt, var,
      b, u, i, center,
      dl, dt, dd, ol, ul, li,
      fieldset, form, label, legend,
      table, caption, tbody, tfoot, thead, tr, th, td,
      article, aside, canvas, details, embed, 
      figure, figcaption, footer, header, hgroup, 
      menu, nav, output, ruby, section, summary,
      time, mark, audio, video {
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 100%;
        font: inherit;
        vertical-align: baseline;
        display: flex;
      }
      body {
        line-height: 1;
      }
      ol, ul {
        list-style: none;
      }
      blockquote, q {
        quotes: none;
      }
      blockquote:before, blockquote:after,
      q:before, q:after {
        content: '';
        content: none;
      }
      table {
        border-collapse: collapse;
        border-spacing: 0;
      }
    `
    this.topbarHeight = 48

    this.innerHTML = `
      <style>
        ${resetCSS}
        * {
          box-sizing: border-box;
        }
        app-layout {
          display: flex;
          flex-direction: column;
          width: 100vw;    
          height: 100vh;
          overflow: scroll;   
        }
        layout-header {
          display: flex;
          justify-content: center;
          background: ${config.palette.primaryColor};
          border-bottom: 1px solid ${config.palette.accentColor};
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1;
          width: 100%;
        } 
        layout-header header {
          transition: ease-in-out .3s all; 
          padding: 0 16px;
          display: flex;
          flex: 1;
          max-width: ${config.layout.maxWidth}px;
          height: ${this.topbarHeight}px;
          justify-content: space-between;
        }
        layout-header.origin header .logo-container {
          visibility: hidden;
          opacity: 0;
        }
        layout-header.scrolled header .logo-container {
          visibility: visible;
          opacity: 1;
        }
        layout-header header .logo-container {
          transition: all ease-in-out .3s;
          visibility: hidden;
          opacity: 0;
          height: 100%;
        }
        layout-header header nav {
          display: flex;
          left: 0;
          z-index: 10;
          gap: 8px;
          transition: .3s all ease-in-out;
        }
        layout-header header nav .nav-logo {
          justify-content: center;
        }
        layout-header header nav .nav-logo  img{
          object-fit: contain;
          width: 100%;
        }
        .desktop layout-header header nav .nav-logo {
          display: none;
        }
        .desktop layout-header header .overlay {
          display: none;
        }
        .mobile layout-header header .overlay {
          display: flex;
        }
        .mobile layout-header header nav + .overlay {
          position: fixed;
          background: ${config.palette.primaryColor};
          width: 100%;
          height: 100vh;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          left: 0;
          visibility: hidden;
          transition: ease-in-out .3s all;
        }
        .mobile layout-header header nav.open + .overlay {
          opacity: .8;
          visibility: visible;
        }
        .mobile layout-header header nav {
          position: fixed;
          background: ${config.palette.backgroundSecondaryColor};
          width: 100%;
          flex-direction: column;
          overflow: hidden;
        }
        .mobile layout-header header nav.open {
          transform: translateY(0);
        }
        .mobile layout-header header nav {
          align-items: center;
          transform-origin: top;
          transform: translateY(-100%);
          justify-content: center;
          padding: 48px 32px;
          gap: 32px;
        }
        .mobile layout-header header nav a {
          color: ${config.palette.textColor};
          text-decoration: none;
          justify-content: space-between;
          display: flex;
          border: 2px solid ${config.palette.textSecondaryColor};
          padding: 16px;
        }
        layout-header header nav a {
          color: ${config.palette.textColor};
          text-decoration: none;
          justify-content: center;
          align-items: center;
          padding: 16px;
          display: flex;
        }
        layout-header header nav a.active {
          border-bottom: 2px solid white;
        }
        layout-header header burguer-menu-button {
          z-index: 11;
        }
        .desktop layout-header header burguer-menu-button {
          display: none;
        }
        layout-header header .logo-container img {
          cursor: pointer;
          object-fit: contain;
          height: 100%;
        }
        layout-content {
          transition: ease-in-out .3s all; 
          flex: 1;
          flex-direction: column;
          display: flex;
          padding-top: 48px;
        }
        layout-content.scrolled{
          padding-top: ${this.topbarHeight}px;
        }
        layout-content.origin{
          padding-top: 0;
        }
        .header-full-screen {
        }
      </style>
      <layout-header>
        <header>
          <div class="logo-container">
            <img src="${config.contactInfo.logo}" >
          </div>
          <nav></nav>
          <div class="overlay"></div>
        </header>
      </layout-header>
      <layout-content></layout-content>
    `;
    document.querySelector('.logo-container').onclick = () => {
      navigate("/")
    }
    document.querySelector('.overlay').onclick = () => {
      document.querySelector('burguer-menu-button').shadowRoot.querySelector('button').click()
    }
    getScrollPosition(document.querySelector('app-layout'), (e) => this.onScroll(e))
    document.querySelector('img').addEventListener('wheel', (event) => {
      event.stopPropagation();
      document.querySelector('app-layout').scrollTop += event.deltaY;
    });
    this.onResize(window.innerWidth)
  }
  onResize(e) {
    const isMobile = e < config.layout.breakpoint;
    const layout = document.querySelector('app-layout');
    const hasMobileClass = layout.classList.contains('mobile');
    if (isMobile != hasMobileClass) {
      layout.classList.add(isMobile ? 'mobile' : 'desktop')
      layout.classList.remove(!isMobile ? 'mobile' : 'desktop')
    }
  }
  onScroll(e) {
    const header = document.querySelector('layout-header');
    const isHome = window.location.pathname === "/";
    // if (isHome) {
    //   if (e.scrollTop > window.innerHeight / 2) {
    //     header.classList.add('scrolled')
    //     header.classList.remove('origin')
    //   } else {
    //     header.classList.add('origin')
    //     header.classList.remove('scrolled')
    //   }
    // }
    const pathname = window.location.pathname
    const currentPage = config.pages.find(({ config: pageConfig }) => {
      return pageConfig.route === pathname
    })
    document.querySelector(`${currentPage?.name}-page`)?.setAttribute('scroll-position', e.scrollTop)
  }
}


class BurguerMenuButton extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    button.innerHTML = `
      <style>
      :host {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      :host button {
        background: transparent;
        border: none;
        justify-content: space-evenly;
        height: 32px;
        padding: 0;
        width: 32px;
        display: flex;
        flex-direction: column;
      }
      .bar {
        height: 4px;
        width: 100%;
        background: ${config.palette.secondaryColor};
        border-radius: 4px;
        transition: ease-in-out all .3s;
      }
      .open .bar:nth-of-type(2) {
        opacity: 0;
        transform: scaleX(0);
      }
      .open .bar:nth-of-type(1) {
        transform: translateY(9px) rotate(135deg);
      }
      .open .bar:nth-of-type(3) {
        transform:  translateY(-9px) rotate(-135deg);
      }
      </style>
      <div class="bar"></div>
      <div class="bar"></div>
      <div class="bar"></div>

    `
    shadow.appendChild(button);
    button.onclick = () => {
      this.dispatchEvent(new Event('menu-click'));
      button.classList.toggle('open');
    };
  }
}

class ParallaxBackground extends HTMLElement {
  static observedAttributes = ["scroll-position"];
  attributeChangedCallback(name, oldValue, newValue) {
    this.handleScroll(newValue)
  }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.parallaxSpeed = parseFloat(this.getAttribute('parallax-speed')) || 1;
    this.layerIndex = parseFloat(this.getAttribute('layer-index')) || 1;
    this.lastScrollY = 0;
    this.rafHandle = null;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
          display: block;
          overflow: hidden;
        }
        .background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: calc(100%);
          background-size: cover;
          background-position: center;
          z-index: -${this.layerIndex};
        }
        slot {
          display: flex;
          flex-direction: column;
          
        }
      </style>
      <div class="background"></div>
      <slot></slot>
    `;
    this.backgroundElement = this.shadowRoot.querySelector('.background');
  }

  connectedCallback() {
    const patternSVG = this.getAttribute('pattern-svg');
    if (patternSVG) {
      this.setBackgroundImage(patternSVG);
    }
  }


  setBackgroundImage(svg) {
    this.backgroundElement.style.backgroundImage = `url("data:image/svg+xml;utf8,${svg}")`;
  }

  handleScroll(offset) {

      const offsetTop = Number(this.getAttribute('overide-offsetTop') || this.offsetTop)
      const scrollPos = offset;
      const nestedParallax = this.children[0].tagName === "PARALLAX-BACKGROUND"
      if (nestedParallax) {
        this.children[0].setAttribute('overide-offsetTop', offsetTop)
      }
      this.backgroundElement.style.transform = `translateY(${(scrollPos - offsetTop) / this.parallaxSpeed}px)`;
  }
}

class ImageCarousel extends HTMLElement {
  constructor() {
    super();
    this.currentIndex = 0;
    this.images = [];
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
        }
        h1,h2,h3,h4,h5,p {
          margin: 0;
        }

        .carousel {
          position: relative;
          overflow: hidden;
          height: 100%;
          display: flex;
          justify-content: space-between; /* Espacio entre las imágenes */
          align-items: center;
          padding: 24px;
          box-sizing: border-box;
        }
        .image-container {
          position:absolute;
          width: 100%; /* Ancho ajustable para que quepan dos imágenes */
          transition: opacity 0.5s ease; /* Transición de opacidad */
          height: 100%;  
          left: 0;
        }
        img {
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        .text-container {
          position:absolute;
          box-sizing: border-box;
          top: 0;
          background: ${config.palette.accentColor2.replace("1)", "0.5)")};
          backdrop-filter: blur(5px) saturate(30%);
          width: 50%;
          padding: 32px;
          left: 25%;
          letter-spacing: 2px;
          display:flex;
          flex-direction: column;
          gap: 16px;
          line-height: 20px;
          color: ${config.palette.textColor};
          
          max-height: 100%;
          height: 100%;
          justify-content: center;
        }
        .text-container * {
        }
        .text-container {
          width: 100%;
          padding-right: 35%;
        }
        button {
          width: 45px;
          height: 45px;
          background: ${config.palette.primaryColor}9A;
          border: none;
          color: ${config.palette.textColor};
          font-weight: 900;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1;
        }
        @media screen and (max-width: ${config.layout.breakpoint}px) {
          img {
            object-fit: contain!important;
          }
          .text-container {
            height: unset;
            top: unset;
            padding-bottom: 30%;
            bottom: 0;
            left: 0;
            padding-right: 32px;
            width: 100%;
          }
          .text-container * {
          }
        }
      </style>
      <div class="carousel">
        <div class="image-container">
          <img class="image" src="">
        </div>
        <div class="image-container">
          <img class="image" src="">
        </div>
        <div class="text-container">
          <h2 class="title"></h2>
          <p class="description"></p>
        </div>
        <div class="text-container">
          <h2 class="title"></h2>
          <p class="description"></p>
        </div>
        <button class="prev">❮</button>
        <button class="next">❯</button>
      </div>
    `;
  }

  connectedCallback() {
    // Agregar listeners para los botones de anterior y siguiente
    this.shadowRoot.querySelector('.prev').addEventListener('click', () => this.showPrevious());
    this.shadowRoot.querySelector('.next').addEventListener('click', () => this.showNext());
    // Mostrar las imágenes al inicializar
    this.updateDisplay();
  }

  set imagesArray(array) {
    this.images = array;
    this.updateDisplay();
  }

  showNext() {
    this.updateDisplay("next");
  }

  showPrevious() {
    this.updateDisplay("prev");
  }

  updateDisplay(param) {

    const incomingIndex = param 
      ? param === "next"
        ? this.currentIndex < (this.images.length -1  )? this.currentIndex + 1 : 0
        : this.currentIndex ? this.currentIndex  - 1 : this.images.length - 1
      : 0
    const imageContainers = this.shadowRoot.querySelectorAll('.image-container');
    const textContainers = this.shadowRoot.querySelectorAll('.text-container');
    
    for (let i = 0; i < 2; i++) { // Actualizar las dos imágenes
      let incomingImage  = this.images[incomingIndex] || {};
      const imageContainer = imageContainers[i];
      const textContainer = textContainers[i];
      const imageElement = imageContainer.querySelector('.image');

      
      const titleElement = textContainer.querySelector('.title');
      const descriptionElement = textContainer.querySelector('.description');
      
      if (i !== 0) {
        imageElement.src = incomingImage.url;
        titleElement.textContent = incomingImage.title;
        descriptionElement.textContent = incomingImage.description;
        
        imageContainer.style.transition = '.5s all ease-in-out';
        imageContainer.style.opacity = '1';

        textContainer.style.transition = '.5s all ease-in-out';
        textContainer.style.transform = 'translateX(0)';
        textContainer.style.opacity = '1';
        
        titleElement.style.transition = '.5s all ease-in-out';
        titleElement.style.transform = '';
        
        descriptionElement.style.transition = '.5s all ease-in-out';
        descriptionElement.style.transform = '';
        
        if (incomingImage.fillColor) {
          imageElement.style.background = incomingImage.fillColor
        } else {
          imageElement.style.background = 'green'
        }

        if (incomingImage.forceContain) {
          imageElement.style.objectFit = "contain"
        } else {
          imageElement.style.objectFit = "cover"
        }
        
        setTimeout(() => {
          imageContainer.style.transition = 'none';
          imageContainer.style.opacity = '0';
          
          textContainer.style.transition = 'none';
          textContainer.style.opacity = '0';
          textContainer.style.transform = 'translateX(100%)';
          
          titleElement.style.transition = 'none';
          titleElement.style.transform = '';
          
          descriptionElement.style.transition = 'none';
          descriptionElement.style.transform = '';
        }, 500);
      } else {

        textContainer.style.transition = '.5s all ease-in-out';
        textContainer.style.transform = 'translateX(-100%)';
        textContainer.style.opacity = '0';
        
        titleElement.style.transition = '.5s all ease-in-out';
        titleElement.style.transform = '';
        
        descriptionElement.style.transition = '.5s all ease-in-out';
        descriptionElement.style.transform = '';
        setTimeout(() => {
          textContainer.style.transition = 'none';
          textContainer.style.opacity = '1';
          textContainer.style.transform = 'translateX(0)';
          
          titleElement.style.transition = 'none';
          titleElement.style.transform = '';
          
          descriptionElement.style.transition = 'none';
          descriptionElement.style.transform = '';
          imageElement.src = incomingImage.url;
          titleElement.textContent = incomingImage.title;
          descriptionElement.textContent = incomingImage.description;
          if (incomingImage.fillColor) {
            imageElement.style.background = incomingImage.fillColor
          } else {
            imageElement.style.background = 'green'
          }
  
          if (incomingImage.forceContain) {
            imageElement.style.objectFit = "contain"
          } else {
            imageElement.style.objectFit = "cover"
          }
        }, 500);
      }

      
    }
    this.currentIndex = incomingIndex
  }
}

class LayoutFooter extends HTMLElement {
  constructor(){
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          padding: 64px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        .footer-left-container {
          display: flex;
          gap: 16px;
          flex: 1;
          flex-direction: column;
        }
        .footer-right-container {
          gap: 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
        }
        .footer-right-container svg{
          height: 48px;
          width: 48px;
          cursor: pinter;
        }
        p, a {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 0;
        }
        @media screen and (max-width: ${config.layout.breakpoint}px) {
          :host {
            padding: 32px;
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
          }
        }
      </style>
      <div class="footer-left-container">
        <p>CONTÀCTANOS</p>
        <a href="tel:${config.contactInfo.phone}">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/></svg>
          ${config.contactInfo.phone}
        </a>


        <a href="mailto:${config.contactInfo.email}"> 
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/></svg>
          ${config.contactInfo.email}
        </a>
        
        <p>${config.contactInfo.address}</p>

      </div>
      <div class="footer-right-container">


        ${config.social.facebook 
          ? `
            <a href="${config.social.facebook}">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
                <g fill-opacity="0.63137" fill="#000000" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(5.12,5.12)"><path d="M41,4h-32c-2.76,0 -5,2.24 -5,5v32c0,2.76 2.24,5 5,5h32c2.76,0 5,-2.24 5,-5v-32c0,-2.76 -2.24,-5 -5,-5zM37,19h-2c-2.14,0 -3,0.5 -3,2v3h5l-1,5h-4v15h-5v-15h-4v-5h4v-3c0,-4 2,-7 6,-7c2.9,0 4,1 4,1z"></path></g></g>
              </svg>
            </a>
          ` 
          : ``
        }

        ${config.social.instagram 
          ? `
            <a href="${config.social.instagram}">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
                <g fill-opacity="0.63137" fill="#000000" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(5.12,5.12)"><path d="M16,3c-7.17,0 -13,5.83 -13,13v18c0,7.17 5.83,13 13,13h18c7.17,0 13,-5.83 13,-13v-18c0,-7.17 -5.83,-13 -13,-13zM37,11c1.1,0 2,0.9 2,2c0,1.1 -0.9,2 -2,2c-1.1,0 -2,-0.9 -2,-2c0,-1.1 0.9,-2 2,-2zM25,14c6.07,0 11,4.93 11,11c0,6.07 -4.93,11 -11,11c-6.07,0 -11,-4.93 -11,-11c0,-6.07 4.93,-11 11,-11zM25,16c-4.96,0 -9,4.04 -9,9c0,4.96 4.04,9 9,9c4.96,0 9,-4.04 9,-9c0,-4.96 -4.04,-9 -9,-9z"></path></g></g>
              </svg>
            </a>
          ` 
          : ``
        }

        ${config.social.youtube 
          ? `
            <a href="${config.social.youtube}">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
                <g fill-opacity="0.63137" fill="#000000" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(5.12,5.12)"><path d="M41,4h-32c-2.76,0 -5,2.24 -5,5v32c0,2.76 2.24,5 5,5h32c2.76,0 5,-2.24 5,-5v-32c0,-2.76 -2.24,-5 -5,-5zM17,20v19h-6v-19zM11,14.47c0,-1.4 1.2,-2.47 3,-2.47c1.8,0 2.93,1.07 3,2.47c0,1.4 -1.12,2.53 -3,2.53c-1.8,0 -3,-1.13 -3,-2.53zM39,39h-6c0,0 0,-9.26 0,-10c0,-2 -1,-4 -3.5,-4.04h-0.08c-2.42,0 -3.42,2.06 -3.42,4.04c0,0.91 0,10 0,10h-6v-19h6v2.56c0,0 1.93,-2.56 5.81,-2.56c3.97,0 7.19,2.73 7.19,8.26z"></path></g></g>
              </svg>
            </a>
          ` 
          : ``
        }

        ${config.social.linkedin 
          ? `
            <a href="${config.social.linkedin}">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0,0,256,256">
                <g fill-opacity="0.63137" fill="#000000" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><g transform="scale(5.12,5.12)"><path d="M44.89844,14.5c-0.39844,-2.19922 -2.29687,-3.80078 -4.5,-4.30078c-3.29687,-0.69922 -9.39844,-1.19922 -16,-1.19922c-6.59766,0 -12.79687,0.5 -16.09766,1.19922c-2.19922,0.5 -4.10156,2 -4.5,4.30078c-0.40234,2.5 -0.80078,6 -0.80078,10.5c0,4.5 0.39844,8 0.89844,10.5c0.40234,2.19922 2.30078,3.80078 4.5,4.30078c3.5,0.69922 9.5,1.19922 16.10156,1.19922c6.60156,0 12.60156,-0.5 16.10156,-1.19922c2.19922,-0.5 4.09766,-2 4.5,-4.30078c0.39844,-2.5 0.89844,-6.10156 1,-10.5c-0.20312,-4.5 -0.70312,-8 -1.20312,-10.5zM19,32v-14l12.19922,7z"></path></g></g>
              </svg>
            </a>

          ` 
          : ``
        }
        
        ${config.social.tiktok 
          ? `
          <a href="${config.social.tiktok}">
            <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 256 256">
              <g transform="scale(5.12,5.12)">
                <path d="M25.8125 7.75c1.71875 3.00781 4.41016 5.41406 7.74219 6.65625 1.23828 0.42188 2.54688 0.59375 3.875 0.625v7.1875c-1.39844 0.06641-2.78125-0.15625-4.09375-0.65625-1.80469-0.66016-3.4375-1.71484-4.8125-3.09375v13.40625c0 7.53516-6.09766 13.5625-13.625 13.625-1.16797-0.06641-2.33203-0.20703-3.46875-0.53125-5.73828-1.51953-9.61719-7.42969-8.75-13.46875 0.78516-5.97266 5.79688-10.47656 11.8125-10.53125 1.14453-0.01172 2.28906 0.15234 3.40625 0.46875v7.28125c-0.85156-0.33203-1.75781-0.5-2.65625-0.5-3.45703 0.00391-6.35938 2.54297-6.8125 5.95703-0.36719 2.58203 0.94922 5.10938 3.1875 6.1875 2.25391 1.15234 5.05859 0.73438 6.875-1.0625 1.20312-1.17578 1.89453-2.78516 1.9375-4.46875v-34.46875h7.28125z"></path>
              </g>
            </svg>
          </a>

          ` 
          : ``
        }



      </div>

    `;

    const footerLeftContainer = this.shadowRoot.querySelector(".footer-left-container")
    
    
    if (config.contactInfo.openingHours.length) {
      const scheduleTag = document.createElement('p')
      scheduleTag.innerHTML = "Horario:"
      footerLeftContainer.append(scheduleTag)
      config.contactInfo.openingHours.forEach((schedule) => {
          const onpeningHours =  document.createElement('p')
          onpeningHours.innerHTML = schedule
          footerLeftContainer.append(onpeningHours)
        }
      )

    }
  }
}

class WhatsAppButton extends HTMLElement {
  constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.render();
  }

  static get observedAttributes() {
      return ['tel'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'tel') {
          this.updateLink(newValue);
      }
  }

  render() {
      const style = document.createElement('style');
      style.textContent = `
          .whatsapp-button {
              position: fixed;
              bottom: 20px;
              right: 20px;
              width: 60px;
              height: 60px;
              background-color: #25d366;
              border-radius: 50%;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 1000;
              cursor: pointer;
          }

          .whatsapp-button img {
              width: 35px;
              height: 35px;
          }
      `;

      const link = document.createElement('a');
      link.className = 'whatsapp-button';
      link.target = '_blank';
      this.updateLink(this.getAttribute('tel'));

      const img = document.createElement('img');
      img.src = 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg';
      img.alt = 'WhatsApp';

      link.appendChild(img);
      this.shadowRoot.append(style, link);
  }

  updateLink(tel) {
      const link = this.shadowRoot.querySelector('a');
      if (link && tel) {
          link.href = `https://wa.me/+52${tel}`;
      }
  }
}

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

customElements.define('dynamic-table', DynamicTable);
customElements.define('layout-footer', LayoutFooter);
customElements.define('image-carousel', ImageCarousel);
customElements.define('parallax-background', ParallaxBackground);
customElements.define('page-not-found', PageNotFound);
customElements.define('page-not-authorized', PageNotAuthorized);
customElements.define('web-layout-00', WebLayout00);
customElements.define('app-layout', AppLayout);
customElements.define('burguer-menu-button', BurguerMenuButton);
customElements.define('whatsapp-floating-button', WhatsAppButton);
window.addEventListener('popstate', async function (event) { renderRoute() });
