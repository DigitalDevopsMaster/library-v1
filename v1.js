let v1config


 const connectParallaxToScroll = () => {
    window.addEventListener('scroll', function () {
        const allParallax = []
        allParallax.push(...document.querySelectorAll('parallax-background')) 
        allParallax.push(...document.querySelectorAll('parallax-content')) 
        allParallax.forEach((parallax) => {
            parallax.setAttribute('scroll-position', window.scrollY)
        })
    });
}


function generateCSSStyles(palette) {
    let cssStyles = '';

    for (const key in palette) {
        if (palette.hasOwnProperty(key)) {
            cssStyles += `--${key}: ${palette[key]};\n`;
        }
    }

    return cssStyles;
}

 const initV1 = async (config) => {

    document.body.innerHTML = "<v1-layout />"
    v1config = {
        currentViewType: '',
        ...config
    }
    await fetch('/api/html-list')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
            }
            return response.text(); // Cambia a response.text() para ver el contenido de la respuesta
        })
        .then(data => {
            const parsedData = JSON.parse(data);
            config.menuOptions = parsedData.htmlFiles.filter((opt) => opt !== 'index.html').map((opt) => {
                const label = opt.replace('.html', '')
                const menuOption = {
                    label,
                    onClick: () => {
                        window.history.pushState({}, '', `/${label !== 'home' ? label : ''}`);
                        const eventoPopstate = new Event('popstate');
                        window.dispatchEvent(eventoPopstate);
                    },
                }
                return menuOption
            })
        })
        .catch(error => {
            console.error('Error:', error);
        });
    v1config = {
        currentViewType: '',
        ...config
    }
    document.querySelector('v1-layout').setAttribute('loaded', true)
    const cssPalette = generateCSSStyles(config.palette);
    const cssSizes = generateCSSStyles({
        "max-width": config.maxWidth,
        "breakpoint-mobile": config.breakpoint
    });
    const themeStyles = document.querySelector('#v1-styles') || document.createElement('style');
    themeStyles.id = "v1-styles"
    themeStyles.innerText = `
        :root {
            ${cssPalette}
            ${cssSizes}
        }
        html {
            background: var(--backgroundColor);
        }
    `
    themeStyles.innerText = themeStyles.innerText.replace('<br>', '')
    document.body.prepend(themeStyles);
}

