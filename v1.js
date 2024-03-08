let v1config


export const initScrollIntegration = () => {
    window.addEventListener('scroll', function () {
        const allScrollAwareComponents = []
        allScrollAwareComponents.push(...document.querySelectorAll('parallax-background')) 
        allScrollAwareComponents.push(...document.querySelectorAll('parallax-content')) 
        allScrollAwareComponents.push(...document.querySelectorAll('lazy-load')) 
        allScrollAwareComponents.forEach((parallax) => parallax.setAttribute('scroll-position', window.scrollY))
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

export const initV1 = async (config) => {

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
                background: var(--primaryColor);
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
                background: var(--backgroundSecondaryColor);
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
                color: var(--textSecondaryColor);
                padding: 32px;
                display: flex;
                justify-content: space-between;
                flex-direction: column;
                align-items: center;
            }

            footer a {
                color: white;
            }
            .contact-info {
                gap: 8px;
                display: flex;
                flex-wrap: wrap;
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
            <p>&copy; 2024 Rainbow Design | <a href="mailto:consorcio.rainbow@gmail.com">consorcio.rainbow@gmail.com</a> | 9991 43 70 13</p>
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
                    }
                    li.active {
                        background: rgba(0,0,0,.05);
                    }
                `
                : `
                    li.active {
                        border-bottom: 3px solid var(--accentColor);
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
            this.translatePosition = ((scrollPosition - offsetTop)/2 )
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
            max-width: 800px;
            color: white;
            text-shadow: var(--primaryColor) 1px 1px 0;
          }

          h2 {
            font-size: 1.5em;
            margin-top: 10px;
            z-index: 1;
            text-shadow: var(--primaryColor) 1px 1px 0;
            color: var(--accentColor);
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
            background-color: var(--accentColor1);
            color: var(--primaryColor);
            border: none;
          }

          .secondary {
            color: var(--accentColor1);
            border: 1px solid var(--accentColor1);
            background-color: var(--primaryColor);
          }
          .cto p {
              margin: 0;
              padding: 0;
          }

          .secondary p {
            background-image: linear-gradient(90deg, rgba(255,229,0,1) 0%, rgba(0,255,194,1) 25%, rgba(96,0,255,1) 50%, rgba(246,0,255,1) 75%, rgba(255,0,0,1) 100%);
            color: transparent;
            background-clip: text;
            -webkit-background-clip: text; /* Necesario para algunos navegadores WebKit */
            text-fill-color: transparent;
            background-color: var(--primaryColor);
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
              <button class="cto primary"><p></p></button>
              <button class="cto secondary"><p></p></button>
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
        this.primaryButton.querySelector('p').textContent = this.getAttribute('primary-button-text');
        this.secondaryButton.querySelector('p').textContent = this.getAttribute('secondary-button-text');
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

class StaticGallery extends HTMLElement {
    constructor() {
        super();

        // Crear un shadow DOM
        this.attachShadow({mode: 'open'});

        // Obtener los atributos del elemento
        const imageUrls = this.getAttribute('image-urls');

        // Convertir la cadena JSON de los atributos en un array
        this.imageUrlsArray = JSON.parse(imageUrls);

        this.title = this.getAttribute('title')
        // Renderizar la lista de imágenes
        this.render();
    }

    connectedCallback() {
        // Agregar evento de clic a cada imagen
        this.shadowRoot.querySelectorAll('img').forEach((img, index) => {
            img.addEventListener('click', () => this.showImageInModal(index));
        });
    }

    // Método para renderizar la lista de imágenes
    render() {
        const style = document.createElement('style');
        const ul = document.createElement('ul');

        style.innerText = `
            * {
                margin: 0;
                padding: 0;
            }
            :host {
                max-width: 1200px;
                align-self: center;
                padding: 24px;
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            ul {
                display: flex;
                flex-wrap: wrap;
                list-style: none;
                gap: 24px;
                align-content: center;
            }
            li {
                cursor: pointer;
                border: 8px solid var(--secondaryColor);
                border-radius: 4px;
                flex: 1;
                min-width: 350px;
                width: calc((100% / 3) - 32px);
                max-height: 350px;
            }
            li img {
                height: 100%;
                width: 100%;
                object-fit: cover;
            }
            heading-text {
                font-size: 32px;
                padding-top: 24px;
                align-self: center;
            }
        `;

        this.shadowRoot.innerHTML = `
            <heading-text heading-size="h2">Galerìa</heading-text>
        `

        this.imageUrlsArray.forEach(url => {
            const li = document.createElement('li');
            const img = document.createElement('img');
            img.src = url;
            li.appendChild(img);
            ul.appendChild(li);
        });

        const title = document.createElement('heading-text');


        // Adjuntar la lista al shadow DOM
        this.shadowRoot.append(style, title, ul);
    }

    // Método para mostrar la imagen en pantalla completa
    showImageInModal(index) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '1000';

        const img = document.createElement('img');
        img.src = this.imageUrlsArray[index];
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.objectFit = 'contain';

        // Cerrar modal al hacer clic fuera de la imagen
        modal.addEventListener('click', () => modal.remove());

        modal.appendChild(img);
        document.body.appendChild(modal);
    }
}

// Registrar el custom element
customElements.define('static-gallery', StaticGallery);

class LazyLoad extends HTMLElement {
    static get observedAttributes() {
        return ['scroll-position'];
    }

    constructor() {
      super();
      this.attachShadow({mode: 'open'});
      this.isVisible = false;
      this.hasLoaded = false;
      this.delay = this.getAttribute('delay') || 500
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.hasLoaded) return
        if (name === 'scroll-position') {
            const scrollPosition = Number(newValue)
            const viewPortHeight = document.body.offsetHeight
            const position = this.offsetTop
            const lazyComponentHeight =  Number(this.offsetHeight)
            const isVisible = 
                (( viewPortHeight - lazyComponentHeight + scrollPosition ) > position)
                    && (( viewPortHeight + lazyComponentHeight + scrollPosition ) < (position + viewPortHeight))
            if ( isVisible) {
                this.hasLoaded = true;
                console.table({isVisible});
                this.render();
            }
            
        }
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>
            @keyframes slideIn {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            :host {
                animation: slideIn 0.5s ${this.delay/1000}s ease-in-out forwards;
                opacity: 0;
                color: white;
            }
            
        </style>

        <slot />
      `;
      
    }
  }

  customElements.define('lazy-load', LazyLoad);

  class CustomerTestimonialCard extends HTMLElement {
    constructor() {
      super();

      // Establece el shadow DOM
      this.attachShadow({ mode: 'open' });

      // Obtiene el texto del atributo 'testimonial'
      const testimonialText = this.getAttribute('testimonial');

      // Crea la estructura y estilos del componente
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: 'Arial', sans-serif;
            max-width: 400px;
            margin: 20px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            background-color: #f9f9f9;
            text-align: center;
            background-image: url("data:image/svg+xml, <svg xmlns="http://www.w3.org/2000/svg" width="35.584" height="30.585" transform="scale(5)"><rect x="0" y="0" width="100%" height="100%" fill="hsla(0, 0%, 100%, 0)"/><path d="M36.908 9.243c-5.014 0-7.266 3.575-7.266 7.117 0 3.376 2.45 5.726 5.959 5.726 1.307 0 2.45-.463 3.244-1.307.744-.811 1.125-1.903 1.042-3.095-.066-.811-.546-1.655-1.274-2.185-.596-.447-1.639-.894-3.162-.546-.48.1-.778.58-.662 1.06.1.48.58.777 1.06.661.695-.149 1.274-.066 1.705.249.364.265.546.645.562.893.05.679-.165 1.308-.579 1.755-.446.48-1.125.744-1.936.744-2.55 0-4.188-1.538-4.188-3.938 0-2.466 1.44-5.347 5.495-5.347 2.897 0 6.008 1.888 6.388 6.058.166 1.804.067 5.147-2.598 7.034a.868.868 0 00-.142.122c-1.311.783-2.87 1.301-4.972 1.301-4.088 0-6.123-1.952-8.275-4.021-2.317-2.218-4.7-4.518-9.517-4.518-4.094 0-6.439 1.676-8.479 3.545.227-1.102.289-2.307.17-3.596-.496-5.263-4.567-7.662-8.159-7.662-5.015 0-7.265 3.574-7.265 7.116 0 3.377 2.45 5.727 5.958 5.727 1.307 0 2.449-.463 3.243-1.308.745-.81 1.126-1.903 1.043-3.095-.066-.81-.546-1.654-1.274-2.184-.596-.447-1.639-.894-3.161-.546-.48.1-.778.58-.662 1.06.099.48.579.777 1.059.66.695-.148 1.275-.065 1.705.25.364.264.546.645.563.893.05.679-.166 1.307-.58 1.754-.447.48-1.125.745-1.936.745-2.549 0-4.188-1.539-4.188-3.939 0-2.466 1.44-5.345 5.495-5.345 2.897 0 6.008 1.87 6.389 6.057.163 1.781.064 5.06-2.504 6.96-1.36.864-2.978 1.447-5.209 1.447-4.088 0-6.124-1.952-8.275-4.021-2.317-2.218-4.7-4.518-9.516-4.518v1.787c4.088 0 6.123 1.953 8.275 4.022 2.317 2.218 4.7 4.518 9.516 4.518 4.8 0 7.2-2.3 9.517-4.518 2.151-2.069 4.187-4.022 8.275-4.022s6.124 1.953 8.275 4.022c2.318 2.218 4.701 4.518 9.517 4.518 4.8 0 7.2-2.3 9.516-4.518 2.152-2.069 4.188-4.022 8.276-4.022s6.123 1.953 8.275 4.022c2.317 2.218 4.7 4.518 9.517 4.518v-1.788c-4.088 0-6.124-1.952-8.275-4.021-2.318-2.218-4.701-4.518-9.517-4.518-4.103 0-6.45 1.683-8.492 3.556.237-1.118.304-2.343.184-3.656-.497-5.263-4.568-7.663-8.16-7.663z" stroke-width="1" stroke="none" fill="hsla(47, 78%, 49%, 1)"/><path d="M23.42 41.086a.896.896 0 01-.729-.38.883.883 0 01.215-1.242c2.665-1.887 2.764-5.23 2.599-7.034-.38-4.187-3.492-6.058-6.389-6.058-4.055 0-5.495 2.88-5.495 5.346 0 2.4 1.639 3.94 4.188 3.94.81 0 1.49-.265 1.936-.745.414-.447.63-1.076.58-1.755-.017-.248-.2-.629-.547-.893-.43-.315-1.026-.398-1.704-.249a.868.868 0 01-1.06-.662.868.868 0 01.662-1.059c1.523-.348 2.566.1 3.161.546.729.53 1.209 1.374 1.275 2.185.083 1.191-.298 2.284-1.043 3.095-.794.844-1.936 1.307-3.244 1.307-3.508 0-5.958-2.35-5.958-5.726 0-3.542 2.25-7.117 7.266-7.117 3.591 0 7.663 2.4 8.16 7.663.347 3.79-.828 6.868-3.344 8.656a.824.824 0 01-.53.182zm0-30.585a.896.896 0 01-.729-.38.883.883 0 01.215-1.242c2.665-1.887 2.764-5.23 2.599-7.034-.381-4.187-3.493-6.058-6.389-6.058-4.055 0-5.495 2.88-5.495 5.346 0 2.4 1.639 3.94 4.188 3.94.81 0 1.49-.266 1.936-.746.414-.446.629-1.075.58-1.754-.017-.248-.2-.629-.547-.894-.43-.314-1.026-.397-1.705-.248A.868.868 0 0117.014.77a.868.868 0 01.662-1.06c1.523-.347 2.566.1 3.161.547.729.53 1.209 1.374 1.275 2.185.083 1.191-.298 2.284-1.043 3.095-.794.844-1.936 1.307-3.244 1.307-3.508 0-5.958-2.35-5.958-5.726 0-3.542 2.25-7.117 7.266-7.117 3.591 0 7.663 2.4 8.16 7.663.347 3.79-.828 6.868-3.344 8.656a.824.824 0 01-.53.182zm29.956 1.572c-4.8 0-7.2-2.3-9.517-4.518-2.151-2.069-4.187-4.022-8.275-4.022S29.46 5.486 27.31 7.555c-2.317 2.218-4.7 4.518-9.517 4.518-4.8 0-7.2-2.3-9.516-4.518C6.124 5.486 4.088 3.533 0 3.533s-6.124 1.953-8.275 4.022c-2.317 2.218-4.7 4.518-9.517 4.518-4.8 0-7.2-2.3-9.516-4.518-2.152-2.069-4.188-4.022-8.276-4.022V1.746c4.8 0 7.2 2.3 9.517 4.518 2.152 2.069 4.187 4.022 8.275 4.022s6.124-1.953 8.276-4.022C-7.2 4.046-4.816 1.746 0 1.746c4.8 0 7.2 2.3 9.517 4.518 2.151 2.069 4.187 4.022 8.275 4.022s6.124-1.953 8.275-4.022c2.318-2.218 4.7-4.518 9.517-4.518 4.8 0 7.2 2.3 9.517 4.518 2.151 2.069 4.187 4.022 8.275 4.022s6.124-1.953 8.275-4.022c2.317-2.218 4.7-4.518 9.517-4.518v1.787c-4.088 0-6.124 1.953-8.275 4.022-2.317 2.234-4.717 4.518-9.517 4.518z" stroke-width="1" stroke="none" fill="hsla(340, 0%, 0%, 1)"/></svg>")

          }

          p {
            font-size: 16px;
            margin: 0;
            color: #333;
          }

          .quote {
            font-style: italic;
            color: #888;
            margin-top: 10px;
          }

          .author {
            margin-top: 20px;
            font-weight: bold;
            color: #555;
          }
        </style>
        <div>
          <p><slot/></p>
          <div class="quote">"</div>
          <div class="author">- cliente satisfecho </div>
        </div>
      `;
    }
  }
  customElements.define('customer-testimonial-card', CustomerTestimonialCard);
  class CustomerTestimonial extends HTMLElement {
    constructor() {
      super();

      // Establece el shadow DOM
      this.attachShadow({ mode: 'open' });

      // Testimonios de ejemplo
      const testimonials = [  
          "El trabajo que realizan es de muy buena calidad, cumplen con los tiempos e incluso me han entregado mucho antes. La atención es personalizada y agradable"            ,
          "Excelente servicio, trabajos de calidad.... entregan en tiempo y forma. La atención siempre muy amable y pacientes :).  1000% recomendados.",
          "Excelente servicio y producto, muy puntuales en la entrega y de excelente calidad los recomiendo ampliamente.",
      ];

      // Crea la estructura y estilos del componente
      this.shadowRoot.innerHTML = `
        <style>
          * {
              padding: 0;
              margin: 0;
          }
          :host {
            display: flex;
            padding: 24px;
            background-color: rgb(24, 24, 24);
            justify-content: center;
          }

          .testimonial-card {
            padding: 15px;
            border-left: 5px solid var(--accentColor2);
            border-radius: 8px;
            background-color: #fff;
            text-align: left;
            width: 80%;
            display: flex;
            flex-direction: column;
          }
          
          .testimonial-card:nth-of-type(2n) {
              align-self: flex-end;
          }

          .quote {
            font-style: italic;
            color: #888;
          }

          .author {
            margin-top: 10px;
            font-weight: bold;
            color: #555;
          }
          heading-text {
              font-size: 24px;
              padding: 24px;
              background: rgba(87, 76, 122, 0.4);
              padding: 32px;
              border-radius: 8px;
              backdrop-filter: blur(2px);
          }
          .testimonial-container {
              width: 100%;
              max-width: var(--maxWidth);
              display:flex;
              flex-direction: column;
              gap: 64px;
              margin-top: 32px;
              padding-bottom: 64px;
          }
          .testimonial-container parragraph-text {
              font-size: 16px;
              line-height: 24px;
              font-weight: 600;
              letter-spacing: 1px;
              font-style: italic;
          }
        </style>
        <div>
          <heading-text heading-size="h2">Testimonios de Nuestros Clientes</heading-text>
          <div class="testimonial-container">
              ${testimonials.map((testimonial, index) => `
                <div class="testimonial-card">
                  <parragraph-text color="var(--accentColor2)" style="align-self: center; font-size: 32px">❝ ❞</parragraph-text>
                  <parragraph-text color="var(--accentColor3)" >${testimonial}</parragraph-text>
                  <parragraph-text color="var(--accentColor2)" class="author">- Cliente Satisfecho</parragraph-text>
                </div>
              `).join('')}
          </div>
        </div>
      `;
    }
  }
  customElements.define('customer-testimonial', CustomerTestimonial);