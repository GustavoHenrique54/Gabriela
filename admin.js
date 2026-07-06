/**
 * Visual Portfolio Editor & Site Builder
 * Injected on all pages to enable inline editing, design configuration, and site export/GitHub sync.
 */

(function () {
  // Config
  const ADMIN_PASSWORD = "gabriela2026";
  const STORAGE_PREFIX = "portfolio_site_";
  
  // Safe Storage Wrapper (fixes Chrome security exceptions on file:/// protocol)
  const safeStorage = {
    isAvailable: function() {
      try {
        localStorage.setItem(STORAGE_PREFIX + "test", "test");
        localStorage.removeItem(STORAGE_PREFIX + "test");
        return true;
      } catch (e) {
        return false;
      }
    },
    getItem: function(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    setItem: function(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
    removeItem: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // State
  let storageSupported = safeStorage.isAvailable();
  let isAdminLoggedIn = safeStorage.getItem(STORAGE_PREFIX + "logged_in") === "true";
  let isEditMode = false;

  // Image compressor helper function
  function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, width, height); // Support transparency
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = isPng ? "image/png" : "image/jpeg";
        const dataUrl = isPng ? canvas.toDataURL(mimeType) : canvas.toDataURL(mimeType, quality);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Reorder and sort helpers for work page (supports different desktop and mobile order)
  function restoreOrderFromStorage() {
    const dtOrderStr = safeStorage.getItem(STORAGE_PREFIX + "paintings_order_dt");
    const mbOrderStr = safeStorage.getItem(STORAGE_PREFIX + "paintings_order_mb");
    
    if (dtOrderStr) {
      const dtOrder = JSON.parse(dtOrderStr);
      dtOrder.forEach((href, index) => {
        const matched = document.querySelector(`.portfolio-item[href="${href}"]`);
        if (matched) matched.setAttribute("data-order-dt", index + 1);
      });
    }
    
    if (mbOrderStr) {
      const mbOrder = JSON.parse(mbOrderStr);
      mbOrder.forEach((href, index) => {
        const matched = document.querySelector(`.portfolio-item[href="${href}"]`);
        if (matched) matched.setAttribute("data-order-mb", index + 1);
      });
    }
  }

  function initializeOrderAttributes() {
    const items = document.querySelectorAll(".portfolio-item");
    items.forEach((item, index) => {
      if (!item.hasAttribute("data-order-dt")) {
        item.setAttribute("data-order-dt", index + 1);
      }
      if (!item.hasAttribute("data-order-mb")) {
        item.setAttribute("data-order-mb", index + 1);
      }
    });
  }

  let isSortingActive = false;
  function sortPortfolioGrid() {
    if (isSortingActive) return;
    const grid = document.querySelector(".portfolio-grid");
    if (!grid) return;
    
    isSortingActive = true;
    const isMobile = window.innerWidth <= 900;
    const items = Array.from(grid.querySelectorAll(".portfolio-item"));
    
    items.sort((a, b) => {
      const ordA = parseInt(a.getAttribute(isMobile ? "data-order-mb" : "data-order-dt")) || 999;
      const ordB = parseInt(b.getAttribute(isMobile ? "data-order-mb" : "data-order-dt")) || 999;
      return ordA - ordB;
    });
    
    items.forEach(item => grid.appendChild(item));
    isSortingActive = false;
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    hideLoadingOverlay(); // Ensure any leftover loading overlay is removed early
    applySavedDesign();
    applySavedContent();
    
    if (window.location.pathname.endsWith("work.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/")) {
      restoreOrderFromStorage();
      initializeOrderAttributes();
      sortPortfolioGrid();
      window.addEventListener("resize", sortPortfolioGrid);
    }
    
    injectFloatingLock();
    
    if (isAdminLoggedIn) {
      activateAdminToolbar();
    }
  });

  // 1. Design Management
  const designVariables = {
    "--bg-color": "#fcfcfc",
    "--text-color": "#575757",
    "--title-color": "#111111",
    "--font-serif": "'Bellefair', serif",
    "--font-sans": "'Montserrat', sans-serif",
    "--grid-gap": "80px"
  };

  function applySavedDesign() {
    Object.keys(designVariables).forEach(variable => {
      const saved = safeStorage.getItem(STORAGE_PREFIX + "design_" + variable);
      if (saved) {
        document.documentElement.style.setProperty(variable, saved);
      }
    });
  }

  function saveDesignVariable(variable, value) {
    const success = safeStorage.setItem(STORAGE_PREFIX + "design_" + variable, value);
    document.documentElement.style.setProperty(variable, value);
    if (!success && isEditMode) {
      showStorageWarning();
    }
  }

  // 2. Content Persistence
  function getPageKey() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    return STORAGE_PREFIX + "content_" + page;
  }

  function applySavedContent() {
    // Apply saved global settings (Title and Favicon)
    const savedGlobalTitle = safeStorage.getItem(STORAGE_PREFIX + "global_title");
    if (savedGlobalTitle) {
      const currentTitle = document.title;
      if (currentTitle.includes("—")) {
        const parts = currentTitle.split("—");
        document.title = parts[0].trim() + " — " + savedGlobalTitle;
      } else {
        document.title = savedGlobalTitle;
      }
    }
    const savedFavicon = safeStorage.getItem(STORAGE_PREFIX + "global_favicon");
    if (savedFavicon) {
      let favLink = document.querySelector("link[rel*='icon']");
      if (!favLink) {
        favLink = document.createElement("link");
        favLink.rel = "icon";
        document.head.appendChild(favLink);
      }
      favLink.href = savedFavicon;
    }

    const pageKey = getPageKey();
    const savedTextData = safeStorage.getItem(pageKey);
    if (savedTextData) {
      const texts = JSON.parse(savedTextData);
      Object.keys(texts).forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && texts[selector]) {
          if (Array.isArray(texts[selector])) {
            elements.forEach((el, index) => {
              if (texts[selector][index] !== undefined) {
                el.innerHTML = texts[selector][index];
              }
            });
          } else {
            elements[0].innerHTML = texts[selector];
          }
        }
      });
    }

    if (window.location.pathname.endsWith("work.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/")) {
      applySavedPaintings();
      
      // Restore saved paintings order
      const savedOrderStr = safeStorage.getItem(STORAGE_PREFIX + "paintings_order");
      if (savedOrderStr) {
        const savedOrder = JSON.parse(savedOrderStr);
        const grid = document.querySelector(".portfolio-grid");
        if (grid) {
          const items = Array.from(grid.querySelectorAll(".portfolio-item"));
          savedOrder.forEach(href => {
            const matchedItem = items.find(item => item.getAttribute("href") === href);
            if (matchedItem) {
              grid.appendChild(matchedItem);
            }
          });
        }
      }
    }

    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/")) {
      const landingDataStr = safeStorage.getItem(STORAGE_PREFIX + "landing_config");
      if (landingDataStr) {
        const landingData = JSON.parse(landingDataStr);
        const videoBg = document.querySelector(".video-background");
        const imageBg = document.querySelector(".image-background");
        const enterBtn = document.querySelector(".enter-site-btn");
        const enterLink = enterBtn ? enterBtn.closest("a") : null;
        const instaLink = document.querySelector(".landing-instagram a");

        if (videoBg && landingData.videoDisplay !== undefined) videoBg.style.display = landingData.videoDisplay;
        if (videoBg && landingData.videoSrc) videoBg.src = landingData.videoSrc;
        if (imageBg && landingData.imageDisplay !== undefined) imageBg.style.display = landingData.imageDisplay;
        if (imageBg && landingData.imageSrc) imageBg.src = landingData.imageSrc;
        if (enterLink && landingData.enterHref) enterLink.setAttribute("href", landingData.enterHref);
        if (instaLink && landingData.instaHref) instaLink.setAttribute("href", landingData.instaHref);
      }
    }

    const savedImagesData = safeStorage.getItem(STORAGE_PREFIX + "images");
    if (savedImagesData) {
      const imgs = JSON.parse(savedImagesData);
      Object.keys(imgs).forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0 && imgs[selector]) {
          if (Array.isArray(imgs[selector])) {
            elements.forEach((el, index) => {
              if (imgs[selector][index]) el.src = imgs[selector][index];
            });
          } else {
            elements[0].src = imgs[selector];
          }
        }
      });
    }
  }

  function saveCurrentPageContent() {
    const pageKey = getPageKey();
    const textData = {};

    const textSelectors = [
      "h1.logo a", "h2", "p", "figcaption", "span", "li a",
      ".portfolio-title", ".image-caption", ".cv-year", ".cv-item div",
      ".enter-site-btn"
    ];

    textSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        textData[selector] = Array.from(elements).map(el => el.innerHTML);
      }
    });

    let success = safeStorage.setItem(pageKey, JSON.stringify(textData));

    if (window.location.pathname.endsWith("work.html")) {
      const items = Array.from(document.querySelectorAll(".portfolio-item"));
      const order = items.map(item => item.getAttribute("href"));
      const orderSuccess = safeStorage.setItem(STORAGE_PREFIX + "paintings_order", JSON.stringify(order));
      success = success && orderSuccess;
    }

    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/")) {
      const videoBg = document.querySelector(".video-background");
      const imageBg = document.querySelector(".image-background");
      const enterBtn = document.querySelector(".enter-site-btn");
      const enterLink = enterBtn ? enterBtn.closest("a") : null;
      const instaLink = document.querySelector(".landing-instagram a");

      const landingData = {
        videoDisplay: videoBg ? videoBg.style.display : "",
        videoSrc: videoBg ? videoBg.src : "",
        imageDisplay: imageBg ? imageBg.style.display : "",
        imageSrc: imageBg ? imageBg.src : "",
        enterHref: enterLink ? enterLink.getAttribute("href") : "",
        instaHref: instaLink ? instaLink.getAttribute("href") : ""
      };
      const landingSuccess = safeStorage.setItem(STORAGE_PREFIX + "landing_config", JSON.stringify(landingData));
      success = success && landingSuccess;
    }

    if (!success && isEditMode) {
      showStorageWarning();
    }
  }

  function showStorageWarning() {
    if (document.getElementById("adminStorageWarning")) return;

    const banner = document.createElement("div");
    banner.id = "adminStorageWarning";
    banner.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background-color: #f39c12;
      color: #fff;
      padding: 15px 20px;
      border-radius: 6px;
      max-width: 350px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.25);
      z-index: 10005;
      font-family: 'Montserrat', sans-serif;
      font-size: 12px;
      line-height: 1.5;
    `;
    banner.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
        <span>⚠️ Limitação Local</span>
        <span style="cursor: pointer; font-size: 16px;" onclick="this.parentElement.parentElement.remove()">&times;</span>
      </div>
      <div>
        Suas edições estão ativas na tela, mas o salvamento automático está desativado localmente.
        <br><br>
        <strong>Para salvar no seu site no ar:</strong>
        <ol style="margin-left: 15px; margin-top: 5px;">
          <li>Configure suas credenciais do GitHub no menu lateral.</li>
          <li>Clique em <strong>"Salvar no GitHub"</strong> para enviar as alterações diretamente para o seu repositório.</li>
        </ol>
      </div>
    `;
    document.body.appendChild(banner);
    setTimeout(() => {
      if (banner) banner.remove();
    }, 15000);
  }

  // 3. Admin UI Injection
  function injectFloatingLock() {
    if (document.getElementById("adminLockBtn")) return;

    const lockBtn = document.createElement("div");
    lockBtn.id = "adminLockBtn";
    lockBtn.className = "admin-lock-btn";
    lockBtn.setAttribute("title", "Painel do Editor");
    lockBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 2c-2.76 0-5 2.24-5 5v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1v-3c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm3 9c-.83 0-1.5-.67-1.5-1.5S11.17 13 12 13s1.5.67 1.5 1.5S12.83 16 12 16z"/>
      </svg>
    `;

    lockBtn.addEventListener("click", () => {
      if (isAdminLoggedIn) {
        toggleEditMode();
      } else {
        showLoginModal();
      }
    });

    document.body.appendChild(lockBtn);
  }

  function showLoginModal() {
    removeModals();

    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.id = "adminLoginModal";
    backdrop.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h3>Entrar no Editor</h3>
          <span style="cursor:pointer; font-size: 20px;" onclick="document.getElementById('adminLoginModal').remove()">&times;</span>
        </div>
        <div class="admin-modal-body">
          <div class="admin-setting-item">
            <label>Senha do Painel</label>
            <input type="password" id="adminPwdInput" placeholder="Digite a senha..." style="border: 1px solid #3c3c3c; background-color: #3c3c3c; color: #fff; border-radius: 4px; padding: 10px; font-size: 13px; width: 100%;">
            <p id="adminLoginError" style="color: #ff4757; font-size: 11px; display: none; margin-top: 5px;">Senha incorreta!</p>
          </div>
        </div>
        <div class="admin-modal-footer">
          <button id="adminCancelLogin">Cancelar</button>
          <button class="primary-btn" id="adminSubmitLogin">Entrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add("open"), 10);

    const submit = () => {
      const pwd = document.getElementById("adminPwdInput").value;
      if (pwd === ADMIN_PASSWORD) {
        safeStorage.setItem(STORAGE_PREFIX + "logged_in", "true");
        isAdminLoggedIn = true;
        backdrop.remove();
        activateAdminToolbar();
        toggleEditMode(true);
      } else {
        document.getElementById("adminLoginError").style.display = "block";
      }
    };

    document.getElementById("adminSubmitLogin").addEventListener("click", submit);
    document.getElementById("adminPwdInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") submit();
    });
    document.getElementById("adminCancelLogin").addEventListener("click", () => backdrop.remove());
  }

  function removeModals() {
    document.querySelectorAll(".admin-modal-backdrop").forEach(m => m.remove());
  }

  // 4. Editor Toolbar
  function activateAdminToolbar() {
    if (document.getElementById("adminToolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "adminToolbar";
    toolbar.className = "admin-topbar";
    
    const isWorkPage = window.location.pathname.endsWith("work.html");
    const isHomePage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/");
    
    const addPaintingBtnHtml = isWorkPage ? `<button id="adminAddPaintingBtn">Adicionar Obra</button>` : '';
    const homeBtnHtml = isHomePage ? `<button id="adminHomeConfigBtn">Personalizar Tela Inicial</button>` : '';

    toolbar.innerHTML = `
      <h4><span>●</span> Editor Gabriela de Souza</h4>
      <div class="btn-group">
        ${homeBtnHtml}
        ${addPaintingBtnHtml}
        <button id="adminDesignBtn">Personalizar Cores/Fontes</button>
        <button class="accent-btn" id="adminSaveGhBtn">Salvar no GitHub</button>
        <button class="danger-btn" id="adminLogoutBtn">Sair</button>
      </div>
    `;

    document.body.insertBefore(toolbar, document.body.firstChild);
    injectDesignSidebar();

    document.getElementById("adminLogoutBtn").addEventListener("click", logout);
    document.getElementById("adminDesignBtn").addEventListener("click", toggleSidebar);
    document.getElementById("adminSaveGhBtn").addEventListener("click", saveSiteToGitHub);
    
    if (isWorkPage) {
      document.getElementById("adminAddPaintingBtn").addEventListener("click", showAddPaintingModal);
    }
    if (isHomePage) {
      document.getElementById("adminHomeConfigBtn").addEventListener("click", showHomeConfigModal);
    }
  }

  function toggleEditMode(forceState) {
    isEditMode = forceState !== undefined ? forceState : !isEditMode;
    
    if (isEditMode) {
      document.body.classList.add("admin-mode-active");
      makeTextsEditable(true);
      makeImagesClickable(true);
      showGridDeletes(true);
      document.getElementById("adminLockBtn").style.backgroundColor = "#3498db";
      document.getElementById("adminLockBtn").querySelector("svg").style.fill = "#fff";
      
      if (!storageSupported) {
        showStorageWarning();
      }
    } else {
      document.body.classList.remove("admin-mode-active");
      makeTextsEditable(false);
      makeImagesClickable(false);
      showGridDeletes(false);
      document.getElementById("adminLockBtn").style.backgroundColor = "";
      document.getElementById("adminLockBtn").querySelector("svg").style.fill = "";
      saveCurrentPageContent();
    }
  }

  function makeTextsEditable(enable) {
    const textSelectors = [
      "h2", "p", "figcaption", "span", 
      ".portfolio-title", ".image-caption", ".cv-year", ".cv-item div",
      ".enter-site-btn"
    ];
    
    textSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.closest("#adminToolbar") && !el.closest("#adminLockBtn") && !el.closest("#topNav") && !el.closest("#mobileNav")) {
          el.contentEditable = enable ? "true" : "false";
          if (enable) {
            el.addEventListener("blur", saveCurrentPageContent);
          }
        }
      });
    });
  }

  function makeImagesClickable(enable) {
    const imageSelectors = [
      ".column-image img", ".portfolio-item img", "#logo img", ".landing-logo img", ".image-background"
    ];

    imageSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach((img, idx) => {
        if (enable) {
          img.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showImageEditModal(img, selector, idx);
          };
        } else {
          img.onclick = null;
        }
      });
    });
  }

  function showImageEditModal(imgEl, selector, index) {
    removeModals();
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.id = "adminImageModal";
    backdrop.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h3>Editar Imagem</h3>
          <span style="cursor:pointer; font-size: 20px;" onclick="document.getElementById('adminImageModal').remove()">&times;</span>
        </div>
        <div class="admin-modal-body">
          <div class="admin-setting-item">
            <label>URL da Imagem</label>
            <input type="text" id="adminImgUrlInput" value="${imgEl.src}">
          </div>
          <div style="text-align: center; color: #888; font-size: 12px; margin: 10px 0;">OU</div>
          <div class="admin-setting-item">
            <label>Carregar do Computador</label>
            <input type="file" id="adminImgFileInput" accept="image/*" style="border: 1px solid #3c3c3c; padding: 10px; width: 100%; color: #fff;">
          </div>
        </div>
        <div class="admin-modal-footer">
          <button onclick="document.getElementById('adminImageModal').remove()">Cancelar</button>
          <button class="primary-btn" id="adminSaveImage">Salvar</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add("open"), 10);

    let loadedBase64 = "";
    document.getElementById("adminImgFileInput").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 1200, 1200, 0.85, (compressedUrl) => {
          loadedBase64 = compressedUrl;
          document.getElementById("adminImgUrlInput").value = "Upload carregado com sucesso!";
        });
      }
    });

    document.getElementById("adminSaveImage").addEventListener("click", () => {
      const urlInput = document.getElementById("adminImgUrlInput").value;
      const finalSrc = loadedBase64 || urlInput;
      
      if (finalSrc && finalSrc !== "Upload carregado com sucesso!") {
        imgEl.src = finalSrc;
        
        const savedImages = JSON.parse(safeStorage.getItem(STORAGE_PREFIX + "images") || "{}");
        if (!savedImages[selector]) savedImages[selector] = [];
        
        const allOfSel = document.querySelectorAll(selector);
        if (allOfSel.length === 1) {
          savedImages[selector] = finalSrc;
        } else {
          if (!Array.isArray(savedImages[selector])) {
            savedImages[selector] = Array.from(allOfSel).map(el => el.src);
          }
          savedImages[selector][index] = finalSrc;
        }
        
        const success = safeStorage.setItem(STORAGE_PREFIX + "images", JSON.stringify(savedImages));
        if (!success) showStorageWarning();
      }
      backdrop.remove();
    });
  }

  // 5. Sidebar design and GitHub settings
  function injectDesignSidebar() {
    if (document.getElementById("adminSidebar")) return;

    const sidebar = document.createElement("div");
    sidebar.id = "adminSidebar";
    sidebar.className = "admin-sidebar";
    
    const bgVal = getComputedStyle(document.documentElement).getPropertyValue("--bg-color").trim() || "#fcfcfc";
    const textVal = getComputedStyle(document.documentElement).getPropertyValue("--text-color").trim() || "#575757";
    const titleVal = getComputedStyle(document.documentElement).getPropertyValue("--title-color").trim() || "#111111";
    const gapVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--grid-gap")) || 80;

    // Load GitHub values
    const ghOwner = safeStorage.getItem(STORAGE_PREFIX + "gh_owner") || "";
    const ghRepo = safeStorage.getItem(STORAGE_PREFIX + "gh_repo") || "";
    const ghToken = safeStorage.getItem(STORAGE_PREFIX + "gh_token") || "";
    const ghBranch = safeStorage.getItem(STORAGE_PREFIX + "gh_branch") || "main";

    // Load global values
    const globalTitleVal = safeStorage.getItem(STORAGE_PREFIX + "global_title") || "Gabriela de Souza";
    const globalFaviconVal = safeStorage.getItem(STORAGE_PREFIX + "global_favicon") || "https://images.squarespace-cdn.com/content/v1/591cce10bf629a201c743003/afc8b6f7-52ef-4afe-89b1-33ca5ddefca4/favicon.ico?format=100w";

    sidebar.innerHTML = `
      <h3>Configurações Globais</h3>
      
      <div class="admin-setting-item">
        <label>Título do Site (Aba)</label>
        <input type="text" id="adminGlobalTitle" value="${globalTitleVal}">
      </div>

      <div class="admin-setting-item">
        <label>URL do Favicon (.ico/.png)</label>
        <input type="text" id="adminGlobalFavicon" value="${globalFaviconVal}">
        <div style="text-align: center; color: #888; font-size: 11px; margin: 10px 0;">OU</div>
        <label>Carregar Favicon Local</label>
        <input type="file" id="adminGlobalFaviconFile" accept="image/*" style="border: 1px solid #3c3c3c; padding: 10px; width: 100%; color: #fff;">
      </div>

      <h3>Credenciais GitHub (Vercel)</h3>
      
      <div class="admin-setting-item">
        <label>Usuário GitHub</label>
        <input type="text" id="adminGhOwner" value="${ghOwner}" placeholder="ex: gabriela-souza">
      </div>

      <div class="admin-setting-item">
        <label>Nome do Repositório</label>
        <input type="text" id="adminGhRepo" value="${ghRepo}" placeholder="ex: portfolio-pinturas">
      </div>

      <div class="admin-setting-item">
        <label>Token de Acesso (PAT)</label>
        <input type="password" id="adminGhToken" value="${ghToken}" placeholder="ghp_xxxxxxxxxxxx">
      </div>

      <div class="admin-setting-item">
        <label>Branch do Repositório</label>
        <input type="text" id="adminGhBranch" value="${ghBranch}" placeholder="main">
      </div>

      <h3>Design Geral</h3>
      
      <div class="admin-setting-item">
        <label>Cor de Fundo</label>
        <input type="color" id="adminColorBg" value="${rgbaToHex(bgVal)}">
      </div>
      
      <div class="admin-setting-item">
        <label>Cor do Texto</label>
        <input type="color" id="adminColorText" value="${rgbaToHex(textVal)}">
      </div>

      <div class="admin-setting-item">
        <label>Cor dos Títulos / Menus</label>
        <input type="color" id="adminColorTitle" value="${rgbaToHex(titleVal)}">
      </div>

      <div class="admin-setting-item">
        <label>Fonte Principal (Serif)</label>
        <select id="adminFontSerif">
          <option value="'Bellefair', serif">Bellefair (Delicada)</option>
          <option value="'Playfair Display', serif">Playfair Display (Moderna)</option>
          <option value="'Lora', serif">Lora (Elegante)</option>
          <option value="Georgia, serif">Georgia (Padrão)</option>
        </select>
      </div>

      <div class="admin-setting-item">
        <label>Fonte de Detalhes (Sans-Serif)</label>
        <select id="adminFontSans">
          <option value="'Montserrat', sans-serif">Montserrat (Espaçada)</option>
          <option value="'Inter', sans-serif">Inter (Limpa)</option>
          <option value="'Outfit', sans-serif">Outfit (Arredondada)</option>
          <option value="Arial, sans-serif">Arial (Clássica)</option>
        </select>
      </div>

      <div class="admin-setting-item">
        <label>Espaçamento da Galeria (px)</label>
        <input type="number" id="adminGridGap" value="${gapVal}" min="20" max="150" step="10">
      </div>
    `;

    document.body.appendChild(sidebar);

    // Bind Global settings saving
    const titleInput = document.getElementById("adminGlobalTitle");
    titleInput.addEventListener("change", (e) => {
      const val = e.target.value.trim();
      safeStorage.setItem(STORAGE_PREFIX + "global_title", val);
      const currentTitle = document.title;
      if (currentTitle.includes("—")) {
        const parts = currentTitle.split("—");
        document.title = parts[0].trim() + " — " + val;
      } else {
        document.title = val;
      }
      saveCurrentPageContent();
    });

    const faviconInput = document.getElementById("adminGlobalFavicon");
    const updateFavicon = (url) => {
      safeStorage.setItem(STORAGE_PREFIX + "global_favicon", url);
      let favLink = document.querySelector("link[rel*='icon']");
      if (!favLink) {
        favLink = document.createElement("link");
        favLink.rel = "icon";
        document.head.appendChild(favLink);
      }
      favLink.href = url;
      saveCurrentPageContent();
    };

    faviconInput.addEventListener("change", (e) => {
      updateFavicon(e.target.value.trim());
    });

    document.getElementById("adminGlobalFaviconFile").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 64, 64, 0.9, (compressedUrl) => {
          faviconInput.value = "Upload carregado com sucesso!";
          updateFavicon(compressedUrl);
        });
      }
    });

    // Bind GitHub settings saving
    document.getElementById("adminGhOwner").addEventListener("change", (e) => safeStorage.setItem(STORAGE_PREFIX + "gh_owner", e.target.value.trim()));
    document.getElementById("adminGhRepo").addEventListener("change", (e) => safeStorage.setItem(STORAGE_PREFIX + "gh_repo", e.target.value.trim()));
    document.getElementById("adminGhToken").addEventListener("change", (e) => safeStorage.setItem(STORAGE_PREFIX + "gh_token", e.target.value.trim()));
    document.getElementById("adminGhBranch").addEventListener("change", (e) => safeStorage.setItem(STORAGE_PREFIX + "gh_branch", e.target.value.trim()));

    // Bind Design settings saving
    document.getElementById("adminColorBg").addEventListener("input", (e) => saveDesignVariable("--bg-color", e.target.value));
    document.getElementById("adminColorText").addEventListener("input", (e) => saveDesignVariable("--text-color", e.target.value));
    document.getElementById("adminColorTitle").addEventListener("input", (e) => saveDesignVariable("--title-color", e.target.value));
    
    const currentSerif = getComputedStyle(document.documentElement).getPropertyValue("--font-serif").trim();
    if (currentSerif) document.getElementById("adminFontSerif").value = currentSerif;
    document.getElementById("adminFontSerif").addEventListener("change", (e) => saveDesignVariable("--font-serif", e.target.value));

    const currentSans = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
    if (currentSans) document.getElementById("adminFontSans").value = currentSans;
    document.getElementById("adminFontSans").addEventListener("change", (e) => saveDesignVariable("--font-sans", e.target.value));

    document.getElementById("adminGridGap").addEventListener("input", (e) => saveDesignVariable("--grid-gap", e.target.value + "px"));
  }

  function toggleSidebar() {
    document.getElementById("adminSidebar").classList.toggle("open");
  }

  // 6. Work.html Painting Add/Delete
  function getCustomPaintings() {
    const list = safeStorage.getItem(STORAGE_PREFIX + "custom_paintings");
    return list ? JSON.parse(list) : [];
  }

  function applySavedPaintings() {
    const paintings = getCustomPaintings();
    if (paintings.length === 0) return;

    const grid = document.querySelector(".portfolio-grid");
    if (!grid) return;

    paintings.forEach(p => {
      if (document.querySelector(`a[href="${p.url}"]`)) return;

      const item = document.createElement("a");
      item.className = "portfolio-item";
      item.href = p.url;
      item.innerHTML = `
        <img src="${p.imgSrc}" alt="${p.title}">
        <div class="portfolio-title">${p.title}</div>
      `;
      grid.appendChild(item);
    });

    if (isEditMode) showGridDeletes(true);
  }

  function showAddPaintingModal() {
    removeModals();
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.id = "adminAddPaintingModal";
    backdrop.innerHTML = `
      <div class="admin-modal" style="max-width: 540px;">
        <div class="admin-modal-header">
          <h3>Adicionar Nova Obra de Arte</h3>
          <span style="cursor:pointer; font-size: 20px;" onclick="document.getElementById('adminAddPaintingModal').remove()">&times;</span>
        </div>
        <div class="admin-modal-body" style="max-height: 400px; overflow-y: auto;">
          <div class="admin-setting-item">
            <label>Título da Obra</label>
            <input type="text" id="newArtTitle" placeholder="Ex: Retrato de Primavera">
          </div>
          <div class="admin-setting-item">
            <label>Ano de Criação</label>
            <input type="text" id="newArtYear" placeholder="Ex: 2026">
          </div>
          <div class="admin-setting-item">
            <label>Técnica / Materiais</label>
            <input type="text" id="newArtMedium" placeholder="Ex: Óleo sobre tela">
          </div>
          <div class="admin-setting-item">
            <label>Dimensões</label>
            <input type="text" id="newArtSize" placeholder="Ex: 50 x 70 cm">
          </div>
          <div class="admin-setting-item">
            <label>URL da Imagem da Obra</label>
            <input type="text" id="newArtImgUrl" placeholder="Cole o link da imagem...">
          </div>
          <div style="text-align: center; color: #888; font-size: 11px;">OU</div>
          <div class="admin-setting-item">
            <label>Carregar Arquivo Local</label>
            <input type="file" id="newArtImgFile" accept="image/*" style="border: 1px solid #3c3c3c; padding: 10px; width: 100%; color: #fff;">
          </div>
        </div>
        <div class="admin-modal-footer">
          <button onclick="document.getElementById('adminAddPaintingModal').remove()">Cancelar</button>
          <button class="primary-btn" id="newArtSubmit">Adicionar Obra</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add("open"), 10);

    let loadedBase64 = "";
    document.getElementById("newArtImgFile").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 1200, 1200, 0.85, (compressedUrl) => {
          loadedBase64 = compressedUrl;
          document.getElementById("newArtImgUrl").value = "Upload carregado com sucesso!";
        });
      }
    });

    document.getElementById("newArtSubmit").addEventListener("click", async () => {
      const title = document.getElementById("newArtTitle").value;
      const year = document.getElementById("newArtYear").value;
      const medium = document.getElementById("newArtMedium").value;
      const size = document.getElementById("newArtSize").value;
      const urlInput = document.getElementById("newArtImgUrl").value;
      const imgSrc = loadedBase64 || urlInput;

      if (!title || !imgSrc || imgSrc === "Upload carregado com sucesso!") {
        alert("O título e a imagem são obrigatórios!");
        return;
      }

      const slug = title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newPageUrl = slug + ".html";

      const newArtObj = {
        title: title,
        year: year,
        medium: medium,
        size: size,
        imgSrc: imgSrc,
        url: newPageUrl
      };

      const currentList = getCustomPaintings();
      currentList.push(newArtObj);
      safeStorage.setItem(STORAGE_PREFIX + "custom_paintings", JSON.stringify(currentList));

      const detailPageData = {
        "h2": [title],
        "p": [year, medium, size, "Para dúvidas ou interesse, favor entrar em contato."]
      };
      safeStorage.setItem(STORAGE_PREFIX + "content_" + newPageUrl, JSON.stringify(detailPageData));

      const detailsImgs = {};
      detailsImgs[".column-right img"] = [imgSrc];
      safeStorage.setItem(STORAGE_PREFIX + "images", JSON.stringify(Object.assign(
        JSON.parse(safeStorage.getItem(STORAGE_PREFIX + "images") || "{}"),
        detailsImgs
      )));

      const grid = document.querySelector(".portfolio-grid");
      if (grid) {
        const item = document.createElement("a");
        item.className = "portfolio-item";
        item.href = newPageUrl;
        item.innerHTML = `
          <img src="${imgSrc}" alt="${title}">
          <div class="portfolio-title">${title}</div>
        `;
        grid.appendChild(item);
        if (isEditMode) showGridDeletes(true);
      }

      // Automatically try to push the new details page to GitHub so it goes live!
      const generatedPageHtml = generateCleanDetailsPageHtml(newArtObj);
      
      backdrop.remove();
      
      // Let's trigger a dynamic commit
      showLoadingOverlay("Enviando nova página para o GitHub...");
      try {
        const committed = await commitFileToGitHub(newPageUrl, generatedPageHtml, `Create ${newPageUrl} page via Visual Editor`);
        hideLoadingOverlay();
        if (committed) {
          alert(`Obra "${title}" adicionada com sucesso no grid e página criada no GitHub! Vercel atualizará o site em instantes.`);
        }
      } catch (err) {
        hideLoadingOverlay();
        // If git fails, download local fallback file
        downloadFile(newPageUrl, generatedPageHtml);
        alert(`O envio ao GitHub falhou (${err.message}). Baixamos a página detalhada (${newPageUrl}) localmente. Salve-a na pasta e suba manualmente.`);
      }
    });
  }

  function showGridDeletes(show) {
    document.querySelectorAll(".portfolio-item").forEach(item => {
      let actions = item.querySelector(".item-actions");
      
      if (!actions && show) {
        actions = document.createElement("div");
        actions.className = "item-actions";
        actions.innerHTML = `
          <button class="item-btn move-btn move-prev" title="Mover para Esquerda/Cima">←</button>
          <button class="item-btn delete-btn">Excluir</button>
          <button class="item-btn move-btn move-next" title="Mover para Direita/Baixo">→</button>
        `;
        
        actions.querySelector(".move-prev").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const prev = item.previousElementSibling;
          if (prev && prev.classList.contains("portfolio-item")) {
            item.parentNode.insertBefore(item, prev);
            saveCurrentPageContent();
          }
        });
        
        actions.querySelector(".move-next").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = item.nextElementSibling;
          if (next && next.classList.contains("portfolio-item")) {
            item.parentNode.insertBefore(item, next.nextElementSibling);
            saveCurrentPageContent();
          }
        });
        
        actions.querySelector(".delete-btn").addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (confirm("Deseja realmente remover esta obra de arte?")) {
            const href = item.getAttribute("href");
            item.remove();
            
            const currentList = getCustomPaintings();
            const updated = currentList.filter(p => p.url !== href);
            safeStorage.setItem(STORAGE_PREFIX + "custom_paintings", JSON.stringify(updated));
            safeStorage.removeItem(STORAGE_PREFIX + "content_" + href);
            saveCurrentPageContent();
          }
        });
        item.appendChild(actions);
      }
      
      if (actions) {
        actions.style.display = show ? "flex" : "none";
      }
    });
  }

  // 7. GitHub Sync Implementation
  // Helper to fetch with timeout
  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 15000 } = options; // 15 seconds timeout
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  async function saveSiteToGitHub() {
    // 1. Validate GitHub Configs
    const owner = (safeStorage.getItem(STORAGE_PREFIX + "gh_owner") || "").trim();
    const repo = (safeStorage.getItem(STORAGE_PREFIX + "gh_repo") || "").trim();
    const token = (safeStorage.getItem(STORAGE_PREFIX + "gh_token") || "").trim();
    const branch = (safeStorage.getItem(STORAGE_PREFIX + "gh_branch") || "main").trim();

    if (!owner || !repo || !token) {
      alert("Por favor, abra 'Personalizar Cores/Fontes' e configure os dados de Usuário, Repositório e Token (PAT) do GitHub primeiro.");
      toggleSidebar();
      return;
    }

    const isConfirmed = confirm("Deseja enviar suas alterações atuais para o GitHub para atualizar o site no ar?");
    if (!isConfirmed) return;

    // Turn off edit highlight/controls before compiling HTML
    toggleEditMode(false);

    showLoadingOverlay("Enviando alterações para o GitHub...");

    try {
      const currentPath = window.location.pathname;
      const currentPageName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';

      // Compile current clean HTML
      const cleanHtml = getCleanDOMHtml(document.documentElement.outerHTML);

      // Commit HTML to Github
      const pageCommitSuccess = await commitFileToGitHub(currentPageName, cleanHtml, `Update ${currentPageName} via Visual Editor`);
      
      // Compile updated index.css
      const cssContent = generateCleanCSS();
      const cssCommitSuccess = await commitFileToGitHub("index.css", cssContent, "Update index.css layout parameters via Visual Editor");

      hideLoadingOverlay();

      if (pageCommitSuccess && cssCommitSuccess) {
        alert("Sucesso! As alterações foram enviadas para o seu repositório GitHub. O site será atualizado na Vercel em poucos segundos.");
        // Reactivate editing
        toggleEditMode(true);
      } else {
        alert("Algumas alterações não puderam ser gravadas. Verifique suas credenciais.");
      }
    } catch (err) {
      hideLoadingOverlay();
      let errorMsg = err.message;
      if (err.name === 'AbortError') {
        errorMsg = "Tempo limite esgotado (timeout). O GitHub demorou muito para responder.";
      }
      alert(`Falha no envio: ${errorMsg}. Verifique o token, as permissões de gravação e sua conexão de internet.`);
      toggleEditMode(true);
    }
  }

  async function commitFileToGitHub(path, content, message) {
    const owner = (safeStorage.getItem(STORAGE_PREFIX + "gh_owner") || "").trim();
    const repo = (safeStorage.getItem(STORAGE_PREFIX + "gh_repo") || "").trim();
    const token = (safeStorage.getItem(STORAGE_PREFIX + "gh_token") || "").trim();
    const branch = (safeStorage.getItem(STORAGE_PREFIX + "gh_branch") || "main").trim();

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    // 1. Fetch current file SHA
    let sha = null;
    try {
      const res = await fetchWithTimeout(url + `?ref=${branch}`, {
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json"
        },
        timeout: 15000
      });
      if (res.ok) {
        const data = await res.json();
        sha = data.sha;
      }
    } catch (e) {
      // File doesn't exist yet, we will create it (sha remains null)
      if (e.name === 'AbortError') {
        throw e;
      }
    }

    // 2. Put file contents (base64 encoded)
    // btoa does not support raw unicode strings properly, so encode using encodeURIComponent + unescape first
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    const payload = {
      message: message,
      content: base64Content,
      branch: branch
    };
    if (sha) {
      payload.sha = sha;
    }

    const res = await fetchWithTimeout(url, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify(payload),
      timeout: 15000
    });

    if (res.ok) {
      return true;
    } else {
      const errData = await res.json();
      console.error(errData);
      throw new Error(errData.message || "Erro de API");
    }
  }

  // Visual Spinner Overlay
  function showLoadingOverlay(text) {
    if (document.getElementById("adminLoadingOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "adminLoadingOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(5px);
      z-index: 20000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      letter-spacing: 1px;
    `;
    overlay.innerHTML = `
      <div style="border: 4px solid rgba(255,255,255,0.1); border-top-color: #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
      <div>${text}</div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
    document.body.appendChild(overlay);
  }

  function hideLoadingOverlay() {
    const o = document.getElementById("adminLoadingOverlay");
    if (o) o.remove();
  }

  function getCleanDOMHtml(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    
    const toolbar = doc.getElementById("adminToolbar"); if (toolbar) toolbar.remove();
    const lockBtn = doc.getElementById("adminLockBtn"); if (lockBtn) lockBtn.remove();
    const sidebar = doc.getElementById("adminSidebar"); if (sidebar) sidebar.remove();
    const loadingOverlay = doc.getElementById("adminLoadingOverlay"); if (loadingOverlay) loadingOverlay.remove();
    
    doc.querySelectorAll(".admin-modal-backdrop").forEach(m => m.remove());
    doc.querySelectorAll("script[src='admin.js']").forEach(s => s.remove());
    
    doc.body.classList.remove("admin-mode-active");
    doc.querySelectorAll("[contenteditable]").forEach(el => {
      el.removeAttribute("contenteditable");
    });
    
    doc.querySelectorAll(".item-actions").forEach(a => a.remove());

    // Re-add admin.js script so the editor button persists after save
    const adminScript = doc.createElement("script");
    adminScript.src = "admin.js";
    doc.body.appendChild(adminScript);

    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  function injectEditsToRawHtml(page, rawHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    doc.querySelectorAll("script[src='admin.js']").forEach(s => s.remove());
    const toolbar = doc.getElementById("adminToolbar"); if (toolbar) toolbar.remove();
    const lockBtn = doc.getElementById("adminLockBtn"); if (lockBtn) lockBtn.remove();
    const sidebar = doc.getElementById("adminSidebar"); if (sidebar) sidebar.remove();
    const loadingOverlay = doc.getElementById("adminLoadingOverlay"); if (loadingOverlay) loadingOverlay.remove();

    const styleTag = doc.createElement("style");
    let cssVars = "";
    Object.keys(designVariables).forEach(variable => {
      const saved = safeStorage.getItem(STORAGE_PREFIX + "design_" + variable);
      if (saved) {
        cssVars += `${variable}: ${saved}; `;
      }
    });
    if (cssVars) {
      styleTag.innerHTML = `:root { ${cssVars} }`;
      doc.head.appendChild(styleTag);
    }

    const savedTextData = safeStorage.getItem(STORAGE_PREFIX + "content_" + page);
    if (savedTextData) {
      const texts = JSON.parse(savedTextData);
      Object.keys(texts).forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        if (elements.length > 0 && texts[selector]) {
          if (Array.isArray(texts[selector])) {
            elements.forEach((el, index) => {
              if (texts[selector][index] !== undefined) elements[index].innerHTML = texts[selector][index];
            });
          } else {
            elements[0].innerHTML = texts[selector];
          }
        }
      });
    }

    if (page === "work.html") {
      const paintings = getCustomPaintings();
      const grid = doc.querySelector(".portfolio-grid");
      if (grid && paintings.length > 0) {
        paintings.forEach(p => {
          if (doc.querySelector(`a[href="${p.url}"]`)) return;
          const item = doc.createElement("a");
          item.className = "portfolio-item";
          item.href = p.url;
          item.innerHTML = `
            <img src="${p.imgSrc}" alt="${p.title}">
            <div class="portfolio-title">${p.title}</div>
          `;
          grid.appendChild(item);
        });
      }
    }

    const savedImagesData = safeStorage.getItem(STORAGE_PREFIX + "images");
    if (savedImagesData) {
      const imgs = JSON.parse(savedImagesData);
      Object.keys(imgs).forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        if (elements.length > 0 && imgs[selector]) {
          if (Array.isArray(imgs[selector])) {
            elements.forEach((el, index) => {
              if (imgs[selector][index]) el.src = imgs[selector][index];
            });
          } else {
            elements[0].src = imgs[selector];
          }
        }
      });
    }

    // Re-add admin.js script so the editor button persists
    const adminScript = doc.createElement("script");
    adminScript.src = "admin.js";
    doc.body.appendChild(adminScript);

    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  function generateCleanCSS() {
    let cssVars = "";
    Object.keys(designVariables).forEach(variable => {
      const saved = safeStorage.getItem(STORAGE_PREFIX + "design_" + variable);
      if (saved) {
        cssVars += `  ${variable}: ${saved};\n`;
      } else {
        cssVars += `  ${variable}: ${designVariables[variable]};\n`;
      }
    });

    let cssContent = `/* Customized variables definitions */\n:root {\n${cssVars}}\n`;
    
    const req = new XMLHttpRequest();
    req.open('GET', 'index.css', false); 
    req.send(null);
    if (req.status === 200) {
      const original = req.responseText;
      const cleaned = original.replace(/:root\s*\{[^}]*\}/g, "");
      cssContent += cleaned;
    }
    
    return cssContent;
  }

  function generateCleanDetailsPageHtml(art) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${art.title} — Gabriela de Souza</title>
  <link rel="stylesheet" href="index.css">
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const mobileMenuBtn = document.getElementById('mobileMenuLink');
      const mobileNav = document.getElementById('mobileNav');
      if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', function() {
          mobileNav.classList.toggle('open');
        });
      }
    });
  </script>
