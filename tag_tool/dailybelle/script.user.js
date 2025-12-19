// ==UserScript==
// @name         [TG3D] [DailyBelle] Tag Tool
// @namespace    https://www.tg3ds.com/
// @version      4.3
// @description  新增自動標記按鈕
// @author       TG3D
// @match        https://*.tg3ds.com/mtm/customer*
// @match        https://*.tg3ds.com/mtm/template/customer_dialog?tid=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tg3ds.com
// @downloadURL  https://raw.githubusercontent.com/TG3Ds/MTM-Scripts/refs/heads/main/tag_tool/dailybelle/script.user.js
// @updateURL    https://raw.githubusercontent.com/TG3Ds/MTM-Scripts/refs/heads/main/tag_tool/dailybelle/script.user.js
// @grant        none
// ==/UserScript==
// changelog
//   2025-12-18 v5.0: 新增身形標籤，移除未使用的標籤
//   2025-12-18 v4.3: 修正胸型標籤
//   2024-08-07 v4.2: 新增標籤
//   2024-08-07 v4.1: 等待fetch完畢
//   2024-08-07 v4.0: 將掃描標籤與使用者備註分離
//   2024-08-06 v3.0: 在列表中顯示已標籤
//   2024-08-01 v2.2: 修正錯字
//   2024-07-30 v2.1: 修正錯字
//   2024-07-30 v2.0: 修訂tags
//   2024-07-26 v1.2: 隱藏部分tags
//   2024-07-22 v1.1: 拆分tags

const DEFAULT_TAGS = {
    "BodyShape": [
        "X型",
        "A型",
        "T型",
        "O型",
        "H型",
    ],
    "BreastShape": [
        "平胸型",
        "小胸型",
        "圓胸型",
        "水滴型",
        "輕微垂墜型",
        "垂墜型",
    ],
    "Upper": [
        "外擴型",
        "胸部下垂",
        "駝背",
        "胸部高低",
        "副乳",
        "大小胸",
        "肩膀高低",
        "圓肩",
        "肩凹",
        "富貴包",
        "左胸組織異常",
        "右胸組織異常",
    ],
    "Lower": [
        "腰間脂肪",
        "骨盆前傾",
        "骨盆後傾",
        "脊椎側彎",
        "內褲過緊",
        "小腿肌旺盛",
        "假胯寬",
    ],
}

const plusIcon = `
<span class="plus-icon" style="vertical-align: text-top;">
    <svg width="16" height="16" style="fill: currentColor; display: block;" viewBox="0 0 24 24">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
    </svg>
</span>`;

const closeIcon = `
<svg width="18" height="18" style="fill: currentColor; display: inline-block;" viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
</svg>
`;

const clearTags = () => {
    const remarks = Array.from(document.querySelectorAll('.dailybelle-remark'));
    remarks.forEach(remark => {
        remark.remove();
    });
}

const addTag = (text, container, insertFirst = false) => {
    if (Array.from(document.querySelectorAll('.dailybelle-remark > span')).some(e => e.innerText.includes(text)))
        return;

    const ul = container.querySelector('ul');
    const li = document.createElement('li');
    li.classList.add('dailybelle-remark');
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
        gCustomerDialogScope.$apply();
    });
    li.appendChild(btn);
}

const waitElement = (selector, callback) => {
    const element = document.querySelector(selector);
    if (!element) {
        setTimeout(waitElement, 100, selector, callback);
        return;
    }

    callback(element);
}