const fetchContent = () => {
    const pathname = window.location.pathname
    const route = `${pathname.replace('/', '') || 'home'}.html`
    fetch(route)
        .then(response => {
            return response.text()
        })
        .then(html => {
            if (html.includes('<!DOCTYPE html>')) {
                document.querySelector('v1-layout').innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
              <rect width="100%" height="100%" fill="none"/>
              <circle cx="150" cy="80" r="40" fill="#ff6347"/>
              <text x="150" y="90" font-size="40" fill="#ffffff" text-anchor="middle" alignment-baseline="middle">!</text>
              <text x="150" y="150" font-size="18" fill="#333333" text-anchor="middle" alignment-baseline="middle">Página no encontrada</text>
            </svg>
          `
            } else {
                const pageScript = document.createElement('script')

                var range = document.createRange();
                var fragment = range.createContextualFragment(html);
                document.querySelector('v1-layout').innerHTML = '';
                document.querySelector('v1-layout').append(fragment);
            }
        });
}

window.addEventListener('popstate', function (event) {
    fetchContent()
});

fetchContent()

function getWidthOnResize(node, callback) {
    const observer = new ResizeObserver(entries => {
        const newWidth = entries[0].contentRect.width;
        callback(newWidth);
    });
    observer.observe(node);
    return observer;
}

const v1tools = {
    getWidthOnResize
}

class NavigationAnchor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = '<section><slot></slot></section>';
    }
}

customElements.define('navigation-anchor', NavigationAnchor);

class V1Layout extends HTMLElement {
    static observedAttributes = ["loaded"];
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
    }
    attributeChangedCallback(ect) {
        this.render();
    }
    render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    height: 100%;
                }
            </style>
            <v1-web-layout>
                <slot
                    style="
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100%;
                    "
                >
                </slot>
            </v1-web-layout>
        `
    }

}

customElements.define('v1-layout', V1Layout);

class V1WebLayout extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        this.render()
    }

    render() {
        const template = document.createElement('template')
        template.id = "host"
        const styles = document.createElement('style')
        styles.innerText = `
            * {
                box-sizing: border-box;
            }
            :host {
                flex: 1;
                display: flex;
                height: 100%;
                flex-direction: column;
            }
            .header-container {
                position: fixed;
                width:100%;
                top: 0;
                z-index: 5;
                display: flex;
                background: var(--backgroundSecondaryColor);
                justify-content: center;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header-delimiter {
                width: 100%;
                display: flex;
                justify-content: space-between;
                max-width: ${v1config.maxWidth}px;
            }
            #menu-button, #menu-trigger {
                display: none;
            }

            img {
                width: 100%;
                max-width: var(--breakpoint-mobile)px ;
            }

            #resizer {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            .content-container {
                flex: 1;
                margin-top: 40px;
            }

            .footer-container {
                background: var(--backgroundAccentColor);
            }

            .menu-container {
                opacity: 0;
                visibility: hidden;

            }
            .menu-overlay {
                opacity: 0;
                visibility: hidden;

            }
            .desktop {
                .menu-container {
                    opacity: 1;
                    visibility: visible;
                }
            }

            footer {
                color: var(--textColor);
                padding: 20px;
                display: flex;
                justify-content: space-between;
            }
            
            .contact-info p {
                margin: 0;
            }
            
            .social-links a {
                color: white;
                margin-right: 10px;
            }


            .mobile {

                .title-bar-container {
                    display: flex;
                    align-items: stretch;
                    justify-content: space-between;
                    position: sticky;
                    top: 0;
                }
                #menu-button {
                    padding: 8px;
                    cursor: pointer;
                    display: flex;
                }
                #menu-button {
                    z-index: 1;
                }
            
                
                #menu-trigger:checked ~ .menu-container {
                    opacity: 1;
                    transform: translateX(0);
                    visibility: visible;
    
                }
                #menu-trigger:checked ~ .menu-overlay {
                    opacity: 1;
                    visibility: visible;
    
                }
                .menu-overlay {
                    visibility: hidden;
                    position: fixed;
                    background: rgba(0,0,0,0.05);
                    width: 100%;
                    top: 0;
                    left: 0;
                    transition: ease-in-out .3s all;
                    height: 100%;
                    backdrop-filter: blur(10px); /* Desenfoque usando backdrop-filter */
                    opacity: 0.2;
                }
    
                .content-container {
                    flex: 1;
                }
                .menu-container {
                    padding: 32px;
                    padding-top: 40px;
                    visibility: hidden;
                    position: fixed;
                    background: var(--backgroundSecondaryColor);
                    height: 100%;
                    width: 100%;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    max-width: 350px;
                    top: 0;
                    right: 0;
                    transform: translateX(50%);
                    display: flex;
                    flex-direction: column;
                    transition: ease-in-out .3s all;
                }
                .footer-container {
    
                }


                #menu-button {
                    width: 40px;
                    height: 40px;
                    position: relative;
                    cursor: pointer;
                    display:flex;
                    flex-direction: column;
                    justify-content: space-evenly;
                }
                
                .bar {
                    width: 100%;
                    border-top: 2px solid var(--accentColor);
                    border-bottom: 2px solid var(--accentColor);
                    transition: all 0.3s ease-in-out;
                    border-radius: 10px;

                }
                
                #menu-button #bar1 {
                    transform-origin: left;
                }

                #menu-trigger:checked ~ #menu-button #bar1 {
                    transform: rotate(45deg) translateX(-2px);
                }
                
                #menu-trigger:checked ~ #menu-button #bar2 {
                    transform: translateX(-24px) scaleX(0);
                    opacity: 0;
                }

                #menu-button #bar3 {
                    transform-origin: left;
                }
                
                #menu-trigger:checked ~ #menu-button #bar3 {
                    transform: rotate(-45deg) translateX(-2px);
                    transform-origin: left;
                }
                
            }
        `
        styles.innerText = styles.innerText.replace('<br>', '')
        template.innerHTML = `
            <div id="resizer">
                <div class="header-container">
                    <div class="header-delimiter">
                        <div class="title-bar-container"></div>
                        <input id="menu-trigger" type="checkbox">
                        <div id="menu-overlay" class="menu-overlay"></div>
                        <div class="menu-container"><v1-simple-menu /></div>
                        <div id="menu-button">
                            <div class="bar" id="bar1"></div>
                            <div class="bar" id="bar2"></div>
                            <div class="bar" id="bar3"></div>
                        </div>
                    </div>
                </div>
                <div class="content-container"><slot></slot></div>
                <div class="footer-container"></div>
            </div>
        `
        const contentNode = template.content.cloneNode(true);
        const headerContent = `
            <div></div>
        `

        contentNode.querySelector('.title-bar-container').innerHTML = `${headerContent}${contentNode.querySelector('.title-bar-container').innerHTML}`
        contentNode.querySelector('.footer-container').innerHTML = `
        
        <footer>
            <div class="contact-info">
                <p>Dirección: Calle Principal, Ciudad</p>
                <p>Teléfono: (123) 456-7890</p>
                <p>Email: info@rainbowimpresiones.com</p>
            </div>
            <div class="social-links">
                <!-- Agrega aquí enlaces a tus redes sociales -->
            </div>
        </footer>
        `



        const menu = contentNode.querySelector('v1-simple-menu')

        const menuButton = contentNode.querySelector('#menu-button')
        const menuOverlay = contentNode.querySelector('#menu-overlay')
        const inputTrigger = contentNode.querySelector('#menu-trigger')
        const resizer = contentNode.querySelector('#resizer')

        v1config.menuOptions.forEach(opt => {
            const button = document.createElement('v1-simple-menu-button')
            button.innerText = `${opt.label}`
            button.onclick = () => {
                opt.onClick()
                inputTrigger.checked = !inputTrigger.checked
            }
            menu.append(button)
        });

        menuOverlay.onclick = () => {
            inputTrigger.checked = !inputTrigger.checked
        }
        menuButton.onclick = () => {
            inputTrigger.checked = !inputTrigger.checked
        }

        getWidthOnResize(document.body, (width) => {
            const resizeViewType = width < v1config.breakpoint
                ? "mobile"
                : "desktop"
            if (v1config.currentViewType !== resizeViewType) {
                v1config.currentViewType = resizeViewType
                if (resizer) {
                    return resizer.className = resizeViewType
                }
            }
        })

        this.shadow.append(styles, contentNode);
    }

}