</head>
<body>
  <div id="canvas">
    <div id="mobileMenuLink"><a>Menu</a></div>
    <div id="mobileNav">
      <nav class="main-nav">
        <ul>
          <li><a href="index.html">home</a></li>
          <li><a href="work.html">trabalhos</a></li>
          <li><a href="aboutruth.html">sobre mim</a></li>
        </ul>
      </nav>
    </div>
    <header id="header">
      <div id="logo">
        <h1 class="logo">
          <a href="index.html">
            <img src="https://images.squarespace-cdn.com/content/v1/591cce10bf629a201c743003/c30a4b6c-bfff-4778-a0aa-67a25dfd268c/Untitled_Artwork+3.png?format=1000w" alt="Gabriela de Souza">
          </a>
        </h1>
      </div>
      <div id="topNav">
        <nav class="main-nav">
          <ul>
            <li><a href="index.html">home</a></li>
            <li><a href="work.html">trabalhos</a></li>
            <li><a href="aboutruth.html">sobre mim</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <div class="page-divider"></div>
    <section id="page" role="main">
      <div class="twocol-layout project-detail-layout">
        <div class="column-left text-content" style="padding-top: 10px;">
          <h2>${art.title}</h2>
          <p>${art.year || ''}</p>
          <p style="font-style: italic;">${art.medium || ''}</p>
          <p>${art.size || ''}</p>
        </div>
        <div class="column-right column-image">
          <figure>
            <img src="${art.imgSrc}" alt="${art.title}">
          </figure>
        </div>
      </div>
    </section>
    <div class="page-divider"></div>
    <footer id="footer">
      <p>Powered by Gabriela de Souza</p>
    </footer>
  </div>
