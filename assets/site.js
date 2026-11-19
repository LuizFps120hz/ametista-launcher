/* Download buttons from the latest GitHub release, plus the crystal background. */
(function () {
  'use strict';
  const REPO = 'LuizFps120hz/ametista-launcher';
  const RELEASES = 'https://github.com/' + REPO + '/releases';

  // Background: same engine as the launcher; it only animates while you interact.
  if (window.Geode) {
    const geode = window.Geode(document.getElementById('bg'), {});
    addEventListener('pointermove', (e) => geode.point(e.clientX, e.clientY));
    addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button')) return;
      geode.burst(e.clientX, e.clientY, 1, false);
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? geode.pause() : geode.resume()));
  }

  const ua = navigator.userAgent.toLowerCase();
  const os = ua.includes('windows') ? 'windows' : ua.includes('linux') && !ua.includes('android') ? 'linux' : 'other';

  const KINDS = [
    { os: 'windows', test: /setup\.exe$|\.exe$/i, label: 'Windows (.exe)' },
    { os: 'windows', test: /\.msi$/i, label: 'Windows (.msi)' },
    { os: 'linux', test: /\.appimage$/i, label: 'Linux (.AppImage)' },
    { os: 'linux', test: /\.deb$/i, label: 'Linux (.deb)' },
  ];

  const main = document.getElementById('dl-main');
  const others = document.getElementById('dl-others');
  const meta = document.getElementById('dl-meta');

  function link(cls, href, text) {
    const a = document.createElement('a');
    a.className = 'btn ' + cls;
    a.href = href;
    a.textContent = text;
    return a;
  }

  function noRelease() {
    main.textContent = 'Primeira versão em breve';
    main.setAttribute('aria-disabled', 'true');
    const n = document.createElement('div');
    n.className = 'notice';
    n.textContent = 'O Ametista ainda não tem uma versão publicada. Quando sair, o download aparece aqui.';
    others.replaceWith(n);
  }

  fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.status === 404 ? null : r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((rel) => {
      if (!rel) return noRelease();
      const files = [];
      for (const asset of rel.assets || []) {
        const kind = KINDS.find((k) => k.test.test(asset.name));
        if (kind && !files.some((f) => f.label === kind.label)) files.push({ ...kind, url: asset.browser_download_url, size: asset.size });
      }
      if (!files.length) return noRelease();
      const best = files.find((f) => f.os === os) || null;
      if (best) {
        main.href = best.url;
        main.textContent = 'Baixar para ' + best.label;
        main.removeAttribute('aria-disabled');
      } else {
        main.href = RELEASES + '/latest';
        main.textContent = 'Ver downloads';
        main.removeAttribute('aria-disabled');
      }
      for (const f of files) if (f !== best) others.append(link('ghost', f.url, f.label));
      const date = new Date(rel.published_at).toLocaleDateString('pt-BR');
      meta.textContent = 'Versão ' + (rel.tag_name || rel.name) + ' · publicada em ' + date + ' · ';
      const notes = document.createElement('a');
      notes.href = rel.html_url;
      notes.textContent = 'notas da versão';
      meta.append(notes);
    })
    .catch(() => {
      main.href = RELEASES;
      main.textContent = 'Ver downloads no GitHub';
      main.removeAttribute('aria-disabled');
    });
})();
