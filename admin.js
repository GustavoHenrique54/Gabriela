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

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    applySavedDesign();
    applySavedContent();
    injectFloatingLock();
    hideLoadingOverlay(); // Ensure any leftover loading overlay is removed
    
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
      ".portfolio-title", ".image-caption", ".cv-year", ".cv-item div"
    ];

    textSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        textData[selector] = Array.from(elements).map(el => el.innerHTML);
      }
    });

    const success = safeStorage.setItem(pageKey, JSON.stringify(textData));
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
    const addPaintingBtnHtml = isWorkPage ? `<button id="adminAddPaintingBtn">Adicionar Obra</button>` : '';

    toolbar.innerHTML = `
      <h4><span>●</span> Editor Gabriela de Souza</h4>
      <div class="btn-group">
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
      ".portfolio-title", ".image-caption", ".cv-year", ".cv-item div"
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
      ".column-image img", ".portfolio-item img", "#logo img"
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
        const reader = new FileReader();
        reader.onload = function(evt) {
          loadedBase64 = evt.target.result;
          document.getElementById("adminImgUrlInput").value = "Upload carregado com sucesso!";
        };
        reader.readAsDataURL(file);
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

    sidebar.innerHTML = `
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
        const reader = new FileReader();
        reader.onload = function(evt) {
          loadedBase64 = evt.target.result;
          document.getElementById("newArtImgUrl").value = "Upload carregado com sucesso!";
        };
        reader.readAsDataURL(file);
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
        actions.innerHTML = `<button class="item-btn delete-btn">Excluir</button>`;
        
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

  function logout() {
    safeStorage.removeItem(STORAGE_PREFIX + "logged_in");
    isAdminLoggedIn = false;
    toggleEditMode(false);
    const toolbar = document.getElementById("adminToolbar"); if (toolbar) toolbar.remove();
    const sidebar = document.getElementById("adminSidebar"); if (sidebar) sidebar.remove();
    alert("Você saiu do modo de edição.");
  }

})();
