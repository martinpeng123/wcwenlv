// ==UserScript==
// @name         wcwl-sign
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  try to take over the world!
// @author       You
// @match        https://reserve.chaoxing.com/front/third/apps/reserve/codeSign**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @include      https://reserve.chaoxing.com/front/third/apps/reserve/codeSign**
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    // 目标 class 名称
    const TARGET_CLASS = 'code_begin'; // 替换为你的目标 class

    // 创建 MutationObserver
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // 检查新增的节点
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        checkForVueInstance(node);
                    }
                });
            } else if (mutation.type === 'attributes') {
                // 检查属性变化（如 class 变化）
                if (mutation.attributeName === 'class') {
                    const targetNode = mutation.target;
                    if (targetNode.classList && targetNode.classList.contains(TARGET_CLASS)) {
                        checkForVueInstance(targetNode);
                    }
                }
            }
        }
    });

    // 开始观察整个文档
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'] // 只监听 class 变化
    });

    // 检查元素是否包含 Vue 实例
    function checkForVueInstance(element) {
        // 检查是否有目标 class
        if (element.classList && element.classList.contains(TARGET_CLASS)) {
            // 尝试获取 Vue 2.x 实例（挂载在 DOM 上）
            const vm = element.__vue__;
            if (vm) {
                console.log('Vue instance found:', vm);
                if (!vm.isAddressTrue) {
                    vm.isAddressTrue = true;
                }
                if (vm.isLoading) {
                    vm.isLoading = false;
                }
            } else {
                console.log('No Vue instance found on this element');
            }
        }
    }
})();
