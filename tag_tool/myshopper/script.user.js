// ==UserScript==
// @name         [TG3D] [Myshopper] Tag Tool
// @namespace    https://www.tg3ds.com/
// @version      1.1
// @description  tag tool for myshopper
// @author       TG3D
// @match        https://*.tg3ds.com/mtm/customer*
// @match        https://*.tg3ds.com/mtm/template/customer_dialog?tid=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tg3ds.com
// @downloadURL  https://raw.githubusercontent.com/TG3Ds/MTM-Scripts/refs/heads/main/tag_tool/myshopper/script.user.js
// @updateURL    https://raw.githubusercontent.com/TG3Ds/MTM-Scripts/refs/heads/main/tag_tool/myshopper/script.user.js
// @grant        GM_addStyle
// ==/UserScript==

const lang = navigator.language || navigator.userLanguage;
const isZh = lang.startsWith('zh');
const i18n_tagged = isZh ? '已標籤' : 'Tagged';
const i18n_add_tag = isZh ? '新增標籤' : 'Add Tag';

const plusIcon = `
<span class="plus-icon" style="vertical-align: text-top;">
    <svg width="16" height="16" style="fill: currentColor; display: block;" viewBox="0 0 24 24">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
    </svg>
</span>
`;

const closeIcon = `
<svg width="18" height="18" style="fill: currentColor; display: inline-block;" viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
</svg>
`;

const removeTag = (text) => {
  const index = gCustomerDialogScope.record.tag_list.findIndex(t => t === text);
  if (index > -1) {
    gCustomerDialogScope.record.tag_list.splice(index, 1);
    removeTagElement(text);
  }
}

const addTag = (text) => {
  const index = gCustomerDialogScope.record.tag_list.findIndex(t => t === text);
  if (index > -1)
    return;
  gCustomerDialogScope.record.tag_list.push(text);
  addTagElement(text);
}

const addTagElement = (text, insertFirst = false) => {
  if (Array.from(document.querySelectorAll('.scan-tag-remark > span')).some(e => e.innerText === text))
    return;

  const container = document.querySelector('#scan-tag-container');

  const ul = container.querySelector('ul');
  const li = document.createElement('li');
  li.classList.add('scan-tag-remark');
  if (insertFirst) {
    ul.insertBefore(li, ul.firstChild.nextSibling);
  } else {
    ul.appendChild(li);
  }

  const span = document.createElement('span');
  span.style.color = 'black';
  span.innerHTML = text;
  li.appendChild(span);

  const btn = document.createElement('button');
  btn.className = 'md-icon-button delete-icon md-button ng-scope md-ink-ripple';
  btn.style.lineHeight = 0;
  btn.innerHTML = closeIcon;
  btn.addEventListener('click', () => {
    ul.removeChild(li);
    removeTag(text);
    gCustomerDialogScope.$apply();
  });
  li.appendChild(btn);
}

const removeTagElement = (text) => {
  const container = document.querySelector('#scan-tag-container');
  const ul = container.querySelector('ul');
  const li = Array.from(ul.querySelectorAll('li')).find(e => e.querySelector('span').innerText === text);
  if (li) {
    ul.removeChild(li);
  }
}

const waitRecordInit = (callback) => {
  if (gCustomerDialogScope.record) {
    callback();
  } else {
    setTimeout(waitRecordInit, 100, callback);
  }
}

