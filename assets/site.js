/* Fills the download area from the latest GitHub release. */
(function () {
  'use strict';
  const REPO = 'LuizFps120hz/ametista-launcher';
  const RELEASES = 'https://github.com/' + REPO + '/releases';
  const main = document.getElementById('dl-main');
  const info = document.getElementById('dl-info');

  const ua = navigator.userAgent.toLowerCase();
  const os = ua.includes('windows') ? 'windows' : ua.includes('linux') && !ua.includes('android') ? 'linux' : 'other';

  const KINDS = [
    { os: 'windows', test: /\.exe$/i, label: 'Windows (.exe)' },
    { os: 'windows', test: /\.msi$/i, label: 'Windows (.msi)' },
    { os: 'linux', test: /\.appimage$/i, label: 'Linux (AppImage)' },
    { os: 'linux', test: /\.deb$/i, label: 'Linux (.deb)' },
  ];
  const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>';

  function textLink(href, text) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  }

  function show(rel, files) {
    info.replaceChildren();
    if (!files.length) {
      main.textContent = 'Ainda não há uma versão publicada';
      main.setAttribute('aria-disabled', 'true');
      info.append('Quando a primeira versão sair, o download aparece aqui e em ', textLink(RELEASES, 'Releases'), '.');
      return;
    }
    const best = files.find((f) => f.os === os);
    main.removeAttribute('aria-disabled');
    if (best) {
      main.href = best.url;
      main.innerHTML = DOWNLOAD_ICON;
      main.append('Baixar para ' + best.label);
    } else {
      main.href = RELEASES + '/latest';
      main.textContent = 'Ver downloads';
    }
    const date = new Date(rel.published_at).toLocaleDateString('pt-BR');
    info.append('Versão ' + (rel.tag_name || rel.name) + ', de ' + date + '. ');
    const rest = files.filter((f) => f !== best);
    if (rest.length) {
      info.append('Outros formatos: ');
      rest.forEach((f, i) => { if (i) info.append(' · '); info.append(textLink(f.url, f.label)); });
      info.append('. ');
    }
    info.append(textLink(rel.html_url, 'Notas da versão'), '.');
  }

  fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.status === 404 ? null : r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((rel) => {
      const files = [];
      for (const asset of (rel && rel.assets) || []) {
        const kind = KINDS.find((k) => k.test.test(asset.name));
        if (kind && !files.some((f) => f.label === kind.label)) files.push({ ...kind, url: asset.browser_download_url });
      }
      show(rel, files);
    })
    .catch(() => {
      main.href = RELEASES;
      main.textContent = 'Ver downloads no GitHub';
      main.removeAttribute('aria-disabled');
    });
})();
