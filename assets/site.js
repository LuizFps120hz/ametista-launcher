/* Download area: picks the best file for the visitor's system from the
   latest GitHub release; the arrow button lists every other format. */
(function () {
  'use strict';
  const REPO = 'LuizFps120hz/ametista-launcher';
  const RELEASES = 'https://github.com/' + REPO + '/releases';
  const main = document.getElementById('dl-main');
  const more = document.getElementById('dl-more');
  const menu = document.getElementById('dl-menu');
  const info = document.getElementById('dl-info');

  // ---- system detection -----------------------------------------------------
  const ua = navigator.userAgent.toLowerCase();
  const platform = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '').toLowerCase();
  const os = /^win/.test(platform) || ua.includes('windows') ? 'windows'
    : /mac|iphone|ipad/.test(platform) || ua.includes('mac os') ? 'mac'
    : ua.includes('android') ? 'android'
    : /linux|x11/.test(platform) || ua.includes('linux') ? 'linux'
    : 'other';
  // Debian-family browsers sometimes say so; then .deb fits better than AppImage.
  const debianLike = /ubuntu|debian|mint|pop!?_os/.test(ua);
  const OS_NAME = { windows: 'Windows', mac: 'macOS', android: 'Android', linux: 'Linux', other: 'o seu sistema' };

  const KINDS = [
    { os: 'linux', test: /\.appimage$/i, label: 'Linux (AppImage)', hint: 'Qualquer distribuição', rank: debianLike ? 2 : 1 },
    { os: 'linux', test: /\.deb$/i, label: 'Linux (.deb)', hint: 'Debian, Ubuntu e derivados', rank: debianLike ? 1 : 2 },
    { os: 'windows', test: /\.exe$/i, label: 'Windows (.exe)', hint: 'Instalador para Windows 10 e 11', rank: 1 },
    { os: 'windows', test: /\.msi$/i, label: 'Windows (.msi)', hint: 'Pacote MSI para Windows 10 e 11', rank: 2 },
  ];
  const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>';

  function textLink(href, text) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  }

  function sizeOf(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(0) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  // ---- menu -----------------------------------------------------------------
  function menuItem(href, title, hint, recommended) {
    const li = document.createElement('li');
    li.setAttribute('role', 'none');
    const a = document.createElement('a');
    a.href = href;
    a.setAttribute('role', 'menuitem');
    a.tabIndex = -1;
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = title;
    if (recommended) {
      const r = document.createElement('span');
      r.className = 'rec';
      r.textContent = 'Recomendado';
      t.append(r);
    }
    const h = document.createElement('span');
    h.className = 'h';
    h.textContent = hint;
    a.append(t, h);
    li.append(a);
    return li;
  }

  const items = () => Array.from(menu.querySelectorAll('[role="menuitem"]'));

  function openMenu(focusFirst) {
    menu.hidden = false;
    more.setAttribute('aria-expanded', 'true');
    if (focusFirst) items()[0].focus();
  }

  function closeMenu(returnFocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    more.setAttribute('aria-expanded', 'false');
    if (returnFocus) more.focus();
  }

  more.addEventListener('click', () => (menu.hidden ? openMenu(false) : closeMenu(false)));
  more.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu(true);
    }
  });
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
    else if (e.key === 'Tab') closeMenu(false);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#split')) closeMenu(false);
  });

  // ---- release --------------------------------------------------------------
  function show(rel, files) {
    info.replaceChildren();
    menu.replaceChildren();
    if (!files.length) {
      main.textContent = 'Ainda não há uma versão publicada';
      main.setAttribute('aria-disabled', 'true');
      more.hidden = true;
      info.append('Quando a primeira versão sair, o download aparece aqui e em ', textLink(RELEASES, 'Releases'), '.');
      return;
    }

    const mine = files.filter((f) => f.os === os).sort((a, b) => a.rank - b.rank);
    const best = mine[0];
    main.removeAttribute('aria-disabled');
    if (best) {
      main.href = best.url;
      main.innerHTML = DOWNLOAD_ICON;
      main.append('Baixar para ' + best.label);
    } else {
      main.href = RELEASES + '/latest';
      main.textContent = 'Ver downloads';
    }

    // Menu: this system's other formats first, then everything else.
    const ordered = [...mine.slice(1), ...files.filter((f) => f.os !== os)];
    for (const f of ordered) menu.append(menuItem(f.url, f.label, f.hint + ' · ' + sizeOf(f.size), false));
    if (best) menu.prepend(menuItem(best.url, best.label, best.hint + ' · ' + sizeOf(best.size), true));
    const sep = document.createElement('li');
    sep.className = 'sep';
    sep.setAttribute('role', 'separator');
    menu.append(sep, menuItem(rel.html_url, 'Todas as versões', 'Notas e arquivos no GitHub', false));
    more.hidden = false;

    const date = new Date(rel.published_at).toLocaleDateString('pt-BR');
    info.append('Versão ' + (rel.tag_name || rel.name) + ', de ' + date + '. ');
    if (!best) info.append('Ainda não há versão para ' + OS_NAME[os] + '. ');
    info.append(textLink(rel.html_url, 'Notas da versão'), '.');
  }

  fetch('https://api.github.com/repos/' + REPO + '/releases?per_page=10', { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((list) => {
      // Betas count too, while there is no stable version.
      const rel = list.find((r) => !r.draft && !r.prerelease) || list.find((r) => !r.draft) || null;
      const files = [];
      for (const asset of (rel && rel.assets) || []) {
        const kind = KINDS.find((k) => k.test.test(asset.name));
        if (kind && !files.some((f) => f.label === kind.label)) files.push({ ...kind, url: asset.browser_download_url, size: asset.size });
      }
      show(rel, files);
    })
    .catch(() => {
      main.href = RELEASES;
      main.textContent = 'Ver downloads no GitHub';
      main.removeAttribute('aria-disabled');
      more.hidden = true;
    });
})();
