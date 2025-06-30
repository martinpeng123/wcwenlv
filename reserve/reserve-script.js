// ==UserScript==
// @name         wcwl-reserve-v1
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
// noinspection t

(function() {
    'use strict';
    // 创建一个Promise来等待Vue实例
    async function waitForVue() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const vueRoot = document.getElementById('reserve_item_v2'); // 替换为你的挂载点ID
                if (vueRoot && vueRoot.__vue__) {
                    clearInterval(checkInterval);
                    resolve(vueRoot);
                }
            }, 1000); // 每50ms检查一次
        });
    }

    window.onload =async function() {
        try{
            const vueRoot = await waitForVue();

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
                //rematch: /_this.effectiveReserveNum = json.data.reserveNum/,
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
            modificationRules.forEach(rule => {
                localStorage.setItem(rule.type, '');
            });

            const scriptTagArray = document.getElementsByTagName('script');
            Array.from(scriptTagArray).forEach(node=>{
                if (node.type === 'text/javascript' && !node.src && node.textContent) {
                    const textContent = node.textContent;
                    // 应用所有修改规则
                    modificationRules.forEach(rule => {
                        if(rule.type != 'serverNow'){
                            const match = textContent.match(rule.match);
                            if(match){
                                localStorage.setItem(rule.type, match[1]);
                            }
                        }
                    });
                }
            })

            const reserveId = localStorage.getItem('reserveId');
            if(reserveId === ''){
                window.location.reload();
            }

            const bottomElement = document.querySelector('#reserve_item_v2 > div.order_btm.bottom-menu-height > div.order_btm_left');

            const yesterdayElement = document.createElement('div');
            yesterdayElement.className = 'order_btm_right';
            yesterdayElement.style="margin-right:5px;margin-left:5px;"
            yesterdayElement.textContent = '昨天';
            // 添加点击事件
            yesterdayElement.addEventListener('click', function() {
                originalDate.setDate(originalDate.getDate() - 1);
                originalDate = new Date(formatDate(originalDate) + 'T12:26:25.461Z')
                localStorage.setItem('serverNow',originalDate.toISOString());
                checkForVueInstance(vueRoot,)
            });

            // 插入到目标元素后面
            bottomElement.after(yesterdayElement);

            const todayElement = document.createElement('div');
            todayElement.className = 'order_btm_right';
            todayElement.style="margin-right:5px;margin-left:5px;"
            todayElement.textContent = '明天';
            // 添加点击事件
            todayElement.addEventListener('click', function() {
                const currentHour = originalDate.getHours();
                if(currentHour < 8){
                    originalDate.setHours(currentHour + 8);
                }
                localStorage.setItem('serverNow',originalDate.toISOString());
                checkForVueInstance(vueRoot,originalDate)
            });

            // 插入到目标元素后面
            bottomElement.after(todayElement);

            const tomorrowElement = document.createElement('div');
            tomorrowElement.className = 'order_btm_right';
            tomorrowElement.style="margin-right:5px;margin-left:5px;"
            tomorrowElement.textContent = '后天';
            // 添加点击事件
            tomorrowElement.addEventListener('click', function() {
                originalDate.setDate(originalDate.getDate() + 1);
                originalDate = new Date(formatDate(originalDate) + 'T12:26:25.461Z')
                localStorage.setItem('serverNow',originalDate.toISOString());
                checkForVueInstance(vueRoot,)
            });

            // 插入到目标元素后面
            bottomElement.after(tomorrowElement);

            function deleteVueMountedElement(vm) {
                const el = vm.$el;
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                    console.log('Deleted Vue mounted element:', el);
                }
            }

            // 检查元素是否包含 Vue 实例
            function checkForVueInstance(element,inputDate) {
                const reserveId = localStorage.getItem('reserveId');
                if(reserveId === ''){
                    alert('reserveId is null');
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

        }catch(error){
            console.error("出错:", error);
        }
    };

})();
