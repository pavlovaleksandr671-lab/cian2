/* Static documentation only. Does not import or change the auction application. */
(() => {
  'use strict';
  const data = window.AUCTION_FLOW;
  const $ = (id) => document.getElementById(id);
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const roles = { seller: 'Продавец', buyer: 'Покупатель', shared: 'Общие' };
  const kinds = {
    screen: 'Экран',
    modal: 'Диалог',
    success: 'Успех',
    error: 'Ошибка',
    pending: 'Ожидание',
    empty: 'Пустое состояние',
    warning: 'Статус',
    ended: 'Завершение',
    terminal: 'Финал / заглушка',
    demo: 'Только демо',
  };
  const viewport = $('viewport'),
    world = $('world'),
    dialog = $('screen-dialog');
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const W = 300,
    H = 900;
  world.style.width = data.width + 'px';
  world.style.height = data.height + 'px';
  $('lanes').innerHTML = data.sections
    .map(
      (l) =>
        `<section class="lane" style="top:${l.y}px;height:${l.height}px" aria-label="${escape(l.title)}"><div class="lane-title"><h2>${escape(l.title)}</h2><p>${escape(l.sub)}</p></div></section>`,
    )
    .join('');
  $('nodes').innerHTML = data.nodes
    .map(
      (n) =>
        `<article class="node ${n.status}" id="node-${n.id}" style="left:${n.x}px;top:${n.y}px" aria-labelledby="title-${n.id}"><header class="node-head"><div class="node-meta"><b>${n.id}</b><span>${roles[n.role]}</span></div><h3 id="title-${n.id}">${escape(n.title)}</h3></header><button class="shot" data-open="${n.id}" aria-label="Открыть скриншот ${n.id}: ${escape(n.title)}"><img src="${n.image}" width="390" height="900" alt="${escape(n.title)} — реальный экран прототипа" draggable="false"></button><div class="node-foot"><p>${escape(n.detail)}</p><code>${escape(n.event)}</code><p class="kind">${kinds[n.status]} · событие предложено</p></div></article>`,
    )
    .join('');
  $('screen-index').innerHTML = Object.entries(roles)
    .map(
      ([role, label]) =>
        `<section class="index-group"><h3>${label}</h3>${data.nodes
          .filter((n) => n.role === role)
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(
            (n) =>
              `<button class="index-item" data-node="${n.id}"><b>${n.id}</b><span>${escape(n.title)}</span></button>`,
          )
          .join('')}</section>`,
    )
    .join('');
  $('screen-picker').innerHTML += [...data.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => `<option value="${n.id}">${n.id} · ${escape(n.title)}</option>`)
    .join('');
  $('metric-list').innerHTML = data.metrics
    .map(
      (m, i) =>
        `<article class="metric"><span class="metric-number">${String(i + 1).padStart(2, '0')}</span><h3>${escape(m.name)}</h3><div><p class="metric-formula">${escape(m.formula)}</p><p class="metric-note"><b>Окно:</b> ${escape(m.window)}</p><p class="metric-note">${escape(m.why)}</p></div></article>`,
    )
    .join('');
  $('contract-list').innerHTML = data.contract.map((c) => `<li>${escape(c)}</li>`).join('');
  $('event-rows').innerHTML = data.events
    .map(
      (e) =>
        `<tr><td><code>${escape(e.name)}</code><small>${escape(e.source)}</small></td><td>${escape(e.description)}</td><td>${escape(e.trigger)}</td><td>${escape(e.parameters)}</td></tr>`,
    )
    .join('');
  $('gap-list').innerHTML = data.gaps
    .map(
      (g) =>
        `<article class="gap"><p class="gap-type">${escape(g.type)}</p><h3>${escape(g.title)}</h3><p>${escape(g.text)}</p></article>`,
    )
    .join('');

  const colors = {
    main: '#2672d8',
    error: '#b53837',
    return: '#8291a6',
    variant: '#8291a6',
    demo: '#b37830',
    role: '#7352ad',
    shared: '#8291a6',
  };
  const svg = $('connections');
  svg.setAttribute('width', data.width);
  svg.setAttribute('height', data.height);
  svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
  const anchor = (n, p) => {
    const cx = n.x + W / 2,
      cy = n.y + H / 2;
    const dx = p[0] - cx,
      dy = p[1] - cy;
    if (Math.abs(dx) / (W / 2) > Math.abs(dy) / (H / 2)) return [dx > 0 ? n.x + W : n.x, cy];
    return [cx, dy > 0 ? n.y + H : n.y];
  };
  // Keep long cross-lane labels in the empty channels between screen rows.
  const labelPositions = {
    'S03-S02': [570, 2410],
    'S06-B01': [1600, 1210],
    'B04-B03': [890, 5050],
    'S01-C01': [300, 6510],
    'B01-C02': [1530, 6460],
    'B14-B03': [1150, 5150],
    'B14-C03': [2100, 6330],
    'C01-S01': [800, 7740],
  };
  svg.innerHTML =
    '<defs>' +
    Object.entries(colors)
      .map(
        ([kind, color]) =>
          `<marker id="arrow-${kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`,
      )
      .join('') +
    '</defs>' +
    data.edges
      .map((e) => {
        const a = nodeById.get(e.a),
          b = nodeById.get(e.b);
        let points, label;
        if (e.route) {
          points = [anchor(a, e.route[0]), ...e.route, anchor(b, e.route.at(-1))];
          const p = e.route[Math.floor((e.route.length - 1) / 2)];
          label = [p[0], p[1] - 70];
        } else if (a.y === b.y) {
          points = [
            [a.x + W, a.y + H / 2],
            [b.x, b.y + H / 2],
          ];
          label = [(a.x + W + b.x) / 2, a.y + H / 2 - 90];
        } else {
          const start = [a.x + W / 2, a.y + H],
            end = [b.x + W / 2, b.y],
            mid = (start[1] + end[1]) / 2;
          points = [start, [start[0], mid], [end[0], mid], end];
          label = [(start[0] + end[0]) / 2, mid - 45];
        }
        label = labelPositions[`${e.a}-${e.b}`] ?? label;
        const path = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
        const isMain = e.kind === 'main';
        return `<g><title>${escape(e.a + ' → ' + e.b + ': ' + e.label + ' · ' + e.event)}</title><path d="${path}" fill="none" stroke="${colors[e.kind]}" stroke-width="${isMain ? 3 : 2}" ${isMain || e.kind === 'error' ? '' : 'stroke-dasharray="9 7"'} marker-end="url(#arrow-${e.kind})"/><foreignObject x="${Math.max(5, Math.min(data.width - 305, label[0] - 150))}" y="${Math.max(5, label[1])}" width="300" height="120"><div xmlns="http://www.w3.org/1999/xhtml" class="edge-label ${e.kind}">${escape(e.label)}<code>${escape(e.event)}</code></div></foreignObject></g>`;
      })
      .join('');

  let scale = 0.2,
    tx = 0,
    ty = 0,
    drag = null,
    activeArea = 'seller';
  function paint() {
    world.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
    $('zoom-label').value = Math.round(scale * 100) + '%';
  }
  function zoomAt(next, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
    next = Math.max(0.04, Math.min(1.6, next));
    const factor = next / scale;
    tx = x - (x - tx) * factor;
    ty = y - (y - ty) * factor;
    scale = next;
    paint();
  }
  function fitRegion(x, y, width, height) {
    const vw = viewport.clientWidth,
      vh = viewport.clientHeight;
    scale = Math.max(0.04, Math.min(1, (vw - 55) / width, (vh - 65) / height));
    tx = (vw - width * scale) / 2 - x * scale;
    ty = (vh - height * scale) / 2 - y * scale;
    paint();
  }
  function focusArea(id) {
    activeArea = id;
    document
      .querySelectorAll('[data-focus]')
      .forEach((b) => b.classList.toggle('active', b.dataset.focus === id));
    if (id === 'all') fitRegion(0, 0, data.width, data.height);
    else {
      const l = data.sections.find((s) => s.id === id);
      fitRegion(0, l.y, data.width, l.height);
    }
  }
  function focusNode(id) {
    const n = nodeById.get(id);
    scale = Math.min(0.82, (viewport.clientHeight - 80) / H);
    tx = viewport.clientWidth / 2 - (n.x + W / 2) * scale;
    ty = viewport.clientHeight / 2 - (n.y + H / 2) * scale;
    document.querySelectorAll('.selected').forEach((e) => e.classList.remove('selected'));
    $('node-' + id).classList.add('selected');
    document.querySelector(`[data-node="${id}"]`)?.classList.add('selected');
    paint();
  }
  document
    .querySelectorAll('[data-focus]')
    .forEach((b) => b.addEventListener('click', () => focusArea(b.dataset.focus)));
  document
    .querySelectorAll('[data-node]')
    .forEach((b) => b.addEventListener('click', () => focusNode(b.dataset.node)));
  $('screen-picker').addEventListener('change', (e) => {
    if (e.target.value) focusNode(e.target.value);
  });
  $('fit').addEventListener('click', () => focusArea('all'));
  $('zoom-in').addEventListener('click', () => zoomAt(scale * 1.25));
  $('zoom-out').addEventListener('click', () => zoomAt(scale / 1.25));
  $('actual-size').addEventListener('click', () => zoomAt(1));
  viewport.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = viewport.getBoundingClientRect();
        zoomAt(scale * Math.exp(-e.deltaY * 0.007), e.clientX - r.left, e.clientY - r.top);
      } else {
        tx -= e.deltaX;
        ty -= e.deltaY;
        paint();
      }
    },
    { passive: false },
  );
  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tx, ty };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag) return;
    tx = drag.tx + e.clientX - drag.x;
    ty = drag.ty + e.clientY - drag.y;
    paint();
  });
  const endDrag = () => {
    drag = null;
    viewport.classList.remove('dragging');
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('lostpointercapture', endDrag);
  viewport.addEventListener('keydown', (e) => {
    if (e.target !== viewport) return;
    const moves = {
      ArrowLeft: [80, 0],
      ArrowRight: [-80, 0],
      ArrowUp: [0, 80],
      ArrowDown: [0, -80],
    };
    if (moves[e.key]) {
      e.preventDefault();
      tx += moves[e.key][0];
      ty += moves[e.key][1];
      paint();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomAt(scale * 1.25);
    } else if (e.key === '-') {
      e.preventDefault();
      zoomAt(scale / 1.25);
    } else if (e.key === '0') {
      e.preventDefault();
      focusArea('all');
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusArea('seller');
    }
  });
  document.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((t) => t.removeAttribute('aria-current'));
      b.setAttribute('aria-current', 'page');
      document
        .querySelectorAll('.panel')
        .forEach((p) => (p.hidden = p.id !== 'panel-' + b.dataset.tab));
      if (b.dataset.tab === 'map') focusArea(activeArea);
    }),
  );
  function openScreen(id) {
    const n = nodeById.get(id);
    $('dialog-kicker').textContent = n.id + ' / ' + roles[n.role] + ' / ' + kinds[n.status];
    $('dialog-title').textContent = n.title;
    $('dialog-detail').textContent = n.detail;
    $('dialog-replay').textContent = n.replay;
    $('dialog-event').textContent = n.event;
    $('dialog-image').src = n.image;
    $('dialog-image').alt = n.title + ' — оригинальный скриншот';
    $('original-link').href = n.image;
    dialog.showModal();
  }
  document
    .querySelectorAll('[data-open]')
    .forEach((b) => b.addEventListener('click', () => openScreen(b.dataset.open)));
  $('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        dialog.close();
    }
  });
  const images = [...document.querySelectorAll('.shot img')];
  let settled = 0,
    broken = 0;
  function health(img) {
    settled++;
    if (!img.naturalWidth) broken++;
    $('image-health').textContent = broken
      ? `Не загрузилось: ${broken} / ${images.length}`
      : `Снимки: ${settled} / ${images.length}`;
    $('image-health').style.color = broken ? 'var(--error)' : 'var(--green)';
  }
  images.forEach((img) => {
    if (img.complete) health(img);
    else {
      img.addEventListener('load', () => health(img), { once: true });
      img.addEventListener('error', () => health(img), { once: true });
    }
  });
  let resizeId;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeId);
    resizeId = requestAnimationFrame(() => focusArea(activeArea));
  }).observe(viewport);
  focusArea('seller');
})();
