// ==UserScript==
// @name         望城文旅-预约
// @namespace    http://tampermonkey.net/
// @version      2025-05-09
// @description  try to take over the world!
// @author       You
// @match        https://github.com/duolabmeng6/duolabmeng6.github.io/issues/22
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @include      https://reserve.chaoxing.com/front/third/apps/reserve/item/reserve**
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';
    // 定义要修改的脚本内容规则
    const modificationRules = [
        {
            match: /var serverNow = new Date\('([^']+)'\)/
        }
    ];

    function formatDate(date, format = 'YYYY-MM-DD') {
        const pad = (n) => n.toString().padStart(2, '0');

        return format
            .replace(/YYYY/g, date.getFullYear())
            .replace(/YY/g, date.getFullYear().toString().slice(-2))
            .replace(/MM/g, pad(date.getMonth() + 1))
            .replace(/DD/g, pad(date.getDate()));
    }


    var originalDate = new Date();
    // 修改日期（例如加1天）
    originalDate.setDate(originalDate.getDate() + 1);

    originalDate = prompt("请输入日期", formatDate(originalDate));

    originalDate = new Date(originalDate + 'T12:26:25.461Z')

    var onlod = false;
    // 创建MutationObserver监控DOM变化
    const observer = new MutationObserver(function(mutations) {
        console.log("onload");
        if(onlod === true){
            return;
        }
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT' &&
                    node.type === 'text/javascript' &&
                    !node.src &&
                    node.textContent) {

                    let modified = false;
                    let newContent = node.textContent;

                    // 应用所有修改规则
                    modificationRules.forEach(rule => {
                        if (rule.match.test(newContent)) {
                            // 替换回字符串
                            newContent = newContent.replace(rule.match, "var serverNow = new Date('"+originalDate.toISOString()+"')");
                            modified = true;
                            onlod = true;
                        }
                    });

                    // 如果有修改，替换script元素
                    if (modified) {
                        const newScript = document.createElement('script');
                        newScript.type = 'text/javascript';
                        newScript.text = newContent;
                        node.parentNode.replaceChild(newScript, node);
                        console.log('Modified dynamic script:', newScript);
                    }
                }
            });
        });
    });

    // 开始观察body及其子元素
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 也检查初始加载的脚本
    document.addEventListener('DOMContentLoaded', function() {
        const initialScripts = document.body.querySelectorAll('script[type="text/javascript"]:not([src])');
        if(onlod == true){
            return;
        }
        initialScripts.forEach(script => {
            let modified = false;
            let newContent = script.textContent;

            modificationRules.forEach(rule => {
                if (rule.match.test(newContent)) {
                    const originalDate = new Date();
                    // 修改日期（例如加1天）
                    originalDate.setDate(originalDate.getDate() + 1);
                    originalDate.setHours(originalDate.getHours() + 8);
                    // 替换回字符串
                    newContent = newContent.replace(rule.match, "var serverNow = new Date('"+originalDate.toISOString()+"')");
                    modified = true;
                }
            });

            if (modified) {
                const newScript = document.createElement('script');
                newScript.type = 'text/javascript';
                newScript.text = newContent;
                script.parentNode.replaceChild(newScript, script);
                console.log('Modified initial script:', newScript);
            }
        });
    });
})();