</body>
</html>`;
  }

  function downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function rgbaToHex(rgba) {
    if (rgba.startsWith('#')) return rgba;
    const parts = rgba.match(/\d+/g);
    if (!parts) return "#ffffff";
    const r = parseInt(parts[0]).toString(16).padStart(2, '0');
    const g = parseInt(parts[1]).toString(16).padStart(2, '0');
    const b = parseInt(parts[2]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  function showHomeConfigModal() {
    removeModals();
    
    // Get current values from DOM
    const videoBg = document.querySelector(".video-background");
    const imageBg = document.querySelector(".image-background");
    const logoImg = document.querySelector(".landing-logo img");
    const enterBtn = document.querySelector(".enter-site-btn");
    const enterLink = enterBtn ? enterBtn.closest("a") : null;
    const instaLink = document.querySelector(".landing-instagram a");

    const isVideoActive = videoBg && videoBg.style.display !== "none";
    
    let currentVideoSrc = videoBg ? videoBg.src : "";
    let currentVideoId = "";
    if (currentVideoSrc) {
      const match = currentVideoSrc.match(/\/embed\/([^?#]+)/);
      if (match) currentVideoId = match[1];
    }
    
    const currentImageSrc = imageBg ? imageBg.src : "";
    const currentLogoSrc = logoImg ? logoImg.src : "";
    const currentBtnText = enterBtn ? enterBtn.innerHTML : "ENTER SITE";
    const currentBtnHref = enterLink ? enterLink.getAttribute("href") : "work.html";
    const currentInstaHref = instaLink ? instaLink.getAttribute("href") : "http://instagram.com/septemberwildflowers";

    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.id = "adminHomeConfigModal";
    backdrop.innerHTML = `
      <div class="admin-modal" style="max-width: 580px;">
        <div class="admin-modal-header">
          <h3>Personalizar Tela Inicial</h3>
          <span style="cursor:pointer; font-size: 20px;" onclick="document.getElementById('adminHomeConfigModal').remove()">&times;</span>
        </div>
        <div class="admin-modal-body" style="max-height: 450px; overflow-y: auto;">
          <div class="admin-setting-item">
            <label>Tipo de Fundo</label>
            <select id="homeBgType" style="border: 1px solid #3c3c3c; background-color: #3c3c3c; color: #fff; border-radius: 4px; padding: 10px; font-size: 13px; width: 100%;">
              <option value="video" ${isVideoActive ? "selected" : ""}>Vídeo do YouTube</option>
              <option value="image" ${!isVideoActive ? "selected" : ""}>Imagem</option>
            </select>
          </div>

          <div id="homeVideoConfig" class="admin-setting-item" style="display: ${isVideoActive ? "block" : "none"};">
            <label>Link ou ID do Vídeo do YouTube</label>
            <input type="text" id="homeVideoUrl" value="${currentVideoId}" placeholder="Ex: JWuQmvjWVug ou link completo...">
          </div>

          <div id="homeImageConfig" class="admin-setting-item" style="display: ${!isVideoActive ? "block" : "none"};">
            <label>URL da Imagem de Fundo</label>
            <input type="text" id="homeImageUrl" value="${currentImageSrc}">
            <div style="text-align: center; color: #888; font-size: 11px; margin: 10px 0;">OU</div>
            <label>Carregar Arquivo de Fundo</label>
            <input type="file" id="homeImageFile" accept="image/*" style="border: 1px solid #3c3c3c; padding: 10px; width: 100%; color: #fff;">
          </div>

          <hr style="border-color: #3c3c3c; margin: 20px 0;">

          <div class="admin-setting-item">
            <label>URL do Logo Central</label>
            <input type="text" id="homeLogoUrl" value="${currentLogoSrc}">
            <div style="text-align: center; color: #888; font-size: 11px; margin: 10px 0;">OU</div>
            <label>Carregar Arquivo do Logo</label>
            <input type="file" id="homeLogoFile" accept="image/*" style="border: 1px solid #3c3c3c; padding: 10px; width: 100%; color: #fff;">
          </div>

          <hr style="border-color: #3c3c3c; margin: 20px 0;">

          <div class="admin-setting-item">
            <label>Texto do Botão</label>
            <input type="text" id="homeBtnText" value="${currentBtnText}">
          </div>
          <div class="admin-setting-item">
            <label>Link de Destino do Botão</label>
            <input type="text" id="homeBtnHref" value="${currentBtnHref}" placeholder="Ex: work.html">
          </div>

          <div class="admin-setting-item">
            <label>Link do Instagram no Rodapé</label>
            <input type="text" id="homeInstaHref" value="${currentInstaHref}" placeholder="Ex: http://instagram.com/...">
          </div>
        </div>
        <div class="admin-modal-footer">
          <button onclick="document.getElementById('adminHomeConfigModal').remove()">Cancelar</button>
          <button class="primary-btn" id="homeConfigSubmit">Salvar Alterações</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add("open"), 10);

    const selectType = document.getElementById("homeBgType");
    selectType.addEventListener("change", (e) => {
      const type = e.target.value;
      document.getElementById("homeVideoConfig").style.display = type === "video" ? "block" : "none";
      document.getElementById("homeImageConfig").style.display = type === "image" ? "block" : "none";
    });

    let loadedBgBase64 = "";
    document.getElementById("homeImageFile").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 1920, 1080, 0.85, (compressedUrl) => {
          loadedBgBase64 = compressedUrl;
          document.getElementById("homeImageUrl").value = "Upload carregado com sucesso!";
        });
      }
    });

    let loadedLogoBase64 = "";
    document.getElementById("homeLogoFile").addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 800, 800, 0.9, (compressedUrl) => {
          loadedLogoBase64 = compressedUrl;
          document.getElementById("homeLogoUrl").value = "Upload carregado com sucesso!";
        });
      }
    });

    document.getElementById("homeConfigSubmit").addEventListener("click", () => {
      const type = selectType.value;

      if (type === "video") {
        let inputVideo = document.getElementById("homeVideoUrl").value.trim();
        let videoId = inputVideo;
        if (inputVideo.includes("youtube.com") || inputVideo.includes("youtu.be")) {
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
          const match = inputVideo.match(regExp);
          if (match && match[2].length === 11) {
            videoId = match[2];
          }
        }
        if (videoId && videoBg) {
          videoBg.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;
          videoBg.style.display = "block";
        }
        if (imageBg) imageBg.style.display = "none";
      } else {
        const urlInput = document.getElementById("homeImageUrl").value;
        const finalBg = loadedBgBase64 || urlInput;
        if (finalBg && finalBg !== "Upload carregado com sucesso!" && imageBg) {
          imageBg.src = finalBg;
          imageBg.style.display = "block";
          
          const savedImages = JSON.parse(safeStorage.getItem(STORAGE_PREFIX + "images") || "{}");
          savedImages[".image-background"] = finalBg;
          safeStorage.setItem(STORAGE_PREFIX + "images", JSON.stringify(savedImages));
        }
        if (videoBg) videoBg.style.display = "none";
      }

      const logoUrlInput = document.getElementById("homeLogoUrl").value;
      const finalLogo = loadedLogoBase64 || logoUrlInput;
      if (finalLogo && finalLogo !== "Upload carregado com sucesso!" && logoImg) {
        logoImg.src = finalLogo;
        const savedImages = JSON.parse(safeStorage.getItem(STORAGE_PREFIX + "images") || "{}");
        savedImages[".landing-logo img"] = finalLogo;
        safeStorage.setItem(STORAGE_PREFIX + "images", JSON.stringify(savedImages));
      }

      const btnTextVal = document.getElementById("homeBtnText").value;
      if (enterBtn && btnTextVal) {
        enterBtn.innerHTML = btnTextVal;
      }
      const btnHrefVal = document.getElementById("homeBtnHref").value.trim();
      if (enterLink && btnHrefVal) {
        enterLink.setAttribute("href", btnHrefVal);
      }

      const instaHrefVal = document.getElementById("homeInstaHref").value.trim();
      if (instaLink && instaHrefVal) {
        instaLink.setAttribute("href", instaHrefVal);
      }

      saveCurrentPageContent();

      backdrop.remove();
      alert("Alterações salvas na tela! Lembre-se de clicar em 'Salvar no GitHub' para enviar as atualizações.");
    });
  }

  function logout() {
    safeStorage.removeItem(STORAGE_PREFIX + "logged_in");
    isAdminLoggedIn = false;
    toggleEditMode(false);
    const toolbar = document.getElementById("adminToolbar"); if (toolbar) toolbar.remove();
    const sidebar = document.getElementById("adminSidebar"); if (sidebar) sidebar.remove();
    alert("Você saiu do modo de edição.");
  }

})();
