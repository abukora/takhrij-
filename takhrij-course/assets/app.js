/* ==========================================================
   تخريج الحديث — السلوك التفاعلي
   المزايا: البحث مع التمييز، طيّ الأبواب وفتحها، تمييز الأسئلة المهمة،
   الوضع الليلي، فهرس نشط، زر الصعود.
   كل الوصول إلى التخزين المحلي داخل try/catch لأنه قد يكون محظورًا.
   ========================================================== */
(function () {
  'use strict';

  const content = document.getElementById('content');
  const searchInput = document.getElementById('search');
  const hitCount = document.getElementById('hit-count');
  const btnMarks = document.getElementById('btn-marks');
  const btnExpand = document.getElementById('btn-expand');
  const btnCollapse = document.getElementById('btn-collapse');
  const btnTheme = document.getElementById('btn-theme');
  const btnPrint = document.getElementById('btn-print');
  const toTop = document.getElementById('to-top');
  const root = document.documentElement;

  /* ---------- 1) الوضع الليلي ---------- */
  function currentThemeIsDark() {
    const attr = root.getAttribute('data-theme');
    if (attr) return attr === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function refreshThemeLabel() {
    btnTheme.textContent = currentThemeIsDark() ? 'الوضع النهاري' : 'الوضع الليلي';
    btnTheme.setAttribute('aria-pressed', String(currentThemeIsDark()));
  }

  btnTheme.addEventListener('click', function () {
    const next = currentThemeIsDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('takhrij-theme', next); // حفظ تفضيل المستخدم
    } catch (e) { /* التخزين غير متاح: يعمل الموقع بدونه */ }
    refreshThemeLabel();
  });
  refreshThemeLabel();

  /* ---------- 2) توسيع الأبواب وطيّها ---------- */
  function setAllDetails(open) {
    content.querySelectorAll('details').forEach(function (d) { d.open = open; });
  }
  btnExpand.addEventListener('click', function () { setAllDetails(true); });
  btnCollapse.addEventListener('click', function () { setAllDetails(false); });

  /* ---------- 3) تمييز الأسئلة المهمة ---------- */
  btnMarks.addEventListener('click', function () {
    const on = !document.body.classList.contains('show-marks');
    document.body.classList.toggle('show-marks', on);
    btnMarks.setAttribute('aria-pressed', String(on));
  });

  // النقر على سؤال يثبّت تمييزه لتتبع ما تمّت مراجعته
  content.addEventListener('click', function (e) {
    const item = e.target.closest('.q-item');
    if (item) item.classList.toggle('is-flagged');
  });

  /* ---------- 4) البحث مع التمييز ---------- */
  function clearHighlights() {
    content.querySelectorAll('mark.hit').forEach(function (m) {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    content.querySelectorAll('.lesson.no-match').forEach(function (l) {
      l.classList.remove('no-match');
    });
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(query) {
    clearHighlights();
    hitCount.textContent = '';
    if (!query) return;

    const regex = new RegExp(escapeRegExp(query), 'gi');
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const p = node.parentElement;
        if (!p || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (p.closest('script, style, mark')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let total = 0;
    textNodes.forEach(function (node) {
      const text = node.nodeValue;
      regex.lastIndex = 0;
      if (!regex.test(text)) return;
      regex.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > last) {
          frag.appendChild(document.createTextNode(text.slice(last, match.index)));
        }
        const mark = document.createElement('mark');
        mark.className = 'hit';
        mark.textContent = match[0];
        frag.appendChild(mark);
        total++;
        last = match.index + match[0].length;
      }
      if (last < text.length) {
        frag.appendChild(document.createTextNode(text.slice(last)));
      }
      node.parentNode.replaceChild(frag, node);
    });

    // إخفاء الدروس التي لا تحوي نتائج، وفتح الأبواب التي تحوي نتائج
    content.querySelectorAll('.lesson').forEach(function (lesson) {
      if (!lesson.querySelector('mark.hit')) lesson.classList.add('no-match');
    });
    content.querySelectorAll('mark.hit').forEach(function (m) {
      let el = m.parentElement;
      while (el && el !== content) {
        if (el.tagName === 'DETAILS') el.open = true;
        el = el.parentElement;
      }
    });

    hitCount.textContent = total ? total + ' نتيجة' : 'لا توجد نتائج';

    const first = content.querySelector('mark.hit');
    if (first) {
      first.classList.add('current');
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  let debounceTimer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      highlight(searchInput.value.trim());
    }, 180);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      searchInput.value = '';
      highlight('');
    }
  });

  /* ---------- 5) الطباعة ---------- */
  btnPrint.addEventListener('click', function () { window.print(); });

  /* ---------- 6) زر الصعود ---------- */
  window.addEventListener('scroll', function () {
    toTop.classList.toggle('visible', window.scrollY > 600);
  }, { passive: true });
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 7) تمييز الفهرس للباب الظاهر ---------- */
  const tocLinks = new Map();
  document.querySelectorAll('.toc a[href^="#"]').forEach(function (a) {
    tocLinks.set(a.getAttribute('href').slice(1), a);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (link) { link.classList.remove('active'); });
        const link = tocLinks.get(entry.target.id);
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    content.querySelectorAll('details.bab').forEach(function (d) { observer.observe(d); });
  }
})();
