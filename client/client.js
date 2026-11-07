window.__ModuleLoader__.load({
  id: 'dsh-travel-journal',
  factory(require) {
    const React = require('react');
    const { useState, useEffect, useRef } = React;
    const h = React.createElement;
    const API = '/travel-journal/api';
    const CSS = `
.tj{--tj-bg:var(--dsw-alias-bg-base,#f7f8f5);--tj-card:var(--dsw-alias-bg-layer-1,#fff);--tj-ink:var(--dsw-alias-label-primary,#263b35);--tj-muted:var(--dsw-alias-label-secondary,#6b7d74);--tj-line:var(--dsw-alias-border-l1,#dce5dd);--tj-green:#39775e;--tj-soft:color-mix(in srgb,var(--tj-green) 9%,var(--tj-card));box-sizing:border-box;height:100%;overflow:auto;background:var(--tj-bg);color:var(--tj-ink);font:13px/1.65 var(--dsh-font-family-ui,system-ui);padding:0 28px 60px}.tj *{box-sizing:border-box}.tj-wrap{max-width:1120px;margin:auto;padding-top:var(--dsh-frame-top-clearance,26px)}.tj button,.tj input,.tj textarea,.tj select{font:inherit}.tj button,.tj a{touch-action:manipulation}.tj button:focus-visible,.tj a:focus-visible,.tj input:focus-visible,.tj textarea:focus-visible{outline:2px solid var(--tj-green);outline-offset:3px}.tj h1{font-size:32px;letter-spacing:-.035em;line-height:1.25;margin:7px 0 9px;font-weight:650}.tj h2{font-size:18px;line-height:1.4;margin:0;font-weight:620}.tj h3{font-size:16px;line-height:1.45;margin:0}.tj p{margin:6px 0}.tj-muted{color:var(--tj-muted)}.tj-eyebrow{font-size:10px;letter-spacing:.2em;font-weight:750;color:var(--tj-green)}.tj-hero{padding:28px 0 22px;display:flex;justify-content:space-between;align-items:center;gap:22px}.tj-hero-actions{display:flex;gap:14px;align-items:center}.tj-count{font-size:25px;line-height:1.3;font-weight:550;font-variant-numeric:tabular-nums}.tj-stat{min-width:70px;padding-left:19px;border-left:1px solid var(--tj-line)}.tj-stat small{font-size:11px;color:var(--tj-muted)}.tj-nav{display:flex;gap:4px;border-bottom:1px solid var(--tj-line);margin-bottom:25px;overflow:auto}.tj-nav button{display:flex;align-items:center;gap:7px;border:0;background:none;color:var(--tj-muted);padding:12px 17px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}.tj-nav button[aria-selected=true]{border-color:var(--tj-green);color:var(--tj-green);font-weight:650}.tj-icon{display:inline-block;vertical-align:middle;flex-shrink:0}.tj-card{background:var(--tj-card);border:1px solid var(--tj-line);border-radius:15px;padding:22px;margin-bottom:18px}.tj-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.tj-between{justify-content:space-between}.tj-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--tj-line);border-radius:9px;padding:8px 14px;background:var(--tj-card);color:var(--tj-ink);cursor:pointer;text-decoration:none;white-space:nowrap}.tj-btn:not(:disabled):hover{border-color:var(--tj-green);background:var(--tj-soft)}.tj-btn.primary{background:var(--tj-green);color:#fff;border-color:var(--tj-green)}.tj-btn.primary:not(:disabled):hover{filter:brightness(1.08)}.tj-btn:disabled{opacity:.5}.tj button:disabled{cursor:default}.tj-btn.small{padding:5px 10px;font-size:12px}.tj-btn.link{border:0;background:none;padding:3px 0;color:var(--tj-green)}.tj-input{width:100%;border:1px solid var(--tj-line);border-radius:9px;padding:9px 11px;background:var(--tj-card);color:var(--tj-ink);min-width:0}.tj-input::placeholder{color:var(--tj-muted);opacity:.8}.tj-textarea{min-height:100px;resize:vertical;line-height:1.7}.tj-field{display:block;margin:15px 0}.tj-field>span:first-child{display:block;font-weight:600;margin-bottom:6px}.tj-hint{font-size:11px;color:var(--tj-muted);margin-top:6px;line-height:1.7}.tj-notice{background:var(--tj-soft);border:1px solid var(--tj-line);border-radius:10px;padding:11px 14px;margin:0 0 17px;font-size:12px;line-height:1.7}.tj-notice.error{color:#b04e40;background:color-mix(in srgb,#b04e40 7%,var(--tj-card))}.tj-notice .tj-btn{margin-left:8px}.tj-search{display:grid;grid-template-columns:minmax(160px,1fr) 150px 160px auto;gap:9px}.tj-searchbar{margin-bottom:17px}.tj-search-caption{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--tj-muted);padding:12px 1px 0}.tj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(245px,1fr));gap:19px}.tj-record{display:block;width:100%;text-align:left;padding:0;overflow:hidden;border:1px solid var(--tj-line);border-radius:14px;background:var(--tj-card);color:var(--tj-ink);cursor:pointer;transition:transform .15s,box-shadow .15s}.tj-record:hover{transform:translateY(-3px);box-shadow:0 9px 28px #142f2510}.tj-cover{aspect-ratio:1.5;background:var(--tj-soft);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.tj-cover>img{width:100%;height:100%;object-fit:cover}.tj-cover-label{position:absolute;bottom:11px;left:13px;z-index:1;background:#142b27b8;color:white;border:1px solid #ffffff30;border-radius:6px;padding:3px 8px;font-size:10px;backdrop-filter:blur(5px)}.tj-record-body{padding:16px 17px 18px}.tj-date{font-size:11px;letter-spacing:.04em;color:var(--tj-green);margin-bottom:5px}.tj-excerpt{font-size:12px;color:var(--tj-muted);margin:8px 0 13px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:39px}.tj-tags{display:flex;gap:5px;flex-wrap:wrap}.tj-tag{font-size:10px;border-radius:5px;padding:2px 7px;border:1px solid var(--tj-line);color:var(--tj-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tj-empty{padding:44px 25px;text-align:center;max-width:710px;margin:14px auto}.tj-empty-mark{width:66px;height:66px;display:grid;place-items:center;margin:0 auto 19px;border:1px solid var(--tj-line);border-radius:20px;background:var(--tj-soft);color:var(--tj-green)}.tj-empty h2{font-size:22px;margin-bottom:10px}.tj-empty .tj-btn{margin-top:18px}.tj-intro{max-width:740px;margin:0 auto}.tj-upload{display:block;width:100%;padding:34px 20px;text-align:center;border:1.5px dashed var(--tj-line);border-radius:14px;background:var(--tj-soft);color:var(--tj-ink);cursor:pointer}.tj-upload:hover,.tj-upload.drag{border-color:var(--tj-green)}.tj-upload strong{display:block;font-size:17px;margin:10px 0 4px}.tj-file-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}.tj-selected{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:9px;margin:17px 0}.tj-selected-item{position:relative;aspect-ratio:1;border-radius:9px;overflow:hidden;border:1px solid var(--tj-line);background:var(--tj-soft)}.tj-selected-item img{width:100%;height:100%;object-fit:cover}.tj-selected-item>span{display:flex;padding:10px;word-break:break-all;font-size:11px}.tj-remove{position:absolute;right:5px;top:5px;border:0;background:#172b25bd;border-radius:50%;width:22px;height:22px;color:white;cursor:pointer;line-height:18px}.tj-upload-footer{display:flex;align-items:center;gap:15px;justify-content:space-between;margin-top:21px}.tj-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tj-import-date{max-width:200px}.tj-detail-top{margin:20px 0}.tj-detail-title{font-size:26px!important;margin:12px 0 4px!important;letter-spacing:-.02em}.tj-note{white-space:pre-wrap;padding:10px 0;border-bottom:1px solid var(--tj-line)}.tj-note:last-child{border-bottom:0}.tj-photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;align-items:start}.tj-photo{margin:0;border:1px solid var(--tj-line);border-radius:14px;overflow:hidden;background:var(--tj-card)}.tj-photo>img{display:block;max-height:550px;width:100%;object-fit:contain;background:var(--tj-soft)}.tj-photo-body{padding:17px}.tj-photo-title{font-weight:600;margin-bottom:9px!important}.tj-meta{display:grid;grid-template-columns:72px minmax(0,1fr);gap:5px 10px;font-size:11px;margin:13px 0}.tj-meta>span:nth-child(odd){color:var(--tj-muted)}.tj-meta>span:nth-child(even){word-break:break-word}.tj-hash{font-family:ui-monospace,monospace;font-size:10px}.tj-photo-editor{border-top:1px solid var(--tj-line);margin-top:14px;padding-top:4px}.tj-photo-editor .tj-field{margin:11px 0}.tj-check{display:flex;gap:10px;align-items:flex-start;margin:20px 0;cursor:pointer}.tj-check input{margin-top:5px;accent-color:var(--tj-green)}.tj-check strong{font-weight:600}.tj-divider{border:0;border-top:1px solid var(--tj-line);margin:24px 0}.tj-settings{max-width:790px;margin:0 auto}.tj-map{height:440px;border-radius:13px;border:1px solid var(--tj-line);background:#edf1e9;z-index:0;overflow:hidden}.tj-map-heading{margin-bottom:17px}.tj-city-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:20px}.tj-city{display:flex;align-items:center;gap:13px;text-align:left;justify-content:flex-start;padding:15px;border-radius:12px;border:1px solid var(--tj-line);background:var(--tj-card);color:var(--tj-ink);cursor:pointer}.tj-city:hover{border-color:var(--tj-green)}.tj-city-dot{width:14px;height:14px;border-radius:50%;background:#d7a249;box-shadow:0 0 0 7px #d7a2491c;margin:0 5px;flex-shrink:0}.tj-city strong{display:block;font-size:14px;font-weight:600}.tj-city small{color:var(--tj-muted);font-size:11px}.tj-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:11px 20px;background:#203e31;color:white;border:1px solid #ffffff20;box-shadow:0 5px 30px #0002;border-radius:11px;font-size:12px;z-index:2000;max-width:80%}.tj-loading{padding:60px 20px;text-align:center;color:var(--tj-muted)}.tj-spinner{width:13px;height:13px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;display:inline-block;animation:tj-spin .9s linear infinite}.tj-processing{display:inline-flex;gap:7px;align-items:center;color:var(--tj-green);font-size:11px}.tj-backup-row{padding-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.tj-model{padding:9px 12px;border:1px solid var(--tj-line);background:var(--tj-soft);border-radius:8px;font-size:12px;word-break:break-all}.tj-subhead{margin:0 0 17px}.tj-pop{font:12px/1.6 system-ui;max-width:220px}.tj-pop button{background:#39775e;border:0;border-radius:5px;color:white;padding:5px 9px;margin-top:8px;cursor:pointer}@keyframes tj-spin{to{transform:rotate(360deg)}}@media(max-width:850px){.tj{padding-left:18px;padding-right:18px}.tj-search{grid-template-columns:1fr 130px}.tj-hero-actions .tj-stat{display:none}.tj-hero{padding-top:20px}.tj-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}@media(max-width:550px){.tj-hero{align-items:flex-start}.tj h1{font-size:26px}.tj-hero-actions{padding-top:22px}.tj-two{grid-template-columns:1fr}.tj-nav button{padding:10px}.tj-map{height:350px}.tj-photo-grid{grid-template-columns:1fr}.tj-upload-footer{align-items:flex-start;flex-direction:column}.tj-search{grid-template-columns:1fr 120px}.tj-stat{display:none}}
`;
    const GROUP_CSS = `.tj-city-heading{display:flex;align-items:baseline;gap:11px;margin:0 0 12px}.tj-city-heading span{font-size:11px;color:var(--tj-muted)}.tj-city-section{margin:24px 0}.tj-record-cities{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin:6px 0;color:var(--tj-green);font-size:11px}.tj-selected-file{aspect-ratio:auto;min-height:116px;display:flex;flex-direction:column;align-items:flex-start;padding:14px 9px 9px;gap:7px}.tj-selected-file>span{padding:0;word-break:break-all;font-size:11px;flex:1}.tj-selected-file .tj-btn{font-size:10px;padding:2px 7px}.tj-selection-preview{margin:12px 0;padding:12px;border:1px solid var(--tj-line);border-radius:10px;background:var(--tj-soft)}.tj-selection-preview img{display:block;max-height:320px;max-width:100%;margin:10px auto;object-fit:contain}.tj-selection-preview-name{overflow-wrap:anywhere;font-size:12px}`;
    const ARCHIVE_TOOLBAR_CSS = `
.tj-archive-toolbar{position:sticky;top:0;z-index:2;display:flow-root;background:var(--tj-bg)}
html[data-platform=darwin]:not([data-fullscreen]) .tj-archive-toolbar{top:var(--dsh-frame-top-clearance,0px)}
`;
    function Icon({ name = 'journal', size = 18 } = {}) {
      const paths = {
        journal: 'M5 3h12a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Zm-1 14h15M8 7h7M8 11h5',
        plus: 'M12 5v14M5 12h14',
        photo: 'M3 5h18v15H3V5Zm0 12 6-6 5 5 3-3 4 4M15 9h.01',
        map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',
        pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
        settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
        search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
        arrow: 'M12 4v12m-5-5 5 5 5-5M4 17v4h16v-4',
      };
      return h('svg', { className: 'tj-icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: paths[name] || paths.journal }));
    }
    const PLACE_FAILURE_LABELS = { 'unsupported-region': '地图未收录', 'name-missing': '地名待补充', 'data-unavailable': '离线数据不可用', disabled: '已关闭解析', 'no-gps': '没有定位', closed: '服务已关闭', aborted: '已取消', internal: '内部错误', exception: '解析异常', unknown: '未知原因', legacy: '旧地名待更新' };
    const placeFailureText = (failures) => Object.entries(failures || {}).map(([kind, count]) => `${PLACE_FAILURE_LABELS[kind] || kind} ${count}`).join('、');
    const noteText = (note) => typeof note === 'string' ? note : note?.text || '';
    const placeText = (place) => typeof place === 'string' ? place : place?.city || place?.name || place?.displayName || place?.display_name || '';
    const photoPlaceText = (place) => typeof place === 'string' ? place : [...new Set([place?.city, place?.district].filter(Boolean))].join(' · ') || placeText(place);
    const ACTION_CSS = `.tj-inline-title{width:100%;font:inherit!important;font-weight:inherit!important;line-height:inherit!important;padding:0 2px;border:1px solid var(--tj-green);border-radius:4px;background:var(--tj-card);color:var(--tj-ink)}.tj-inline-caption{display:block;width:100%;min-height:4em;resize:vertical;font:inherit;line-height:1.65;color:var(--tj-ink);background:var(--tj-card);border:1px solid var(--tj-green);border-radius:5px;padding:4px 6px}.tj-inline-actions{display:flex;gap:8px;margin-top:10px}.tj-context-menu{position:fixed;z-index:3000;min-width:155px;padding:5px;border:1px solid var(--tj-line);border-radius:9px;background:var(--tj-card);box-shadow:0 8px 30px #0003}.tj-context-menu button{display:block;width:100%;border:0;background:none;color:var(--tj-ink);padding:8px 12px;text-align:left;border-radius:5px;cursor:pointer}.tj-context-menu button:hover,.tj-context-menu button:focus-visible{background:var(--tj-soft)}.tj-context-menu .danger,.tj-delete-dialog .danger{color:#bd5647}.tj-dialog-backdrop{position:fixed;inset:0;z-index:3100;background:#0006;display:grid;place-items:center;padding:24px}.tj-delete-dialog{width:min(420px,100%);padding:24px;border:1px solid var(--tj-line);border-radius:14px;background:var(--tj-card);box-shadow:0 15px 60px #0004}.tj-delete-dialog p{margin:12px 0 18px}.tj-detail-fold{margin-top:12px}.tj-detail-fold .tj-field{margin:12px 0}.tj-photo-edit-actions{margin-top:12px}`;
    function ContextMenu({ menu, close, remove }) {
      const box = useRef(null);
      useEffect(() => {
        if (typeof document === 'undefined') return;
        const outside = (event) => { if (!box.current?.contains(event.target)) close(); }, key = (event) => { if (event.key === 'Escape') close(); };
        document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key); document.addEventListener('scroll', close, true);
        box.current?.querySelector('[role="menuitem"]')?.focus();
        return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key); document.removeEventListener('scroll', close, true); };
      }, []);
      return h('div', { ref: box, className: 'tj-context-menu', role: 'menu', 'aria-label': menu.kind === 'record' ? '整日档案操作' : '照片操作', style: { left: menu.x, top: menu.y } },
        h('button', { type: 'button', role: 'menuitem', onClick: () => { menu.edit(); close(); } }, menu.kind === 'record' ? '编辑整日信息' : '编辑信息'),
        menu.cover ? h('button', { type: 'button', role: 'menuitem', onClick: () => { close(); menu.cover(); } }, '更换封面') : null,
        h('button', { type: 'button', role: 'menuitem', className: 'danger', onClick: remove }, menu.kind === 'record' ? '删除整天' : '删除单图'));
    }
    function DeleteDialog({ item, busy, error, cancel, confirm }) {
      const box = useRef(null);
      useEffect(() => {
        const previous = typeof document !== 'undefined' ? document.activeElement : null;
        box.current?.querySelector('button')?.focus(); return () => previous?.focus?.();
      }, []);
      function key(event) {
        if (event.key === 'Escape' && !busy) { event.preventDefault(); cancel(); }
        if (event.key === 'Tab') { const controls = box.current?.querySelectorAll('button:not(:disabled)'); if (!controls?.length) return; const first = controls[0], last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
      }
      return h('div', { className: 'tj-dialog-backdrop' }, h('div', { ref: box, className: 'tj-delete-dialog', role: 'alertdialog', 'aria-modal': true, 'aria-labelledby': 'tj-delete-title', 'aria-describedby': 'tj-delete-description', onKeyDown: key },
        h('h2', { id: 'tj-delete-title' }, item.kind === 'record' ? '删除这一天？' : '删除这张照片？'),
        h('p', { id: 'tj-delete-description' }, item.kind === 'record' ? `“${item.record.title || dateText(item.record.date)}”的整日记录和 ${item.record.photoCount ?? item.record.media?.length ?? 0} 张照片将从旅行档案及足迹地图中移除。` : `“${item.media.name || '这张照片'}”将从旅行档案及足迹地图中移除。若这是当天最后一张照片，这一天的记录也会一并移除。`),
        error ? h('div', { className: 'tj-notice error', role: 'alert' }, error) : null,
        h('div', { className: 'tj-row', style: { justifyContent: 'flex-end' } }, h('button', { className: 'tj-btn', type: 'button', disabled: busy, onClick: cancel }, '取消'), h('button', { className: 'tj-btn danger', type: 'button', disabled: busy, onClick: confirm }, busy ? '正在删除…' : '确认删除'))));
    }
    function externalURL(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }
    function DemoSources({ api }) {
      const [info, setInfo] = useState(null), [error, setError] = useState('');
      return h('details', { className: 'tj-hint', onToggle: (event) => { if (event.currentTarget.open && !info) api('/demo-info').then(setInfo).catch((problem) => setError(problem.message)); } }, h('summary', { style: { cursor: 'pointer' } }, '示例照片来源与许可'), error ? h('p', null, error) : null, info ? h(React.Fragment, null, h('p', null, info.notice), ...(info.photos || []).map((photo) => h('p', { key: photo.id }, h('a', { href: externalURL(photo.pageUrl), target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--tj-green)' } }, photo.title), ` — ${photo.author} · `, h('a', { href: externalURL(photo.licenseUrl), target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--tj-green)' } }, photo.license), h('br'), '已替换为模拟日期和位置，图像内容未改动。'))) : h('p', null, '正在读取来源…'));
    }
    function displayTime(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    function dateText(value) { return value ? String(value).replace(/-/g, '.') : '日期待补充'; }
    function recordCityGroups(record) {
      const media = record.media || [], byId = new Map(media.map((photo) => [photo.id, photo])), included = new Set(), groups = [];
      for (const group of Array.isArray(record.cityGroups) ? record.cityGroups : []) {
        const photos = (Array.isArray(group.photoIds) ? group.photoIds : []).filter((id) => byId.has(id) && !included.has(id)).map((id) => { included.add(id); return byId.get(id); });
        if (photos.length) groups.push({ key: String(group.key || `city-${groups.length}`), name: String(group.name || '地点待补充'), photos });
      }
      const remaining = new Map();
      for (const photo of media) {
        if (included.has(photo.id)) continue;
        const place = photo.place && typeof photo.place === 'object' ? photo.place : {};
        const rawCity = typeof place.city === 'string' ? place.city.trim() : '';
        // A district, county, or an arbitrary place name is not city evidence.
        const city = rawCity && !/[区县旗]$/.test(rawCity) && (rawCity !== place.district || /市$/.test(rawCity)) ? rawCity : '';
        const key = city ? JSON.stringify([place.country || '', place.province || '', city]) : 'pending-place';
        if (!remaining.has(key)) remaining.set(key, { key, name: city || '地点待补充', photos: [] });
        remaining.get(key).photos.push(photo);
      }
      return [...groups, ...remaining.values()];
    }
    function savedRecords(result) { return Array.isArray(result.records) ? result.records : result.record ? [result.record] : []; }
    function importNotice(result, selectedCount) {
      const records = savedRecords(result), days = new Set(records.map((record) => record.date).filter(Boolean)).size;
      const photos = Number.isSafeInteger(result.importedPhotos) && result.importedPhotos >= 0 ? result.importedPhotos : selectedCount;
      const undated = records.some((record) => !record.date);
      return `${days ? `已按 ${days} 天归档` : '已保存待补日期的档案'}，共 ${photos} 张照片。${days && undated ? '另有日期待补充的照片。' : ''}正在后台整理。`;
    }
    function capturedText(media) { const value = media.metadata?.capturedAt; return typeof value === 'object' && value ? value.value || value.raw || JSON.stringify(value) : value || '未检测到'; }
    function gpsOf(media) { return media.metadata?.gps; }
    function Metadata({ media }) {
      const metadata = media.metadata || {}, gps = gpsOf(media);
      return h('div', { className: 'tj-meta' },
        h('span', null, '拍摄时间'), h('span', null, capturedText(media), Object.hasOwn(media.userEdits || {}, 'capturedAt') ? '（已更正）' : ''),
        h('span', null, '拍摄位置'), h('span', null, gps ? `${Number(gps.latitude).toFixed(5)}, ${Number(gps.longitude).toFixed(5)}` : '未检测到 GPS'),
        h('span', null, '原图尺寸'), h('span', null, `${metadata.width || '—'} × ${metadata.height || '—'} · ${metadata.bytes ? (metadata.bytes / 1048576).toFixed(2) + ' MB' : '大小未知'}`),
        h('span', null, '文件校验'), h('span', { className: 'tj-hash', title: metadata.sha256 || '' }, metadata.sha256 ? metadata.sha256.slice(0, 20) + '…' : '—'));
    }
    function RecordCard({ record, open, api, updated, onMenu, onCover, notify = () => {} }) {
      const [editing, setEditing] = useState(false), [title, setTitle] = useState(record.title || ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
      const flight = useRef(false), editingSession = useRef(false), titleBaseline = useRef(record.title || '');
      useEffect(() => { if (!editing) setTitle(record.title || ''); }, [record.title, editing]);
      function edit() { editingSession.current = true; titleBaseline.current = record.title || ''; setTitle(record.title || ''); setEditing(true); setError(''); }
      async function save() {
        if (flight.current || !editingSession.current) return;
        if (title.trim() === titleBaseline.current) { editingSession.current = false; setEditing(false); setError(''); return; }
        flight.current = true; setBusy(true); setError('');
        try { const result = await api('/edit-record', { body: { id: record.id, title: title.trim() } }); updated(result.record, { recordId: record.id }); editingSession.current = false; setEditing(false); notify('整日标题已更新。'); }
        catch (problem) { setError(problem.message); } finally { flight.current = false; setBusy(false); }
      }
      function activate() { if (!editing) return open(record.id, record.matchedPhotoIds || []); }
      const cover = record.media?.find((media) => media.previewUrl);
      const places = Array.from(new Set((record.cityGroups?.length ? record.cityGroups : recordCityGroups(record)).filter((group) => group.key !== 'unknown' && group.key !== 'pending-place' && group.name && group.name !== '地点待补充').map((group) => group.name)));
      const cityLine = places.length ? places.join('　') : '地点待补充';
      function showMenu(event) { onMenu?.(event, { kind: 'record', record, edit, cover: onCover && (record.photoCount ?? record.media?.length ?? 0) > 0 ? () => onCover(record) : undefined }); }
      return h('article', { className: 'tj-record', role: 'button', tabIndex: 0, onClick: activate, onKeyDown: (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) showMenu(event);
        if (['Enter', ' '].includes(event.key)) { event.preventDefault(); activate(); }
      }, onContextMenu: showMenu },
        h('div', { className: 'tj-cover' }, cover ? h('img', { src: cover.previewUrl, alt: record.title || '旅行照片', loading: 'lazy', decoding: 'async' }) : h(Icon, { name: 'photo', size: 40 })),
        h('div', { className: 'tj-record-body' }, h('div', { className: 'tj-date' }, dateText(record.date)), h('h3', null, editing ? h('input', { className: 'tj-inline-title', 'aria-label': '整日标题', autoFocus: true, value: title, maxLength: 100, disabled: busy, onClick: (event) => event.stopPropagation(), onChange: (event) => setTitle(event.target.value), onKeyDown: (event) => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); save(); } if (event.key === 'Escape' && !busy) { editingSession.current = false; setEditing(false); setError(''); } }, onBlur: () => { if (!flight.current) save(); } }) : record.title || '一段旅行记忆'),
          error ? h('div', { className: 'tj-hint', role: 'alert', style: { color: '#bd5647' } }, error) : null,
          h('div', { className: 'tj-record-cities', title: cityLine }, cityLine),
          h('div', { className: 'tj-excerpt' }, record.summary || (record.notes || []).map(noteText).join(' ') || '照片已保存，正在整理这一天的记忆。'),
          h('div', { className: 'tj-tags' }, record.demo ? h('span', { className: 'tj-tag' }, '演示记录') : null, h('span', { className: 'tj-tag' }, `${record.photoCount ?? record.media?.length ?? 0} 张照片`), ...(record.tags || []).slice(0, 3).map((tag, i) => h('span', { className: 'tj-tag', key: i }, String(tag))))));
    }
    // The observer watches the scrolling plugin panel, with a button for browsers
    // without IntersectionObserver and for explicit retries after an error.
    function LoadMore({ count, total, hasMore, loading = false, error = '', onMore, unit = '天的记忆' }) {
      const sentinel = useRef(null), action = useRef(onMore); action.current = onMore;
      useEffect(() => {
        if (!hasMore || loading || error || !sentinel.current || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) action.current(); }, { root: sentinel.current.closest?.('.tj') || null, rootMargin: '400px 0px' });
        observer.observe(sentinel.current); return () => observer.disconnect();
      }, [count, hasMore, loading, error]);
      return h('div', { className: 'tj-load-more', ref: sentinel, style: { padding: '25px 0', textAlign: 'center' }, 'aria-live': 'polite' },
        error ? h('p', { className: 'tj-notice error', role: 'alert' }, error) : null,
        hasMore || error || loading ? h('button', { className: 'tj-btn', type: 'button', disabled: loading, onClick: onMore }, loading ? '正在加载…' : error ? '重试加载' : '加载更多') : null,
        h('p', { className: 'tj-hint' }, hasMore || loading || error ? `已显示 ${count}${Number.isFinite(total) ? ` / ${total}` : ''} ${unit}` : `已显示全部 ${count} ${unit}`));
    }
    const IMPORT_TERMINAL = new Set(['completed', 'cancelled']);
    const IMPORT_LABELS = { running: '正在归档', receiving: '等待接收原图', waiting: '排队等待', paused: '已暂停', completed: '已完成', cancelled: '已取消' };
    const importJobs = (queue) => Array.from(new Map([...(queue?.retryable || []), ...(queue?.recent || []), ...(queue?.waiting || []), queue?.active].filter(Boolean).map((job) => [job.id, job])).values());
    const IMPORT_RESULT_CSS = `.tj-import-results{margin:0 0 18px;padding:16px;border:1px solid var(--tj-line);border-radius:12px;background:var(--tj-card)}.tj-import-results-scroll{max-height:300px;overflow:auto;margin-top:10px}.tj-import-results table{width:100%;min-width:670px;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums}.tj-import-results th{position:sticky;top:0;background:var(--tj-card);color:var(--tj-muted);font-weight:500}.tj-import-results th,.tj-import-results td{padding:8px 7px;border-bottom:1px solid var(--tj-line);text-align:right;vertical-align:top}.tj-import-results th:first-child,.tj-import-results td:first-child,.tj-import-results th:nth-child(2),.tj-import-results td:nth-child(2){text-align:left}.tj-import-result-name{max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tj-import-result-state{max-width:180px;min-width:130px}.tj-import-result-good{color:var(--tj-green)}.tj-import-result-warning{color:#b04e40}.tj-import-results .tj-hint{font-size:10px}.tj-import-results .tj-btn{font-size:11px}`;
    function importResult(job) {
      const counts = Object.fromEntries(['total', 'saved', 'duplicates', 'deleted', 'failed', 'cancelled'].map((key) => [key, Number(job[key] ?? (key === 'total' ? NaN : 0))]));
      const processed = counts.saved + counts.duplicates + counts.deleted + counts.failed + counts.cancelled;
      const verified = Object.values(counts).every((value) => Number.isSafeInteger(value) && value >= 0) && processed === counts.total && Number(job.remaining ?? 0) === 0;
      const imported = verified && counts.saved + counts.duplicates === counts.total;
      const label = !verified ? '数量待核对' : job.status === 'cancelled' || counts.cancelled > 0 ? imported ? '已取消；照片已全部入库' : counts.failed > 0 ? '已取消且有失败' : '已取消；未完整导入' : counts.failed > 0 ? '有失败；未完整导入' : counts.deleted > 0 ? '曾删除，已跳过' : '全部已入库';
      return { counts, processed, verified, imported, label };
    }
    const importFilePath = new WeakMap();
    const fileRelativePath = (file) => importFilePath.get(file) || file.webkitRelativePath || file.name;
    const imageFile = (file) => /\.(?:jpe?g|png|webp|heic|heif|tiff?|gif|bmp|avif)$/i.test(file.name || '') || /^image\//.test(file.type || '');
    function hostFilePath(file) { try { return file && window.__DSH_HOST_PATHS__?.pathFor(file) || ''; } catch { return ''; } }
    function importRequestId() { return 'import-' + (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`); }
    function orderedFiles(files) { return [...files].sort((a, b) => { const x = JSON.stringify([fileRelativePath(a), a.size, a.lastModified || 0, a.type || '']), y = JSON.stringify([fileRelativePath(b), b.size, b.lastModified || 0, b.type || '']); return x < y ? -1 : x > y ? 1 : 0; }); }
    async function importManifest(files) {
      if (!globalThis.crypto?.subtle) throw new Error('当前界面无法生成续传校验，请使用“选择文件夹”从本机导入。');
      const manifest = JSON.stringify(orderedFiles(files).map((file) => [fileRelativePath(file), file.size, file.lastModified || 0, file.type || '']));
      const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(manifest));
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    function snapshotDrop(transfer) {
      const items = Array.from(transfer?.items || []).filter((item) => item.kind === 'file').map((item) => { const file = item.getAsFile?.(); return { file, path: hostFilePath(file), entry: item.webkitGetAsEntry?.() }; });
      return { items, files: Array.from(transfer?.files || []) };
    }
    async function droppedFiles(snapshot, isActive = () => true) {
      const files = [];
      async function visit(entry, prefix = '') {
        if (!isActive()) throw Object.assign(new Error('文件夹读取已停止。'), { stale: true });
        if (entry.isFile) { const file = await new Promise((resolve, reject) => entry.file(resolve, reject)); importFilePath.set(file, prefix + file.name); if (imageFile(file)) files.push(file); }
        else if (entry.isDirectory) { const reader = entry.createReader(); for (;;) { const entries = await new Promise((resolve, reject) => reader.readEntries(resolve, reject)); if (!entries.length) break; for (const child of entries) await visit(child, prefix + entry.name + '/'); } }
      }
      if (snapshot.items.some((item) => item.entry)) { for (const item of snapshot.items) { if (item.entry) await visit(item.entry); else if (item.file && imageFile(item.file)) files.push(item.file); } }
      else files.push(...snapshot.files.filter(imageFile));
      return files;
    }
    function ImportPanel({ api, state, onSaved, notify, visible = true, onShow = () => {} }) {
      const [files, setFiles] = useState([]), [previewFile, setPreviewFile] = useState(null), [previewUrl, setPreviewUrl] = useState(''), [notes, setNotes] = useState(''), [date, setDate] = useState('');
      const [provinces, setProvinces] = useState([]), [province, setProvince] = useState(''), [city, setCity] = useState(''), [placeError, setPlaceError] = useState(''), [placeLoading, setPlaceLoading] = useState(false);
      const [busy, setBusy] = useState(false), [error, setError] = useState(''), [drag, setDrag] = useState(false), [native, setNative] = useState(null), [shown, setShown] = useState(24);
      const [queue, setQueue] = useState(state.imports || { active: null, waiting: [], recent: [], waitingPhotos: 0, limit: 2000 });
      const [taskError, setTaskError] = useState(''), [, setActionBusy] = useState(''), [cancelJob, setCancelJob] = useState(null), [resumeTarget, setResumeTarget] = useState(null), [shownJobs, setShownJobs] = useState(5), [showAllResults, setShowAllResults] = useState(false);
      const [verification, setVerification] = useState(null);
      const input = useRef(null), directoryInput = useRef(null), flight = useRef(false), request = useRef(''), alive = useRef(true), selection = useRef(0), residents = useRef(new Map()), running = useRef(new Set()), controls = useRef(new Set()), queueRef = useRef(queue), resumeRef = useRef(null), placeFlight = useRef(false), taskProblem = useRef(null);
      queueRef.current = queue; resumeRef.current = resumeTarget;
      const cities = provinces.find((item) => item.name === province)?.cities || [];
      useEffect(() => { alive.current = true; return () => { alive.current = false; selection.current++; for (const item of residents.current.values()) item.paused = true; }; }, []);
      useEffect(() => { if (!previewFile) { setPreviewUrl(''); return; } const url = URL.createObjectURL(previewFile); setPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [previewFile]);
      async function loadPlaces() {
        if (placeFlight.current || !alive.current) return; placeFlight.current = true; setPlaceLoading(true); setPlaceError('');
        try { const result = await api('/geo/place-choices'); if (alive.current) setProvinces(result.provinces || []); }
        catch (problem) { if (alive.current && !problem.stale) setPlaceError(problem.message); }
        finally { placeFlight.current = false; if (alive.current) setPlaceLoading(false); }
      }
      useEffect(() => { if (visible && !provinces.length) void loadPlaces(); }, [visible]);
      function clearTaskProblem() { taskProblem.current = null; setTaskError(''); }
      function reportTaskProblem(problem, kind, jobId) { taskProblem.current = { kind, jobId }; setTaskError(problem.message); }
      function publish(value, authoritative = false) { if (alive.current) { queueRef.current = value; setQueue(value); if (authoritative && taskProblem.current?.kind === 'status') clearTaskProblem(); } }
      function remember(job) {
        if (!job || !alive.current) return;
        const old = queueRef.current, waiting = (old.waiting || []).filter((item) => item.id !== job.id), recent = (old.recent || []).filter((item) => item.id !== job.id), retryable = (old.retryable || []).filter((item) => item.id !== job.id);
        let active = old.active?.id === job.id ? null : old.active;
        if (IMPORT_TERMINAL.has(job.status)) { recent.unshift(job); if (job.failed > 0) retryable.unshift(job); } else if (job.status === 'waiting') waiting.push(job); else active = job;
        publish({ ...old, active, waiting, recent: recent.slice(0, 20), retryable });
      }
      async function refreshQueue() { try { const value = await api('/imports'); if (alive.current) publish(value, true); return value; } catch (problem) { throw Object.assign(problem, { importStatusRead: true }); } }
      useEffect(() => {
        if (!state.imports) return;
        publish(state.imports, true);
        for (const job of importJobs(state.imports)) {
          if (IMPORT_TERMINAL.has(job.status)) residents.current.delete(job.id);
          else {
            const resident = residents.current.get(job.id); if (!resident) continue;
            const paused = job.status === 'paused' || job.pauseRequested || job.cancelRequested;
            if (!controls.current.has(job.id)) {
              const resumed = resident.paused && !paused; resident.paused = Boolean(paused);
              if (resumed) { resident.halted = false; if (taskProblem.current?.jobId === job.id && taskProblem.current.kind !== 'admission') clearTaskProblem(); }
            }
            if (job.needsFiles && !paused && !resident.halted && !resident.paused) void pump(job);
          }
        }
      }, [state.imports]);
      async function pump(initial) {
        const resident = residents.current.get(initial.id);
        if (!resident || running.current.has(initial.id) || resident.paused || resident.halted || !alive.current) return;
        running.current.add(initial.id);
        try {
          let job = initial;
          while (alive.current && !resident.paused && !resident.halted && !IMPORT_TERMINAL.has(job.status) && job.status !== 'paused' && !job.pauseRequested && !job.cancelRequested && Number(job.received || 0) < job.total) {
            const offset = Number(job.received || 0), form = new FormData();
            resident.files.slice(offset, offset + 50).forEach((file) => form.append('files', file, file.name));
            const result = await api('/imports/receive?' + new URLSearchParams({ jobId: job.id, offset: String(offset), manifestKey: job.manifestKey }), { body: form, timeoutMs: 600000 });
            if (!alive.current) return;
            job = result.job; remember(job);
            if (Number(job.received || 0) <= offset && !IMPORT_TERMINAL.has(job.status)) throw new Error('这一段尚未确认接收，请点击“继续上传”核对进度后重试。');
          }
          if (alive.current) { await refreshQueue(); onSaved(); }
        } catch (problem) {
          if (!problem.importStatusRead) resident.halted = true;
          if (alive.current && !problem.stale && !resident.paused) reportTaskProblem(problem, problem.importStatusRead ? 'status' : 'upload', initial.id);
          if (alive.current && problem.importStatusRead) onSaved();
        } finally { running.current.delete(initial.id); }
      }
      function changed() { request.current = ''; selection.current++; setShown(24); setError(''); }
      function nativePaths(value) { return value?.paths || (value?.path ? [value.path] : []); }
      function mixedSelectionError() { setError('当前选择已保留。这些照片无法与本机文件夹安全合并，请先提交当前选择，再添加另一批照片；也可以先清空选择。'); }
      function select(incoming, replace = false) {
        if (flight.current) return;
        const incomingFiles = Array.from(incoming || []).filter(imageFile);
        if (!incomingFiles.length) { setError('没有找到支持的照片文件，当前选择已保留。'); return; }
        if (native && !resumeRef.current) {
          const paths = incomingFiles.map(hostFilePath);
          if (!paths.every(Boolean) || !nativePaths(native).length) { mixedSelectionError(); return; }
          changed(); setNative({ paths: [...new Set([...nativePaths(native), ...paths])] }); return;
        }
        const next = replace || resumeRef.current ? [] : [...files];
        for (const file of incomingFiles) if (!next.includes(file)) next.push(file);
        changed(); setNative(null); setFiles(next);
      }
      async function drop(event) {
        event.preventDefault(); setDrag(false);
        if (flight.current) return;
        const snapshot = snapshotDrop(event.dataTransfer), generation = ++selection.current;
        flight.current = true; setBusy(true); setError('');
        try {
          const topItems = snapshot.items.length ? snapshot.items : snapshot.files.map((file) => ({ file, path: hostFilePath(file) })), previousPaths = files.map(hostFilePath);
          if (!resumeRef.current && topItems.length && topItems.every((item) => item.path) && previousPaths.every(Boolean)) {
            request.current = ''; setFiles([]); setNative({ paths: [...new Set([...(native?.paths || (native?.path ? [native.path] : [])), ...previousPaths, ...topItems.map((item) => item.path)])] }); setPreviewFile(null);
          } else {
            const collected = await droppedFiles(snapshot, () => alive.current && generation === selection.current); if (!alive.current || generation !== selection.current) return;
            if (!collected.length) { setError('文件夹里没有找到支持的照片文件，当前选择已保留。'); return; }
            if (native && !resumeRef.current) {
              const paths = collected.map(hostFilePath);
              if (!paths.every(Boolean) || !nativePaths(native).length) { mixedSelectionError(); return; }
              request.current = ''; setNative({ paths: [...new Set([...nativePaths(native), ...paths])] }); return;
            }
            request.current = ''; setShown(24); setNative(null); setFiles((before) => resumeRef.current ? collected : [...before, ...collected]); setPreviewFile(null);
          }
        } catch (problem) { if (alive.current) setError('读取拖入的文件夹失败：' + problem.message); }
        finally { if (alive.current) { flight.current = false; setBusy(false); } }
      }
      async function pickFolder() {
        if (flight.current) return; flight.current = true; setBusy(true); setError(''); const generation = selection.current;
        try {
          const bridge = window.__DSH_DIRECTORY_PICKER__;
          const picked = typeof bridge?.pick === 'function' ? await bridge.pick().then((path) => path ? { paths: [path], path } : { cancelled: true }) : await api('/imports/pick', { body: {}, timeoutMs: 600000 });
          if (alive.current && generation === selection.current && !picked.cancelled) {
            const paths = files.map(hostFilePath), prior = nativePaths(native), selected = nativePaths(picked);
            if ((files.length && !paths.every(Boolean)) || (native && !prior.length) || ((files.length || native) && !selected.length)) { mixedSelectionError(); return; }
            changed(); setNative(files.length || native ? { paths: [...new Set([...prior, ...paths, ...selected])] } : picked); setFiles([]); setPreviewFile(null); setResumeTarget(null);
          }
        }
        catch (problem) { if (alive.current && !problem.stale) setError(problem.message); }
        finally { if (alive.current) { flight.current = false; setBusy(false); } }
      }
      async function verifyReselectedPrefix(job, ordered, checked = 0) {
        while (checked < Number(job.received || 0)) {
          const end = Math.min(checked + 50, Number(job.received)), form = new FormData();
          setVerification({ checked, total: Number(job.received) });
          ordered.slice(checked, end).forEach((file) => form.append('files', file, file.name));
          // The host hashes each file and compares retained SHA evidence. These
          // acknowledged segments verify bytes without saving/importing twice.
          const result = await api('/imports/receive?' + new URLSearchParams({ jobId: job.id, offset: String(checked), manifestKey: job.manifestKey }), { body: form, timeoutMs: 600000 });
          if (!alive.current) return null;
          if (result.job.id !== job.id || Number(result.job.received || 0) < end) throw new Error('已接收照片的校验进度不一致，请重新核对后续传。');
          job = result.job; checked = end; remember(job);
          setVerification({ checked, total: Number(job.received) });
          // Another window may have received more while this segment was being
          // checked. Verify that new prefix too, instead of skipping over it.
        }
        return { job, checked };
      }
      async function submit(event) {
        event.preventDefault(); if (flight.current) return;
        if (!files.length && !native) { setError('先选择要归档的照片或文件夹吧。'); return; }
        if (!resumeTarget && province && !cities.includes(city)) { setError('请选择统一地址的城市，或清空统一地址。'); return; }
        flight.current = true; setBusy(true); setError(''); clearTaskProblem();
        request.current ||= importRequestId();
        let acceptedJob;
        try {
          let job;
          const address = !resumeTarget && province && city ? { province, city } : {};
          const paths = files.map(hostFilePath), localPaths = files.length && paths.every(Boolean) ? [...new Set(paths)] : null;
          if (resumeTarget || (!native && !localPaths)) {
            const ordered = orderedFiles(files), manifestKey = await importManifest(ordered);
            if (!alive.current) return;
            if (resumeTarget) {
              if (manifestKey !== resumeTarget.manifestKey || ordered.length !== resumeTarget.total) throw new Error('所选照片与原任务不一致。请重新选择原来的完整文件清单或文件夹，已接收的照片会核对内容，不会重复入库。');
              const fresh = await refreshQueue(); job = importJobs(fresh).find((item) => item.id === resumeTarget.id);
              if (!job || IMPORT_TERMINAL.has(job.status)) throw new Error('这个任务已经结束，请查看任务列表。');
              let verified = await verifyReselectedPrefix(job, ordered); if (!verified) return; job = verified.job;
              if (job.status === 'paused') job = (await api('/imports/action', { body: { jobId: job.id, action: 'resume' } })).job;
              verified = await verifyReselectedPrefix(job, ordered, verified.checked); if (!verified) return; job = verified.job;
              if (IMPORT_TERMINAL.has(job.status)) throw new Error('这个任务已经结束。所选照片已保留，可以取消重选后按新批次导入。');
            } else job = (await api('/imports/upload', { body: { requestId: request.current, count: ordered.length, manifestKey, notes, date, ...address } })).job;
            if (!alive.current) return;
            residents.current.set(job.id, { files: ordered, paused: false, halted: false });
          } else {
            const body = { requestId: request.current, notes, date, ...address };
            const endpoint = native?.folderToken ? '/imports/folder' : '/imports/paths';
            if (native?.folderToken) body.folderToken = native.folderToken; else body.paths = native?.paths || localPaths;
            job = (await api(endpoint, { body, timeoutMs: 600000 })).job;
          }
          if (!alive.current) return;
          acceptedJob = job;
          remember(job); setFiles([]); setNative(null); setNotes(''); setDate(''); setProvince(''); setCity(''); setPreviewFile(null); setResumeTarget(null); request.current = '';
          notify(job.status === 'waiting' ? '已加入等待队列，可以继续浏览档案。' : '导入任务已接收，可以继续浏览档案。');
          if (job.kind === 'upload' && Number(job.received || 0) < job.total) void pump(job); else { await refreshQueue(); onSaved(); }
        } catch (problem) { if (alive.current && !problem.stale) { if (!problem.importStatusRead) setError(problem.message); reportTaskProblem(problem, problem.importStatusRead ? 'status' : 'admission', acceptedJob?.id); if (acceptedJob || problem.importStatusRead) onSaved(); else refreshQueue().catch(() => {}); } }
        finally { if (alive.current) { flight.current = false; setBusy(false); setVerification(null); } }
      }
      async function act(job, action) {
        if (controls.current.has(job.id)) return; controls.current.add(job.id); setActionBusy(job.id); clearTaskProblem();
        const resident = residents.current.get(job.id);
        if (resident && (action === 'pause' || action === 'cancel')) resident.paused = true;
        try {
          const result = await api('/imports/action', { body: { jobId: job.id, action } }); if (!alive.current) return;
          remember(result.job); setCancelJob(null);
          if (resident && (action === 'resume' || action === 'retry')) { resident.paused = false; resident.halted = false; void pump(result.job); }
          if (action === 'cancel') residents.current.delete(job.id);
          await refreshQueue();
          onSaved();
        } catch (problem) { if (resident && !problem.importStatusRead) resident.halted = true; if (alive.current && !problem.stale) { reportTaskProblem(problem, problem.importStatusRead ? 'status' : 'action', job.id); if (problem.importStatusRead) onSaved(); } }
        finally { controls.current.delete(job.id); if (alive.current) setActionBusy(''); }
      }
      async function continueUpload(job) {
        const resident = residents.current.get(job.id); if (!resident) return;
        resident.halted = false; resident.paused = false; clearTaskProblem();
        try { const current = importJobs(await refreshQueue()).find((item) => item.id === job.id); if (current) await pump(current); }
        catch (problem) { resident.halted = true; if (alive.current && !problem.stale) reportTaskProblem(problem, problem.importStatusRead ? 'status' : 'upload', job.id); }
      }
      function reselect(job, folder) { if (flight.current) return; setResumeTarget(job); resumeRef.current = job; setFiles([]); setNative(null); setProvince(''); setCity(''); setError(''); request.current = ''; onShow(); (folder ? directoryInput : input).current?.click(); }
      function jobRow(job) {
        const terminal = IMPORT_TERMINAL.has(job.status), resident = residents.current.get(job.id), processed = ['saved', 'duplicates', 'deleted', 'failed', 'cancelled'].reduce((n, key) => n + Number(job[key] || 0), 0);
        return h('div', { className: 'tj-import-job', key: job.id, style: { borderTop: '1px solid var(--tj-line)', paddingTop: 10, marginTop: 10 } },
          h('div', { className: 'tj-row tj-between' }, h('strong', null, job.sourceName || `${job.total} 张照片`), h('span', { className: 'tj-hint' }, job.cancelRequested ? '本张完成后取消' : job.pauseRequested ? '本张完成后暂停' : IMPORT_LABELS[job.status] || job.status)),
          h('p', { className: 'tj-hint', role: 'status' }, `已处理 ${Math.min(processed, job.total)} / ${job.total} 张 · 已保存 ${job.saved || 0} · 重复 ${job.duplicates || 0} · 失败 ${job.failed || 0}`, job.deleted ? ` · 已删除 ${job.deleted}` : '', job.cancelled ? ` · 已取消 ${job.cancelled}` : '', job.kind === 'upload' ? ` · 已接收 ${job.received || 0} / ${job.total}` : ''),
          !terminal ? h('progress', { value: Math.min(processed, job.total), max: Math.max(1, job.total), style: { width: '100%', accentColor: 'var(--tj-green)' }, 'aria-label': '照片归档进度' }) : null,
          job.error ? h('p', { className: 'tj-hint' }, job.error) : null,
          h('div', { className: 'tj-row' },
            !terminal && job.status !== 'waiting' ? h('button', { className: 'tj-btn small', type: 'button', disabled: controls.current.has(job.id) || job.pauseRequested || job.cancelRequested, onClick: () => act(job, job.status === 'paused' ? 'resume' : 'pause') }, job.status === 'paused' ? '继续导入' : '暂停') : null,
            !terminal && job.needsFiles && job.status !== 'paused' && resident?.halted ? h('button', { className: 'tj-btn small', type: 'button', disabled: controls.current.has(job.id), onClick: () => continueUpload(job) }, '继续上传') : null,
            !terminal && job.needsFiles && !resident ? h(React.Fragment, null, h('button', { className: 'tj-btn small', type: 'button', onClick: () => reselect(job, false) }, '重选原照片续传'), h('button', { className: 'tj-btn small', type: 'button', onClick: () => reselect(job, true) }, '重选原文件夹续传')) : null,
            terminal && job.failed > 0 ? h('button', { className: 'tj-btn small', type: 'button', disabled: controls.current.has(job.id), onClick: () => act(job, 'retry') }, '重试失败项') : null,
            !terminal ? h('button', { className: 'tj-btn small', type: 'button', disabled: controls.current.has(job.id) || job.cancelRequested, onClick: () => setCancelJob(job.id) }, '取消剩余导入') : null),
          cancelJob === job.id ? h('div', { className: 'tj-notice', style: { marginTop: 10 }, role: 'alert' }, '取消剩余导入？已经归档的照片会保留。', h('button', { className: 'tj-btn small', type: 'button', disabled: controls.current.has(job.id), onClick: () => act(job, 'cancel') }, '确认取消'), h('button', { className: 'tj-btn small', type: 'button', onClick: () => setCancelJob(null) }, '继续保留')) : null);
      }
      const hasSelection = files.length > 0 || native;
      const liveIds = new Set([queue.active, ...(queue.waiting || [])].filter(Boolean).map((job) => job.id));
      const recentOrder = new Map((queue.recent || []).map((job, index) => [job.id, index]));
      const resultJobs = Array.from(new Map([...(queue.retryable || []), ...(queue.recent || [])].filter((job) => IMPORT_TERMINAL.has(job.status) && !liveIds.has(job.id)).map((job) => [job.id, job])).values()).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')) || (recentOrder.get(a.id) ?? Infinity) - (recentOrder.get(b.id) ?? Infinity));
      const visibleResults = resultJobs.filter((job, index) => showAllResults || index === 0 || job.failed > 0), hiddenResults = resultJobs.length - visibleResults.length;
      function resultRow(job) {
        const result = importResult(job), count = (key) => Number.isSafeInteger(result.counts[key]) && result.counts[key] >= 0 ? result.counts[key] : '—';
        const reasons = [...new Set((job.failureReasons || []).filter((reason) => typeof reason === 'string' && reason.trim()))];
        return h('tr', { key: job.id, 'data-import-job': job.id },
          h('td', null, h('div', { className: 'tj-import-result-name', title: job.sourceName || '' }, job.sourceName || `${count('total')} 张照片`), job.updatedAt || job.createdAt ? h('div', { className: 'tj-hint' }, displayTime(job.updatedAt || job.createdAt)) : null),
          h('td', { className: 'tj-import-result-state' }, h('strong', { className: result.imported && job.status !== 'cancelled' ? 'tj-import-result-good' : 'tj-import-result-warning' }, result.label), h('div', { className: 'tj-hint' }, result.verified ? `数量已核对 ${count('total')} / ${count('total')}` : `已计数 ${Number.isFinite(result.processed) ? result.processed : '—'} / ${count('total')}`), reasons.length ? h('details', null, h('summary', { style: { cursor: 'pointer' } }, '失败原因'), ...reasons.map((reason) => h('div', { key: reason, className: 'tj-hint' }, reason))) : null),
          ...['total', 'saved', 'duplicates', 'deleted', 'failed', 'cancelled'].map((key) => h('td', { key }, count(key))),
          h('td', null, job.failed > 0 ? h('button', { className: 'tj-btn small', type: 'button', disabled: controls.current.has(job.id), onClick: () => act(job, 'retry') }, '重试失败项') : '—'));
      }
      return h(React.Fragment, null,
        visible && (queue.active || queue.waiting?.length || taskError || busy) ? h('section', { className: 'tj-card tj-import-progress', 'aria-label': '导入任务' }, h('div', { className: 'tj-row tj-between' }, h('h2', null, '照片导入'), h('span', { className: 'tj-hint' }, `等待 ${queue.waitingPhotos || 0} / ${queue.limit || 2000} 张`)), h('p', { className: 'tj-hint' }, '切换页面可以继续浏览。暂停和取消会在当前照片保存后生效。'), busy ? h('p', { className: 'tj-processing', role: 'status' }, h('span', { className: 'tj-spinner' }), '正在准备所选照片…') : null, taskError ? h('div', { className: 'tj-notice error', role: 'alert' }, taskError) : null, queue.active ? jobRow(queue.active) : null, ...(queue.waiting || []).slice(0, shownJobs).map(jobRow), (queue.waiting?.length || 0) > shownJobs ? h('button', { className: 'tj-btn small', type: 'button', style: { marginTop: 10 }, onClick: () => setShownJobs((count) => count + 10) }, `更多等待任务（${queue.waiting.length} 项）`) : null) : null,
        h('div', { hidden: !visible },
        visible && resultJobs.length ? h('section', { className: 'tj-import-results', 'aria-label': '导入结果' }, h('style', null, IMPORT_RESULT_CSS),
          h('div', { className: 'tj-row tj-between' }, h('h2', { style: { margin: 0 } }, '导入结果'), hiddenResults ? h('button', { className: 'tj-btn small', type: 'button', onClick: () => setShowAllResults(true) }, `展开其他近期结果（${hiddenResults}）`) : showAllResults && resultJobs.some((job, index) => index > 0 && !job.failed) ? h('button', { className: 'tj-btn small', type: 'button', onClick: () => setShowAllResults(false) }, '收起其他结果') : null),
          h('div', { className: 'tj-import-results-scroll' }, h('table', null, h('thead', null, h('tr', null, ...['任务', '结果', '总数', '已保存', '重复', '已删除', '失败', '取消', '操作'].map((label) => h('th', { key: label, scope: 'col' }, label)))), h('tbody', null, ...visibleResults.map(resultRow)))),
          h('p', { className: 'tj-hint', style: { marginBottom: 0 } }, '数量核对表示每张照片都有处理结果；重复照片不重复保存。旧任务中跳过的照片可重新选择原文件导入。')) : null,
          h('form', { className: 'tj-intro', onSubmit: submit },
          h('div', { className: 'tj-subhead' }, h('h2', null, '把旅行照片留在这里'), h('p', { className: 'tj-muted' }, '选择照片或整个文件夹，自动按拍摄日期和城市归档。')),
          error ? h('div', { className: 'tj-notice error', role: 'alert' }, error) : null,
          resumeTarget ? h('div', { className: 'tj-notice' }, `继续接收“${resumeTarget.sourceName || '原任务'}”：请选择原来的完整照片清单，先核对已接收照片的内容，再继续上传。`, h('button', { className: 'tj-btn small', type: 'button', disabled: busy, onClick: () => { if (flight.current) return; setResumeTarget(null); setFiles([]); changed(); } }, '取消重选')) : null,
          verification ? h('p', { className: 'tj-processing', role: 'status' }, h('span', { className: 'tj-spinner' }), `正在核对已接收照片 ${verification.checked} / ${verification.total} 张；核对通过的照片不会重复入库。`) : null,
          h('div', { className: 'tj-card' },
            h('input', { ref: input, type: 'file', multiple: true, accept: 'image/*,.heic,.heif,.tiff', className: 'tj-file-input', 'aria-label': '选择旅行照片', onChange: (event) => { select(event.target.files); event.target.value = ''; } }),
            h('input', { ref: directoryInput, type: 'file', multiple: true, webkitdirectory: '', className: 'tj-file-input', 'aria-label': '重选原文件夹', onChange: (event) => { select(event.target.files, true); event.target.value = ''; } }),
            h('button', { type: 'button', className: 'tj-upload' + (drag ? ' drag' : ''), disabled: busy, onClick: () => input.current?.click(), onDragOver: (event) => { event.preventDefault(); setDrag(true); }, onDragLeave: () => setDrag(false), onDrop: drop }, h(Icon, { name: 'photo', size: 32 }), h('strong', null, files.length ? '继续添加照片' : '选择照片，或拖入照片 / 文件夹'), h('span', { className: 'tj-muted' }, '保留原文件 · 自动读取拍摄时间和位置')),
            h('div', { className: 'tj-row', style: { marginTop: 12 } }, h('button', { className: 'tj-btn', type: 'button', disabled: busy || Boolean(resumeTarget), onClick: pickFolder }, '选择文件夹'), hasSelection ? h('button', { className: 'tj-btn small', type: 'button', disabled: busy, onClick: () => { changed(); setFiles([]); setNative(null); setPreviewFile(null); } }, '清空选择') : null),
            native ? h('p', { className: 'tj-hint' }, native.path ? `已选择文件夹：${native.path}` : `已选择 ${native.paths.length} 个本机文件或文件夹；提交时会统计照片。`) : null,
            files.length ? h(React.Fragment, null, h('div', { className: 'tj-selected' }, ...files.slice(0, shown).map((file, i) => h('div', { className: 'tj-selected-item tj-selected-file', key: `${fileRelativePath(file)}-${i}` }, h('span', null, fileRelativePath(file)), /^image\/(jpeg|png|webp|gif|bmp)$/.test(file.type) ? h('button', { className: 'tj-btn small', type: 'button', onClick: () => setPreviewFile(file), disabled: busy }, '预览这张') : null, h('button', { className: 'tj-remove', type: 'button', disabled: busy, 'aria-label': `移除 ${file.name}`, onClick: () => { changed(); if (previewFile === file) setPreviewFile(null); setFiles((before) => before.filter((_, j) => j !== i)); } }, '×')))), files.length > shown ? h('button', { className: 'tj-btn small', type: 'button', onClick: () => setShown((count) => count + 24) }, `显示更多（已显示 ${shown} / ${files.length}）`) : null, h('p', { className: 'tj-hint' }, `${files.length} 张 · ${(files.reduce((n, f) => n + f.size, 0) / 1048576).toFixed(1)} MB · 点选单张预览，避免同时展开大图。`)) : null,
            previewFile ? h('div', { className: 'tj-selection-preview' }, h('div', { className: 'tj-row tj-between' }, h('span', { className: 'tj-selection-preview-name' }, previewFile.name), h('button', { className: 'tj-btn small', type: 'button', onClick: () => setPreviewFile(null) }, '收起预览')), previewUrl ? h('img', { src: previewUrl, alt: previewFile.name, decoding: 'async' }) : null) : null,
            h('label', { className: 'tj-field' }, h('span', null, '给这批照片留句话'), h('textarea', { className: 'tj-input tj-textarea', value: notes, disabled: busy || Boolean(resumeTarget), maxLength: 20000, onChange: (e) => { request.current = ''; setNotes(e.target.value); }, placeholder: '比如：这几天沿着海边慢慢走，碰到喜欢的小店就停下来。' })),
            h('label', { className: 'tj-field tj-import-date' }, h('span', null, '统一指定日期（可选）'), h('input', { className: 'tj-input', type: 'date', value: date, disabled: busy || Boolean(resumeTarget), onChange: (e) => { request.current = ''; setDate(e.target.value); } })),
            h('p', { className: 'tj-hint' }, '填写日期会覆盖整批照片的归档日期；留空则按各自拍摄日期分组。没有拍摄日期的照片显示“日期待补充”，之后可手动修正。'),
            h('div', { className: 'tj-field' }, h('span', null, '统一地址（可选）'), h('div', { className: 'tj-two' },
              h('select', { className: 'tj-input', 'aria-label': '统一地址省份', value: province, disabled: busy || Boolean(resumeTarget) || placeLoading || !provinces.length, onChange: (event) => { request.current = ''; setProvince(event.target.value); setCity(''); } }, h('option', { value: '' }, placeLoading ? '正在读取省市…' : '选择省份'), ...provinces.map((item) => h('option', { key: item.name, value: item.name }, item.name))),
              h('select', { className: 'tj-input', 'aria-label': '统一地址城市', value: city, disabled: busy || Boolean(resumeTarget) || !cities.length, onChange: (event) => { request.current = ''; setCity(event.target.value); } }, h('option', { value: '' }, '选择城市'), ...cities.map((name) => h('option', { key: name, value: name }, name)))),
              province || city ? h('button', { className: 'tj-btn link', type: 'button', disabled: busy || Boolean(resumeTarget), onClick: () => { request.current = ''; setProvince(''); setCity(''); } }, '清空统一地址') : null,
              h('p', { className: 'tj-hint' }, resumeTarget ? '续传沿用原任务的日期和地址。' : '应用于本批新增照片，原图定位不变；留空则使用照片自身的地点信息。'),
              placeError ? h('div', { className: 'tj-hint', role: 'alert' }, '省市列表读取失败：', placeError, h('button', { className: 'tj-btn link', type: 'button', disabled: placeLoading, onClick: loadPlaces }, '重新读取')) : null),
            h('div', { className: 'tj-upload-footer' }, h('span', { className: 'tj-hint' }, '大批照片会分段处理，额外等待队列最多 2000 张。'), h('button', { className: 'tj-btn primary', type: 'submit', disabled: busy || !hasSelection }, busy ? h('span', { className: 'tj-spinner' }) : h(Icon, { name: 'plus', size: 16 }), busy ? '正在接收照片…' : resumeTarget ? '校验并继续上传' : '按日期归档'))))));
    }
    function Photo({ media, recordId, api, updated, notify, download, onMenu }) {
      const [editing, setEditing] = useState(false), [draft, setDraft] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState(''), [details, setDetails] = useState(false);
      const flight = useRef(false), baseline = useRef(null);
      const rawPlace = media.place || media.analysis?.place, place = typeof rawPlace === 'string' ? rawPlace : rawPlace?.city || '', district = typeof rawPlace === 'object' ? rawPlace?.district || '' : '';
      const caption = media.caption ?? media.analysis?.caption ?? '', tags = media.tags || media.analysis?.tags || [];
      function edit() { const gps = gpsOf(media), values = { capturedAt: capturedText(media) === '未检测到' ? '' : capturedText(media), latitude: gps?.latitude ?? '', longitude: gps?.longitude ?? '', place, district, caption, tags: tags.join('，') }; baseline.current = { ...values, tags: [...tags], gps: gps ? { ...gps } : null }; setDraft(values); setEditing(true); setError(''); }
      const set = (key, value) => setDraft((before) => ({ ...before, [key]: value }));
      async function save(event) {
        event?.preventDefault(); if (flight.current) return; flight.current = true; setBusy(true); setError('');
        try {
          let gps = null;
          if (String(draft.latitude).trim() || String(draft.longitude).trim()) {
            if (!String(draft.latitude).trim() || !String(draft.longitude).trim()) throw new Error('请同时填写纬度和经度。');
            gps = { latitude: Number(draft.latitude), longitude: Number(draft.longitude) };
            if (!Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude) || Math.abs(gps.latitude) > 90 || Math.abs(gps.longitude) > 180) throw new Error('经纬度超出有效范围。');
          }
          const cityValue = draft.place.trim(), districtValue = draft.district.trim(), patch = { recordId, photoId: media.id };
          const capturedAt = draft.capturedAt.trim() || null, oldCapturedAt = baseline.current.capturedAt || null;
          if (capturedAt !== oldCapturedAt) patch.capturedAt = capturedAt;
          const originalGPS = baseline.current.gps;
          if ((gps?.latitude ?? null) !== (originalGPS?.latitude ?? null) || (gps?.longitude ?? null) !== (originalGPS?.longitude ?? null)) patch.gps = gps;
          if (cityValue !== baseline.current.place || districtValue !== baseline.current.district) {
            const city = cityValue !== baseline.current.place ? cityValue : place, county = districtValue !== baseline.current.district ? districtValue : district;
            patch.place = city || county ? { country: rawPlace?.country || '', province: rawPlace?.province || '', city, district: county, name: [city, county].filter(Boolean).join(' · ') } : null;
          }
          if (draft.caption.trim() !== baseline.current.caption) patch.caption = draft.caption.trim();
          const nextTags = draft.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
          if (JSON.stringify(nextTags) !== JSON.stringify(baseline.current.tags)) patch.tags = nextTags;
          if (Object.keys(patch).length === 2) { setEditing(false); return; }
          const result = await api('/edit-photo', { body: patch });
          updated(result.record, { recordId }); setEditing(false); notify('照片信息已更正，原文件保持完整。');
        } catch (problem) { setError(problem.message); } finally { flight.current = false; setBusy(false); }
      }
      function field(key, label, placeholder = '') { return h('label', { className: 'tj-field' }, h('span', null, label), h('input', { className: 'tj-input', value: draft[key] ?? '', placeholder, onChange: (event) => set(key, event.target.value), maxLength: 200, disabled: busy })); }
      return h('figure', { className: 'tj-photo', onContextMenu: (event) => onMenu?.(event, { kind: 'photo', recordId, media, edit }) }, media.previewUrl ? h('img', { src: media.previewUrl, alt: caption || media.name || '旅行照片', loading: 'lazy' }) : h('div', { className: 'tj-notice error' }, media.error || '照片尚未保存'),
        h('figcaption', { className: 'tj-photo-body' }, h('p', { className: 'tj-photo-title' }, photoPlaceText(rawPlace) || media.name || '旅行照片'),
          editing ? h('textarea', { className: 'tj-inline-caption', 'aria-label': '照片说明', value: draft.caption, maxLength: 400, disabled: busy, autoFocus: true, onChange: (event) => set('caption', event.target.value) }) : caption ? h('p', { className: 'tj-muted' }, caption) : null,
          editing ? h('input', { className: 'tj-input', 'aria-label': '照片标签', value: draft.tags, maxLength: 1000, disabled: busy, placeholder: '标签，以逗号分隔', style: { margin: '9px 0' }, onChange: (event) => set('tags', event.target.value) }) : h('div', { className: 'tj-tags' }, ...tags.map((tag, i) => h('span', { className: 'tj-tag', key: i }, tag))),
          h('div', { className: 'tj-row tj-between', style: { marginTop: 12 } }, h('button', { className: 'tj-btn small', type: 'button', 'aria-expanded': details, onClick: () => setDetails(!details) }, details ? '收起详细信息' : '详细信息'), media.originalUrl ? h('button', { className: 'tj-btn link', type: 'button', onClick: () => download(media.originalUrl, media.downloadName || media.name || 'photo') }, '下载原图') : null),
          details ? h('div', { className: 'tj-detail-fold' }, h(Metadata, { media }), editing ? h(React.Fragment, null, field('capturedAt', '拍摄时间', '2026-10-30 15:20:00'), h('div', { className: 'tj-two' }, field('place', '城市', '例如：赣州市'), field('district', '区 / 县', '例如：信丰县')), h('div', { className: 'tj-two' }, field('latitude', '纬度', '25.69'), field('longitude', '经度', '100.16')), h('p', { className: 'tj-hint' }, '更正值单独保存，不改写原图 EXIF。城市用于归组，区县用于照片地点展示。')) : null) : null,
          error ? h('div', { className: 'tj-notice error', role: 'alert' }, error) : null,
          editing ? h('form', { className: 'tj-photo-edit-actions', onSubmit: save }, h('div', { className: 'tj-row' }, h('button', { className: 'tj-btn primary small', disabled: busy, type: 'submit' }, busy ? '保存中…' : '保存更正'), h('button', { className: 'tj-btn small', disabled: busy, type: 'button', onClick: () => { setEditing(false); setError(''); } }, '取消编辑'))) : null));
    }
    function RecordDetail({ record, matchedPhotoIds = [], api, back, updated, notify, download, refresh, onMenu }) {
      const [editing, setEditing] = useState(false), [title, setTitle] = useState(record.title || ''), [date, setDate] = useState(record.date || ''), [note, setNote] = useState(record.note || ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
      const [visiblePhotos, setVisiblePhotos] = useState(24);
      const allPhotos = useRef(null), editBaseline = useRef(null);
      useEffect(() => { if (!editing) { setTitle(record.title || ''); setDate(record.date || ''); setNote(record.note || ''); } }, [record.title, record.date, record.note, editing]);
      useEffect(() => { setVisiblePhotos(24); }, [record.id]);
      const groups = recordCityGroups(record), totalPhotos = record.media?.length || 0;
      const byId = new Map((record.media || []).map((media) => [media.id, media]));
      const matching = [...new Set(matchedPhotoIds)].map((id) => byId.get(id)).filter(Boolean);
      let remainingPhotos = visiblePhotos;
      const visibleGroups = groups.map((group) => { const photos = group.photos.slice(0, Math.max(0, remainingPhotos)); remainingPhotos -= photos.length; return { ...group, total: group.photos.length, photos }; }).filter((group) => group.photos.length);
      function toggleEdit() { if (!editing) { editBaseline.current = { title: record.title || '', date: record.date || '', note: record.note || '' }; setTitle(editBaseline.current.title); setDate(editBaseline.current.date); setNote(editBaseline.current.note); } setEditing(!editing); }
      async function save(event) {
        event.preventDefault(); const patch = { id: record.id }, values = { title, date, note };
        for (const key of ['title', 'date', 'note']) if (values[key] !== editBaseline.current?.[key]) patch[key] = values[key];
        if (Object.keys(patch).length === 1) { setEditing(false); return; }
        setBusy(true); setError(''); try { const result = await api('/edit-record', { body: patch }); updated(result.record); setEditing(false); notify('这一天的信息已更新。'); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
      }
      async function reprocess() { setBusy(true); try { await api('/reprocess', { body: { id: record.id } }); notify('已开始重新整理，原图和手动更正会保留。'); await refresh(); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }
      return h(React.Fragment, null, h('button', { className: 'tj-btn', onClick: back }, '← 返回每日档案'),
        h('div', { className: 'tj-detail-top tj-row tj-between' }, h('div', null, h('div', { className: 'tj-eyebrow' }, dateText(record.date)), h('h2', { className: 'tj-detail-title' }, record.title || '一段旅行记忆'), h('p', { className: 'tj-hint' }, `${record.media?.length || 0} 张照片 · 保存于 ${displayTime(record.savedAt)}`)), h('div', { className: 'tj-row' }, h('button', { className: 'tj-btn small', onClick: toggleEdit }, editing ? '取消编辑' : '修改这一天'), h('button', { className: 'tj-btn small', disabled: busy, onClick: reprocess }, '重新整理'))),
        error ? h('div', { className: 'tj-notice error' }, error) : null,
        record.demo ? h('div', { className: 'tj-notice' }, '演示记录：用于验证导入、AI 整理和地图，所示时间与坐标为测试数据。', h(DemoSources, { api })) : null,
        editing ? h('form', { className: 'tj-card', onSubmit: save }, h('div', { className: 'tj-two' }, h('label', { className: 'tj-field' }, h('span', null, '标题'), h('input', { className: 'tj-input', value: title, maxLength: 200, onChange: (e) => setTitle(e.target.value) })), h('label', { className: 'tj-field' }, h('span', null, '日期'), h('input', { className: 'tj-input', type: 'date', value: date, onChange: (e) => setDate(e.target.value) }))), h('label', { className: 'tj-field' }, h('span', null, '补充一句（保留此前原话）'), h('textarea', { className: 'tj-input tj-textarea', value: note, maxLength: 20000, onChange: (e) => setNote(e.target.value) })), h('button', { className: 'tj-btn primary', disabled: busy }, '保存修改')) : null,
        record.summary ? h('div', { className: 'tj-card' }, h('div', { className: 'tj-eyebrow' }, '这一天的记忆'), h('p', { style: { whiteSpace: 'pre-wrap', marginTop: 12, fontSize: 14, lineHeight: 1.9 } }, record.summary), h('div', { className: 'tj-tags', style: { marginTop: 13 } }, ...(record.tags || []).map((tag, i) => h('span', { className: 'tj-tag', key: i }, tag)))) : null,
        record.summaryError ? h('div', { className: 'tj-notice' }, '原图已保存，AI 整理暂未完成：', record.summaryError) : null,
        record.notes?.length ? h('div', { className: 'tj-card' }, h('h2', null, record.notesSharedAcrossDays ? '这批照片的说明（跨多天）' : '你当时说的话'), record.notesSharedAcrossDays ? h('p', { className: 'tj-hint' }, '原话保留并关联这批照片，没有强行分配到某一天。') : null, ...(record.notes || []).map((item, i) => h('div', { className: 'tj-note', key: i }, noteText(item)))) : null,
        record.note ? h('div', { className: 'tj-card' }, h('h2', null, '后来的补充'), h('p', { style: { whiteSpace: 'pre-wrap' } }, record.note)) : null,
        matching.length ? h('section', { className: 'tj-matched-photos' }, h('div', { className: 'tj-row tj-between', style: { margin: '24px 0 12px' } }, h('div', null, h('h2', null, '本次匹配的照片'), h('p', { className: 'tj-hint' }, `共 ${matching.length} 张匹配${matching.length > 6 ? '，先展示 6 张' : ''}；下方仍可按城市查看当天全部照片。`)), h('button', { className: 'tj-btn small', type: 'button', onClick: () => allPhotos.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, '查看当天全部照片')), h('div', { className: 'tj-photo-grid' }, ...matching.slice(0, 6).map((media) => h(Photo, { key: media.id, media, recordId: record.id, api, updated, notify, download, onMenu })))) : null,
        matching.length ? h('h2', { ref: allPhotos, style: { marginTop: 28 } }, '当天全部照片') : null,
        ...visibleGroups.map((group) => h('section', { className: 'tj-city-section', key: group.key }, h('div', { className: 'tj-city-heading' }, h('h2', null, group.name), h('span', null, `${group.total} 张照片`)), h('div', { className: 'tj-photo-grid' }, ...group.photos.map((media) => h(Photo, { key: media.id, media, recordId: record.id, api, updated, notify, download, onMenu }))))),
        totalPhotos ? h(LoadMore, { count: Math.min(visiblePhotos, totalPhotos), total: totalPhotos, hasMore: visiblePhotos < totalPhotos, onMore: () => setVisiblePhotos((count) => Math.min(count + 24, totalPhotos)), unit: '张照片' }) : null);
    }
    let geoCache = null;
    const geometryCache = new WeakMap();
    function loadGeo(api) {
      if (!geoCache) geoCache = api('/geo/display')
        .catch((problem) => { geoCache = null; throw problem; });
      return geoCache;
    }
    const MAP_ENVELOPE = [73.5, 16, 135, 53.5];
    const mapDetail = (zoom) => zoom + 1e-9 < 2 ? 'province' : zoom + 1e-9 < 5 ? 'city' : 'district';
    const unitOf = (longitude, latitude) => [(longitude + 180) / 360, 0.5 - Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, latitude)) * Math.PI / 360)) / (2 * Math.PI)];
    const overlaps = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
    const mergeBounds = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
    // Display-only simplification. The original polygons remain the hit-test and
    // geographic lookup source; zooming cannot change stored location accuracy.
    function simplifyDisplayRing(points, tolerance = 0.00013) {
      if (points.length < 8) return points;
      const result = [points[0]];
      for (let i = 1; i < points.length - 1; i++) {
        const previous = result[result.length - 1], point = points[i];
        if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= tolerance) result.push(point);
      }
      result.push(points[points.length - 1]);
      return result.length >= 4 ? result : points;
    }
    function pathOf(polygons, coarse = false) {
      const path = new Path2D();
      for (const polygon of polygons) for (const ring of polygon) {
        const points = coarse ? simplifyDisplayRing(ring) : ring;
        points.forEach(([x, y], index) => index ? path.lineTo(x, y) : path.moveTo(x, y));
        path.closePath();
      }
      return path;
    }
    function compileMapGeometry(geo) {
      if (geometryCache.has(geo)) return geometryCache.get(geo);
      if (geo.type === 'Topology') {
        const transform = geo.transform;
        const arcPoints = geo.arcs.map((arc) => {
          let x = 0, y = 0;
          return arc.map((point) => {
            if (!transform) return unitOf(point[0], point[1]);
            x += point[0]; y += point[1];
            return unitOf(x * transform.scale[0] + transform.translate[0], y * transform.scale[1] + transform.translate[1]);
          });
        });
        // The bundled topology is already jointly simplified and repaired.
        // Never simplify it again at runtime: even shared-arc simplification
        // can create crossings between nearby arcs. LOD changes visibility.
        const arcIds = new Set(), ranks = new Map();
        const ringOf = (ids, arcs) => {
          const points = [];
          for (const id of ids) {
            const arc = arcs[id < 0 ? ~id : id], ordered = id < 0 ? [...arc].reverse() : arc;
            points.push(...(points.length ? ordered.slice(1) : ordered));
          }
          return points;
        };
        const layer = (name, rank) => (geo.objects[name]?.geometries || []).filter((shape) => shape.type === 'Polygon' || shape.type === 'MultiPolygon').map((shape) => {
          const rings = shape.type === 'Polygon' ? [shape.arcs] : shape.arcs;
          for (const polygon of rings) for (const ring of polygon) for (const id of ring) { const key = id < 0 ? ~id : id; arcIds.add(key); ranks.set(key, Math.min(rank, ranks.get(key) ?? rank)); }
          const polygons = rings.map((polygon) => polygon.map((ring) => ringOf(ring, arcPoints)));
          const coarsePolygons = polygons;
          const bounds = polygons.flat(2).reduce((box, point) => mergeBounds(box, [...point, ...point]), [Infinity, Infinity, -Infinity, -Infinity]);
          const path = pathOf(polygons);
          return { source: shape.properties || {}, bounds, polygons, coarsePolygons, fine: path, coarse: path };
        });
        const counties = layer('counties', 2), cities = layer('cities', 1), provinces = layer('provinces', 0);
        const linePath = (points) => { const path = new Path2D(); points.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y)); return path; };
        const mesh = [...arcIds].map((id) => { const path = linePath(arcPoints[id]); return { id, rank: ranks.get(id), bounds: arcPoints[id].reduce((box, point) => mergeBounds(box, [...point, ...point]), [Infinity, Infinity, -Infinity, -Infinity]), fine: path, coarse: path }; });
        const groups = new Map();
        for (const county of counties) {
          const b = county.bounds, key = Math.floor((b[0] + b[2]) / 0.025) + ':' + Math.floor((b[1] + b[3]) / 0.025);
          if (!groups.has(key)) groups.set(key, { bounds: b, counties: [] });
          const group = groups.get(key); group.bounds = mergeBounds(group.bounds, b); group.counties.push(county);
        }
        const result = { counties, cities, provinces, mesh, groups: [...groups.values()] };
        geometryCache.set(geo, result); return result;
      }
      const feature = (source) => {
        let bounds = [Infinity, Infinity, -Infinity, -Infinity];
        const polygons = (source.p2 || []).map((polygon) => polygon.map((ring) => {
          const points = [];
          for (let i = 0; i < ring.length; i += 2) { const point = unitOf(ring[i], ring[i + 1]); points.push(point); bounds = mergeBounds(bounds, [...point, ...point]); }
          return points;
        }));
        const coarsePolygons = polygons.map((polygon) => polygon.map((ring) => simplifyDisplayRing(ring)));
        return { source, bounds, polygons, coarsePolygons, fine: pathOf(polygons), coarse: pathOf(coarsePolygons) };
      };
      const counties = geo.counties.map(feature), provinces = geo.provinces.map(feature), groups = new Map();
      for (const county of counties) {
        const b = county.bounds, key = Math.floor((b[0] + b[2]) / 0.025) + ':' + Math.floor((b[1] + b[3]) / 0.025);
        if (!groups.has(key)) groups.set(key, { bounds: b, counties: [], fine: new Path2D(), coarse: new Path2D() });
        const group = groups.get(key); group.bounds = mergeBounds(group.bounds, b); group.counties.push(county); group.fine.addPath(county.fine); group.coarse.addPath(county.coarse);
      }
      const cities = (geo.cities || []).filter((city) => Array.isArray(city.p2)).map(feature);
      const result = { counties, provinces, cities, groups: [...groups.values()] };
      geometryCache.set(geo, result);
      return result;
    }
    function insideMapFeature(feature, x, y, detail = 'fine') {
      if (!overlaps(feature.bounds, [x, y, x, y])) return false;
      return (detail === 'coarse' ? feature.coarsePolygons : feature.polygons).some((polygon) => {
        let inside = false;
        for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[i], b = ring[j];
          if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        return inside;
      });
    }
    // Choose an interior label position in the largest component, avoiding the
    // bounding-box centre landing in the sea between disconnected islands.
    function labelUnit(feature) {
      if (feature.labelUnit) return feature.labelUnit;
      const area = (ring) => Math.abs(ring.reduce((sum, a, i) => { const b = ring[(i + 1) % ring.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0));
      const polygon = [...feature.polygons].sort((a, b) => area(b[0]) - area(a[0]))[0];
      if (!polygon?.[0]?.length) return [feature.bounds[0], feature.bounds[1]];
      const bounds = polygon[0].reduce((box, point) => mergeBounds(box, [...point, ...point]), [Infinity, Infinity, -Infinity, -Infinity]);
      const cy = (bounds[1] + bounds[3]) / 2, crossings = [];
      for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i], b = ring[j];
        if ((a[1] > cy) !== (b[1] > cy)) crossings.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      crossings.sort((a, b) => a - b);
      let best = polygon[0][0], span = -1;
      for (let i = 0; i + 1 < crossings.length; i += 2) if (crossings[i + 1] - crossings[i] > span) { span = crossings[i + 1] - crossings[i]; best = [(crossings[i] + crossings[i + 1]) / 2, cy]; }
      feature.labelUnit = best; return best;
    }
    function createOfflineMap(canvas, geo, { onCity, raf = requestAnimationFrame, caf = cancelAnimationFrame } = {}) {
      const geometry = compileMapGeometry(geo), display = canvas.getContext('2d');
      const raster = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : document.createElement('canvas'), context = raster.getContext('2d');
      let snapshot = null, dirty = true, interacting = false, settleTimer = null, padX = 0, padY = 0;
      let width = 0, height = 0, base = 1, dpr = 1, view = null, frame = null, disposed = false, drag = null, pointer = null;
      let cities = [], districts = [], visitedProvinces = new Set(), overlays = [], level = 'city', hovered = null;
      const stats = { frames: 0, vectorFrames: 0, bitmapFrames: 0, boundaryBatches: 0, visibleCounties: 0, detailLevel: 'province' };
      const detailLevel = () => {
        const detail = mapDetail(view ? view.scale / base : 1);
        return level === 'city' && detail === 'district' ? 'city' : detail;
      };
      const schedule = () => { if (!disposed && frame === null) frame = raf(() => {
        frame = null; stats.frames++;
        if (!snapshot || snapshot.detailLevel !== detailLevel() || (!interacting && dirty)) { draw(); stats.vectorFrames++; } else stats.bitmapFrames++;
        paintSnapshot();
      }); };
      function interact() { interacting = true; dirty = true; clearTimeout(settleTimer); settleTimer = setTimeout(() => { settleTimer = null; interacting = false; schedule(); }, 120); }
      function fit() {
        const a = unitOf(MAP_ENVELOPE[0], MAP_ENVELOPE[3]), b = unitOf(MAP_ENVELOPE[2], MAP_ENVELOPE[1]);
        base = Math.min(width / (b[0] - a[0]), height / (b[1] - a[1])) * 0.92;
        return { scale: base, x: (width - (b[0] - a[0]) * base) / 2 - a[0] * base, y: (height - (b[1] - a[1]) * base) / 2 - a[1] * base };
      }
      function resize() {
        const rect = canvas.getBoundingClientRect(), oldWidth = width, oldHeight = height, oldBase = base;
        const nextDpr = Math.min(2, window.devicePixelRatio || 1), nextWidth = Math.max(1, Math.round(rect.width)), nextHeight = Math.max(1, Math.round(rect.height));
        if (view && nextWidth === width && nextHeight === height && nextDpr === dpr) return;
        const center = view && [(oldWidth / 2 - view.x) / view.scale, (oldHeight / 2 - view.y) / view.scale], zoom = view ? view.scale / oldBase : 1;
        width = nextWidth; height = nextHeight; dpr = nextDpr;
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        padX = Math.ceil(width * 0.15); padY = Math.ceil(height * 0.15);
        raster.width = Math.round((width + padX * 2) * dpr); raster.height = Math.round((height + padY * 2) * dpr);
        snapshot = null; dirty = true;
        const initial = fit();
        view = center ? { scale: base * zoom, x: width / 2 - center[0] * base * zoom, y: height / 2 - center[1] * base * zoom } : initial;
        schedule();
      }
      function hit(x, y) {
        const ux = (x - view.x) / view.scale, uy = (y - view.y) / view.scale;
        const detail = snapshot?.pathDetail || 'fine';
        if (detailLevel() === 'province') return geometry.provinces.find((province) => insideMapFeature(province, ux, uy, detail)) || null;
        if (detailLevel() === 'city') return geometry.cities.find((city) => insideMapFeature(city, ux, uy, detail)) || null;
        for (const group of geometry.groups) {
          if (!overlaps(group.bounds, [ux, uy, ux, uy])) continue;
          for (const county of group.counties) if (insideMapFeature(county, ux, uy, detail)) return county;
        }
        return null;
      }
      function draw() {
        if (disposed || !view) return;
        stats.boundaryBatches = 0; stats.visibleCounties = 0; stats.detailLevel = detailLevel();
        const k = view.scale, zoom = k / base, detail = zoom >= 4 ? 'fine' : 'coarse';
        const viewport = [(-padX - view.x) / k, (-padY - view.y) / k, (width + padX - view.x) / k, (height + padY - view.y) / k];
        context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, width + padX * 2, height + padY * 2);
        context.setTransform(k * dpr, 0, 0, k * dpr, (view.x + padX) * dpr, (view.y + padY) * dpr); context.lineJoin = 'round';
        context.fillStyle = 'rgba(255,255,255,0.045)'; context.strokeStyle = 'rgba(255,255,255,0.22)'; context.lineWidth = 1.1 / k;
        for (const province of geometry.provinces) if (overlaps(province.bounds, viewport)) { context.fill(province[detail], 'evenodd'); if (!geometry.mesh) context.stroke(province[detail]); }
        context.fillStyle = 'rgba(57,119,94,0.46)';
        for (const overlay of overlays) if (overlaps(overlay.bounds, viewport)) context.fill(overlay[detail], 'evenodd');
        if (geometry.mesh) {
          const maxRank = stats.detailLevel === 'province' ? 0 : stats.detailLevel === 'city' ? 1 : 2;
          for (let rank = maxRank; rank >= 0; rank--) {
            const path = new Path2D(); let count = 0;
            for (const edge of geometry.mesh) if (edge.rank === rank && overlaps(edge.bounds, viewport)) { path.addPath(edge[detail]); count++; }
            if (!count) continue;
            context.strokeStyle = rank === 0 ? 'rgba(255,255,255,0.22)' : rank === 1 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)';
            context.lineWidth = (rank === 0 ? 1.1 : rank === 1 ? 0.8 : 0.65) / k;
            context.stroke(path); stats.boundaryBatches++;
          }
          if (maxRank === 2) stats.visibleCounties = geometry.counties.filter((county) => overlaps(county.bounds, viewport)).length;
        } else if (stats.detailLevel !== 'province') {
          context.strokeStyle = 'rgba(255,255,255,0.10)'; context.lineWidth = 0.7 / k;
          for (const city of geometry.cities) if (overlaps(city.bounds, viewport)) { context.stroke(city[detail]); stats.boundaryBatches++; }
          if (stats.detailLevel === 'district') for (const group of geometry.groups) if (overlaps(group.bounds, viewport)) {
            for (const county of group.counties) if (overlaps(county.bounds, viewport)) { context.stroke(county.fine); stats.boundaryBatches++; stats.visibleCounties++; }
          }
        }
        snapshot = { ...view, detailLevel: stats.detailLevel, pathDetail: detail }; dirty = false;
      }
      function markers() {
        if (detailLevel() === 'province') return [];
        const locatedCities = cities.filter((city) => city.unit);
        if (detailLevel() === 'city') return locatedCities;
        const detailedCities = new Set(districts.map((district) => district.city));
        return [...districts, ...locatedCities.filter((city) => !detailedCities.has(city))];
      }
      function paintLabels() {
        display.setTransform(dpr, 0, 0, dpr, 0, 0); display.font = '12px system-ui, sans-serif';
        const labelBoxes = [];
        const provinceMode = detailLevel() === 'province';
        const items = provinceMode ? geometry.provinces.map((province) => ({ name: province.source.n, unit: labelUnit(province), visited: visitedProvinces.has(province.source.n) })).sort((a, b) => Number(b.visited) - Number(a.visited)) : markers();
        for (const item of items) {
          const px = item.unit[0] * view.scale + view.x, py = item.unit[1] * view.scale + view.y;
          if (px < 0 || py < 0 || px > width || py > height - 22) continue;
          if (!provinceMode) { display.beginPath(); display.arc(px, py, 3.5, 0, Math.PI * 2); display.fillStyle = 'rgba(242,193,78,0.95)'; display.fill(); }
          const textWidth = display.measureText(item.name).width, tx = provinceMode ? px - textWidth / 2 : px + 6;
          const box = [tx - 3, py - 11, tx + textWidth + 3, py + 8];
          if (box[0] < 0 || box[2] > width || labelBoxes.some((other) => overlaps(box, other))) continue;
          labelBoxes.push(box); display.fillStyle = provinceMode ? item.visited ? 'rgba(242,193,78,0.95)' : 'rgba(236,243,239,0.60)' : 'rgba(236,243,239,0.92)';
          display.fillText(item.name, tx, py + 4);
        }
      }
      function cityAt(x, y) {
        let closest = null, distance = 10;
        for (const city of markers()) { const current = Math.hypot(city.unit[0] * view.scale + view.x - x, city.unit[1] * view.scale + view.y - y); if (current <= distance) { closest = city; distance = current; } }
        return closest;
      }
      function paintSnapshot() {
        if (!snapshot || disposed) return;
        display.setTransform(dpr, 0, 0, dpr, 0, 0); display.clearRect(0, 0, width, height);
        const ratio = view.scale / snapshot.scale;
        display.setTransform(dpr * ratio, 0, 0, dpr * ratio, dpr * (view.x - snapshot.x * ratio - padX * ratio), dpr * (view.y - snapshot.y * ratio - padY * ratio));
        display.drawImage(raster, 0, 0, width + padX * 2, height + padY * 2);
        hovered = pointer && !drag && !interacting ? hit(pointer.x, pointer.y) : null;
        const hoveredCity = pointer && !drag && !interacting ? cityAt(pointer.x, pointer.y) : null;
        const titleParts = hoveredCity ? [hoveredCity.province, hoveredCity.city?.name, hoveredCity.name] : hovered ? [hovered.source.p, hovered.source.c || hovered.source.n, detailLevel() === 'district' ? hovered.source.n : ''] : [];
        canvas.title = titleParts.filter(Boolean).filter((value, i, all) => all.indexOf(value) === i).join(' · ');
        if (hovered) { display.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.x * dpr, view.y * dpr); display.fillStyle = 'rgba(172,218,190,0.18)'; display.fill(hovered[snapshot.pathDetail], 'evenodd'); }
        paintLabels();
        display.setTransform(dpr, 0, 0, dpr, 0, 0); display.font = '10px system-ui, sans-serif'; display.fillStyle = 'rgba(255,255,255,0.50)'; display.fillText('geoBoundaries · © OpenStreetMap contributors · OCHA / HDX', 8, height - 8);
      }
      function update(data, nextLevel = 'city') {
        level = nextLevel; dirty = true;
        cities = (data?.cities || []).map((city) => {
          const matches = geometry.cities.filter(({ source }) => (source.c || source.n) === city.name && (!city.province || source.p === city.province));
          // City labels describe the region, never the first photo's position.
          // Without an unambiguous boundary, keep the city's archive card only.
          return { ...city, unit: matches.length === 1 ? labelUnit(matches[0]) : null };
        });
        const points = data?.points || [], codes = new Set(points.map((point) => point.code).filter(Boolean)), boundaries = new Set(points.map((point) => point.boundaryId).filter(Boolean));
        const districtCodes = new Set(points.filter((point) => !point.boundaryId && (!point.codeLevel || point.codeLevel === 'county' || point.codeLevel === 'district')).map((point) => point.code).filter((code) => code && !/00$/.test(code)));
        const names = new Set(cities.filter((city) => !city.province).map((city) => city.name));
        const cityKeys = new Set([...points.filter((point) => point.city).map((point) => point.province ? point.province + ':' + point.city : point.city), ...cities.filter((city) => city.province).map((city) => city.province + ':' + city.name)]);
        visitedProvinces = new Set([...points.map((point) => point.province), ...cities.map((city) => city.province)].filter(Boolean));
        districts = [];
        // Codes also identify the containing city, including old city-label variants.
        for (const county of geometry.counties) {
          if (codes.has(county.source.g) || boundaries.has(county.source.boundaryId || county.source.s)) { cityKeys.add(county.source.p + ':' + county.source.c); visitedProvinces.add(county.source.p); }
          const known = boundaries.has(county.source.boundaryId || county.source.s) || ((!county.source.codeLevel || ['county', 'district'].includes(county.source.codeLevel)) && districtCodes.has(county.source.g));
          if (known) {
            const city = cities.find((item) => item.name === county.source.c && (!item.province || item.province === county.source.p));
            districts.push({ name: county.source.n, province: county.source.p, city, unit: labelUnit(county) });
          }
        }
        for (const city of geometry.cities) if (cityKeys.has(city.source.p + ':' + city.source.n) || names.has(city.source.n)) visitedProvinces.add(city.source.p);
        overlays = [];
        if (level === 'city' && geometry.cities.length) {
          overlays = geometry.cities.filter(({ source: city }) => cityKeys.has(city.p + ':' + (city.c || city.n)) || cityKeys.has(city.c || city.n) || names.has(city.c || city.n));
          schedule(); return;
        }
        for (const group of geometry.groups) {
          const selected = group.counties.filter(({ source: county }) => level === 'district' ? boundaries.has(county.boundaryId || county.s) || ((!county.codeLevel || county.codeLevel === 'county' || county.codeLevel === 'district') && districtCodes.has(county.g)) : county.c && (cityKeys.has(county.p + ':' + county.c) || cityKeys.has(county.c) || names.has(county.c)));
          if (!selected.length) continue;
          const overlay = { bounds: selected[0].bounds, fine: new Path2D(), coarse: new Path2D() };
          for (const county of selected) { overlay.bounds = mergeBounds(overlay.bounds, county.bounds); overlay.fine.addPath(county.fine); overlay.coarse.addPath(county.coarse); }
          overlays.push(overlay);
        }
        schedule();
      }
      const position = (event) => { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; };
      function zoom(event) {
        if (!view) return; event.preventDefault(); pointer = null;
        const at = position(event), delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
        const next = Math.max(base, Math.min(base * 16, view.scale * Math.exp(-delta * 0.0015))), ratio = next / view.scale;
        if (next === view.scale) return;
        view = { scale: next, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio }; interact(); schedule();
      }
      function down(event) { if (event.button !== 0 || !view) return; const at = position(event); drag = { ...at, px: view.x, py: view.y, moved: false, pointerId: event.pointerId }; pointer = null; canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-dragging'); }
      function move(event) { pointer = position(event); if (drag) { const dx = pointer.x - drag.x, dy = pointer.y - drag.y; drag.moved ||= Math.hypot(dx, dy) > 5; view.x = drag.px + dx; view.y = drag.py + dy; interact(); } schedule(); }
      function up(event) {
        const oldDrag = drag; drag = null; canvas.classList.remove('is-dragging');
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        if (oldDrag && !oldDrag.moved && event.type !== 'pointercancel') {
          const at = position(event), county = hit(at.x, at.y);
          if (detailLevel() === 'province') {
            if (county) { const b = county.bounds, scale = Math.max(base * 2.1, Math.min(base * 4.5, Math.min(width / (b[2] - b[0]), height / (b[3] - b[1])) * 0.8)); view = { scale, x: width / 2 - (b[0] + b[2]) * scale / 2, y: height / 2 - (b[1] + b[3]) * scale / 2 }; dirty = true; interacting = false; }
            schedule(); return;
          }
          const marker = cityAt(at.x, at.y);
          const city = (marker?.city || (cities.includes(marker) ? marker : null)) || (county && cities.find((item) => item.name === (county.source.c || county.source.n) && (!item.province || item.province === county.source.p)));
          if (city) onCity?.(city);
        }
        schedule();
      }
      const leave = () => { if (!drag) { pointer = null; canvas.title = ''; schedule(); } };
      const pageDocument = canvas.ownerDocument || (typeof document === 'object' ? document : null);
      function cancelGesture() { drag = null; pointer = null; interacting = false; clearTimeout(settleTimer); settleTimer = null; canvas.title = ''; canvas.classList.remove('is-dragging'); if (!pageDocument?.hidden) schedule(); }
      function visibility() {
        if (pageDocument?.hidden) { cancelGesture(); if (frame !== null) caf(frame); frame = null; }
        else { resize(); schedule(); }
      }
      const events = { wheel: zoom, pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, pointerleave: leave, lostpointercapture: cancelGesture };
      window.addEventListener?.('blur', cancelGesture); pageDocument?.addEventListener('visibilitychange', visibility);
      for (const [name, fn] of Object.entries(events)) canvas.addEventListener(name, fn, name === 'wheel' ? { passive: false } : undefined);
      const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
      return {
        update, stats,
        reset() { clearTimeout(settleTimer); settleTimer = null; interacting = false; dirty = true; view = fit(); pointer = null; schedule(); },
        dispose() {
          disposed = true; clearTimeout(settleTimer); if (frame !== null) caf(frame); frame = null; observer.disconnect();
          for (const [name, fn] of Object.entries(events)) canvas.removeEventListener(name, fn);
          window.removeEventListener?.('blur', cancelGesture); pageDocument?.removeEventListener('visibilitychange', visibility);
          if (drag && canvas.hasPointerCapture(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId); drag = null; pointer = null;
          canvas.title = ''; canvas.classList.remove('is-dragging'); raster.width = raster.height = 1; snapshot = null;
        },
      };
    }
    function Footprints({ api, onCity, revision, footprintLevel = 'city' }) {
      const [data, setData] = useState(null), [error, setError] = useState(''), [geo, setGeo] = useState(null), [note, setNote] = useState('正在加载离线地图…');
      const [level, setLevel] = useState(footprintLevel), [savingLevel, setSavingLevel] = useState(false);
      const canvasRef = useRef(null), mapRef = useRef(null), onCityRef = useRef(onCity); onCityRef.current = onCity;
      useEffect(() => {
        let active = true, running = false;
        async function tick() { if (running) return; running = true; try { const result = await api('/map'); if (active) { setData(result); setError(''); } } catch (problem) { if (active) setError(problem.message); } finally { running = false; } }
        tick(); return () => { active = false; };
      }, [revision]);
      useEffect(() => { let active = true; loadGeo(api).then((result) => { if (active) { setGeo(result); setNote(''); } }).catch((problem) => { if (active) setNote(problem.message); }); return () => { active = false; }; }, []);
      useEffect(() => { if (!geo || !canvasRef.current) return; try { const map = createOfflineMap(canvasRef.current, geo, { onCity: (city) => onCityRef.current(city) }); mapRef.current = map; return () => { map.dispose(); mapRef.current = null; }; } catch (problem) { setNote('离线地图无法绘制：' + problem.message); } }, [geo]);
      const cities = data?.cities || [], points = data?.points || [];
      // Location edits can change codes/coordinates without changing photo counts.
      const signature = JSON.stringify([cities, points.map((point) => [point.boundaryId, point.codeLevel, point.code, point.city, point.province, point.longitude, point.latitude])]);
      useEffect(() => { mapRef.current?.update(data, level); }, [geo, signature, level]);
      async function changeLevel(value) { const previous = level; setLevel(value); setSavingLevel(true); try { await api('/config', { body: { footprintLevel: value } }); } catch (problem) { setLevel(previous); setError(problem.message); } finally { setSavingLevel(false); } }
      return h(React.Fragment, null,
        h('style', null, '.tj-canvas-wrap{position:relative;height:min(64vh,560px);margin:14px 0 10px;border:1px solid var(--tj-line);border-radius:12px;overflow:hidden;background:#101512}.tj-canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none}.tj-canvas.is-dragging{cursor:grabbing}.tj-canvas-note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--tj-muted);font-size:13px}'),
        h('div', { className: 'tj-map-heading tj-row tj-between' }, h('div', null, h('h2', null, '走过的地方，都会亮起来'), h('p', { className: 'tj-muted' }, cities.length ? `已点亮 ${cities.length} 个城市。滚轮缩放，按住拖拽，点击去过的城市查看照片。` : '照片里的地点，会慢慢连成你的旅行地图。')), h('div', { className: 'tj-row' }, h('select', { className: 'tj-input', 'aria-label': '地图点亮范围', value: level, disabled: savingLevel, onChange: (event) => changeLevel(event.target.value), style: { width: 'auto' } }, h('option', { value: 'city' }, '按市点亮'), h('option', { value: 'district' }, '按区县点亮')), h('button', { className: 'tj-btn small', onClick: () => mapRef.current?.reset() }, '回到全国'))),
        error ? h('div', { className: 'tj-notice error' }, error) : null,
        h('div', { className: 'tj-canvas-wrap' }, h('canvas', { ref: canvasRef, className: 'tj-canvas', 'aria-label': '旅行足迹示意图' }), note ? h('div', { className: 'tj-canvas-note' }, note) : null));
    }
    function StorageFolder({ state, api, refresh, notify, embedded = false }) {
      const storage = state.storage || {}, [busy, setBusy] = useState(false), [error, setError] = useState('');
      const flight = useRef(false), alive = useRef(true), identity = useRef('');
      identity.current = `${storage.accessToken || storage.libraryId || ''}|${storage.path || ''}|${storage.status || ''}`;
      useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
      async function browse() {
        if (flight.current || !alive.current) return;
        const from = identity.current; flight.current = true; setBusy(true); setError('');
        try {
          const bridge = window.__DSH_DIRECTORY_PICKER__, picked = typeof bridge?.pick === 'function'
            ? await bridge.pick().then((path) => path ? { path } : { cancelled: true })
            : await api('/storage/pick', { body: {}, timeoutMs: 300000 });
          if (!alive.current || from !== identity.current || picked.cancelled || !picked.path) return;
          await api('/storage', { body: { path: picked.path }, timeoutMs: 120000 });
          await refresh(); notify('已打开所选资料文件夹。');
        } catch (problem) { if (alive.current && !problem.stale) setError(problem.message); }
        finally { flight.current = false; if (alive.current) setBusy(false); }
      }
      return h('section', { className: embedded ? undefined : 'tj-card', 'aria-label': '资料文件夹设置' },
        h('h2', null, '选择资料文件夹'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, marginTop: 12 } },
          h('input', { className: 'tj-input', 'aria-label': '资料文件夹路径', value: storage.path || '', readOnly: true, title: storage.path || '', placeholder: '请选择资料文件夹' }),
          h('button', { type: 'button', className: 'tj-btn', disabled: busy, onClick: browse }, busy ? '处理中…' : '浏览文件夹')),
        error || storage.status && storage.status !== 'ready' ? h('div', { className: 'tj-notice error', role: 'alert', style: { marginTop: 12, overflowWrap: 'anywhere' } }, error || storage.message || '资料文件夹暂时不可用，请连接硬盘后重新选择该文件夹。') : null);
    }
    const missingPhotoKey = (photo) => JSON.stringify([photo.recordId, photo.photoId]);
    function MissingLocations({ api, refresh, notify, close }) {
      const [photos, setPhotos] = useState([]), [page, setPage] = useState({ nextCursor: null, hasMore: false, total: 0 }), [provinces, setProvinces] = useState([]);
      const [province, setProvince] = useState(''), [city, setCity] = useState(''), [selected, setSelected] = useState([]), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
      const alive = useRef(true), readFlight = useRef(false), saveFlight = useRef(false), generation = useRef(0), selection = useRef(selected);
      selection.current = selected;
      const cities = provinces.find((item) => item.name === province)?.cities || [];
      async function load(reset = false, withChoices = false) {
        if (readFlight.current || !alive.current) return;
        readFlight.current = true; setLoading(true); setError(''); const request = ++generation.current;
        try {
          const params = new URLSearchParams({ limit: '24' }); if (!reset && page.nextCursor) params.set('after', page.nextCursor);
          const [result, choices] = await Promise.all([api('/missing-locations?' + params), withChoices ? api('/geo/place-choices') : null]);
          if (!alive.current || request !== generation.current) return;
          if (result.hasMore && (!result.nextCursor || (!reset && result.nextCursor === page.nextCursor))) throw new Error('后续照片暂时无法读取，请重试。');
          setPhotos((before) => Array.from(new Map([...(reset ? [] : before), ...(result.photos || [])].map((photo) => [missingPhotoKey(photo), photo])).values()));
          setPage({ nextCursor: result.nextCursor || null, hasMore: Boolean(result.hasMore), total: result.total || 0 });
          if (choices) setProvinces(choices.provinces || []);
        } catch (problem) { if (alive.current && !problem.stale) setError(problem.message); }
        finally { readFlight.current = false; if (alive.current) setLoading(false); }
      }
      useEffect(() => { alive.current = true; void load(true, true); return () => { alive.current = false; generation.current++; }; }, []);
      function choose(photo, checked) {
        if (saveFlight.current) return;
        const key = missingPhotoKey(photo), before = selection.current;
        if (checked && before.length >= 200 && !before.some((item) => missingPhotoKey(item) === key)) { setError('每次最多选择 200 张照片，请先保存这批地点。'); return; }
        const next = checked ? [...before.filter((item) => missingPhotoKey(item) !== key), { recordId: photo.recordId, photoId: photo.photoId }] : before.filter((item) => missingPhotoKey(item) !== key);
        selection.current = next; setSelected(next);
      }
      function selectLoaded() { const next = Array.from(new Map([...selection.current, ...photos.map(({ recordId, photoId }) => ({ recordId, photoId }))].map((photo) => [missingPhotoKey(photo), photo])).values()).slice(0, 200); selection.current = next; setSelected(next); if (photos.length > 200) setError('每次最多选择 200 张照片，已选中的照片已保留。'); }
      async function save() {
        if (saveFlight.current || readFlight.current || !selection.current.length || !province || !cities.includes(city)) return;
        saveFlight.current = true; setSaving(true); setError('');
        try {
          const result = await api('/fill-missing-locations', { body: { photos: selection.current.map(({ recordId, photoId }) => ({ recordId, photoId })), province, city } });
          if (!alive.current) return;
          selection.current = []; setSelected([]);
          notify(`已补充 ${result.updated || 0} 张照片的地点${result.skipped ? `，另有 ${result.skipped} 张已变化，未覆盖` : ''}。`);
          await refresh(); if (alive.current) await load(true);
        } catch (problem) { if (alive.current && !problem.stale) setError(problem.message); }
        finally { saveFlight.current = false; if (alive.current) setSaving(false); }
      }
      return h('section', { className: 'tj-missing-locations', 'aria-label': '手动补充地点', style: { marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--tj-line)' } },
        h('div', { className: 'tj-row tj-between' }, h('h3', null, '为没有定位的照片补充地点'), h('button', { className: 'tj-btn small', type: 'button', disabled: saving, onClick: close }, '收起')),
        h('p', { className: 'tj-hint' }, '选择照片后指定省份和城市，不会修改原图或已有地点。'),
        error ? h('div', { className: 'tj-notice error', role: 'alert' }, error, !saving ? h('button', { className: 'tj-btn small', type: 'button', disabled: loading, onClick: () => load(!photos.length, !provinces.length) }, '重新加载') : null) : null,
        h('div', { className: 'tj-row tj-between', style: { margin: '12px 0' } }, h('span', { className: 'tj-hint', role: 'status' }, `已选择 ${selected.length} / 200 张 · 已加载 ${photos.length} / ${page.total} 张`), h('div', { className: 'tj-row' }, h('button', { className: 'tj-btn small', type: 'button', disabled: saving || !photos.length, onClick: selectLoaded }, '选择已加载照片'), h('button', { className: 'tj-btn small', type: 'button', disabled: saving || !selected.length, onClick: () => { selection.current = []; setSelected([]); } }, '清空选择'))),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(105px,1fr))', gap: 10, maxHeight: 350, overflowY: 'auto', padding: 3 } }, ...photos.map((photo) => { const checked = selected.some((item) => missingPhotoKey(item) === missingPhotoKey(photo)); return h('label', { key: missingPhotoKey(photo), title: `${photo.title || ''} ${photo.name || ''}`, style: { display: 'block', border: `1px solid ${checked ? 'var(--tj-green)' : 'var(--tj-line)'}`, borderRadius: 8, padding: 6, cursor: saving || (!checked && selected.length >= 200) ? 'default' : 'pointer' } },
          photo.previewUrl ? h('img', { src: photo.previewUrl, alt: photo.name || '待补地点的照片', loading: 'lazy', decoding: 'async', style: { display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 4 } }) : h('div', { style: { textAlign: 'center', padding: 20 } }, h(Icon, { name: 'photo' })),
          h('div', { className: 'tj-row', style: { gap: 5, marginTop: 6, flexWrap: 'nowrap' } }, h('input', { type: 'checkbox', 'aria-label': `选择 ${photo.name || '照片'} ${dateText(photo.date)}`, checked, disabled: saving || (!checked && selected.length >= 200), onChange: (event) => choose(photo, event.target.checked) }), h('span', { style: { fontSize: 10, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, photo.name || photo.title || '照片')),
          h('div', { className: 'tj-hint' }, dateText(photo.date))); })),
        loading ? h('p', { className: 'tj-processing', role: 'status' }, h('span', { className: 'tj-spinner' }), '正在读取照片…') : !photos.length && !error ? h('p', { className: 'tj-hint' }, '没有需要手动补充地点的照片。') : null,
        page.hasMore ? h('button', { className: 'tj-btn small', type: 'button', disabled: loading || saving, style: { marginTop: 10 }, onClick: () => load() }, '加载更多照片') : null,
        h('div', { className: 'tj-two' }, h('label', { className: 'tj-field' }, h('span', null, '省份'), h('select', { className: 'tj-input', 'aria-label': '补充地点省份', value: province, disabled: saving || !provinces.length, onChange: (event) => { setProvince(event.target.value); setCity(''); } }, h('option', { value: '' }, '选择省份'), ...provinces.map((item) => h('option', { key: item.name, value: item.name }, item.name)))), h('label', { className: 'tj-field' }, h('span', null, '城市'), h('select', { className: 'tj-input', 'aria-label': '补充地点城市', value: city, disabled: saving || !cities.length, onChange: (event) => setCity(event.target.value) }, h('option', { value: '' }, '选择城市'), ...cities.map((name) => h('option', { key: name, value: name }, name))))),
        h('button', { className: 'tj-btn primary', type: 'button', disabled: saving || loading || !selected.length || !province || !cities.includes(city), onClick: save }, saving ? '正在补充…' : `为 ${selected.length} 张照片补充地点`));
    }
    function Settings({ state, api, archiveApi = api, refresh, locationsUpdated = refresh, notify }) {
      const [draft, setDraft] = useState({ ...state.config }), [busy, setBusy] = useState(false), [error, setError] = useState('');
      const [retryBusy, setRetryBusy] = useState(false), [queued, setQueued] = useState(0), [manual, setManual] = useState(false), [resetConfirm, setResetConfirm] = useState(false), [resetBusy, setResetBusy] = useState(false);
      const retryFlight = useRef(false), configFlight = useRef(false), resetFlight = useRef(false), alive = useRef(true);
      useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
      useEffect(() => { if (!configFlight.current) setDraft({ ...state.config }); }, [state.config]);
      const ready = !state.storage || state.storage.status === 'ready';
      const geocoding = state.geocoding || {}, inFlight = Math.max(queued, Number(geocoding.pending || 0) + Number(geocoding.processing || 0)), actuallyBusy = retryBusy || inFlight > 0;
      const retryable = Number(geocoding.retryable ?? geocoding.failed ?? 0);
      async function saveFlag(key, value) {
        if (configFlight.current || !alive.current) return;
        const previous = draft[key]; configFlight.current = true; setBusy(true); setError(''); setDraft((before) => ({ ...before, [key]: value })); let saved = false;
        try { await api('/config', { body: { [key]: value } }); saved = true; await refresh(); }
        catch (problem) { if (alive.current && !problem.stale) { if (!saved) setDraft((before) => ({ ...before, [key]: previous })); setError(saved ? '设置已保存，但刷新失败：' + problem.message : problem.message); } }
        finally { configFlight.current = false; if (alive.current) setBusy(false); }
      }
      function check(key, label, hint) { return h('label', { className: 'tj-check' }, h('input', { type: 'checkbox', checked: Boolean(draft[key]), disabled: busy, onChange: (event) => saveFlag(key, event.target.checked) }), h('span', null, h('strong', null, label), h('div', { className: 'tj-hint' }, hint))); }
      async function retryPlaces() {
        if (retryFlight.current || !ready) return; retryFlight.current = true; setRetryBusy(true); setError('');
        try { const result = await archiveApi('/retry-places', { body: {} }); if (!alive.current) return; setQueued(result.retried || 0); notify(result.retried ? `已排队 ${result.retried} 张照片，在本机解析地名，不调用 AI。` : '没有需要重新解析的照片。'); Promise.resolve(refresh()).catch((problem) => { if (alive.current && !problem.stale) setError(problem.message); }).finally(() => { if (alive.current) setQueued(0); }); }
        catch (problem) { if (alive.current && !problem.stale) setError(problem.message); } finally { retryFlight.current = false; if (alive.current) setRetryBusy(false); }
      }
      async function resetUsage() {
        if (resetFlight.current || !resetConfirm || !ready) return; resetFlight.current = true; setResetBusy(true); setError('');
        try { await archiveApi('/reset-usage', { body: {} }); if (!alive.current) return; setResetConfirm(false); await refresh(); notify('计量已重置，照片和整理结果已保留。'); }
        catch (problem) { if (alive.current && !problem.stale) setError(problem.message); } finally { resetFlight.current = false; if (alive.current) setResetBusy(false); }
      }
      return h('div', { className: 'tj-settings' }, h('section', { className: 'tj-card' },
        error ? h('div', { className: 'tj-notice error', role: 'alert' }, error) : null,
        h(StorageFolder, { state, api, refresh, notify, embedded: true }),
        h('hr', { className: 'tj-divider' }),
        check('aiEnabled', '自动整理摘要与标签', '原图和原话先保存，整理在后台完成。模型暂时不可用也不会丢失照片。'),
        check('aiImages', '让 AI 看照片，记住更多细节', '开启时，照片预览与说明会发送给 DSH 模型服务；EXIF 和精确 GPS 在本机读取。'),
        busy ? h('p', { className: 'tj-hint', role: 'status' }, '正在保存设置…') : null,
        h('hr', { className: 'tj-divider' }), h('h2', null, '离线地名'), h('p', { className: 'tj-hint' }, '地图和地名解析在本机完成，无需代理或地图服务账号。'),
        inFlight ? h('p', { className: 'tj-processing', role: 'status' }, h('span', { className: 'tj-spinner' }), `正在解析 ${Number(geocoding.processing || 0)} 张 · 等待 ${Math.max(Number(geocoding.pending || 0), queued)} 张`) : null,
        h('p', { className: 'tj-hint' }, `已解析 ${Number(geocoding.resolved || 0)} 张 · 未完成 ${Number(geocoding.failed || 0)} 张 · 地图未收录 ${Number(geocoding.unsupported || 0)} 张 · 无定位 ${Number(geocoding.missing || 0)} 张`),
        placeFailureText(geocoding.failures) ? h('p', { className: 'tj-hint' }, placeFailureText(geocoding.failures)) : null,
        h('div', { className: 'tj-row', style: { marginTop: 12 } }, h('button', { className: 'tj-btn', type: 'button', disabled: !ready || actuallyBusy || !retryable || geocoding.enabled === false, style: { cursor: !ready || actuallyBusy || !retryable || geocoding.enabled === false ? 'default' : 'pointer' }, onClick: retryPlaces }, retryBusy ? '正在排队…' : inFlight ? '正在解析地名…' : '重新解析待补地名'), h('button', { className: 'tj-btn', type: 'button', disabled: !ready, style: { cursor: ready ? 'pointer' : 'default' }, onClick: () => setManual(!manual) }, manual ? '收起手动补充' : '手动补充')),
        manual && ready ? h(MissingLocations, { api: archiveApi, refresh: locationsUpdated, notify, close: () => setManual(false) }) : null,
        h('hr', { className: 'tj-divider' }), h('div', { className: 'tj-row tj-between' }, h('h2', null, '整理用量'), h('button', { className: 'tj-btn small', type: 'button', disabled: !ready || resetBusy, style: { cursor: ready && !resetBusy ? 'pointer' : 'default' }, onClick: () => setResetConfirm(true) }, '重置计量')),
        h('p', { className: 'tj-muted' }, `${state.summary?.usage?.calls || 0} 次模型调用 · ${state.summary?.usage?.imagesAnalyzed || 0} 张照片已分析`),
        h('p', { className: 'tj-hint' }, `提供方已报告：输入 ${Number(state.summary?.usage?.inputTokens || 0).toLocaleString()} tokens，输出 ${Number(state.summary?.usage?.outputTokens || 0).toLocaleString()} tokens。`),
        (state.summary?.usage?.reportedCalls || 0) < (state.summary?.usage?.calls || 0) ? h('p', { className: 'tj-hint' }, '部分请求未返回用量，以上不是全部调用的完整计费统计。') : null,
        resetConfirm ? h('div', { className: 'tj-notice', role: 'alertdialog', 'aria-label': '确认重置计量', style: { marginTop: 12 } }, h('p', null, '确定重置计量？当前累计调用和 Token 统计将归零，照片、标签和摘要会保留。'), h('div', { className: 'tj-row' }, h('button', { className: 'tj-btn small', type: 'button', disabled: resetBusy, onClick: () => setResetConfirm(false) }, '取消'), h('button', { className: 'tj-btn small', type: 'button', disabled: resetBusy, onClick: resetUsage }, resetBusy ? '正在重置…' : '确认重置'))) : null));
    }
    async function fetchJSON(url, init, timeoutMs = 15000) {
      const controller = new AbortController(); let timer;
      const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('请求超时，请稍后查看状态或重试。已提交的后台任务会继续处理。')); }, timeoutMs); });
      const request = (async () => {
        const response = await fetch(url, { ...init, signal: controller.signal });
        let data; try { data = await response.json(); } catch { throw new Error(`旅行记忆接口没有返回 JSON（HTTP ${response.status}）。请重新启用旅行记忆插件。`); }
        if (!response.ok || data.ok === false) throw new Error(data.message || '操作没有完成。');
        return data;
      })();
      try { return await Promise.race([request, deadline]); } finally { clearTimeout(timer); }
    }
    const ARCHIVE_BROWSE_CSS = `
.tj-browse-toolbar{display:flex;align-items:center;gap:10px;margin:0 0 18px}.tj-browse-field{position:relative;flex:1;min-width:200px}.tj-browse-field .tj-input{padding-right:44px}.tj-browse-search{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:34px;height:32px;display:grid;place-items:center;border:0;border-radius:7px;background:transparent;color:var(--tj-green);cursor:pointer}.tj-browse-search:not(:disabled):hover{background:var(--tj-soft)}.tj-browse-mode{width:auto;min-width:112px}.tj-browse-direction{min-width:112px;padding:9px 11px}.tj-archive-group{position:relative;border:1px solid var(--tj-line);border-radius:14px;background:var(--tj-card);cursor:pointer;min-width:0;transition:transform .15s,box-shadow .15s;isolation:isolate}.tj-archive-group:hover{transform:translateY(-2px);box-shadow:0 7px 24px #142f2510}.tj-archive-group.menu-open{z-index:4}.tj-archive-group:focus-visible{outline:2px solid var(--tj-green);outline-offset:3px}.tj-group-cover{aspect-ratio:1.5;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:13px 13px 0 0;background:var(--tj-soft);color:var(--tj-green)}.tj-group-cover img{display:block;width:100%;height:100%;object-fit:cover}.tj-group-body{padding:14px 16px 15px}.tj-group-body h3{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tj-group-count{margin-top:5px;color:var(--tj-muted);font-size:11px}.tj-group-more{position:absolute;top:10px;right:10px;width:30px;height:28px;border:1px solid #ffffff55;border-radius:7px;background:#183c2bc9;color:white;cursor:pointer;line-height:1}.tj-group-menu{position:absolute;right:10px;top:44px;padding:4px;min-width:124px;border:1px solid var(--tj-line);border-radius:9px;background:var(--tj-card);box-shadow:0 8px 22px #0002;z-index:2}.tj-group-menu button{border:0;border-radius:5px;padding:7px 11px;width:100%;text-align:left;background:none;color:var(--tj-ink);cursor:pointer}.tj-group-menu button:hover{background:var(--tj-soft)}.tj-archive-divider{display:flex;align-items:center;gap:12px;margin:27px 0 15px;scroll-margin-top:145px}.tj-archive-divider h2{font-size:13px;font-weight:600;white-space:nowrap;color:var(--tj-muted)}.tj-archive-divider:after{content:'';height:1px;background:var(--tj-line);flex:1}
.tj-month-rail-wrap{position:sticky;top:145px;align-self:start;width:28px;z-index:1}
.tj-month-rail{max-height:calc(100vh - 175px);overflow:auto;overscroll-behavior:contain;scrollbar-width:none;display:flex;flex-direction:column;padding:3px}
.tj-month-year{height:1px;flex:none;margin:8px 0 4px;background:var(--tj-line)}
.tj-month-year:first-child{margin-top:0}
.tj-month-mark{width:100%;height:15px;flex:none;display:flex;align-items:center;justify-content:flex-end;padding:0;border:0;background:transparent;color:var(--tj-muted);cursor:pointer}
.tj-month-mark:after{content:'';width:8px;height:1px;background:currentColor;opacity:.8}
.tj-month-mark:is(:hover,:focus-visible,[aria-current=true]){color:var(--tj-green)}
.tj-month-mark:is(:hover,:focus-visible,[aria-current=true]):after{width:19px;height:2px;opacity:1}
.tj-month-mark:focus-visible{outline-offset:-1px}
.tj-month-hint{position:absolute;right:calc(100% + 8px);transform:translateY(-50%);padding:5px 9px;border:1px solid var(--tj-line);border-radius:7px;background:var(--tj-card);color:var(--tj-ink);box-shadow:0 3px 14px #0002;font-size:12px;white-space:nowrap;pointer-events:none}
.tj-cover-picker-backdrop{position:fixed;inset:0;z-index:2100;background:#0f1d1a66;display:flex;align-items:center;justify-content:center;padding:24px}.tj-cover-picker{display:flex;flex-direction:column;width:min(760px,100%);max-height:calc(100vh - 48px);min-height:170px;border:1px solid var(--tj-line);border-radius:16px;background:var(--tj-card);color:var(--tj-ink);box-shadow:0 20px 70px #0003;overflow:hidden}.tj-cover-picker-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 20px;border-bottom:1px solid var(--tj-line)}.tj-cover-picker-header h2{font-size:17px}.tj-cover-picker-scroll{padding:16px 20px 20px;overflow:auto;overscroll-behavior:contain}.tj-cover-picker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:12px}.tj-cover-choice{display:block;padding:0;border:1px solid var(--tj-line);border-radius:9px;overflow:hidden;background:var(--tj-soft);color:var(--tj-ink);cursor:pointer;text-align:left}.tj-cover-choice:not(:disabled):hover{border-color:var(--tj-green)}.tj-cover-choice img{display:block;aspect-ratio:1.25;width:100%;object-fit:cover}.tj-cover-choice span{display:block;padding:5px 8px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tj-cover-picker-footer{display:flex;justify-content:center;margin-top:16px}@media(max-width:640px){.tj-browse-toolbar{flex-wrap:wrap;gap:8px}.tj-browse-field{flex-basis:100%}.tj-browse-mode{flex:1}.tj-browse-direction{min-width:112px}.tj-cover-picker-backdrop{padding:14px}.tj-cover-picker{max-height:calc(100vh - 28px)}.tj-cover-picker-header,.tj-cover-picker-scroll{padding:14px}.tj-cover-picker-grid{grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:9px}}
`;
    function ArchiveBrowseToolbar({ query = '', submittedQuery = query, onQuery, onSubmit, mode = 'date', onMode, reverse = false, onReverse, searching = false }) {
      const hint = '可直接描述照片，也可加城市、年份；条件用空格、逗号或顿号分隔。先缩小时间和地点范围，再用照片描述与标签查找。';
      const pendingSameQuery = searching && query.trim() === submittedQuery.trim();
      return h('form', { className: 'tj-browse-toolbar', role: 'search', onSubmit: (event) => { event.preventDefault(); if (!pendingSameQuery) onSubmit?.(event); } },
        h('div', { className: 'tj-browse-field' }, h('input', { className: 'tj-input', type: 'text', value: query, maxLength: 500, placeholder: '描述照片，也可加城市、年份（如：杭州 2025 海边吃饭）', title: hint, 'aria-label': hint, onChange: (event) => onQuery?.(event.target.value) }),
          h('button', { className: 'tj-browse-search', type: 'submit', disabled: pendingSameQuery, 'aria-label': pendingSameQuery ? '正在查找' : '查找照片', title: '查找照片' }, pendingSameQuery ? h('span', { className: 'tj-spinner', 'aria-hidden': true }) : h(Icon, { name: 'search', size: 18 }))),
        h('select', { className: 'tj-input tj-browse-mode', value: mode, 'aria-label': '档案分组方式', onChange: (event) => onMode?.(event.target.value) }, ...[['province', '按省份'], ['month', '按月份'], ['date', '按日期'], ['random', '随机']].map(([value, label]) => h('option', { key: value, value }, label))),
        h('button', { className: 'tj-btn tj-browse-direction', type: 'button', 'aria-label': reverse ? '最早优先，切换为最近优先' : '最近优先，切换为最早优先', 'aria-pressed': reverse, onClick: () => onReverse?.(!reverse) }, h('span', { 'aria-hidden': true }, reverse ? '↑' : '↓'), reverse ? '最早优先' : '最近优先'));
    }
    function ArchiveGroupCard({ group, onOpen, onCover }) {
      const [menuOpen, setMenuOpen] = useState(false), card = useRef(null), menu = useRef(null);
      useEffect(() => {
        if (!menuOpen || typeof document === 'undefined') return;
        const close = () => setMenuOpen(false), outside = (event) => { if (!card.current?.contains(event.target)) close(); };
        document.addEventListener('pointerdown', outside, true); document.addEventListener('scroll', close, true);
        menu.current?.querySelector('button')?.focus();
        return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('scroll', close, true); };
      }, [menuOpen]);
      function showMenu(event) { if (!onCover) return; event.preventDefault(); event.stopPropagation?.(); setMenuOpen(true); }
      function key(event) {
        if (event.key === 'Escape' && menuOpen) { event.preventDefault(); event.stopPropagation?.(); setMenuOpen(false); card.current?.focus(); return; }
        if (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) { showMenu(event); return; }
        if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onOpen?.(group); }
      }
      return h('article', { ref: card, className: 'tj-archive-group' + (menuOpen ? ' menu-open' : ''), role: 'button', tabIndex: 0, 'aria-label': `${group.title}，${group.photoCount || 0} 张照片`, onClick: () => { if (menuOpen) setMenuOpen(false); else onOpen?.(group); }, onContextMenu: showMenu, onKeyDown: key },
        h('div', { className: 'tj-group-cover' }, group.cover?.previewUrl ? h('img', { src: group.cover.previewUrl, alt: group.cover.name || group.title, loading: 'lazy', decoding: 'async' }) : h(Icon, { name: 'photo', size: 36 })),
        h('div', { className: 'tj-group-body' }, h('h3', { title: group.title }, group.title), h('div', { className: 'tj-group-count' }, `${group.photoCount || 0} 张照片`, Number.isFinite(group.dayCount) ? ` · ${group.dayCount} 天` : '')),
        onCover ? h('button', { className: 'tj-group-more', type: 'button', 'aria-label': `更换${group.title}的封面`, 'aria-haspopup': 'menu', 'aria-expanded': menuOpen, title: '封面操作', onClick: (event) => { event.stopPropagation(); setMenuOpen(!menuOpen); } }, '•••') : null,
        menuOpen ? h('div', { ref: menu, className: 'tj-group-menu', role: 'menu', 'aria-label': `${group.title}的封面操作`, onClick: (event) => event.stopPropagation() }, h('button', { type: 'button', role: 'menuitem', onClick: (event) => { event.stopPropagation(); setMenuOpen(false); onCover?.(group); } }, '更换封面')) : null);
    }
    function ArchiveMonthRail({ months = [], active, onJump, reverse = false }) {
      const wrap = useRef(null), anchor = useRef(null);
      const [hint, setHint] = useState(null);
      function hideHint(node) {
        if (node && node !== anchor.current?.node) return;
        anchor.current = null;
        setHint(null);
      }
      function positionHint() {
        const target = anchor.current, frame = wrap.current;
        if (!target || !frame) return;
        const bounds = frame.getBoundingClientRect(), mark = target.node.getBoundingClientRect();
        const top = mark.top + mark.height / 2 - bounds.top;
        if (top < 0 || top > bounds.height) { hideHint(); return; }
        setHint({ title: target.title, top });
      }
      function showHint(event, title) {
        anchor.current = { node: event.currentTarget, title };
        positionHint();
      }
      const yearOf = (month) => String(month.year || (/^\d{4}-\d{2}/.test(month.key || '') ? month.key.slice(0, 4) : ''));
      const items = [...months].sort((a, b) => {
        const unknownA = !/^\d{4}$/.test(yearOf(a)), unknownB = !/^\d{4}$/.test(yearOf(b));
        if (unknownA !== unknownB) return (unknownA ? 1 : -1) * (reverse ? -1 : 1);
        return String(a.key).localeCompare(String(b.key)) * (reverse ? 1 : -1);
      });
      let previousYear;
      const marks = items.flatMap((month) => {
        const year = yearOf(month), known = /^\d{4}$/.test(year), heading = known ? year : '待补充', key = String(month.key), monthNumber = /^\d{4}-\d{2}/.test(key) ? Number(key.slice(5, 7)) : null;
        const title = monthNumber ? `${year}年${monthNumber}月` : month.title || '日期待补充', children = [];
        if (previousYear !== heading) {
          children.push(h('div', { key: `year:${key}`, className: 'tj-month-year', role: 'separator', 'aria-label': known ? `${year}年` : '日期待补充' }));
          previousYear = heading;
        }
        children.push(h('button', {
          key, type: 'button', className: 'tj-month-mark', 'aria-current': active === month.key ? true : undefined,
          'aria-label': `${title}${Number.isFinite(month.count) ? `，${month.count} 项` : ''}`,
          onMouseEnter: (event) => showHint(event, title),
          onMouseLeave: (event) => { if (!event.currentTarget.matches?.(':focus-visible')) hideHint(event.currentTarget); },
          onFocus: (event) => { if (event.currentTarget.matches?.(':focus-visible') !== false) showHint(event, title); },
          onBlur: (event) => { if (!event.currentTarget.matches?.(':hover')) hideHint(event.currentTarget); },
          onClick: () => onJump?.(month.key),
        }));
        return children;
      });
      return h('div', { className: 'tj-month-rail-wrap', ref: wrap },
        h('nav', { className: 'tj-month-rail', 'aria-label': '按月份定位档案', onScroll: positionHint }, ...marks),
        hint ? h('div', { className: 'tj-month-hint', style: { top: hint.top }, 'aria-hidden': true }, hint.title) : null);
    }
    function ArchiveGroupDivider({ label }) { return h('div', { className: 'tj-archive-divider', role: 'separator', 'aria-label': label }, h('h2', null, label)); }
    function ArchiveCoverPicker({ title, photos = [], busy = false, error, hasMore = false, onMore, onChoose, onClose }) {
      const box = useRef(null);
      useEffect(() => { const previous = typeof document === 'undefined' ? null : document.activeElement; box.current?.querySelector('button')?.focus(); return () => previous?.focus?.(); }, []);
      function key(event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation?.(); onClose?.(); }
        if (event.key === 'Tab' && typeof document !== 'undefined') { const buttons = box.current?.querySelectorAll('button:not(:disabled)'); if (!buttons?.length) return; const first = buttons[0], last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
      }
      return h('div', { className: 'tj-cover-picker-backdrop', onClick: (event) => { if (event.target === event.currentTarget) onClose?.(); } }, h('section', { ref: box, className: 'tj-cover-picker', role: 'dialog', 'aria-modal': true, 'aria-label': `为${title || '此分组'}选择封面`, onKeyDown: key },
        h('header', { className: 'tj-cover-picker-header' }, h('h2', null, `为${title || '此分组'}选择封面`), h('button', { className: 'tj-btn small', type: 'button', onClick: onClose, 'aria-label': '关闭封面选择' }, '关闭')),
        h('div', { className: 'tj-cover-picker-scroll', 'aria-busy': busy }, error ? h('div', { className: 'tj-notice error', role: 'alert' }, error) : null,
          h('div', { className: 'tj-cover-picker-grid' }, ...photos.map((photo) => h('button', { className: 'tj-cover-choice', type: 'button', key: `${photo.recordId}:${photo.photoId || photo.id}`, disabled: busy, 'aria-label': `将${photo.name || '这张照片'}设为封面`, onClick: () => { if (!busy) onChoose?.(photo); } }, h('img', { src: photo.previewUrl, alt: photo.name || '旅行照片', loading: 'lazy', decoding: 'async' }), h('span', { title: photo.name }, photo.name || '旅行照片')))),
          busy ? h('p', { className: 'tj-processing', role: 'status' }, h('span', { className: 'tj-spinner', 'aria-hidden': true }), '正在处理照片…') : !photos.length && !error ? h('p', { className: 'tj-hint' }, '这个分组还没有可用照片。') : null,
          hasMore ? h('div', { className: 'tj-cover-picker-footer' }, h('button', { className: 'tj-btn small', type: 'button', disabled: busy, onClick: () => { if (!busy) onMore?.(); } }, error ? '重试加载更多' : '加载更多照片')) : null)));
    }
    function TravelPage() {
      const [state, setState] = useState(null), [tab, setTab] = useState('records'), [error, setError] = useState(''), [toast, setToast] = useState('');
      const [query, setQuery] = useState(''), [date, setDate] = useState(''), [place, setPlace] = useState(''), [results, setResults] = useState(null), [searching, setSearching] = useState(false);
      const [record, setRecord] = useState(null), [revision, setRevision] = useState(0);
      const [draftBusy, setDraftBusy] = useState(false);
      const [demoBusy, setDemoBusy] = useState(false);
      const demoFlight = useRef(false);
      const csrf = useRef(''), recordId = useRef(null); recordId.current = record?.id;
      const library = useRef(''), libraryView = useRef(undefined), stateRequest = useRef(0), libraryEpoch = useRef(0);
      const [archive, setArchive] = useState(null), [pageStatus, setPageStatus] = useState({ loading: false, error: '' });
      const [detailMatches, setDetailMatches] = useState([]);
      const list = useRef({ generation: 0, snapshot: null, busy: false, needsRefresh: false });
      const view = useRef({ search: false, searchRequest: 0, openRequest: 0 });
      const latestState = useRef(null), observedRevision = useRef(undefined);
      const [menu, setMenu] = useState(null), [confirmation, setConfirmation] = useState(null), [deleteBusy, setDeleteBusy] = useState(false), [deleteError, setDeleteError] = useState('');
      const mutationFlight = useRef(false), mutationEpoch = useRef(0), deleteFlight = useRef(false);
      const [searchNotice, setSearchNotice] = useState('');
      const scrollArea = useRef(null);
      const resultView = useRef(results); resultView.current = results;
      library.current = state?.storage?.accessToken || state?.storage?.libraryId || '';
      const archiveBrowse = state?.compat?.archiveBrowse === true;
      const browse = useArchiveBrowser({ active: archiveBrowse && (!state.storage || state.storage.status === 'ready') && tab === 'records' && !record,
        api, libraryKey: library.current, revision, scrollArea, notify: setToast });
      const archiveScroll = useRef(0);
      async function api(path, options = {}) {
        const init = { credentials: 'same-origin', cache: 'no-store', headers: {} };
        const archiveRequest = !/^\/(?:state|config|storage|geo|demo-info)(?:[/?]|$)/.test(path), epoch = libraryEpoch.current;
        if (library.current && archiveRequest) init.headers['x-travel-library'] = library.current;
        if (options.body !== undefined) {
          init.method = 'POST'; init.headers['x-travel-csrf'] = csrf.current;
          if (options.body instanceof FormData) init.body = options.body;
          else if (options.body instanceof Blob) { init.body = options.body; init.headers['content-type'] = options.contentType || 'application/octet-stream'; }
          else { init.body = JSON.stringify(options.body); init.headers['content-type'] = 'application/json'; }
        }
        const mutation = options.body !== undefined && /^\/(?:edit-record|edit-photo|delete-record|delete-photo|fill-missing-locations)$/.test(path);
        if (mutation) {
          if (mutationFlight.current) throw new Error('请等当前修改完成后再操作。');
          mutationFlight.current = true; mutationEpoch.current++; stateRequest.current++; cancelPage(); view.current.openRequest++; view.current.searchRequest++; setSearching(false);
          if (resultView.current === null) view.current.search = false;
        }
        const dataEpoch = mutationEpoch.current;
        try {
          const timeoutMs = options.timeoutMs || (path === '/import' ? 600000 : path.startsWith('/search') || path === '/demo' || path.startsWith('/archive?') && new URLSearchParams(path.split('?')[1]).has('q') ? 120000 : 15000);
          const data = await fetchJSON(API + path, init, timeoutMs);
          if (archiveRequest && epoch !== libraryEpoch.current) throw Object.assign(new Error('资料文件夹已切换，请在当前资料中重试。'), { stale: true });
          if (archiveRequest && !mutation && !/^\/imports(?:[/?]|$)/.test(path) && dataEpoch !== mutationEpoch.current) throw Object.assign(new Error('记录已更新，请重试。'), { stale: true });
          if (data.csrfToken) csrf.current = data.csrfToken;
          return data;
        } finally { if (mutation) { mutationFlight.current = false; mutationEpoch.current++; } }
      }
      function stateRevision(next) { return next.recordsRevision ?? next.recordPage?.revision ?? JSON.stringify(next.records || []); }
      function uniqueRecords(records) { return Array.from(new Map((records || []).map((item) => [item.id, item])).values()); }
      function firstPage(next) {
        const records = uniqueRecords(next.records), page = next.recordPage || {};
        return { records, nextCursor: page.nextCursor || null, hasMore: Boolean(page.hasMore && page.nextCursor), total: page.total ?? records.length, revision: stateRevision(next) };
      }
      function publishPage(snapshot) { list.current.snapshot = snapshot; setArchive(snapshot); }
      function cancelPage() { list.current.generation++; list.current.busy = false; setPageStatus({ loading: false, error: '' }); }
      async function reconcileRecords(next, reset = false) {
        const first = firstPage(next), previous = list.current.snapshot;
        if (!reset && !list.current.needsRefresh && previous?.revision === first.revision) return;
        const target = reset ? 24 : Math.max(24, previous?.records.length || 0);
        cancelPage(); const generation = list.current.generation;
        list.current.needsRefresh = false;
        if (reset || !previous || first.records.length >= target || !first.hasMore) { publishPage(first); return; }
        // Keep the existing cards mounted while rebuilding the range already read.
        // Publishing only a complete, consistent revision avoids gaps and duplicates.
        list.current.busy = true; setPageStatus({ loading: true, error: '' });
        try {
          let snapshot = first;
          while (snapshot.records.length < target && snapshot.hasMore) {
            const response = await api('/records?' + new URLSearchParams({ after: snapshot.nextCursor, limit: '24' }));
            if (generation !== list.current.generation) return;
            if (response.revision !== first.revision) throw new Error('档案正在更新，请重试加载。');
            const records = uniqueRecords([...snapshot.records, ...(response.records || [])]);
            if (response.hasMore && (!response.nextCursor || response.nextCursor === snapshot.nextCursor || records.length === snapshot.records.length)) throw new Error('后续档案暂时无法加载，请重试。');
            snapshot = { records, nextCursor: response.nextCursor || null, hasMore: Boolean(response.hasMore && response.nextCursor), total: response.total ?? first.total, revision: first.revision };
          }
          if (generation === list.current.generation) publishPage(snapshot);
        } catch (problem) {
          if (generation === list.current.generation) { list.current.needsRefresh = true; setPageStatus({ loading: false, error: problem.message }); }
        } finally {
          if (generation === list.current.generation) { list.current.busy = false; setPageStatus((before) => ({ ...before, loading: false })); }
        }
      }
      async function loadMoreRecords() {
        if (list.current.busy || view.current.search) return;
        if (list.current.needsRefresh) { try { await refresh(); } catch (problem) { setPageStatus({ loading: false, error: problem.message }); } return; }
        const current = list.current.snapshot;
        if (!current?.hasMore || !current.nextCursor) return;
        const generation = list.current.generation;
        list.current.busy = true; setPageStatus({ loading: true, error: '' });
        try {
          const response = await api('/records?' + new URLSearchParams({ after: current.nextCursor, limit: '24' }));
          if (generation !== list.current.generation || view.current.search) return;
          if (response.revision !== current.revision) { list.current.needsRefresh = true; throw new Error('档案已更新，请重试加载最新记录。'); }
          const records = uniqueRecords([...current.records, ...(response.records || [])]);
          if (response.hasMore && (!response.nextCursor || response.nextCursor === current.nextCursor || records.length === current.records.length)) throw new Error('后续档案暂时无法加载，请重试。');
          publishPage({ records, nextCursor: response.nextCursor || null, hasMore: Boolean(response.hasMore && response.nextCursor), total: response.total ?? current.total, revision: current.revision });
        } catch (problem) { if (generation === list.current.generation) setPageStatus({ loading: false, error: problem.message }); }
        finally { if (generation === list.current.generation) { list.current.busy = false; setPageStatus((before) => ({ ...before, loading: false })); } }
      }
      function clearSearch(clearFields = true) {
        if (latestState.current?.compat?.archiveBrowse) {
          if (clearFields) { view.current.openRequest++; setQuery(''); browse.move({ q: '', place: '', jump: '', searchId: '' }); }
          return;
        }
        view.current.searchRequest++; view.current.openRequest++; view.current.search = false;
        setResults(null); resultView.current = null; setSearching(false); setDetailMatches([]); setSearchNotice('');
        if (clearFields) { setQuery(''); setDate(''); setPlace(''); }
        if (latestState.current) reconcileRecords(latestState.current);
      }
      async function acceptState(next) {
        const identity = next.storage ? `${next.storage.accessToken || next.storage.libraryId || ''}|${next.storage.path}|${next.storage.status}` : '';
        const previous = libraryView.current ?? (state?.storage ? `${state.storage.accessToken || state.storage.libraryId || ''}|${state.storage.path}|${state.storage.status}` : undefined);
        const switched = previous !== undefined && previous !== identity, unavailable = next.storage && next.storage.status !== 'ready';
        if (switched || unavailable) {
          if (previous !== identity) libraryEpoch.current++;
          cancelPage(); view.current.searchRequest++; view.current.openRequest++; view.current.search = false;
          list.current.snapshot = null; list.current.needsRefresh = false; setArchive(null); setSearching(false);
          setRecord(null); recordId.current = null; setDetailMatches([]); setResults(null); setQuery(''); setDate(''); setPlace('');
          setMenu(null); setConfirmation(null); setDeleteError('');
          resultView.current = null; setSearchNotice('');
          browse.reset();
        }
        libraryView.current = identity; library.current = next.storage?.accessToken || next.storage?.libraryId || '';
        latestState.current = next;
        const nextRevision = stateRevision(next), changed = switched || observedRevision.current !== nextRevision;
        observedRevision.current = nextRevision;
        setState(next); if (changed) setRevision((n) => n + 1);
        if (!unavailable && !next.compat?.archiveBrowse && !view.current.search) await reconcileRecords(next, switched);
        return changed;
      }
      async function refresh() {
        const request = ++stateRequest.current, next = await api('/state');
        if (request === stateRequest.current) await acceptState(next);
        return next;
      }
      useEffect(() => {
        let active = true, running = false;
        async function tick() {
          if (running || mutationFlight.current) return; running = true;
          try {
            const request = ++stateRequest.current, next = await api('/state');
            if (!active || request !== stateRequest.current) return;
            const changed = await acceptState(next); setError('');
            const id = recordId.current;
            const fromLibrary = library.current;
            if (changed && id) { const detail = await api('/record?id=' + encodeURIComponent(id)); if (active && recordId.current === id && fromLibrary === library.current) setRecord(detail.record); }
          } catch (problem) { if (active && !problem.stale) setError(problem.message); } finally { running = false; }
        }
        tick(); const timer = setInterval(tick, 4000); return () => { active = false; clearInterval(timer); list.current.generation++; view.current.searchRequest++; view.current.openRequest++; libraryEpoch.current++; };
      }, []);
      useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
      async function open(id, matchedPhotoIds = []) {
        const fromLibrary = library.current, request = ++view.current.openRequest;
        try {
          const result = await api('/record?id=' + encodeURIComponent(id));
          if (fromLibrary !== library.current || request !== view.current.openRequest) return;
          if (archiveBrowse && scrollArea.current) { archiveScroll.current = scrollArea.current.scrollTop; scrollArea.current.scrollTop = 0; }
          setRecord(result.record);
          setDetailMatches(Array.isArray(matchedPhotoIds) ? [...new Set(matchedPhotoIds.filter((value) => typeof value === 'string'))] : []);
          setTab('records');
        } catch (problem) { if (request === view.current.openRequest && !problem.stale) setError(problem.message); }
      }
      const restoreArchiveScroll = useRef(false);
      useEffect(() => {
        if (!record && restoreArchiveScroll.current) {
          restoreArchiveScroll.current = false;
          if (scrollArea.current) scrollArea.current.scrollTop = archiveScroll.current;
        }
      }, [record]);
      function closeRecord() { if (archiveBrowse) restoreArchiveScroll.current = true; setRecord(null); }
      async function search(event, overrides) {
        event?.preventDefault(); setSearching(true); setError(''); setSearchNotice('');
        const values = overrides || { q: query, date, place };
        const fromLibrary = library.current, request = ++view.current.searchRequest;
        view.current.search = true; view.current.openRequest++; setDetailMatches([]); cancelPage();
        try {
          const result = await api('/search?' + new URLSearchParams(values));
          if (fromLibrary === library.current && request === view.current.searchRequest) {
            if (scrollArea.current) scrollArea.current.scrollTop = 0;
            resultView.current = result.records; setResults(result.records); setRecord(null);
          }
        }
        catch (problem) { if (request === view.current.searchRequest) { setError(problem.message); clearSearch(false); } }
        finally { if (request === view.current.searchRequest) setSearching(false); }
      }
      async function download(url, filename) {
        try { const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' }); if (!response.ok) { const result = await response.json(); throw new Error(result.message || '下载失败。'); } const blob = await response.blob(); const target = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = target; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(target), 60000); } catch (problem) { setError(problem.message); }
      }
      function updated(value, options = {}) {
        const id = options.recordId || value?.id || recordId.current, deleted = options.deleted || value === null;
        mutationEpoch.current++; stateRequest.current++; cancelPage(); view.current.openRequest++; view.current.searchRequest++; setSearching(false);
        if (recordId.current === id) { setRecord(deleted ? null : value); recordId.current = deleted ? null : value?.id; if (deleted) setDetailMatches([]); }
        function patch(item) {
          if (item.id !== id) return item;
          if (deleted) return null;
          const ids = new Set((value.media || []).map((photo) => photo.id));
          const matchedPhotoIds = (item.matchedPhotoIds || []).filter((photoId) => ids.has(photoId));
          const cover = (value.media || []).find((photo) => photo.previewUrl && matchedPhotoIds.includes(photo.id)) || (value.media || []).find((photo) => photo.previewUrl);
          const smallCover = cover ? { ...cover, previewUrl: /[?&]size=/.test(cover.previewUrl) ? cover.previewUrl.replace(/([?&])size=[^&]*/, '$1size=480') : cover.previewUrl + (cover.previewUrl.includes('?') ? '&' : '?') + 'size=480' } : null;
          return { ...item, title: value.title, date: value.date, summary: value.summary, tags: value.tags, cityGroups: (value.cityGroups || []).map(({ key, name, country, province }) => ({ key, name, country, province })), photoCount: value.media?.length ?? item.photoCount, media: smallCover ? [smallCover] : [], matchedPhotoIds };
        }
        if (list.current.snapshot) { const snapshot = list.current.snapshot, records = snapshot.records.map(patch).filter(Boolean); publishPage({ ...snapshot, records, total: deleted ? Math.max(0, snapshot.total - 1) : snapshot.total }); }
        // Edits/deletions can invalidate textual and day-context search evidence.
        // Remove only the changed result; do not spend another model call silently.
        setResults((before) => { const next = before === null ? null : before.filter((item) => item.id !== id); resultView.current = next; return next; });
        if (view.current.search) { setDetailMatches([]); setSearchNotice('有记录已修改，请重新搜索更新结果。'); }
        setRevision((before) => before + 1);
        refresh().catch((problem) => { if (!problem.stale) setError(problem.message); });
      }
      const actionLibrary = library.current, actionEpoch = libraryEpoch.current;
      function checkActionLibrary() { if (actionLibrary !== library.current || actionEpoch !== libraryEpoch.current) throw Object.assign(new Error('资料文件夹已切换，请在当前资料中重试。'), { stale: true }); }
      async function actionApi(path, options) { checkActionLibrary(); const result = await api(path, options); checkActionLibrary(); return result; }
      function actionUpdated(value, options) { checkActionLibrary(); updated(value, options); }
      function showMenu(event, item) {
        if (event.target?.closest?.('input,textarea')) return;
        event.preventDefault(); event.stopPropagation?.();
        if (mutationFlight.current) return;
        setMenu({ ...item, library: actionLibrary, epoch: actionEpoch, x: Math.max(8, Math.min(event.clientX || 8, (window.innerWidth || 1200) - 180)), y: Math.max(8, Math.min(event.clientY || 8, (window.innerHeight || 800) - (item.cover ? 140 : 100))) });
      }
      function requestDelete() { if (!menu) return; setConfirmation(menu); setDeleteError(''); setMenu(null); }
      async function confirmDelete() {
        const item = confirmation; if (!item || deleteFlight.current) return;
        if (item.library !== library.current || item.epoch !== libraryEpoch.current) { setConfirmation(null); return; }
        deleteFlight.current = true; setDeleteBusy(true); setDeleteError('');
        try {
          const id = item.kind === 'record' ? item.record.id : item.recordId;
          const result = await api(item.kind === 'record' ? '/delete-record' : '/delete-photo', { body: item.kind === 'record' ? { id } : { recordId: id, photoId: item.media.id } });
          if (item.library !== library.current || item.epoch !== libraryEpoch.current) return;
          updated(result.record, { recordId: id, deleted: item.kind === 'record' || result.record === null }); setConfirmation(null); setToast(item.kind === 'record' ? '这一天已从旅行档案中删除。' : '照片已删除。');
        } catch (problem) { if (item.library === library.current && item.epoch === libraryEpoch.current) setDeleteError(problem.message); }
        finally { deleteFlight.current = false; setDeleteBusy(false); }
      }
      async function runDemo() {
        if (demoFlight.current) return; demoFlight.current = true; setDemoBusy(true); setError('');
        try { const result = await api('/demo', { body: {} }); setRecord(null); setTab('records'); clearSearch(); await refresh(); setToast('示例照片已按日期归档，可在列表查看各天。'); } catch (problem) { setError(problem.message); } finally { demoFlight.current = false; setDemoBusy(false); }
      }
      async function handleDraft(kind) {
        if (kind === 'cancel' && !window.confirm('结束这次待归档导入，随后可重新选择照片。已经归档的记录不会改变。继续吗？')) return;
        setDraftBusy(true);
        try { const result = await api('/draft/' + kind, { body: {} }); if (savedRecords(result).length) { setRecord(null); setTab('records'); clearSearch(); } await refresh(); setToast(kind === 'commit' ? '待归档素材已按日期保存，可在列表查看。' : '已结束本次待归档导入，可以重新选择照片。'); } catch (problem) { setError(problem.message); } finally { setDraftBusy(false); }
      }
      function onCity(city) {
        if (archiveBrowse) {
          selectTab('records');
          setQuery(city.name);
          browse.move({ ...archiveSettings(), reverse: browse.settings.reverse, place: city.name });
          return;
        }
        setPlace(city.name); setDate(''); setQuery(''); setTab('records'); search(null, { q: '', date: '', place: city.name });
      }
      function selectTab(id) {
        if (id !== tab) {
          view.current.openRequest++;
          browse.cancelPicker();
          if (scrollArea.current) scrollArea.current.scrollTop = 0;
        }
        setTab(id); setRecord(null);
        if (id === 'map') setRevision((n) => n + 1);
      }
      function searchArchive(event) {
        event?.preventDefault();
        view.current.openRequest++;
        browse.move({ q: query.trim(), place: '', jump: '', searchId: query.trim() ? importRequestId() : '' });
      }
      function archiveCrumbs() {
        const options = browse.settings, filtered = options.q || options.place;
        if (!options.province && !options.month && !options.jump && !filtered) return null;
        const root = options.mode === 'province' ? '所有省份' : options.mode === 'month' ? '所有月份' : '回到开头';
        const button = (label, onClick) => h('button', { className: 'tj-btn link', type: 'button', onClick }, label);
        return h('div', { className: 'tj-row tj-archive-crumbs', 'aria-label': '档案位置' },
          options.province || options.month || options.jump ? button(root, () => browse.move({ province: '', provinceTitle: '', city: '', cityTitle: '', month: '', monthTitle: '', jump: '' })) : null,
          options.province ? h('span', { 'aria-hidden': true }, '›') : null,
          options.province ? (options.city ? button(options.provinceTitle, () => browse.move({ city: '', cityTitle: '' })) : h('strong', null, options.provinceTitle)) : null,
          options.city ? h('span', { 'aria-hidden': true }, '›') : null,
          options.city ? h('strong', null, options.cityTitle) : null,
          options.month ? h('span', { 'aria-hidden': true }, '›') : null,
          options.month ? h('strong', null, options.monthTitle) : null,
          filtered ? button('清除筛选', () => clearSearch()) : null);
      }
      function archiveEmpty(finding = false) {
        return h('div', { className: 'tj-card tj-empty' },
          h('div', { className: 'tj-empty-mark' }, h(Icon, { name: finding ? 'search' : 'photo', size: 30 })),
          h('h2', null, finding ? '没有符合条件的档案' : '从一组照片开始'),
          h('p', { className: 'tj-muted' }, finding ? '试试其他描述，或调整城市、年份。' : '混合选择不同日期的照片，自动归入各天的旅行档案。'),
          !finding ? h(React.Fragment, null,
            h('div', { className: 'tj-row', style: { justifyContent: 'center' } },
              h('button', { className: 'tj-btn primary', onClick: () => selectTab('import') }, h(Icon, { name: 'plus', size: 16 }), '导入第一组照片'),
              h('button', { className: 'tj-btn', disabled: demoBusy, onClick: runDemo }, demoBusy ? h('span', { className: 'tj-spinner' }) : null, demoBusy ? '正在导入示例…' : '用示例照片试试')),
            h('p', { className: 'tj-hint', style: { marginTop: 13 } }, '3 天 5 张公开照片，时间地点为模拟数据。'), h(DemoSources, { api })) : null);
      }
      function renderBrowse() {
        const { page, settings, status } = browse;
        const cards = (items) => h('div', { className: 'tj-grid' }, ...items.map((item) => h(RecordCard, {
          key: item.id, record: item, open, api: actionApi, updated: actionUpdated, onMenu: showMenu, onCover: browse.openDayCover, notify: setToast,
        })));
        const groups = (items) => h('div', { className: 'tj-grid tj-archive-group-grid' }, ...items.map((group) => h(ArchiveGroupCard, {
          key: group.key, group, onOpen: browse.openGroup, onCover: browse.openCover,
        })));
        let content;
        if (!page) {
          content = status.error ? h(LoadMore, { count: 0, hasMore: false, error: status.error, onMore: () => browse.load() }) : h('div', { className: 'tj-loading', role: 'status', 'aria-live': 'polite' }, settings.q ? '正在查找匹配照片：先筛选城市和年份，再根据照片描述与标签匹配。' : '正在读取档案…');
        } else if (!page.items.length) {
          content = archiveEmpty(Boolean(settings.q || settings.place || settings.province || settings.month || settings.jump));
        } else if (page.kind === 'groups' && settings.mode === 'month') {
          content = archiveSections(page.items, (group) => group.year || 'unknown').map((section) => h('section', { key: section.key },
            h(ArchiveGroupDivider, { label: section.key === 'unknown' ? '日期未归类' : `${section.key} 年` }), groups(section.items)));
        } else if (page.kind === 'groups') {
          content = groups(page.items);
        } else if (settings.mode === 'date') {
          content = archiveSections(page.items, (item) => item.date?.slice(0, 7) || 'unknown').map((section) => h('section', { key: section.key, 'data-archive-month': section.key },
            h(ArchiveGroupDivider, { label: section.key === 'unknown' ? '日期未归类' : `${section.key.slice(0, 4)}.${Number(section.key.slice(5))}` }), cards(section.items)));
        } else {
          content = cards(page.items);
        }
        const rail = settings.mode === 'date' && page?.months?.length > 0;
        const searchInfo = settings.q && page?.search;
        const searchMessage = searchInfo?.mode === 'ai' ? '已由 AI 根据照片描述与标签筛选。' : searchInfo?.mode === 'fallback' ? '本次未完成 AI 筛选，当前显示本地匹配结果。' : searchInfo?.mode === 'local' ? '当前显示本地筛选结果。' : '';
        const countedCoverage = Number.isSafeInteger(searchInfo?.reviewedCount) && searchInfo.reviewedCount >= 0 && Number.isSafeInteger(searchInfo?.candidateCount) && searchInfo.candidateCount >= searchInfo.reviewedCount;
        const coverageMessage = !searchInfo?.truncated ? '' : countedCoverage && searchInfo.mode === 'ai' ? ` AI 检查了 ${searchInfo.reviewedCount} / ${searchInfo.candidateCount} 张候选照片，可用城市或年份缩小范围。` : searchInfo.mode === 'local' ? ' 当前仅显示部分匹配结果，可用城市或年份缩小范围。' : ' AI 未覆盖全部候选照片，可用城市或年份缩小范围。';
        return h('div', { className: `tj-archive-layout${rail ? ' tj-archive-with-rail' : ''}` },
          h('div', { className: 'tj-archive-main' }, archiveCrumbs(), searchMessage || searchInfo?.truncated ? h('p', { className: 'tj-hint tj-archive-search-info', role: 'status', 'aria-live': 'polite' }, searchMessage, coverageMessage) : null, content,
            page?.items.length ? h(LoadMore, { count: page.items.length, total: settings.jump ? undefined : page.total, hasMore: page.hasMore, loading: status.busy, error: status.error,
              onMore: () => browse.load(status.error ? { preserve: true } : { append: true }), unit: page.kind === 'groups' ? '个分类' : '天的记忆' }) : null),
          rail ? h(ArchiveMonthRail, { months: page.months, active: browse.activeMonth || page.items[0]?.date?.slice(0, 7) || 'unknown',
            onJump: (month) => { view.current.openRequest++; browse.jumpMonth(month); }, reverse: settings.reverse }) : null);
      }
      const records = results === null ? archive?.records || state?.records || [] : results;
      const summary = state?.summary || {};
      const storageReady = !state?.storage || state.storage.status === 'ready';
      const pending = Number(summary.pending ?? summary.pendingJobs ?? summary.processing ?? 0) || 0;
      const photoCount = summary.photos ?? summary.photoCount ?? (state?.records || []).reduce((n, item) => n + (item.photoCount ?? item.media?.length ?? 0), 0);
      const archiveVisible = state && storageReady && tab === 'records' && !record;
      return h('div', { className: 'tj', ref: scrollArea }, h('style', null, CSS + GROUP_CSS + ACTION_CSS + ARCHIVE_TOOLBAR_CSS + ARCHIVE_BROWSE_CSS + ARCHIVE_LAYOUT_CSS), h('div', { className: 'tj-wrap' },
        h('header', { className: 'tj-hero' }, h('div', null, h('div', { className: 'tj-eyebrow' }, 'PLACES · MOMENTS · MEMORIES'), h('h1', null, '旅行记忆'), h('p', { className: 'tj-muted' }, '随手留下照片和几句话，日后凭一点印象找回来。')), h('div', { className: 'tj-hero-actions' }, h('div', { className: 'tj-stat' }, h('div', { className: 'tj-count' }, storageReady ? summary.records || 0 : '—'), h('small', null, '段记忆')), h('div', { className: 'tj-stat' }, h('div', { className: 'tj-count' }, storageReady ? photoCount : '—'), h('small', null, '张照片')), h('button', { className: 'tj-btn primary', disabled: !storageReady, onClick: () => selectTab('import') }, h(Icon, { name: 'plus', size: 16 }), '导入照片'))),
        h('div', { className: archiveVisible ? 'tj-archive-toolbar' : undefined },
          h('nav', { className: 'tj-nav', role: 'tablist', 'aria-label': '旅行记忆功能' }, ...[['records', '每日档案', 'journal'], ['map', '城市足迹', 'map'], ['import', '导入照片', 'photo'], ['settings', '设置与存储', 'settings']].map(([id, label, icon]) => h('button', { key: id, role: 'tab', 'aria-selected': tab === id, onClick: () => selectTab(id) }, h(Icon, { name: icon, size: 16 }), label))),
          archiveVisible && archiveBrowse ? h(ArchiveBrowseToolbar, { query, submittedQuery: browse.settings.q, onQuery: setQuery, onSubmit: searchArchive,
            mode: browse.settings.mode, onMode: (mode) => { view.current.openRequest++; browse.changeMode(mode); }, reverse: browse.settings.reverse,
            onReverse: (reverse) => { view.current.openRequest++; browse.move({ reverse, jump: '' }); }, searching: browse.status.busy && !browse.page }) : archiveVisible ? h('div', { className: 'tj-searchbar' },
            h('form', { className: 'tj-search', onSubmit: search },
              h('input', { className: 'tj-input', 'aria-label': '按标签筛选', value: query, onChange: (e) => setQuery(e.target.value), maxLength: 500, placeholder: '输入标签，多个用逗号分隔' }),
              h('input', { className: 'tj-input', type: 'date', 'aria-label': '按日期筛选', value: date, onChange: (e) => setDate(e.target.value) }),
              h('input', { className: 'tj-input', 'aria-label': '按地点筛选', value: place, onChange: (e) => setPlace(e.target.value), placeholder: '城市或地点', maxLength: 200 }),
              h('button', { className: 'tj-btn', disabled: searching, type: 'submit' }, searching ? h('span', { className: 'tj-spinner' }) : h(Icon, { name: 'search', size: 16 }), '筛选')),
            results !== null || searching ? h('div', { className: 'tj-search-caption' },
              results !== null ? h('span', null, records.length >= 100 ? '显示最近 100 段匹配记忆，可缩小筛选范围' : `找到 ${records.length} 段匹配记忆`) : null,
              h('button', { className: 'tj-btn link', style: { marginInlineStart: 'auto' }, onClick: () => clearSearch() }, '清除筛选')) : null) : null),
        error ? h('div', { className: 'tj-notice error', role: 'alert' }, error) : null,
        state?.compat?.missing?.length ? h('div', { className: 'tj-notice error', role: 'alert' }, `当前 DSH 没有提供 ${state.compat.missing.join('、')}，依赖它的功能已关闭。请更新旅行记忆插件或 DSH。`) : null,
        pending ? h('div', { className: 'tj-notice' }, h('span', { className: 'tj-processing' }, h('span', { className: 'tj-spinner' }), `正在整理 ${pending} 项记忆，原图已保存。`)) : null,
        state?.draft ? h('div', { className: 'tj-notice' }, h('strong', null, '有一组素材尚未归档。'), ' ', `${state.draft.media?.length || 0} 张照片，${state.draft.media?.filter((item) => item.status === 'failed').length || 0} 张未能保存。`, h('button', { className: 'tj-btn small', disabled: draftBusy || state.draft.media?.some((item) => item.status !== 'saved'), onClick: () => handleDraft('commit') }, '完成归档'), h('button', { className: 'tj-btn small', disabled: draftBusy, onClick: () => handleDraft('cancel') }, '结束本次导入'), h('details', { style: { marginTop: 8 } }, h('summary', { style: { cursor: 'pointer' } }, '查看待归档素材'), ...(state.draft.media || []).map((item) => h('div', { key: item.id }, `${item.name}：${item.status === 'saved' ? '已保存原文件' : item.error || '未完成'}`)), ...(state.draft.notes || []).map((item, i) => h('p', { key: i }, item)))) : null,
        !state ? h('div', { className: 'tj-loading' }, error ? '等待插件连接。' : '正在打开你的旅行记忆…') : null,
        state && !storageReady && tab !== 'settings' ? h('div', { className: 'tj-settings' }, h('div', { className: 'tj-notice error', role: 'alert' }, '资料文件夹暂时不可用，已暂停照片导入和整理。请连接硬盘，或选择移动后的文件夹。'), h(StorageFolder, { state, api, refresh, notify: setToast })) : null,
        state && storageReady ? h(ImportPanel, { key: `import:${state.storage?.accessToken || state.storage?.libraryId || 'default'}`, api: actionApi, state, visible: tab === 'import', onShow: () => selectTab('import'), notify: setToast, onSaved: () => { refresh().catch((problem) => { if (!problem.stale) setError(problem.message); }); } }) : null,
        state && tab === 'settings' ? h(Settings, { key: `settings:${state.storage?.accessToken || state.storage?.libraryId || 'default'}`, state, api, archiveApi: actionApi, refresh, locationsUpdated: () => { clearSearch(false); return refresh(); }, notify: setToast }) : null,
        state && storageReady && tab === 'map' ? h(Footprints, { key: `map:${state.storage?.accessToken || state.storage?.libraryId || 'default'}`, api, onCity, revision, footprintLevel: state.config?.footprintLevel || 'city' }) : null,
        state && storageReady && tab === 'records' && record ? h(RecordDetail, { key: `${state.storage?.accessToken || state.storage?.libraryId || ''}:${record.id}`, record, matchedPhotoIds: detailMatches, api: actionApi, updated: actionUpdated, onMenu: showMenu, back: closeRecord, notify: setToast, download, refresh }) : null,
        archiveVisible && archiveBrowse ? renderBrowse() : archiveVisible ? h(React.Fragment, null,
          results !== null && searchNotice ? h('p', { className: 'tj-notice' }, searchNotice) : null,
          records.length ? h('div', { className: 'tj-grid' }, ...records.map((item) => h(RecordCard, { key: `${state.storage?.accessToken || state.storage?.libraryId || ''}:${item.id}`, record: item, open, api: actionApi, updated: actionUpdated, onMenu: showMenu, notify: setToast }))) : h('div', { className: 'tj-card tj-empty' }, h('div', { className: 'tj-empty-mark' }, h(Icon, { name: results === null ? 'photo' : 'search', size: 30 })), h('h2', null, results === null ? '从一组照片开始' : '暂时没有找到这段回忆'), h('p', { className: 'tj-muted' }, results === null ? '混合选择不同日期的照片，自动归入各天的旅行档案。' : '换一个地点、物品，或你当时说过的词试试。'), results === null ? h(React.Fragment, null, h('div', { className: 'tj-row', style: { justifyContent: 'center' } }, h('button', { className: 'tj-btn primary', onClick: () => setTab('import') }, h(Icon, { name: 'plus', size: 16 }), '导入第一组照片'), h('button', { className: 'tj-btn', disabled: demoBusy, onClick: runDemo }, demoBusy ? h('span', { className: 'tj-spinner' }) : null, demoBusy ? '正在导入示例…' : '用示例照片试试')), h('p', { className: 'tj-hint', style: { marginTop: 13 } }, '3 天 5 张公开照片，时间地点为模拟数据。'), h(DemoSources, { api })) : null),
          results === null && !searching && records.length ? h(LoadMore, { key: state.storage?.accessToken || state.storage?.libraryId || 'default', count: records.length, total: archive?.total ?? state.recordPage?.total ?? records.length, hasMore: archive?.hasMore ?? Boolean(state.recordPage?.hasMore), loading: pageStatus.loading, error: pageStatus.error, onMore: loadMoreRecords }) : null) : null,
        archiveVisible && archiveBrowse && browse.picker ? h(ArchiveCoverPicker, { ...browse.picker, onMore: browse.moreCovers, onChoose: browse.chooseCover, onClose: browse.closeCover }) : null,
        menu ? h(ContextMenu, { key: `${menu.kind}:${menu.record?.id || menu.media?.id}`, menu, close: () => setMenu(null), remove: requestDelete }) : null,
        confirmation ? h(DeleteDialog, { key: `${confirmation.kind}:${confirmation.record?.id || confirmation.media?.id}`, item: confirmation, busy: deleteBusy, error: deleteError, cancel: () => { if (!deleteFlight.current) setConfirmation(null); }, confirm: confirmDelete }) : null,
        toast ? h('div', { className: 'tj-toast', role: 'status' }, toast) : null));
    }
    const ARCHIVE_LAYOUT_CSS = `
.tj-archive-with-rail{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:12px}
.tj-archive-main{min-width:0}.tj-archive-crumbs{margin:0 0 12px;min-height:26px;color:var(--tj-muted)}
.tj-archive-crumbs strong{color:var(--tj-ink);font-weight:600}.tj-archive-main [data-archive-month]{scroll-margin-top:145px}
.tj-archive-group-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))}
@media(max-width:640px){.tj-archive-with-rail{gap:8px}.tj-archive-main .tj-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,195px),1fr))}}
`;
    function archiveSettings() {
      return { mode: 'date', reverse: false, q: '', searchId: '', place: '', province: '', provinceTitle: '', city: '', cityTitle: '', month: '', monthTitle: '', jump: '', seed: importRequestId() };
    }
    function archiveParams(settings, after) {
      const { mode, reverse, q, searchId, place, province, city, month, jump, seed } = settings;
      const values = { mode, reverse: reverse ? '1' : '0', q, searchId: q ? searchId : '', place, province, city, month, jump: after ? '' : jump, seed: mode === 'random' ? seed : '', limit: '24', after };
      return new URLSearchParams(Object.entries(values).filter(([, value]) => value));
    }
    function archiveSections(items, keyOf) {
      const sections = [];
      for (const item of items) {
        const key = keyOf(item);
        if (sections.at(-1)?.key !== key) sections.push({ key, items: [] });
        sections.at(-1).items.push(item);
      }
      return sections;
    }
    function useArchiveBrowser({ active, api, libraryKey, revision, scrollArea, notify }) {
      const [settings, setSettings] = useState(archiveSettings);
      const [snapshot, setSnapshot] = useState(null);
      const [status, setStatus] = useState({ busy: false, error: '' });
      const [activeMonth, setActiveMonth] = useState('');
      const [picker, setPicker] = useState(null);
      const [navigation, setNavigation] = useState(0);
      const work = useRef({ request: 0, busy: false, snapshot: null });
      const coverWork = useRef({ request: 0, busy: false, saving: false, picker: null });
      const key = `${libraryKey}|${archiveParams(settings)}`;
      const page = snapshot?.key === key ? snapshot : null;
      function cancelPicker() {
        coverWork.current.request++;
        coverWork.current.busy = false;
        coverWork.current.saving = false;
        coverWork.current.picker = null;
        setPicker(null);
      }
      function move(patch, { scroll = true } = {}) {
        work.current.request++;
        work.current.busy = false;
        setStatus({ busy: false, error: '' });
        setActiveMonth(patch.jump || '');
        cancelPicker();
        if (scroll && scrollArea.current) scrollArea.current.scrollTop = 0;
        setSettings((previous) => ({ ...previous, ...patch }));
        setNavigation((previous) => previous + 1);
      }
      function reset() {
        work.current.snapshot = null;
        setSnapshot(null);
        move(archiveSettings());
      }
      async function load({ append = false, preserve = false } = {}) {
        const current = work.current, previous = current.snapshot?.key === key ? current.snapshot : null;
        if (append && (current.busy || !previous?.hasMore || !previous.nextCursor)) return;
        const request = ++current.request;
        current.busy = true;
        setStatus({ busy: true, error: '' });
        const target = preserve ? previous?.items.length || 0 : 0;
        let after = append ? previous.nextCursor : '', next = append ? previous : null;
        try {
          do {
            const response = await api('/archive?' + archiveParams(settings, after));
            if (request !== current.request) return;
            if (next && (next.revision !== response.revision || next.kind !== response.kind)) {
              if (append) return load();
              throw new Error('档案已更新，请重新加载。');
            }
            const groups = response.kind === 'groups', identity = (item) => groups ? item.key : item.id;
            const incoming = groups ? response.groups : response.records;
            const items = Array.from(new Map([...(next?.items || []), ...(incoming || [])].map((item) => [identity(item), item])).values());
            const cursor = response.nextCursor || '';
            if (response.hasMore && (!cursor || cursor === after || items.length === (next?.items.length || 0))) throw new Error('后续档案暂时无法加载，请重试。');
            next = { key, kind: response.kind, items, months: response.months || next?.months || [], search: response.search ?? next?.search ?? null, nextCursor: cursor, hasMore: Boolean(response.hasMore && cursor), total: response.total ?? items.length, revision: response.revision };
            after = cursor;
          } while (!append && next.hasMore && next.items.length < target);
          current.snapshot = next;
          setSnapshot(next);
        } catch (problem) {
          if (request === current.request && !problem.stale) setStatus({ busy: false, error: problem.message });
        } finally {
          if (request === current.request) {
            current.busy = false;
            setStatus((previousStatus) => ({ ...previousStatus, busy: false }));
          }
        }
      }
      useEffect(() => {
        if (!active) return;
        void load({ preserve: true });
        return () => { work.current.request++; work.current.busy = false; };
      }, [active, key, revision, navigation]);
      useEffect(() => () => { coverWork.current.request++; }, []);
      function openGroup(group) {
        if (settings.mode === 'month') move({ month: group.key, monthTitle: group.title });
        else if (settings.province) move({ city: group.key, cityTitle: group.title });
        else move({ province: group.key, provinceTitle: group.title, city: '', cityTitle: '' });
      }
      function changeMode(mode) {
        if (mode === settings.mode) return;
        move({ mode, province: '', provinceTitle: '', city: '', cityTitle: '', month: '', monthTitle: '', jump: '', ...(mode === 'random' ? { seed: importRequestId() } : {}) });
      }
      function jumpMonth(month) {
        const anchor = scrollArea.current?.querySelector?.(`[data-archive-month="${month}"]`);
        if (anchor) { setActiveMonth(month); anchor.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }
        else move({ jump: month });
      }
      function publishPicker(next) { coverWork.current.picker = next; setPicker(next); }
      async function loadCovers(selection = coverWork.current.picker, append = false) {
        const current = coverWork.current;
        if (!selection || current.busy || current.saving || (append && !selection.hasMore)) return;
        const request = ++current.request;
        current.busy = true;
        publishPicker({ ...selection, busy: true, error: '' });
        try {
          const params = new URLSearchParams({ ...selection.scope, limit: '24' });
          if (append) params.set('after', selection.nextCursor);
          const response = await api('/archive/covers?' + params);
          if (request !== current.request) return;
          const photos = Array.from(new Map([...(append ? selection.photos : []), ...(response.photos || [])].map((photo) => [`${photo.recordId}/${photo.photoId}`, photo])).values());
          publishPicker({ ...selection, photos, busy: false, hasMore: Boolean(response.hasMore && response.nextCursor), nextCursor: response.nextCursor, error: '' });
        } catch (problem) {
          if (request === current.request) publishPicker({ ...selection, busy: false, error: problem.message });
        } finally { if (request === current.request) current.busy = false; }
      }
      function openCover(group) {
        const type = settings.mode === 'month' ? 'month' : settings.province ? 'city' : 'province';
        cancelPicker();
        void loadCovers({ title: group.title, scope: { type, key: group.key, ...(type === 'city' ? { province: settings.province } : {}) }, photos: [], busy: false });
      }
      function openDayCover(record) {
        cancelPicker();
        void loadCovers({ title: record.title || dateText(record.date), scope: { type: 'day', key: record.id }, photos: [], busy: false });
      }
      async function chooseCover(photo) {
        const current = coverWork.current, selection = current.picker;
        if (!selection || current.saving || current.busy) return;
        const request = ++current.request;
        current.saving = true;
        publishPicker({ ...selection, busy: true, error: '' });
        try {
          await api('/archive/cover', { body: { ...selection.scope, recordId: photo.recordId, photoId: photo.photoId } });
          if (request !== current.request) return;
          cancelPicker();
          notify('封面已更换。');
          void load({ preserve: true });
        } catch (problem) {
          if (request === current.request) publishPicker({ ...selection, busy: false, error: problem.message });
        } finally { if (request === current.request) current.saving = false; }
      }
      return { settings, page, status, picker, activeMonth, move, reset, load, openGroup, changeMode, jumpMonth, openCover, openDayCover, chooseCover, closeCover: () => { if (!coverWork.current.saving) cancelPicker(); }, cancelPicker, moreCovers: () => loadCovers(coverWork.current.picker, Boolean(coverWork.current.picker?.nextCursor)) };
    }
    function apply(ctx) {
      const slots = ctx.slots || (typeof ctx.get === 'function' ? ctx.get('slots') : undefined);
      if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
        console.warn('[travel-journal] DSH 没有提供 slots 服务，旅行记忆面板未注册。请更新 DSH 或插件版本。');
        return;
      }
      const register = () => {
        const offMain = slots.inject('main', () => slots.register({ name: 'main', key: 'travel-journal' }, TravelPage));
        const offSide = slots.inject('sidebar.panellist', () => slots.register({ name: 'sidebar.panellist', id: 'travel-journal', order: 25, label: () => '旅行记忆' }, Icon));
        return () => { offSide?.(); offMain?.(); };
      };
      try {
        if (typeof ctx.effect === 'function') ctx.effect(register, 'travel-journal: panel registration');
        else register();
      } catch (error) {
        console.warn('[travel-journal] 面板注册失败：' + String(error?.message || error));
      }
    }
    return { apply, inject: ['slots'], TravelPage, createOfflineMap, compileMapGeometry, fetchJSON };
  },
});