customElements.define('v1-web-layout', V1WebLayout);

class V1SimpleMenu extends HTMLElement {
    static observedAttributes = ["direction"];


    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.styles = document.createElement('style')
        this.direction = this.getAttribute('direction');
        this.styles.innerText = `
            ul {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: ${this.direction || 'row'}; 
            }
        `
        this.shadow.innerHTML = `
            <ul></ul>
        `;
        this.shadow.prepend(this.styles)
    }

    connectedCallback() {
        let currentViewType = v1config.currentViewType
        getWidthOnResize(document.body, (width) => {
            const resizeViewType = width < v1config.breakpoint ? "mobile" : "desktop"
            if (currentViewType !== resizeViewType) {
                currentViewType = resizeViewType
                if (width < v1config.breakpoint) {
                    this.setAttribute('direction', 'column')
                } else {
                    this.setAttribute('direction', 'row')
                }
            }
        })
        const buttons = this.querySelectorAll('v1-simple-menu-button');
        const ul = this.shadow.querySelector('ul')
        buttons.forEach(button => {
            const li = document.createElement('li')
            if (window.location.pathname.replace('/', '') === button.innerText.replace('home', '')) {
                li.classList.add('active')
            }
            li.append(button)
            ul.append(li)
        });


        window.addEventListener('popstate', function (event) {

            buttons.forEach(button => {
                if (window.location.pathname.replace('/', '') === button.innerText.replace('home', '')) {
                    button.parentElement.classList.add('active')
                } else {
                    button.parentElement.classList.remove('active')
                }
            });


        });

    }

    attributeChangedCallback(e) {
        this.updateComponent(e)
    }

    updateComponent() {
        this.styles.innerText = `
            ul {
                padding: 0;
                list-style: none;
                margin: 0;
                display: flex;
                flex-direction: ${this.getAttribute('direction') || 'row'}; 
            }
           
            
            ${this.getAttribute('direction') !== 'row'
                ? `
                    li {
                        border-bottom: 1px solid var(--primaryColor);
                    }
                    li.active {
                        background: rgba(0,0,0,.05);
                    }
                `
                : `
                    li.active {
                        border-bottom: 3px solid var(--primaryColor);
                    }
                `};
            
        `
    }

    renderComponent() {


    }




}

customElements.define('v1-simple-menu', V1SimpleMenu);