const injectOK = () => {
  const scope = gCustomerDialogScope;
  scope._ok = scope.ok;
  scope.ok = async () => {
    try {
      scope.is_updating = true;
      const token = document.querySelector("meta[name=csrf-token]").content;
      const tid = gCustomerDialogScope.record.tid;
      const { tag_list } = gCustomerDialogScope.record;
      if (scope.is_dirty()) {
        const res = await fetch(`/api/v1/scan_records/${tid}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': token
          },
          body: JSON.stringify({ 'tag_list': tag_list })
        });
        if (res.status !== 204) {
          throw new Error(`/api/v1/scan_records: ${res.status}`);
        }
      }
    } catch (e) {
      console.error('[injectOK], error:', e);
      alert(e);
    }
    finally {
      scope.is_updating = false;
      scope._ok();
    }
  };
}

const onRecordInit = () => {
  const scope = gCustomerDialogScope;
  injectOK();

  console.log('[tag_list]', scope.record.tag_list);
  scope.record.orig_tag_list = [...scope.record.tag_list];
  scope._is_dirty = scope.is_dirty;
  scope.is_dirty = () => {
    if (!scope.record) return scope._is_dirty();
    const isDirty = JSON.stringify(scope.record.orig_tag_list) !== JSON.stringify(scope.record.tag_list);
    return scope._is_dirty() || isDirty;
  };

  const { tag_list } = gCustomerDialogScope.record;
  for (const tag of tag_list) {
    addTagElement(tag);
  }
}

const init = () => {
  const card = document.querySelector('.customer-basic-info-card');
  if (!card) return;

  const divSeparator = document.createElement('div');
  divSeparator.classList.add('customer-info-data-separator');
  card.appendChild(divSeparator);

  const container = document.createElement('div');
  container.id = 'scan-tag-container';
  container.classList.add('customer-info-data-container');
  container.innerHTML = `<ul class="customer-info-remarks"><li class="add-remark-button" style="cursor: pointer; margin-right: 10px">${i18n_add_tag} ${plusIcon}</li></ul>`;
  card.appendChild(container);

  // Implement add remark button ( add scan tag )
  const addRemarkBtn = container.querySelector('.add-remark-button');
  addRemarkBtn.addEventListener('click', () => {
    const inputField = document.createElement('li');
    inputField.innerHTML = '<li><input style="border: none; outline: none; color: black;" type="text"></li>';
    const input = inputField.querySelector('input');
    input.onblur = () => {
      const text = input.value.trim();
      if (text) {
        addTag(text);
        gCustomerDialogScope.$apply();
      }
      inputField.remove();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
    addRemarkBtn.parentElement.insertBefore(inputField, addRemarkBtn.nextSibling);
    input.focus();
  });

  waitRecordInit(() => onRecordInit());
}

const initShowTagged = () => {
  const taggedText = ` <span style="color: #D4005C">(${i18n_tagged})</span>`;
  const listView = document.querySelector('div.main-container > div.column.list-view');

  if (!listView) return;

  const updateTagged = (item) => {
    const tags = item.getAttribute('data-tags') || '';
    const isMatch = tags.includes(':');

    const itemName = item.querySelector('.item-name');
    if (!itemName) return;
    itemName.innerHTML = itemName.innerHTML.replace(taggedText, '');
    if (isMatch) {
      itemName.innerHTML = itemName.innerHTML + taggedText;
    }
  }

  const onTagsChange = (mutationList, observer) => {
    if (mutationList.some(m => m.type === 'attributes')) {
      const item = mutationList[0].target;
      updateTagged(item);
    }
  };

  const onListViewChange = (mutationList, observer) => {
    if (mutationList.some(m => m.type === 'childList')) {
      listView.querySelectorAll('.list-item').forEach(item => {
        const observer = new MutationObserver(onTagsChange);
        observer.observe(item, { attributes: true });
        updateTagged(item);
      })
    };
  };

  const observer = new MutationObserver(onListViewChange);
  observer.observe(listView, { childList: true });
}

// --- Custom --- //

const TAG_TYPES = ['Small', 'Medium', 'Large', 'Straight', 'Natural', 'Wave'];

const getSizeXtKey = (measure_name) => {
  for (const part of Object.values(gCustomerDialogScope.measure_info)) {
    const m = part.find(m => m.name === measure_name);
    if (m) return m.key;
  }
  return null;
}

const addSelectElement = (options) => {
  const s = document.createElement('select');
  s.className = "tags-select";
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt;
    o.innerText = opt;
    s.appendChild(o);
  });
  return s;
}

const selectTag = (name, value) => {
  const scope = gCustomerDialogScope;
  const index = scope.record.tag_list.findIndex(t => t.startsWith(`${name}:`));
  if (index > -1) {
    removeTag(scope.record.tag_list[index]);
  }
  if (value) {
    addTag(`${name}:${value}`);
  }
};

const processMeasureItem = (item) => {
  if (item.querySelector('.tags-select')) return;

  const measure_name = item.querySelector('span.measure-name').innerText;
  const key = getSizeXtKey(measure_name) || measure_name;
  const s = addSelectElement(['', ...TAG_TYPES]);
  item.appendChild(s);

  s.onchange = () => {
    selectTag(key, s.value);
  };
  s.addEventListener('click', function (event) {
    event.stopPropagation();
  });

  const index = gCustomerDialogScope.record.tag_list.findIndex(t => t.startsWith(`${key}:`));
  if (index > 0) {
    s.value = gCustomerDialogScope.record.tag_list[index].split(':')[1];
  }
};

const main = () => {
  const customCSS = `
#scan-tag-container {display: none;}
.tags-select
{
    display: block;
    padding: 0.5rem 1rem;
    font-size: 12px;
    line-height: 1.5;
    color: #1f2937;
    background-color: #fff;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    box-sizing: border-box;

    /* 自訂 select 箭頭樣式 */
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>');
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    background-size: 1.25em;
    padding-right: 2.5rem;
}

.tags-select:focus
{
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

select::-ms-expand {
    display: none;
}
`;
  GM_addStyle(customCSS);
  const callback = (mutationList, observer) => {
    if (mutationList.some(m => m.type === 'childList')) {
      document.querySelectorAll('.measure-item').forEach(processMeasureItem);
    };
  };

  const measure_container = document.querySelector('#measure-item-scroll-container');
  const observer = new MutationObserver(callback);
  observer.observe(measure_container, { childList: true, subtree: true });
}
// --- Custom --- //

(function () {
  'use strict';

  if (window.location.href.includes('mtm/customer')) {
    initShowTagged();
    return;
  }

  init();

  // --- Custom --- //
  main();
})();
