// ==UserScript==
// @name         wcwl-reserve
// @namespace    http://tampermonkey.net/
// @version      2025-05-13
// @description  try to take over the world!
// @author       You
// @match        https://github.com/duolabmeng6/duolabmeng6.github.io/issues/22
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @include      https://reserve.chaoxing.com/front/third/apps/reserve/item/reserve**
// @require      https://cdn.jsdelivr.net/npm/js-md5@0.8.3/src/md5.min.js
// @grant        GM_xmlhttpRequest
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';
    var reloadScriptKey = 'reloadScript';
    localStorage.setItem(reloadScriptKey, '');
    localStorage.setItem('reloadVue', 'false');

    // 定义要修改的脚本内容规则
    const modificationRules = [{
        type: 'serverNow',
        match: /var serverNow = new Date\('([^']+)'\)/,
        replace: ''
    },{
        type: 'reserveNum',
        match: /_this.effectiveReserveNum = json.data.reserveNum/,
        rematch: /_this.effectiveReserveNum = json.data.reserveNum/,
        replace: '_this.effectiveReserveNum = 6'
    },{
        type: 'fidEnc',
        match: /var\s+fidEnc\s*=\s*['"]([^'"]+)['"]/,
        rematch: /var\s+fidEnc\s*=\s*['"]fidEnc_var['"]/g,
        replace:  'var fidEnc = "'+localStorage.getItem('fidEnc')+'"'
    },{
        type: 'itemId',
        match: /var\s+itemId\s*=\s*['"](\d+)['"]/,
        rematch: /var\s+itemId\s*=\s*['"]itemId_var['"]/g,
        replace: 'var itemId = "'+localStorage.getItem('itemId')+'"'
    },{
        type: 'reserveId',
        match: /var\s+reserveId\s*=\s*['"](\d+)['"]/,
        rematch: /var\s+reserveId\s*=\s*['"]reserveId_var['"]/g,
        replace: 'var reserveId = "'+localStorage.getItem('reserveId')+'"'
    }];

    function formatDate(date, format='YYYY-MM-DD') {
        const pad = (n) => n.toString().padStart(2, '0');
        return format.replace(/YYYY/g, date.getFullYear()).replace(/YY/g, date.getFullYear().toString().slice(-2)).replace(/MM/g, pad(date.getMonth() + 1)).replace(/DD/g, pad(date.getDate()));
    }

    var originalDate = new Date();
    const currentHour = originalDate.getHours();
    if(currentHour < 8){
        originalDate.setHours(currentHour + 8);
    }else{
        originalDate.setDate(originalDate.getDate() + 1);
    }
    originalDate = new Date(formatDate(originalDate) + 'T12:26:25.461Z')

    modificationRules.forEach(rule => {
        localStorage.setItem(rule.type, '');
        if (rule.type === 'serverNow') {
            localStorage.setItem('serverNow',originalDate.toISOString());
            rule.replace = "var serverNow = new Date('" + localStorage.getItem('serverNow') + "')";
            return;
        }
    });

    // 目标 class 名称
    const TARGET_CLASS = 'reserve_item_v2';
    // 替换为你的目标 class
    const CONFIG = {
        vueRootId: 'reserve_item_v2'
    }

    // 创建 MutationObserver
    const observer = new MutationObserver( (mutationsList) => {
        for (const mutation of mutationsList) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT' && node.type === 'text/javascript' && !node.src && node.textContent) {

                    let modified = false;

                    let newContent = node.textContent;
                    // 应用所有修改规则
                    modificationRules.forEach(rule => {

                        if(rule.type != 'serverNow'){
                            const match = newContent.match(rule.match);
                            if(match){
                                localStorage.setItem(rule.type, match[1]);
                            }
                        }

                    });
                }
            });

            if (mutation.type === 'childList') {
                // 检查新增的节点
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.id === CONFIG.vueRootId) {
                        checkForVueInstance(node);
                    }

                    // 递归检查子节点
                    if (node.querySelectorAll) {
                        const targetElement = node.querySelector(`#${CONFIG.vueRootId}`);
                        if (targetElement) {
                            checkForVueInstance(targetElement);
                        }
                    }
                });
            } else if (mutation.type === 'attributes' &&
                       mutation.target.id === CONFIG.vueRootId) {
                // 如果目标元素的属性发生变化
                checkForVueInstance(mutation.target);
            }
        }
    });

    // 开始观察整个文档
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    function deleteVueMountedElement(vm) {
        const el = vm.$el;
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
            console.log('Deleted Vue mounted element:', el);
        }
    }

    // 检查元素是否包含 Vue 实例
    function checkForVueInstance(element) {
        const reloadVue = localStorage.getItem('reloadVue');
        const itemId = localStorage.getItem('itemId');
        if(itemId === ''){
            return;
        }
        if(reloadVue === 'true'){
            return;
        }
        const vm = element.__vue__;
        if (vm && vm.$destroy) {
            deleteVueMountedElement(vm)
            vm.$destroy();
            console.log('Vue instance destroyed!');
            reloadHtml();
            reloadJs();
            localStorage.setItem('reloadVue', 'true');
        }
    }

    function reloadHtml(){
        GM_xmlhttpRequest({
            method: "GET",
            url: 'https://raw.githubusercontent.com/martinpeng123/wcwenlv/refs/heads/main/reserve/reload-reserve.httml',
            onload: function(response) {
                const htmlContent = response.responseText;
                document.body.innerHTML = htmlContent;
            }
        })

    }

    function reloadJs(){
        GM_xmlhttpRequest({
            method: "GET",
            url: 'https://raw.githubusercontent.com/martinpeng123/wcwenlv/refs/heads/main/reserve/reload-reserve.js',
            onload: function(response) {
                let jsContent = response.responseText;

                // 替换变量
                jsContent = jsContent.replace(
                    /var\s+itemId\s*=\s*['"]itemId_var['"]/g,
                    'var itemId = "'+localStorage.getItem('itemId')+'"'
                );

                jsContent = jsContent.replace(
                    /var\s+fidEnc\s*=\s*['"]fidEnc_var['"]/g,
                    'var fidEnc = "'+localStorage.getItem('fidEnc')+'"'
                );
                jsContent = jsContent.replace(
                    /var\s+reserveId\s*=\s*['"]reserveId_var['"]/g,
                    'var reserveId = "'+localStorage.getItem('reserveId')+'"'
                );

                jsContent = jsContent.replace(
                    /_this.effectiveReserveNum = json.data.reserveNum/,
                    '_this.effectiveReserveNum = 6'
                );

                jsContent = jsContent.replace(
                    /var serverNow = new Date\('([^']+)'\)/,
                    "var serverNow = new Date('" + localStorage.getItem('serverNow') + "')"
                );
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.textContent = jsContent
                document.body.appendChild(script);
            }
        });
    }

    window.onload = function() {
        if(localStorage.getItem('reloadVue') === 'false'){
            console.info('script load failed reload page')
            window.location.reload();
        }else{
            console.info('script load success')
        }
    };

})();
