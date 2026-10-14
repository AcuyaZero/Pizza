(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const peso = (n) => '₱' + n.toLocaleString('en-PH');

  // localStorage can throw (private mode, blocked storage), so wrap it.
  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }
  };


  /* DARK MODE  (all pages; button only exists on menu.html) */
  function initTheme() {
    const body = document.body;
    const btn = document.getElementById('themeToggleBtn');

    function apply(dark) {
      body.classList.toggle('dark', dark);
      if (btn) {
        btn.textContent = dark ? 'Light mode' : 'Dark mode';
        btn.setAttribute('aria-pressed', String(dark));
      }
    }

    apply(store.get('theme') === 'dark');

    if (btn) {
      btn.addEventListener('click', () => {
        const dark = !body.classList.contains('dark');
        apply(dark);
        store.set('theme', dark ? 'dark' : 'light');
      });
    }
  }

  /*  3. MENU SEARCH + CATEGORY FILTER  (menu.html) */
  function initMenuFilter() {
    const list = document.getElementById('menuList');
    if (!list) return;

    const items = Array.from(list.querySelectorAll('.menu-item'));
    const sections = Array.from(list.querySelectorAll('.menu-section'));
    const tabs = Array.from(document.querySelectorAll('#categoryTabs .tab-link'));
    const input = document.getElementById('searchInput');
    const searchBtn = document.getElementById('themeSearchBtn');
    const emptyMsg = document.getElementById('emptyMessage');

    let category = 'all';
    let query = '';

    function matchesQuery(item) {
      if (!query) return true;
      const name = item.querySelector('.food-name').textContent;
      const desc = item.querySelector('.food-desc').textContent;
      return (name + ' ' + desc).toLowerCase().includes(query);
    }

    function update() {
      const counts = { all: 0 };
      let visible = 0;

      items.forEach((item) => {
        const cat = item.dataset.category;
        const queryOk = matchesQuery(item);
        const show = queryOk && (category === 'all' || cat === category);

        item.classList.toggle('is-hidden', !show);
        if (show) visible++;
        if (queryOk) {
          counts.all++;
          counts[cat] = (counts[cat] || 0) + 1;
        }
      });

      // Hide a whole section (heading included) when none of its items show.
      sections.forEach((section) => {
        const hasVisible = section.querySelector('.menu-item:not(.is-hidden)');
        section.classList.toggle('is-hidden', !hasVisible);
      });

      // Tab counts follow the search, so they always match what you'd see.
      tabs.forEach((tab) => {
        const countEl = tab.querySelector('.tab-count');
        if (countEl) countEl.textContent = '(' + (counts[tab.dataset.category] || 0) + ')';
      });

      if (emptyMsg) emptyMsg.hidden = visible > 0;
    }

    function setCategory(next) {
      category = next;
      tabs.forEach((tab) => {
        const active = tab.dataset.category === next;
        tab.classList.toggle('active', active);
        if (active) tab.setAttribute('aria-current', 'true');
        else tab.removeAttribute('aria-current');
      });
      update();
    }

    function runSearch() {
      query = input ? input.value.trim().toLowerCase() : '';
      update();
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault(); // filter in place instead of jumping to an anchor
        setCategory(tab.dataset.category);
      });
    });

    if (input) {
      input.addEventListener('input', runSearch);   // live as you type (also fires on the clear "x")
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
      });
    }
    if (searchBtn) searchBtn.addEventListener('click', runSearch);

    // Deep links such as menu.html#pizza open with that category selected.
    const hash = window.location.hash.slice(1);
    if (hash && tabs.some((t) => t.dataset.category === hash)) {
      setCategory(hash);
      list.scrollIntoView();
    } else {
      update();
    }
  }

  /* =========================================================
     4. ORDER TRAY  (menu.html)
     ========================================================= */
  function initTray() {
    const listEl = document.getElementById('orderList');
    const totalEl = document.getElementById('orderTotal');
    const emptyEl = document.getElementById('orderEmpty');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearBtn = document.getElementById('clearTrayBtn');
    const headerBtn = document.getElementById('headerOrderBtn');
    const menuList = document.getElementById('menuList');
    if (!listEl || !totalEl || !menuList) return;

    // tray = { itemId: { name, price, qty } }
    let tray = {};
    try { tray = JSON.parse(store.get('tray')) || {}; } catch (e) { tray = {}; }

    // Status line under the total ("Order placed", "Tray is empty", ...)
    const status = document.createElement('p');
    status.className = 'order-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    if (checkoutBtn) checkoutBtn.parentNode.insertBefore(status, checkoutBtn);

    function say(message) {
      status.textContent = message;
      status.hidden = !message;
    }

    function save() { store.set('tray', JSON.stringify(tray)); }

    function makeQtyButton(label, action, id, symbol) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qty-btn';
      b.dataset.action = action;
      b.dataset.id = id;
      b.setAttribute('aria-label', label);
      b.textContent = symbol;
      return b;
    }

    function render() {
      const ids = Object.keys(tray);
      listEl.replaceChildren();

      let total = 0;
      let count = 0;

      if (ids.length === 0) {
        listEl.appendChild(emptyEl);
      }

      ids.forEach((id) => {
        const line = tray[id];
        const lineTotal = line.price * line.qty;
        total += lineTotal;
        count += line.qty;

        const li = document.createElement('li');
        li.className = 'order-line';

        const info = document.createElement('div');
        info.className = 'order-line-info';
        const name = document.createElement('span');
        name.className = 'order-line-name';
        name.textContent = line.name;
        const each = document.createElement('span');
        each.className = 'order-line-each';
        each.textContent = peso(line.price) + ' each';
        info.append(name, each);

        const side = document.createElement('div');
        side.className = 'order-line-side';
        const qty = document.createElement('div');
        qty.className = 'qty';
        const qtyNum = document.createElement('span');
        qtyNum.className = 'qty-num';
        qtyNum.textContent = line.qty;
        qty.append(
          makeQtyButton('Remove one ' + line.name, 'dec', id, '−'),
          qtyNum,
          makeQtyButton('Add one ' + line.name, 'inc', id, '+')
        );
        const lt = document.createElement('span');
        lt.className = 'order-line-total';
        lt.textContent = peso(lineTotal);
        side.append(qty, lt);

        li.append(info, side);
        listEl.appendChild(li);
      });

      totalEl.textContent = peso(total);
      if (headerBtn) headerBtn.textContent = count > 0 ? 'View tray (' + count + ')' : 'View tray';
    }

    function addItem(btn) {
      const id = btn.dataset.item;
      const price = Number(btn.dataset.price);
      const card = btn.closest('.menu-item');
      const name = card ? card.querySelector('.food-name').textContent : id;

      if (tray[id]) tray[id].qty += 1;
      else tray[id] = { name: name, price: price, qty: 1 };

      save();
      render();
      say('');

      // Quick confirmation on the button itself.
      const original = btn.dataset.label || btn.textContent;
      btn.dataset.label = original;
      btn.textContent = 'Added ✓';
      clearTimeout(btn._reset);
      btn._reset = setTimeout(() => { btn.textContent = original; }, 900);
    }

    // One listener for every "Add to tray" button.
    menuList.addEventListener('click', (e) => {
      const btn = e.target.closest('.add-btn');
      if (btn) addItem(btn);
    });

    // One listener for the + / − buttons inside the tray.
    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.qty-btn');
      if (!btn) return;
      const line = tray[btn.dataset.id];
      if (!line) return;

      line.qty += btn.dataset.action === 'inc' ? 1 : -1;
      if (line.qty <= 0) delete tray[btn.dataset.id];

      save();
      render();
      say('');
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        tray = {};
        save();
        render();
        say('');
      });
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        const ids = Object.keys(tray);
        if (ids.length === 0) {
          say('Your tray is empty. Add something first.');
          return;
        }
        const total = ids.reduce((sum, id) => sum + tray[id].price * tray[id].qty, 0);
        tray = {};
        save();
        render();
        say('Order placed! Total ' + peso(total) + '. Your tray will be ready in under ten minutes.');
      });
    }

    render();
  }

  /*  5. HOVER HIGHLIGHT  (mouseover / mouseout on food cards)*/
  function initHover() {
    const cards = document.querySelectorAll('.menu-item, .food-card');

    function onOver(e) {
      e.currentTarget.classList.add('is-highlight');
    }
    function onOut(e) {
      // ignore moves between the card's own children
      if (e.currentTarget.contains(e.relatedTarget)) return;
      e.currentTarget.classList.remove('is-highlight');
    }

    cards.forEach((card) => {
      card.addEventListener('mouseover', onOver);
      card.addEventListener('mouseout', onOut);
    });
  }

  /* ---------- start ---------- */
  initTheme();
  initMenuFilter();
  initTray();
  initHover();
})();