class V1SimpleMenuButton extends HTMLElement {
    static observedAttributes = ["direction"];


    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: "open" });
        this.shadow.innerHTML = `
            <style>
                button {
                    background: none;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 40px;
                    border: none;
                    padding: 8px;
                    color: var(--textColor);
                }
            </style>
            <button>
                <slot></slot>
            </button>
        `;
    }
}

customElements.define('v1-simple-menu-button', V1SimpleMenuButton);




class ParallaxBackground extends HTMLElement {
    static get observedAttributes() {
        return ['scroll-position'];
    }
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        setTimeout(() => {
            this.render();
        }, 10);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'scroll-position') {
            this.updateParallax();
        }
    }


    render() {
        const offsetHeight = this.offsetHeight

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    position: relative;
                    width: 100%;
                }
                .paralax-section {
                    display: flex;
                    width: 100%;
                    justify-content: center;
                    align-items: center;
                }
                
                
                img {
                    left:0;
                    top:0;
                    position: absolute;
                    object-fit: cover;
                    width: 100%;
                    height: 100%;
                }
                .slot-container {
                    position: relative;
                    z-index:1;
                    width: 100%;
                    height: 100%;
                    max-width: ${v1config.maxWidth}px;
                }
            </style>

            <div class="paralax-section">
                <div class="slot-container">
                    <slot></slot>
                </div>
            </div>
        `;

        const parallax = document.createElement('img')
        parallax.src = this.getAttribute('parallax-image')
        this.shadowRoot.querySelector('.paralax-section').prepend(parallax)
        this.updateParallax()

    }

    updateParallax() {
        const parallax = this.shadowRoot.querySelector('img')
        const parallaxFactor = Math.abs(Number(this.getAttribute('parallax-factor'))) < 1 ? Math.abs(Number(this.getAttribute('parallax-factor'))) : 1
        const viewPortHeight = document.body.offsetHeight
        const offsetTop = this.offsetTop
        const offsetHeight = this.offsetHeight
        const scrollPosition = Number(Number(this.getAttribute('scroll-position')).toFixed(0))
        if (
            parallaxFactor < 1
        ) {
            parallax.style.transform = `translateY(${((scrollPosition - offsetTop) * parallaxFactor) * ((offsetHeight / viewPortHeight))}px)`;
            parallax.style.minHeight = `calc(${offsetHeight + (offsetHeight * parallaxFactor)}px)`;
        } else {
            parallax.style.transform = `translateY(${((scrollPosition - offsetTop) * parallaxFactor)}px)`;
            parallax.style.minHeight = `100vh`;
        }
    }
}

customElements.define('parallax-background', ParallaxBackground);

class ParallaxContent extends HTMLElement {
    static get observedAttributes() {
        return ['scroll-position'];
    }
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        setTimeout(() => {
            this.render();
        }, 10);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'scroll-position') {
            this.updateParallax();
        }
    }


    render() {
        const offsetHeight = this.offsetHeight

        this.shadowRoot.innerHTML = `
            <style>
                
            </style>

            <div class="slot-container">
                <slot></slot>
            </div>
        `;

        this.updateParallax()

    }

    updateParallax() {
        const parallax = this.shadowRoot.querySelector('.slot-container')
        const parallaxFactor = Math.abs(Number(this.getAttribute('parallax-factor'))) < 1 ? Math.abs(Number(this.getAttribute('parallax-factor'))) : 1
        const viewPortHeight = document.body.offsetHeight
        const offsetTop = this.offsetTop
        const offsetHeight = this.offsetHeight
        const scrollPosition = Number(Number(this.getAttribute('scroll-position')).toFixed(0))

        const isOnScreen = (scrollPosition + viewPortHeight > ( offsetTop - ((viewPortHeight/2) * parallaxFactor))) 
            && (offsetTop + offsetHeight > scrollPosition)
       
        if (isOnScreen ) {
            this.translatePosition = (scrollPosition - offsetTop) + offsetHeight
            parallax.style.visibility = "visible"
            parallax.style.transform = `translateY(-${this.translatePosition * parallaxFactor}px)`.replace('--', '');
        } else {
            parallax.style.transform = `translateY(0)`;
            parallax.style.visibility = "hidden"
        }
    }
}

customElements.define('parallax-content', ParallaxContent);




customElements.define('cover-section', class extends HTMLElement {
    constructor() {
        super();



    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' });

        const template = document.createElement('template');

        template.innerHTML = `
        <style>
          .tint {
            background: rgb(0, 0, 0);
            background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9 ) 50%, rgba(0,0,0,0) 100%); 
            padding: 32px;
            min-height: 350px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          h1 {
            font-size: 5em;
            margin: 0;
            z-index: 1;
            color: var(--titleColor);
            text-shadow: var(--primaryColor) 1px 1px 0;
          }

          h2 {
            font-size: 1.5em;
            margin-top: 10px;
            z-index: 1;
            text-shadow: var(--primaryColor) 1px 1px 0;
            color: var(--subtitleColor);
            margin-bottom: 30px;
            overflow: hidden;
          }

          .row {
            margin-top: 30px;
            flex-wrap: wrap;
            gap: 16px;
            z-index: 1;
            display: flex;
            justify-content: flex-end;
          }

          .cto {
            padding: 10px 20px;
            font-size: 1em;
            margin: 0px;
            cursor: pointer;
          }

          .primary {
            background-color: var(--primaryColor);
            color: var(--textColor);
            border: none;
          }

          .secondary {
            color: var(--backgroundAccentColor);
            background-color: transparent;
            border: 1px solid var(--backgroundAccentColor);
          }
          @media screen and (max-width: ${v1config.breakpoint}px) {
            h1 {
                font-size: 3em;
            }
          h2 {
              font-size: 1.2em;
          }
          .primary {
            flex: 1;
            white-space: nowrap;
        }
        .secondary {
            flex: 1;
            white-space: nowrap;
        }

        }
        </style>

        <div class="tint">
          <h1 class="title"></h1>
          <h2 class="subtitle"></h2>
          <div class="row">
              <button class="cto primary"></button>
              <button class="cto secondary"></button>

          </div>
        </div>
      `;

        shadow.appendChild(template.content.cloneNode(true));
        this.titleElement = shadow.querySelector('.title');
        this.subtitleElement = shadow.querySelector('.subtitle');
        this.primaryButton = shadow.querySelector('.primary');
        this.secondaryButton = shadow.querySelector('.secondary');

        this.primaryClick = this.getAttribute('primary-click');
        this.primaryClick = new Function(this.primaryClick);
        this.primaryButton.onclick = this.primaryClick;

        this.secondaryClick = this.getAttribute('secondary-click');
        this.secondaryClick = new Function(this.secondaryClick);
        this.secondaryButton.onclick = this.secondaryClick;

        this.titleElement.textContent = this.getAttribute('title');
        this.subtitleElement.textContent = this.getAttribute('subtitle');
        this.primaryButton.textContent = this.getAttribute('primary-button-text');
        this.secondaryButton.textContent = this.getAttribute('secondary-button-text');
    }
});



class ColumnLayout extends HTMLElement {
    constructor() {
        super();

        // Create a shadow root
        this.attachShadow({ mode: 'open' });

        // Define the HTML content and styles
        this.shadowRoot.innerHTML = `
        <style>
        :host {
            width: 100%;
      
            display: flex;
            flex-direction: column;
          }
        </style>
          <slot></slot>
      `;
    }
}

// Define the custom element
customElements.define('column-layout', ColumnLayout);

class RowLayout extends HTMLElement {
    constructor() {
        super();

        // Create a shadow root
        this.attachShadow({ mode: 'open' });

        // Define the HTML content and styles
        this.shadowRoot.innerHTML = `
        <style>
        :host {
            width: 100%;
            display: flex;
            justify-content: center;
        }
          slot {
            flex: 1;
            display: flex;
            max-width: ${v1config.maxWidth}px;
            gap: 16px;
            flex-wrap: wrap;
          }
        </style>
        <slot></slot>
      `;
    }
}

// Define the custom element
customElements.define('row-layout', RowLayout);

class HeadingText extends HTMLElement {
    constructor() {
      super();

      // Create a shadow root
      this.attachShadow({ mode: 'open' });

      const headingSize = this.getAttribute('heading-size');
      const position = this.getAttribute('position');
      const color = this.getAttribute('color');

      // Define the HTML content and styles
      this.shadowRoot.innerHTML = `
        <style>
            h1,h2,h3,h4,h5 {
                margin: 0;
                padding: 0;
            }
            ${headingSize} {
                display: flex;
                text-align: ${position === "flex-end" ? 'right' : position === 'center' ? 'center' : 'left' };
                align-items: center;
                justify-content: ${position || 'flex-start'};
                color: ${color || 'var(--titleTextColor)'};
                text-shadow: var(--primaryColor) 1px 1px 0;
                gap: 8px;
            }
        </style>
        <${headingSize}>
          <slot></slot>
        </${headingSize}>
      `;
    }

   
  }

  // Define the custom element
  customElements.define('heading-text', HeadingText);


class ParragraphText extends HTMLElement {
    constructor() {
      super();

      // Create a shadow root
      this.attachShadow({ mode: 'open' });

      const headingSize = this.getAttribute('heading-size');
      const position = this.getAttribute('position');
      const color = this.getAttribute('color');

      // Define the HTML content and styles
      this.shadowRoot.innerHTML = `
        <style>
            p {
                margin: 0;
                padding: 0;
                display: flex;
                text-align: ${position === "flex-end" ? 'right' : position === 'center' ? 'center' : 'left' };
                align-items: center;
                justify-content: ${position || 'flex-start'};
                color: ${color || 'var(--textColor)'};
            }
        </style>
        <p>
          <slot></slot>
        </p>
      `;
    }

   
  }

  // Define the custom element
  customElements.define('parragraph-text', ParragraphText);


  class AccordionItem extends HTMLElement {
    constructor() {
        super();

        const shadow = this.attachShadow({ mode: 'open' });

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                * {
                    box-sizing: border-box;
                }
                .accordion-item-container {
                    display: flex;
                    flex-direction: column;
                }

                parragraph-text {
                    visibility: hidden;
                    padding: 16px;
                    display: flex;
                    height: 0;
                    opacity: 0;
                    transition: all ease-in-out .3s;
                    transform: translateY(-10px);
                    overflow: hidden;
                    margin-bottom: -32px;
                    max-height: 0px;
                }

                input:checked ~ parragraph-text {
                    visibility: visible;
                    opacity: 1;
                    transform: translateY(0);
                    height: 100%;
                    margin-bottom: 0;
                    max-height: 250px;
                }

                .label {
                    background: var(--backgroundSecondaryColor);
                    display: flex;
                    padding: 16px;
                    justify-content: space-between;
                    color: var(--textColor);
                    cursor: pointer;
                }

                .label:hover {
                    background: rgba(255,255,255,0.1);
                }

                .label span {
                    transition: transform 0.3s;
                }

                input {
                    position: absolute;
                    visibility: hidden;
                }

                input:checked ~ .label span {
                    transform: rotate(180deg);
                }

                input:checked ~ .label span {
                    transform: rotate(180deg);
                }

                accordion-item-content {
                    line-height: 1.5em;
                }
            </style>
            <label class="accordion-item-container">
                <input type="radio" name="${this.getAttribute('name')}" id="${this.getAttribute('name')}">
                <div class="label">
                    <span>▼</span>
                </div>
                <parragraph-text>
                    <slot></slot>
                </parragraph-text>
            </label>
        `;

        shadow.appendChild(template.content.cloneNode(true));
        const label = shadow.querySelector('.label');
        const parragraph = shadow.querySelector('parragraph-text');
        Array.from(this.children).forEach(node => {
            if (node.tagName === "ACCORDION-ITEM-TITLE") {
                label.prepend(node)
            }
            if (node.tagName === "ACCORDION-ITEM-CONTENT") {
                parragraph.append(node)
            }

        });


        // this.shadowRoot.querySelector('input').addEventListener('blur', (e) => {
        //     console.log(e.target);
        //     const input = this.shadowRoot.querySelector('input');
        //     console.log('blur ?');
        //     input.checked = false;
        //     this.isOpened = input.checked
        // });

        this.shadowRoot.querySelector('input').onclick = (e) => {
            //     if (this.isOpened ) {

            e.preventDefault()
            //     }
            //     const input = this.shadowRoot.querySelector('input');
            //     if (this.isOpened) {
            //         input.checked = false;
            //     } 
            //     this.isOpened = input.checked
        };

        document.addEventListener('mouseup', (event) => {
            console.log(event.target);
            const currentName = this.getAttribute('name')
            const input = this.shadowRoot.querySelector('input');
            const isInsideAccordion = this.contains(event.target); // Verificar si el clic está dentro del componente
            if (event.target.tagName === "ACCORDION-ITEM") {
                if (currentName === event.target.getAttribute('name')) {

                    console.log(input.checked, this.isOpen);
                    if (!input.checked) {

                        input.checked = true
                    } else {
                        input.checked = false

                    }
                    // this.isOpen = true
                } else {
                     input.checked = false
                    // this.isOpen = false
                }
            }


        });
    }
}

customElements.define('accordion-item', AccordionItem);