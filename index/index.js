// ==UserScript==
// @name         wcwl-sign
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  sign
// @author       Your Name
// @match        https://reserve.chaoxing.com/front/third/apps/reserve/item/index*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建一个Promise来等待Vue实例
    function waitForVue() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const vueRoot = document.getElementById('reserve_index'); // 替换为你的挂载点ID
                if (vueRoot && vueRoot.__vue__) {
                    clearInterval(checkInterval);
                    resolve(vueRoot.__vue__);
                }
            }, 1000); // 每50ms检查一次
        });
    }

    // 使用async/await来"同步"等待
    (async function() {
        try {
            console.log('开始等待Vue实例...');
            const vm = await waitForVue();
            console.log('成功获取Vue实例:', vm);
            const currentList = vm.currentList;
            const containers = document.querySelectorAll('.now_per_btm');
            containers.forEach((element,index)=>{
                const item = currentList[index];
                const match = item.status == 0 && (item.teamLeaderCancel==0 || (item.teamLeaderCancel==1&&item.leader&&item.leader==1));
                if(match){
                    return;
                }
                const pre_res_element = element.getElementsByClassName("per_res")[1];
                const btnElement = document.createElement('span');
                btnElement.className = 'sure';
                btnElement.textContent = 'gogogo';
                // 添加点击事件
                btnElement.addEventListener('click', function() {
                    window.location.href = 'https://reserve.chaoxing.com/front/third/apps/reserve/signIn/success?resUserId='+item.id+'&reserveId=2454&fidEnc=bc16a533e9870b41&enc=db5987a5298466950ec92198c03eca32&closeBack=0';
                });

                // 插入到目标元素后面
                element.insertBefore(btnElement, pre_res_element.nextSibling);
            });
        } catch (error) {
            console.error('获取Vue实例失败:', error);
        }
    })();
})();