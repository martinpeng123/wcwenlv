// ==UserScript==
// @name         wcwl-index
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  sign
// @author       Your Name
// @match        https://reserve.chaoxing.com/front/third/apps/reserve/item/index*
// @grant        none
// @require      https://https://code.jquery.com/jquery-2.2.4.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js
// @require      https://cdn.jsdelivr.net/npm/@simondmc/popup-js@1.4.3/popup.min.js
// @run-at       document-body
// ==/UserScript==
// noinspection t

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

    function operateData(url, data) {
        return $.getJSON(url, data)
    }

    function doRequest(url, data, async) {
        return $.ajax({
            url: url,
            type: 'post',
            data: data,
            async: async,
            dataType: 'json'
        })
    }

    function belongCalendar(_this, data) {
        var duration = _this.reserve.signDuration
        doRequest('data/apps/reserve/special/rule', {reserveId: data.reserveId, itemId: data.itemId}, false).then(function (json) {
            if (json.success) {
                if (json.data.reserveSpecialRule) {
                    duration = json.data.reserveSpecialRule.signDuration
                }
                if (json.data.reserveRoleSpecialRule) {
                    duration = json.data.reserveRoleSpecialRule.signDuration
                }
            }
        })
        if (duration === -1) {
            duration = 30
        }
        var time = moment(data.starttime),
            start = time.clone().subtract(duration, 'minutes'),
            end = moment(data.expireTime),
            now = moment()
        if (data.status === 1) {
            end = moment(data.expireTime).add(duration, 'minutes')
        }
        if (_this.reserve.signDuration === -1 && end.isBefore(moment(data.endtime))) {
            end = moment(data.endtime)
        }
        return now.isAfter(start) && now.isBefore(end)
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

                const pre_res_element = element.getElementsByClassName("per_res")[1];
                const reserveNumElement = document.createElement('span');
                reserveNumElement.className = '';
                reserveNumElement.textContent = item.reserveNum;
                element.insertBefore(reserveNumElement, pre_res_element.nextSibling);

                console.log(item.status);
                if(!item.status === 0){
                    return;
                }

                const cancelElement = element.getElementsByClassName("cal_red");
                if (typeof(cancelElement) === undefined){
                    return;
                }

                const sureBtns = element.getElementsByClassName("sure");
                console.log(sureBtns);
                Array.from(sureBtns).forEach(sureBtn=>{
                    const innerText = sureBtn.innerText;
                    if(innerText === '签到'){
                        const btnElement = document.createElement('span');
                        btnElement.className = 'sure';
                        btnElement.textContent = '签到';
                        // 添加点击事件
                        btnElement.addEventListener('click', function() {
                            // if (!belongCalendar(vm, item)) {
                            //     popup.alert('未到签到时间')
                            //     return
                            // }
                            window.location.href='https://reserve.chaoxing.com/front/third/apps/reserve/codeSign?resUserId='+item.id+'&reserveId=2454&fidEnc=bc16a533e9870b41&enc=db5987a5298466950ec92198c03eca32&closeBack=0&bindSno=false&bindSnoUrl=';
                        });
                        // 插入到目标元素后面
                        element.insertBefore(btnElement, cancelElement.nextSibling);
                        sureBtn.remove();
                        return;
                    }
                });
            });
        } catch (error) {
            console.error('获取Vue实例失败:', error);
        }
    })();
})()