const injectOkBtn = (btn) => {
    const scope = gCustomerDialogScope;
    if (scope) {
        scope._is_dirty = scope.is_dirty;
        scope.is_dirty = () => {
            if (!gCustomerDialogScope.record) return scope._is_dirty();
            const { tag_list } = gCustomerDialogScope.record;
            const remarks = Array.from(document.querySelectorAll('.dailybelle-remark > span')).map(e => e.innerText);
            const isDirty = tag_list.length !== remarks.length || !remarks.every(t => tag_list.includes(t));
            return scope._is_dirty() || isDirty;
        };

        scope._origin_ok = scope.ok;
        scope.ok = async () => {
            try {
                scope.is_updating = true;
                const token = document.querySelector("meta[name=csrf-token]").content;
                const tid = gCustomerDialogScope.record.tid;
                const tags = Array.from(document.querySelectorAll('.dailybelle-remark > span')).map(e => e.innerText);
                if (scope.is_dirty()) {
                    const res = await fetch(`/api/v1/scan_records/${tid}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-Token': token
                        },
                        body: JSON.stringify({ 'tag_list': tags })
                    });
                    if (res.status !== 204) {
                        throw new Error(`/api/v1/scan_records: ${res.status}`);
                    }
                }
            } catch (e) {
                console.error('[injectOkBtn], error:', e);
                alert(e);
            }
            finally {
                scope.is_updating = false;
                scope._origin_ok();
            }
        };
    }
}

const watchTagList = (callback) => {
    setInterval(() => {
        const record = gCustomerDialogScope?.record;
        if (record === window.currentRecord) return;
        window.currentRecord = record;
        callback(record);
    }, 1000);
}

(function () {
    'use strict';

    if (window.location.href.includes('mtm/customer')) {
        const taggedText = ' <span style="color: #D4005C">(已標籤)</span>';
        const listView = document.querySelector('div.main-container > div.column.list-view');

        const updateTagged = (item) => {
            const tags = item.getAttribute('data-tags') || '';
            const isMatch = tags.split(',').some(tag => {
                return Object.keys(DEFAULT_TAGS).some(key => {
                    return DEFAULT_TAGS[key].some(t => t === tag);
                });
            });

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
        return;
    }

    const card = document.querySelector('.customer-basic-info-card');
    if (!card) return;

    const divSeparator = document.createElement('div');
    divSeparator.classList.add('customer-info-data-separator');
    card.appendChild(divSeparator);

    const container = document.createElement('div');
    container.classList.add('customer-info-data-container');
    container.innerHTML = `<ul class="customer-info-remarks"><li class="add-remark-button" style="cursor: pointer; margin-right: 10px">掃描標籤 ${plusIcon}</li></ul>`;
    card.appendChild(container);

    const addRemarkBtn = container.querySelector('.add-remark-button');
    addRemarkBtn.addEventListener('click', () => {
        const inputField = document.createElement('li');
        inputField.innerHTML = '<li><input style="border: none; outline: none; color: black;" type="text"></li>';
        const input = inputField.querySelector('input');
        input.onblur = () => {
            const text = input.value.trim();
            if (text) {
                addTag(text, container, true);
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

    window.currentRecord = null;
    watchTagList((record) => {
        clearTags();
        if (!Array.isArray(record.tag_list)) return;
        record.tag_list.forEach(tag => addTag(tag, container));
    });

    document.styleSheets[0].insertRule(".dailybelle-tags { display: flex; flex-wrap: wrap; margin-top: 24px; gap: 6px; color: white; font-size: 14px; font-weight: 300; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags-bodyshape button { background-color: #009B4C; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags-breastshape button { background-color: #D4005C; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags-upper button { background-color: #5C00D4; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags-lower button { background-color: #D45C00; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags button { height: 36px; border: 0; border-radius: 20px; background-color: #4a4a4a; padding: 0px 16px; display: flex; align-items: center; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags button:hover { opacity: 0.4; transition: 0.4s; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags button:disabled { opacity: 0.4; }", 0);
    document.styleSheets[0].insertRule(".dailybelle-tags .plus-icon { border-radius: 50%; border: 1px solid white; margin-left: 6px; }", 0);

    const btns = [];
    Object.keys(DEFAULT_TAGS).forEach(key => {
        const div = document.createElement('div');
        container.appendChild(div);
        div.classList.add('dailybelle-tags');
        div.classList.add(`dailybelle-tags-${key.toLowerCase()}`);

        DEFAULT_TAGS[key].forEach(tag => {
            const btn = document.createElement('button');
            btn.innerHTML = tag + plusIcon;
            btn.onclick = () => { addTag(tag, container); gCustomerDialogScope.$apply(); };
            div.appendChild(btn);
            btns.push(btn);
        });
    });


    const updateBtns = () => {
        const remarks = Array.from(document.querySelectorAll('.dailybelle-remark'));
        btns.forEach(btn => {
            btn.disabled = remarks.some(r => r.innerText === btn.innerText);
        });
    };
    const callback = (mutationList, observer) => {
        if (mutationList.some(m => m.type === 'childList')) {
            updateBtns();
        };
    };

    const observer = new MutationObserver(callback);
    observer.observe(container, { childList: true, subtree: true });

    waitElement(".customer-info-toolbar.ng-scope > button[type='submit']", (e) => {
        injectOkBtn(e);
    });
})();
