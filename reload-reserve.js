  require(['jquery', 'Vue', 'cookies', 'moment', 'popup', 'iosSelectCmp', 'reserveUtils', 'baseUtils'], function ($, Vue, Cookies, moment, popup, IosSelectCmp, reserveUtils, BaseUtils) {
    'use strict'
    console.log("start reload");
    var itemId = 'itemId_var'//预约对象ID
    var reserveId = 'reserveId_var'//预约应用ID
    var jumpType = '0'
    var fidEnc = 'fidEnc_var'
    var formsDataKey = 'formsData_' + itemId + '_' + Cookies.get('oa_uid') //缓存提交数据key
    var formsDataKeyNew = 'formsDataNew_' + itemId + '_' + Cookies.get('oa_uid') //表单数据new
    //用户信息
    var usrinf = {
      uid: parseInt(encodeURIComponent(Cookies.get('oa_uid') || '0')),
      name: Cookies.get('oa_name')
    }
    var serverNow = new Date('2025-05-16T12:54:13.324+08:00')
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
    function cacheData(key, value) {
      window.localStorage.removeItem(key)
      window.localStorage.setItem(key, value)
    }
    function toWeek(day) {
      return '周' + '日一二三四五六'.charAt(day)
    }
    function initCycleEndDate(_this) {
      var defaultDate = moment(_this.allIntervalList[_this.choseIntervalList[0][0].allIntervalListIndex].date).add(30, 'd')
      if (_this.reserve.cycleType === 6 && defaultDate.diff(moment(_this.reserve.cycleEndDate)) > 0) {
        return moment(_this.reserve.cycleEndDate).format('YYYY-MM-DD')
      }
      return defaultDate.format('YYYY-MM-DD')
    }
    function initCycleDateList(_this) {
      var end = moment().clone(),
          start = moment().clone(),
          cycleEndDate = _this.reserve.hasOwnProperty('cycleEndDate') ? _this.reserve.cycleEndDate : moment().format('YYYY-MM-DD')
      switch (_this.reserve.cycleType) {
          //1月
        case 1:
          end = moment().add(1, 'M')
          break
          //2月
        case 2:
          end = moment().add(2, 'M')
          break
          //3月
        case 3:
          end = moment().add(3, 'M')
          break
          //6约
        case 4:
          end = moment().add(6, 'M')
          break
          //一年
        case 5:
          end = moment().add(1, 'y')
          break
        case 6:
          end = moment(cycleEndDate + ' 00:00:00')
          break
        default:
          break
      }
      //先清空避免脏数据污染
      _this.cycleDateList = []
      var days = end.diff(start, 'days') + 1
      for (var i = 0; i <= days; i++) {
        _this.cycleDateList.push({id: start.clone().add(i, 'd').format('YYYY-MM-DD'), value: start.clone().add(i, 'd').format('YYYY-MM-DD')})
      }
    }
    //数据初始化
    function initData(vm, reserveUserJson, mySelfReserveJson) {
      var commomReserveIntervalJson = {}
      var commonWeekIntervalData = []
      for (var i = 1; i <= 7; i++) {
        if (!commomReserveIntervalJson[i]) {
          commomReserveIntervalJson[i] = {}
        }
        var intervals = vm.commonIntervalMap[i] ? vm.commonIntervalMap[i] : [{available: 1, endTime: "00:00", id: 0, index: -1,
          startTime: "00:00", timeAlias: '', userNum: 1, week: i}]
        var connectArrIndex = 0, intervalList = [], intervalSettingList = []
        if (intervals && intervals instanceof Array && intervals.length > 0) {
          intervalSettingList.push(intervals[0])
          intervalList.push({startTime: intervals[0].startTime, endTime: intervals[0].endTime, intervalDataList: intervalSettingList})
          commomReserveIntervalJson[i][intervals[0].startTime + '-' + intervals[0].endTime] = intervals[0]
          for (var j = 1; j < intervals.length; j++) {
            var interval = intervals[j]
            commomReserveIntervalJson[i][intervals[j].startTime + '-' + intervals[j].endTime] = intervals[j]
            if (intervals[j - 1].endTime === interval.startTime) {
              intervalList[connectArrIndex].endTime = interval.endTime
              intervalList[connectArrIndex].intervalDataList.push(interval)
            } else {
              intervalSettingList = []
              intervalSettingList.push(interval)
              intervalList.push({startTime: interval.startTime, endTime: interval.endTime, intervalDataList: intervalSettingList})
              connectArrIndex++
            }
          }
          commonWeekIntervalData.push(intervalList)
        }
      }
      //节假日规则
      var hoildayReserveIntervalJson = {}
      var hoildayWeekIntervalData = []
      for (var i = 1; i <= 7; i++) {
        if (!hoildayReserveIntervalJson[i]) {
          hoildayReserveIntervalJson[i] = {}
        }
        var intervals = vm.hoildayIntervalMap[i] ? vm.hoildayIntervalMap[i] : [{available: 1, endTime: "00:00", id: 0, index: -1,
          startTime: "00:00", timeAlias: '', userNum: 1, week: i}]
        var connectArrIndex = 0, intervalList = [], intervalSettingList = []
        if (intervals && intervals instanceof Array && intervals.length > 0) {
          intervalSettingList.push(intervals[0])
          intervalList.push({startTime: intervals[0].startTime, endTime: intervals[0].endTime, intervalDataList: intervalSettingList})
          hoildayReserveIntervalJson[i][intervals[0].startTime + '-' + intervals[0].endTime] = intervals[0]
          for (var j = 1; j < intervals.length; j++) {
            var interval = intervals[j]
            hoildayReserveIntervalJson[i][intervals[j].startTime + '-' + intervals[j].endTime] = intervals[j]
            if (intervals[j - 1].endTime === interval.startTime) {
              intervalList[connectArrIndex].endTime = interval.endTime
              intervalList[connectArrIndex].intervalDataList.push(interval)
            } else {
              intervalSettingList = []
              intervalSettingList.push(interval)
              intervalList.push({startTime: interval.startTime, endTime: interval.endTime, intervalDataList: intervalSettingList})
              connectArrIndex++
            }
          }
          hoildayWeekIntervalData.push(intervalList)
        }
      }
      vm.allIntervalList = []
      for (var i = 0; i < vm.header.length; i++) {
        //创建每天的对象
        var todayData = {
          date: moment(vm.header[i].nDate).format('YYYY-MM-DD'),
          week: vm.header[i].weekIndex,
          intervalList: []
        }
        var interval = commonWeekIntervalData[todayData.week - 1]
        var ishoilday = BaseUtils.hoilday(moment(vm.header[i].nDate), vm.hoildays)
        if (ishoilday) {
          interval = hoildayWeekIntervalData[todayData.week - 1]
        }
        //循环当前大时间段中的小段，放入对应数据
        for (var n = 0; n < interval.length; n++) {
          var value = interval[n]
          todayData.intervalList.push({
            startTime: value.startTime,
            endTime: value.endTime,
            height: 0,
            intervalDataList: []
          })
          //循环每个时间段，初始化每个时间段数据
          for (var o = 0; o < value.intervalDataList.length; o++) {
            var intervalData = value.intervalDataList[o]
            var reserveInterval = {}
            if (intervalData.startTime == '00:00' && intervalData.endTime == '00:00') {
              reserveInterval = {startTime: '00:00', endTime: '00:00', available: 0, userNum: 0, id: -1, userCount: 0}
            } else {
              if (ishoilday) {
                reserveInterval = JSON.parse(JSON.stringify(hoildayReserveIntervalJson[vm.header[i].weekIndex][intervalData.startTime + '-' + intervalData.endTime]))
              } else {
                reserveInterval = JSON.parse(JSON.stringify(commomReserveIntervalJson[vm.header[i].weekIndex][intervalData.startTime + '-' + intervalData.endTime]))
              }
            }
            var key = reserveInterval.id + '_' + vm.header[i].date
            if (reserveUserJson[key]) {
              reserveInterval['userCount'] = reserveUserJson[key].userCount
              reserveInterval['userShow'] = reserveUserJson[key].userShow
              reserveInterval['userList'] = reserveUserJson[key].userList
              reserveInterval['height'] = 1
              if (reserveInterval.userShow && reserveUserJson[key].userList.length > 0) {
                reserveInterval['reserveUserId'] = reserveUserJson[key].userList[0].id
              }
              if (mySelfReserveJson[key]) {
                reserveInterval['mySelf'] = true
                reserveInterval['reserveUserId'] = mySelfReserveJson[key].id
              }
            }
            //检查当前时段是否已过
            var currentDay = moment(serverNow).format('YYYY-MM-DD')
            if (currentDay == todayData.date) {
              var myDate = new Date(moment(serverNow).valueOf()), h = myDate.getHours(), m = myDate.getMinutes()
              var endArr = intervalData.endTime.split(':')
              if (parseInt(endArr[0]) < h) {
                reserveInterval.available = 0
              }
              if (parseInt(endArr[0]) == h && parseInt(endArr[1]) <= m) {
                reserveInterval.available = 0
              }
              var endTime = moment(currentDay + ' ' + intervalData.endTime).valueOf()
              var startTime = moment(currentDay + ' ' + intervalData.startTime).valueOf()
              var nowTime = myDate.getTime()
              if (vm.reserve.allowReserveNowTime == 1 && nowTime >= startTime && nowTime <= endTime) {
                reserveInterval.available = 0
              }
            }
            //检查时间段是否在设置的开放范围内（新版）
            if (vm.reserve.openTimeType === 1) {
              var tempStart = moment(todayData.date + ' ' + reserveInterval.startTime + ':00')
              var tempEnd = moment(todayData.date + ' ' + reserveInterval.endTime + ':00')
              if (!(tempStart.diff(vm.endOpenTime) >= 0 && tempStart.diff(vm.startOpenTime) <= 0)) {
                if (!(vm.reserve.allowReserveNowTime === 0 && vm.reserve.openTimeEndHours === 0 && moment(serverNow).diff(tempStart) >= 0 && moment(serverNow)
                    .diff(tempEnd) <= 0)) {
                  reserveInterval.available = 0
                }
              }
            }
            todayData.intervalList[n].intervalDataList.push(reserveInterval)
          }
          var height = 0
          //验证当前用户预约时间是否连接
          for (var a = 1; todayData.intervalList[n].intervalDataList.length > 1 && a < todayData.intervalList[n].intervalDataList.length; a++) {
            if ((((todayData.intervalList[n].intervalDataList[a - 1].mySelf && todayData.intervalList[n].intervalDataList[a].mySelf) ||
                    (todayData.intervalList[n].intervalDataList[a - 1].userShow && todayData.intervalList[n].intervalDataList[a].userShow)) &&
                todayData.intervalList[n].intervalDataList[a - 1].reserveUserId === todayData.intervalList[n].intervalDataList[a].reserveUserId)) {
              todayData.intervalList[n].intervalDataList[a - 1].endTime = todayData.intervalList[n].intervalDataList[a].endTime
              todayData.intervalList[n].intervalDataList[a - 1].endTimeAlias = todayData.intervalList[n].intervalDataList[a].timeAlias ? todayData.intervalList[n].intervalDataList[a].timeAlias : todayData.intervalList[n].intervalDataList[a].endTime
              todayData.intervalList[n].intervalDataList[a - 1].height += 1
              height++
              todayData.intervalList[n].intervalDataList.splice(a, 1)
              a--
            }
          }
          todayData.intervalList[n]['height'] = height + todayData.intervalList[n].intervalDataList.length
        }
        for (var j = 0; j < vm.pauseDateList.length; j++) {
          var nowDate = todayData.date + ' 12:00:00'
          var startDate = vm.pauseDateList[j].startDate
          var endDate = vm.pauseDateList[j].endDate
          var pauseReason = vm.pauseDateList[j].reason
          //如果在暂停预约时间内则全部置为不可预约
          //兼容老逻辑(时间不带时分)
          if (startDate.length == 10 && endDate.length == 10) {
            startDate = startDate + ' 00:00'
            endDate = endDate + ' 23:59'
            if (vm.dateEquals(nowDate, startDate) == 1 && vm.dateEquals(nowDate, endDate) == -1) {
              for (var k = 0; k < todayData.intervalList.length; k++) {
                for (var l = 0; l < todayData.intervalList[k].intervalDataList.length; l++) {
                  todayData.intervalList[k].intervalDataList[l].available = 0
                  todayData.intervalList[k].intervalDataList[l].pauseReason = pauseReason
                }
              }
            }
            continue
          }
          var startDay = startDate.substring(0, 10) + ' 00:00'
          var endDay = endDate.substring(0, 10) + ' 23:59'
          if (vm.dateEquals(nowDate, startDay) == 1 && vm.dateEquals(nowDate, endDay) == -1) {
            for (var k = 0; k < todayData.intervalList.length; k++) {
              var sTime = startDate.substring(11, 16)
              var eTime = endDate.substring(11, 16)
              for (var l = 0; l < todayData.intervalList[k].intervalDataList.length; l++) {
                var st = todayData.intervalList[k].intervalDataList[l].startTime
                var et = todayData.intervalList[k].intervalDataList[l].endTime
                if (todayData.date == startDate.substring(0, 10)) {
                  if ((vm.timeEquals(et, sTime) == -1 || vm.timeEquals(et, sTime) == 0)) {
                    continue
                  }
                }
                if (todayData.date == endDate.substring(0, 10)) {
                  if ((vm.timeEquals(st, eTime) == 1 || vm.timeEquals(st, eTime) == 0)) {
                    continue
                  }
                }
                todayData.intervalList[k].intervalDataList[l].available = 0
                todayData.intervalList[k].intervalDataList[l].pauseReason = pauseReason
              }
            }
          }
        }
        vm.allIntervalList.push(todayData)
      }
    }
    function initHeader(_this, now, start, end) {
      for (var y = 0; y < start - end; y++) {
        var date = now.clone().add(y, 'days')
        _this.header.push({
          date: moment(date).format('YYYY-MM-DD'),
          nDate: date,
          nWeek: reserveUtils.toWeek(date.day() === 0 ? 7 : date.day()),
          weekIndex: date.day() === 0 ? 7 : date.day() //星期索引1234567
        })
      }
    }
    function getReserveInfo(_this) {
      var now = moment(serverNow)
      //预约模板&预约对象信息
      operateData('data/apps/reserve/item/detail', {'id': itemId, reserveIdEnc: 'd1d3bde5ef570f6b', fidEnc: fidEnc}).then(function (json) {
        if (!json.success) {
          popup.alert('信息获取失败')
          return
        }
        document.title = json.data.reserveItemData.name
        _this.reserveItem = json.data.reserveItemData
        _this.reserve = json.data.reserveData
        if (_this.reserve) {
          if (_this.reserve.deptId === 27725) {// 天津财经大学定制，补充单位id判断
            _this.tjcjdx = _this.reserve.id === 11414 // 天津财经大学定制，预约id：11414
          }
        }
        _this.balanceDisplay = json.data.reserveData.balanceDisplay
        _this.openTimeAlias = json.data.reserveData.openTimeAlias
        _this.reserveNum = json.data.reserveData.reserveNum
        _this.teamReserve = json.data.reserveData.multiReserve === 2
        if (json.data.reserveItemData.isSpecial === 1) {
          _this.balanceDisplay = json.data.reserveItemData.balanceDisplay
          _this.openTimeAlias = json.data.reserveItemData.openTimeAlias
          _this.reserveNum = json.data.reserveItemData.reserveNum
          _this.teamReserve = json.data.reserveItemData.multiReserve === 2
        }
        _this.reserveTips = json.data.reserveTips
        _this.reserveIndexUrl = json.data.reserveIndexUrl
        _this.uname = json.data.uname
        _this.sno = json.data.sno
        _this.zgny = _this.reserve.deptId === 23242 && _this.reserve.id === 12259
        _this.szxwzy = _this.reserve.deptId === 325653
        _this.cqjzgc = _this.reserve.deptId === 6838 && _this.reserve.id === 16540
        //是否填写表单信息
        _this.isRevForms = json.data.reserveItemData.isForms === 1
        //是否是对象管理员
        for (var i = 0; i < _this.reserveItem.administratorUsers.length; i++) {
          if (_this.reserveItem.administratorUsers[i].uid === usrinf.uid) {
            _this.isAdministrator = true
            _this.reserve.leastDays = 0
            _this.reserve.durationLimit = -1
            break
          }
        }
        //初始化header
        switch (parseInt(_this.reserve.openTimeType)) {
          case 0:
            var advanceDays = _this.reserve.advanceDays
            //根据模板里的提前预约时间点来判断
            var configHour = parseInt(_this.reserve.advanceTime.split(':')[0])
            var configMinutes = parseInt(_this.reserve.advanceTime.split(':')[1])
            var current = serverNow
            if ((current.getHours() * 60 + current.getMinutes()) > (configHour * 60 + configMinutes)) {
              advanceDays = advanceDays + 1
            }
            //至少提前预约天数判断
            var diff = 0
            if (_this.reserve.leastDays && _this.reserve.leastDays !== 0 && _this.reserve.leastTime) {
              var flag = moment(now.format('YYYY-MM-DD') + ' ' + _this.reserve.leastTime + ':00')
              diff = _this.reserve.leastDays
              if (now.diff(flag) > 0) {
                diff += 1
              }
              now.add(diff, 'days')
            }
            initHeader(_this, now, advanceDays, diff)
            break
          case 1:
            var endDays = Math.abs(moment(now.format('YYYY-MM-DD')).diff(now.clone().add(_this.reserve.openTimeStartHours, 'h').format('YYYY-MM-DD'), 'days')) + 1,
                startDays = Math.abs(moment(now.format('YYYY-MM-DD')).diff(now.clone().add(_this.reserve.openTimeEndHours, 'h').format('YYYY-MM-DD'), 'days'))
            _this.startOpenTime = now.clone().add(_this.reserve.openTimeStartHours, 'h')
            _this.endOpenTime = now.clone().add(_this.reserve.openTimeEndHours, 'h')
            for (var y = 0; y < endDays - startDays; y++) {
              var date = now.clone().add((y + startDays), 'days')
              _this.header.push({
                date: moment(date).format('YYYY-MM-DD'),
                nDate: date,
                nWeek: reserveUtils.toWeek(date.day() === 0 ? 7 : date.day()),
                weekIndex: date.day() === 0 ? 7 : date.day() //星期索引1234567
              })
            }
            break
          case 2:
            _this.header = $.extend(true, [], reserveUtils.cycleOpenTimeHeaderInit(now, _this.reserve.openTimeCycleSetting))
            break
          default:
            break
        }
        //是否审批人
        if (_this.reserveItem.isAprv === 1) {
          if (JSON.stringify(_this.reserveItem.aprvUsers).indexOf(usrinf.uid) !== -1) {
            _this.isAprv = true
          }
        }
        //是否设置暂停日期
        if (_this.reserveItem.pauseDateId) {
          operateData('data/apps/reserve/pause/date/config', {reserveId: _this.reserve.id, pauseDateId: _this.reserveItem.pauseDateId, fidEnc: fidEnc}).then(function (pauseDateJson) {
            if (!pauseDateJson.success) {
              popup.alert('信息获取失败')
              return
            }
            _this.pauseDateList = JSON.parse(pauseDateJson.data.pauseDate.dateJson)
            for (var i = 0; i < _this.pauseDateList.length; i++) {
              if (!_this.pauseDateList[i].reason) {
                _this.pauseDateList[i].reason = ''
              }
            }
          })
        }
        //初始化时间块配置信息
        operateData('data/apps/reserve/item/setting', {reserveId: _this.reserve.id, itemId: itemId, fidEnc: fidEnc}).then(function (jsonData) {
          if (!jsonData.success) {
            popup.alert('信息获取失败')
            return
          }
          _this.commonIntervalMap = jsonData.data.commonIntervalMap
          _this.hoildayIntervalMap = jsonData.data.hoildayIntervalMap
          _this.hoildays = jsonData.data.hoildays
        }).then(function () {
          //查询时间段内预约对象所有用户的预约数据
          if (_this.header.length > 0) {
            operateData('data/apps/reserve/item/user/list', {
              reserveId: _this.reserve.id,
              itemId: itemId,
              fidEnc: fidEnc,
              startTime: _this.header[0].date,
              endTime: _this.header[_this.header.length - 1].date
            }).then(function (res) {
              if (!res.success) {
                popup.alert('获取用户预约记录失败')
                return
              }
              _this.loadingShow = false
              //构造 星期：开始-结束：数据 格式的数据
              var reserveUserJson = {}
              _this.mySelfReserveJson = {}
              res.data.reserveUserList.forEach(function (value) {
                var key = value.reserveIntervalId + '_' + moment(value.starttime).format('YYYY-MM-DD')
                if (!value.reserveNum) {
                  value['reserveNum'] = 1
                }
                if (!reserveUserJson[key]) {
                  reserveUserJson[key] = {userCount: value.reserveNum, mySelf: false, id: value.id, userShow: value.hasOwnProperty('uname'), userList: []}
                  reserveUserJson[key].userList.push(value)
                } else {
                  reserveUserJson[key].userCount = reserveUserJson[key].userCount + value.reserveNum
                  reserveUserJson[key].userList.push(value)
                }
                //标记自己预约的数据
                if (value.uid == usrinf.uid) {
                  _this.mySelfReserveJson[key] = value
                  reserveUserJson[key].mySelf = true
                }
              })
              //循环当前所有天数，得到对应的周数，对应数据里的week值，生成整个列表页数据
              initData(_this, reserveUserJson, _this.mySelfReserveJson)
            }).then(function () {
              $('.data_cont_scroll').on('scroll', function () {//下边的div滚动多少距离，上面的就滚动多少
                $('.data_top_scroll').scrollLeft($('.data_cont_scroll').scrollLeft())
              })
              $('.data_top_scroll').on('scroll', function () {//下边的div滚动多少距离，上面的就滚动多少
                $('.data_cont_scroll').scrollLeft($('.data_top_scroll').scrollLeft())
              })
            })
          } else {
            _this.loadingShow = false
            $('.data_cont_scroll').on('scroll', function () {//下边的div滚动多少距离，上面的就滚动多少
              $('.data_top_scroll').scrollLeft($('.data_cont_scroll').scrollLeft())
            })
            $('.data_top_scroll').on('scroll', function () {//下边的div滚动多少距离，上面的就滚动多少
              $('.data_cont_scroll').scrollLeft($('.data_top_scroll').scrollLeft())
            })
          }
        })
      })
    }
    
    new Vue({
      el: '#reserve_item_v2',
      data: {
        header: [], //头部星期日期数据
        allIntervalList: [], //时间段信息数据
        choseIntervalList: [], //用户选中的时段
        selectIntervalList: [], //用户选中的中间时段
        multipleChoseIntervalInfoArr: [], //用于时段多选选中的时段信息展示
        multipleSortChoseIntervalInfoArr: [], //用于时段多选选中的时段信息展示 有序
        multipleIntervalInfoShow: false,
        range: '', //显示预约时长/总时长
        mySelfReserveJson: {}, //用户自己的预约记录
        submitReserveDialog: {
          show: false,
          title: '',
          remark: ''
        }, //提交预约窗口
        choseIntervalInfo: {
          date: '',
          startTime: '',
          endTime: '',
          range: ''
        },//选中数据
        cancelReserveShowDialog: {
          show: false,
          id: 0,
          item: {},
          itemId: 0,
          reserveId: 0,
          title: '',
          timeAlias: '',
          remark: '',
          userName: usrinf.name,
          confirmShow: false,
          allCancel: 0,
          startTime: '',
          showCancelBtn: true,
          msg: '确认取消预约？'
        },//取消弹窗
        reserve: '', //预约模板数据
        reserveItem: '', //预约应用数据
        isRevForms: false, //是否填写表单信息
        isAprv: false, //是否是审批人
        showDetail: false, //是否显示预约详情
        pauseDateList: [], //暂停日期段
        submitBtnEnable: true,
        reserveTips: {},
        intervalGroupByData: [],
        tipTitle: '加载中...',
        loadingShow: true,
        balanceDisplay: 1, //控制人数显示
        openTimeAlias: 0, //是否开启时间段别名
        effectiveReserveNum: 0, //实时可预约人数
        choiceReserveNum: 1, //用户选择的预约人数
        reserveNum: 1, //配置中的最大可预约数量
        startOpenTime: moment(),
        endOpenTime: moment(),
        cycleReserve: {
          show: false,
          cycleTips: '仅预约当天',
          type: 0, // 0/1/2/3/4/5 无重复/每日/每周/每两周/每月/工作日/
          cycleStartDate: '',
          cycleEndDate: '',
          errorShow: false,
          errList: [],
          reserveUsers: [],
          isFirst: true
        },
        cycleDateList: [],
        isAdministrator: false, //是否是对象管理员
        reserveClash: { //错误数据集合 用于页面上列表展示
          show: false,
          list: [],
          totalDurationErrShow: false, //0
          reserveNumErrShow: false, //1
          existRserveShow: false, //2
          numLimitErrShow: false, //3
          singleDurationErrShow: false, //4
          invalidErrShow: false //5
        },
        reserveUsers: [], //封装的用于提交的预约数据
        teamReserve: false,
        freeLogin: false,
        loginStatus: false,
        reserveIndexUrl: '',
        pauseReason: {
          show: false,
          text: ''
        },
        uname: '',
        sno: '',
        commonIntervalMap: {},
        hoildayIntervalMap: {},
        hoildays: [],
        zgny: false,
        tjcjdx: false,
        isRequired: false,
        szxwzy: false, //深圳校外资源平台定制可预约名额文案限制
        cqjzgc: false //重庆建筑工程职业学院图书馆定制
      },
      filters: {
        format: function (value, formater) {
          return moment(value).format(formater)
        },
        errInfo: function (e) {
          return moment(e.starttime).format('YYYY.MM.DD') + ' 星期' + '日一二三四五六'.charAt(new Date(e.starttime).getDay()) + ' ' + moment(e.starttime).format('HH:mm') + '-' +
              moment(e.endtime).format('HH:mm')
        }
      },
      watch: {
        multipleChoseIntervalInfoArr: function () {
          this.multipleSortChoseIntervalInfoArr = $.extend(true, [], this.multipleChoseIntervalInfoArr)
          for (var i = 0; i < this.multipleSortChoseIntervalInfoArr.length; i++) {
            for (var j = i + 1; j < this.multipleSortChoseIntervalInfoArr.length; j++) {
              if (moment(this.multipleSortChoseIntervalInfoArr[i].startDateTime).diff(moment(this.multipleSortChoseIntervalInfoArr[j].startDateTime)) > 0) {
                var temp = this.multipleSortChoseIntervalInfoArr[i]
                this.multipleSortChoseIntervalInfoArr[i] = this.multipleSortChoseIntervalInfoArr[j]
                this.multipleSortChoseIntervalInfoArr[j] = temp
              }
            }
          }
          var timeDifference = 0
          for (var i = 0; i < this.multipleSortChoseIntervalInfoArr.length; i++) {
            var tempData = this.multipleSortChoseIntervalInfoArr[i]
            timeDifference += moment(tempData.endDateTime).diff(moment(tempData.startDateTime), 'minutes')
          }
          var hours = timeDifference / 60
          var hoursRound = Math.floor(hours)
          var minutes = timeDifference - (60 * hoursRound)
          var minutesRound = Math.floor(minutes)
          this.range = hoursRound + '小时 ' + minutesRound + '分钟'
        }
      },
      computed: {
        timeAliasShow: function () {
          for (var i = 0; i < this.multipleSortChoseIntervalInfoArr.length; i++) {
            if (this.multipleSortChoseIntervalInfoArr[i].timeAlias) {
              return true
            }
          }
          return false
        },
        isCustomTheme: function () {
          var test = 81 // 测试应用id
          var gray = 12719 // 灰度应用id
          // 11221: 东西湖区文化馆(https://16q.cn/MCH0Q7)
          var userReserveIds = [11221, test, gray]
          return userReserveIds.includes(Number(reserveId))
        }
      },
      methods: {
        computeChoseIntervalInfo: function (date, idx) {
          var _this = this
          //改变选中信息
          var choseIntervalDataArr = _this.choseIntervalList[idx]
          var startTime = choseIntervalDataArr[0].intervalData.startTime
          var endTime = choseIntervalDataArr[0].intervalData.endTime
          var timeAlias = ''
          if (this.openTimeAlias && choseIntervalDataArr[0].intervalData.timeAlias) {
            timeAlias = choseIntervalDataArr[0].intervalData.timeAlias
          }
          var dateShowStr = moment(date).format('YYYY年MM月DD日')
          //选中两个时段时找到最早的开始时间和最晚的结束时间
          if (choseIntervalDataArr.length === 2) {
            if (_this.timeEquals(choseIntervalDataArr[0].intervalData.startTime, choseIntervalDataArr[1].intervalData.startTime) === 1) {
              startTime = choseIntervalDataArr[1].intervalData.startTime
              if (this.openTimeAlias && choseIntervalDataArr[1].intervalData.timeAlias) {
                timeAlias = choseIntervalDataArr[1].intervalData.timeAlias
              }
            }
            if (this.timeEquals(choseIntervalDataArr[1].intervalData.endTime, choseIntervalDataArr[0].intervalData.endTime) === 1) {
              endTime = choseIntervalDataArr[1].intervalData.endTime
              if (this.openTimeAlias && choseIntervalDataArr[1].intervalData.timeAlias) {
                timeAlias += '-' + choseIntervalDataArr[1].intervalData.timeAlias
              }
            }
          }
          var timeDifference = moment(date + ' ' + endTime + ':00').diff(moment(date + ' ' + startTime + ':00'), 'minutes')
          if (!_this.isAdministrator && _this.reserve.durationLimitOpen !== 0 && timeDifference > _this.reserve.durationLimitMin) {
            popup.alert('单次预约时长不得超过' + _this.reserve.durationLimitMin + '分钟，请重新选择')
            _this.clearChoseIntervalList(idx, false)
            return
          }
          var choseIntervalInfo = {
            today: date, //yyyy-mm-dd格式
            week: reserveUtils.toWeek(new Date(date).getDay()), //星期*
            date: dateShowStr, //YYYY年MM月DD日
            startTime: startTime, //HH:mm
            endTime: endTime, //HH:mm
            startDateTime: date + ' ' + startTime + ':00',
            endDateTime: date + ' ' + endTime + ':00',
            yearWeek: reserveUtils.getYearWeek(date), //2022_15
            yearMonth: new Date(date).getFullYear() + '_' + new Date(date).getMonth(), //2022-8
            timeAlias: timeAlias
          }
          if (_this.multipleChoseIntervalInfoArr[idx]) {
            _this.multipleChoseIntervalInfoArr.splice(idx, 1, choseIntervalInfo)
          } else {
            _this.multipleChoseIntervalInfoArr.push(choseIntervalInfo)
          }
          //增加点选时间段选中状态
          choseIntervalDataArr.forEach(function (value) {
            _this.allIntervalList[value.allIntervalListIndex].intervalList[value.intervalListIndex].intervalDataList[value.index]['mySelf'] = true
            _this.allIntervalList[value.allIntervalListIndex].intervalList[value.intervalListIndex].intervalDataList[value.index]['select'] = false
          })
          //增加选中时段中间包含时段的选中状态
          if (choseIntervalDataArr.length === 2) {
            var num = Math.abs(choseIntervalDataArr[0].index - choseIntervalDataArr[1].index)
            var variable = choseIntervalDataArr[0].index > choseIntervalDataArr[1].index ? choseIntervalDataArr[1].index : choseIntervalDataArr[0].index
            //标出两个选中时段之间的区域
            while (num > 1) {
              var selectData = _this.allIntervalList[choseIntervalDataArr[0].allIntervalListIndex].intervalList[choseIntervalDataArr[0].intervalListIndex].intervalDataList[variable + 1]
              var rangeData = {
                allIntervalListIndex: choseIntervalDataArr[0].allIntervalListIndex,
                intervalListIndex: choseIntervalDataArr[0].intervalListIndex,
                index: variable + 1,
                intervalData: selectData
              }
              if (_this.selectIntervalList[idx]) {
                _this.selectIntervalList[idx].push(rangeData)
              } else {
                _this.selectIntervalList.push([rangeData])
              }
              selectData['select'] = true
              variable++
              num--
            }
            if (!_this.selectIntervalList[idx]) {
              _this.selectIntervalList.push([])
            }
          }
          if (choseIntervalDataArr.length === 1) {
            _this.selectIntervalList.push([])
          }
        },
        choseIntervalData: function (date, interval, intervalData, index, intervalListIndex, allIntervalListIndex) {
          var _this = this
          //查看用户当前点击的是否为自己的预约记录
          if (intervalData.available === 0) {
            if (!intervalData.pauseReason || intervalData.pauseReason === '') {
              return
            }
            _this.pauseReason.text = intervalData.pauseReason
            _this.pauseReason.show = true
            return
          }
          //多人
          if (_this.mySelfReserveJson[intervalData.id + '_' + date]) {
            //取消预约
            _this.cancelReserveShow(_this.mySelfReserveJson[intervalData.id + '_' + date], intervalData, date)
            return
          }
          //单人
          if (_this.isSingle && _this.mySelfReserveJson[date] && intervalData.reserveUserId) {
            var reserveUsers = _this.mySelfReserveJson[date].userList
            for (var i = 0; i < reserveUsers.length; i++) {
              if (reserveUsers[i].id = intervalData.reserveUserId) {
                _this.cancelReserveShow(reserveUsers[i], intervalData, date)
                return
              }
            }
          }
          if (intervalData.userShow) {
            _this.cancelReserveShow(intervalData.userList[0], intervalData, date)
            return
          }
          //查看当前区域是否无法预约
          if (intervalData.userNum <= intervalData.userCount) {
            return
          }
          var choseInterval = {
            date: date,
            index: index, //某天的某个大时段的某个小时段
            intervalListIndex: intervalListIndex, //某天的某个大时段
            allIntervalListIndex: allIntervalListIndex, //某天
            intervalData: intervalData
          }
          if (_this.reserve.selectMode === 0) {
            //当前点击时段对象，与列表关联
            if (_this.choseIntervalList.length === 1 && _this.choseIntervalList[0].length === 1) {
              //查看用户当次点击的是否和之前点击是一个大时段
              var singleFirstChoseData = this.choseIntervalList[0][0]
              if (allIntervalListIndex !== singleFirstChoseData.allIntervalListIndex || intervalListIndex !== singleFirstChoseData.intervalListIndex) {
                _this.clearChoseIntervalList(0, false)
                _this.choseIntervalList.push([choseInterval])
                _this.computeChoseIntervalInfo(date, 0)
                _this.$forceUpdate()
                return
              }
              //查看用户是否点击了已选择的时段 如果是则取消选中状态
              if (_this.choseIntervalList[0][0].index === index) {
                _this.clearChoseIntervalList(0, false)
                _this.multipleChoseIntervalInfoArr = []
                _this.$forceUpdate()
                return
              }
            }
            //用户当前选择了两个时段的情况下 去掉之前选择 追加新的选择
            if (_this.choseIntervalList.length > 0 && _this.choseIntervalList[0].length === 2) {
              _this.clearChoseIntervalList(0, true)
              _this.choseIntervalList.push([choseInterval])
              _this.computeChoseIntervalInfo(date, 0)
              _this.$forceUpdate()
              return
            }
            if (this.choseIntervalList[0]) {
              _this.choseIntervalList[0].push(choseInterval)
            } else {
              _this.choseIntervalList.push([choseInterval])
            }
            _this.computeChoseIntervalInfo(date, 0)
            _this.$forceUpdate()
          }
          if (this.reserve.selectMode === 1) {
            var currentData = _this.allIntervalList[allIntervalListIndex].intervalList[intervalListIndex].intervalDataList[index]
            //判断选中的时段是否已经是被选中的中间时段
            if (currentData.hasOwnProperty('select') && currentData.select) {
              var deleteIdx = -1, addIntervalArr = []
              for (var i = 0; i < _this.choseIntervalList.length; i++) {
                var tempArr = _this.choseIntervalList[i]
                if (tempArr.length === 2 &&
                    tempArr[0].allIntervalListIndex === allIntervalListIndex &&
                    tempArr[0].intervalListIndex === intervalListIndex) {
                  var tempIntervalDataFirst = tempArr[0]
                  var tempIntervalDataSecond = tempArr[1]
                  var startIdx = tempIntervalDataFirst.index < tempIntervalDataSecond.index ? tempIntervalDataFirst.index : tempIntervalDataSecond.index
                  var endIdx = tempIntervalDataFirst.index > tempIntervalDataSecond.index ? tempIntervalDataFirst.index : tempIntervalDataSecond.index
                  if (index > startIdx && index < endIdx) {
                    var bigIntervalList = this.allIntervalList[allIntervalListIndex].intervalList[intervalListIndex].intervalDataList
                    deleteIdx = i
                    addIntervalArr.push([$.extend(true, {}, {
                      date: date,
                      index: startIdx, //某天的某个大时段的某个小时段
                      intervalListIndex: intervalListIndex, //某天的某个大时段
                      allIntervalListIndex: allIntervalListIndex, //某天
                      intervalData: bigIntervalList[startIdx]
                    })])
                    addIntervalArr.push([$.extend(true, {}, {
                      date: date,
                      index: endIdx, //某天的某个大时段的某个小时段
                      intervalListIndex: intervalListIndex, //某天的某个大时段
                      allIntervalListIndex: allIntervalListIndex, //某天
                      intervalData: bigIntervalList[endIdx]
                    })])
                    if ((index - 1) > startIdx) {
                      addIntervalArr[0].push($.extend(true, {}, {
                        date: date,
                        index: index - 1, //某天的某个大时段的某个小时段
                        intervalListIndex: intervalListIndex, //某天的某个大时段
                        allIntervalListIndex: allIntervalListIndex, //某天
                        intervalData: bigIntervalList[index - 1]
                      }))
                    }
                    if ((index + 1) < endIdx) {
                      addIntervalArr[1].push($.extend(true, {}, {
                        date: date,
                        index: index + 1, //某天的某个大时段的某个小时段
                        intervalListIndex: intervalListIndex, //某天的某个大时段
                        allIntervalListIndex: allIntervalListIndex, //某天
                        intervalData: bigIntervalList[index + 1]
                      }))
                    }
                    break
                  }
                }
              }
              if (deleteIdx > -1 && addIntervalArr.length > 0) {
                this.clearChoseIntervalList(deleteIdx, true)
                addIntervalArr.forEach(function (value) {
                  _this.choseIntervalList.push(value)
                  _this.computeChoseIntervalInfo(value[0].date, _this.choseIntervalList.length - 1)
                })
              }
              return
            }
            //判断点击的时段是否已经是被选中
            if (currentData.hasOwnProperty('mySelf') && currentData.mySelf) {
              var deleteIdx = -1, addIntervalArr = []
              for (var i = 0; i < _this.choseIntervalList.length; i++) {
                var tempArr = _this.choseIntervalList[i]
                if (tempArr.length === 1 &&
                    tempArr[0].allIntervalListIndex === allIntervalListIndex &&
                    tempArr[0].intervalListIndex === intervalListIndex &&
                    tempArr[0].index === index) {
                  deleteIdx = i
                  break
                }
                if (tempArr.length === 2 &&
                    tempArr[0].allIntervalListIndex === allIntervalListIndex &&
                    tempArr[0].intervalListIndex === intervalListIndex) {
                  var tempIntervalDataFirst = tempArr[0]
                  var tempIntervalDataSecond = tempArr[1]
                  var startIdx = tempIntervalDataFirst.index < tempIntervalDataSecond.index ? tempIntervalDataFirst.index : tempIntervalDataSecond.index
                  var endIdx = tempIntervalDataFirst.index > tempIntervalDataSecond.index ? tempIntervalDataFirst.index : tempIntervalDataSecond.index
                  if (index === startIdx) {
                    var bigIntervalList = this.allIntervalList[allIntervalListIndex].intervalList[intervalListIndex].intervalDataList
                    deleteIdx = i
                    addIntervalArr.push($.extend(true, {}, {
                      date: date,
                      index: endIdx, //某天的某个大时段的某个小时段
                      intervalListIndex: intervalListIndex, //某天的某个大时段
                      allIntervalListIndex: allIntervalListIndex, //某天
                      intervalData: bigIntervalList[endIdx]
                    }))
                    if ((index + 1) !== endIdx) {
                      addIntervalArr.push($.extend(true, {}, {
                        date: date,
                        index: index + 1, //某天的某个大时段的某个小时段
                        intervalListIndex: intervalListIndex, //某天的某个大时段
                        allIntervalListIndex: allIntervalListIndex, //某天
                        intervalData: bigIntervalList[index + 1]
                      }))
                    }
                    break
                  }
                  if (index === endIdx) {
                    var bigIntervalList = _this.allIntervalList[allIntervalListIndex].intervalList[intervalListIndex].intervalDataList
                    deleteIdx = i
                    addIntervalArr.push($.extend(true, {}, {
                      date: date,
                      index: startIdx, //某天的某个大时段的某个小时段
                      intervalListIndex: intervalListIndex, //某天的某个大时段
                      allIntervalListIndex: allIntervalListIndex, //某天
                      intervalData: bigIntervalList[startIdx]
                    }))
                    if ((index - 1) !== startIdx) {
                      addIntervalArr.push($.extend(true, {}, {
                        date: date,
                        index: index - 1, //某天的某个大时段的某个小时段
                        intervalListIndex: intervalListIndex, //某天的某个大时段
                        allIntervalListIndex: allIntervalListIndex, //某天
                        intervalData: bigIntervalList[index - 1]
                      }))
                    }
                    break
                  }
                }
              }
              if (deleteIdx > -1) {
                _this.clearChoseIntervalList(deleteIdx, addIntervalArr.length > 0)
                if (addIntervalArr.length > 0) {
                  _this.choseIntervalList.push(addIntervalArr)
                  _this.computeChoseIntervalInfo(addIntervalArr[0].date, _this.choseIntervalList.length - 1)
                }
              }
              return
            }
            //判断是否能和已存在的多时段合并
            for (var i = 0; i < this.choseIntervalList.length; i++) {
              var tempArr = this.choseIntervalList[i]
              if (tempArr[0].allIntervalListIndex === allIntervalListIndex &&
                  tempArr[0].intervalListIndex === intervalListIndex &&
                  tempArr.length === 2) {
                var mergeIntervalArr = []
                var startData = tempArr[0].index > tempArr[1].index ? tempArr[1] : tempArr[0]
                var endData = tempArr[0].index > tempArr[1].index ? tempArr[0] : tempArr[1]
                var newStart = (index + 1) === startData.index
                var newEnd = (index - 1) === endData.index
                if (newStart) {
                  this.clearChoseIntervalList(i, true)
                  mergeIntervalArr.push(choseInterval)
                  mergeIntervalArr.push(endData)
                  this.choseIntervalList.push(mergeIntervalArr)
                  this.computeChoseIntervalInfo(mergeIntervalArr[0].date, this.choseIntervalList.length - 1)
                  reserveUtils.mergeChoseIntervalData(this, allIntervalListIndex, intervalListIndex)
                  return
                }
                if (newEnd) {
                  this.clearChoseIntervalList(i, true)
                  mergeIntervalArr.push(startData)
                  mergeIntervalArr.push(choseInterval)
                  this.choseIntervalList.push(mergeIntervalArr)
                  this.computeChoseIntervalInfo(mergeIntervalArr[0].date, this.choseIntervalList.length - 1)
                  reserveUtils.mergeChoseIntervalData(this, allIntervalListIndex, intervalListIndex)
                  return
                }
              }
            }
            //判断是否能和已存在的单时段合并（以最小开始时间为基础合并）
            var addInterval = true
            var mergeArr = []
            flag:
                for (var i = 0; i < this.choseIntervalList.length; i++) {
                  var add = true, delIdx = -1, addIntervalArr = []
                  var tempArr = this.choseIntervalList[i]
                  var tempIntervalData = tempArr[0]
                  if (tempIntervalData.allIntervalListIndex === allIntervalListIndex &&
                      tempIntervalData.intervalListIndex === intervalListIndex &&
                      tempArr.length === 1) {
                    if (tempIntervalData.index === index) {
                      this.clearChoseIntervalList(i, false)
                      this.$forceUpdate()
                      return
                    }
                    var bigIntervalList = this.allIntervalList[allIntervalListIndex].intervalList[intervalListIndex].intervalDataList
                    var num = Math.abs(index - tempIntervalData.index)
                    var variable = index > tempIntervalData.index ? tempIntervalData.index : index
                    while (num > 1) {
                      var rangeData = bigIntervalList[variable + 1]
                      if ((rangeData.hasOwnProperty('select') && rangeData.select) || (rangeData.hasOwnProperty('mySelf') && rangeData.mySelf) || rangeData.userNum <= rangeData.userCount) {
                        continue flag
                      }
                      variable++
                      num--
                    }
                    add = false
                    addInterval = false
                    delIdx = i
                    addIntervalArr.push($.extend(true, {}, tempIntervalData))
                    addIntervalArr.push(choseInterval)
                  }
                  if (!add && delIdx !== -1 && addIntervalArr.length > 0) {
                    mergeArr.push({
                      delIdx: delIdx,
                      addIntervalArr: addIntervalArr,
                      index: tempIntervalData.index
                    })
                  }
                }
            if (mergeArr.length > 0) {
              var minData = mergeArr[0]
              for (var i = 1; i < mergeArr.length; i++) {
                if (minData.index >= mergeArr[i].index) {
                  minData = $.extend(true, {}, mergeArr[i])
                }
              }
              this.clearChoseIntervalList(minData.delIdx, false)
              this.choseIntervalList.push(minData.addIntervalArr)
              this.computeChoseIntervalInfo(minData.addIntervalArr[0].date, this.choseIntervalList.length - 1)
              reserveUtils.mergeChoseIntervalData(this, allIntervalListIndex, intervalListIndex)
              this.$forceUpdate()
              return
            }
            //新增时段
            if (addInterval) {
              this.choseIntervalList.push([choseInterval])
              this.computeChoseIntervalInfo(date, this.choseIntervalList.length - 1)
              this.$forceUpdate()
            }
          }
        },
        //超过单次预约时长时候取消新增的选中项
        clearOverTimeLimit: function (idx) {
          var _this = this
          _this.choseIntervalList[idx].forEach(function (v, i) {
            if (i === _this.choseIntervalList[idx].length - 1) {
              //只取消超过单次预约时长的新增的选中项
              _this.allIntervalList[v.allIntervalListIndex].intervalList[v.intervalListIndex].intervalDataList[v.index]['mySelf'] = false
            }
          })
          //删除选中时段中间的数据
          _this.selectIntervalList[idx].forEach(function (v) {
            _this.allIntervalList[v.allIntervalListIndex].intervalList[v.intervalListIndex].intervalDataList[v.index]['select'] = false
          })
          _this.choseIntervalList[idx].splice(_this.choseIntervalList[idx].length - 1, 1)
          _this.selectIntervalList[idx].splice(_this.selectIntervalList[idx].length - 1, 1)
        },
        clearChoseIntervalList: function (idx, clearSelectIntervalList) {
          var _this = this
          //删除选中的数据
          _this.choseIntervalList[idx].forEach(function (v) {
            _this.allIntervalList[v.allIntervalListIndex].intervalList[v.intervalListIndex].intervalDataList[v.index]['mySelf'] = false
          })
          //删除选中时段中间的数据
          if (clearSelectIntervalList && _this.selectIntervalList.length > 0) {
            _this.selectIntervalList[idx].forEach(function (v) {
              _this.allIntervalList[v.allIntervalListIndex].intervalList[v.intervalListIndex].intervalDataList[v.index]['select'] = false
            })
          }
          _this.choseIntervalList.splice(idx, 1)
          _this.selectIntervalList.splice(idx, 1)
          _this.multipleChoseIntervalInfoArr.splice(idx, 1)
        },
        submitReserve: function () {
          var _this = this
          if (!_this.submitBtnEnable) {
            return
          }
          // (定制单位 || 开启必填校验) && 备注为空 && 开启确认弹框
          if ((_this.tjcjdx || _this.reserveItem.isMark == 2) && $.trim(_this.submitReserveDialog.remark) === '' && _this.reserve.confirmDialog !== 0) {
            _this.isRequired = true
            BaseUtils.showMoblieBtmTips('必填项未填')
            return
          }
          _this.submitBtnEnable = false
          if (_this.reserve.id === 13029 && $.trim(_this.submitReserveDialog.remark) === '') {
            BaseUtils.showMoblieBtmTips('请填写会议主题')
            _this.submitBtnEnable = true
            return
          }
          if (!_this.choseIntervalList.length) {
            alert('请选择时段后再次提交')
            _this.submitBtnEnable = true
            return
          }
          //查询当前预约剩余时间是否是否小于预约时间
          var startArr = _this.multipleSortChoseIntervalInfoArr[0].startTime.split(':')
          var myDate = new Date(), h = myDate.getHours(), m = myDate.getMinutes()
          var currentDay = moment().format('YYYY-MM-DD')
          //验证至少提前预约天数
          if (_this.reserve.openTimeType === 0 && _this.reserve.leastDays && _this.reserve.leastDays !== 0 && _this.reserve.leastTime) {
            var flag = moment(currentDay + ' ' + _this.reserve.leastTime + ':00'), now = moment(), diff = _this.reserve.leastDays
            if (now.diff(flag) > 0) {
              diff += 1
            }
            //循环判断 不合法的直接返回
            for (var i = 0; i < _this.reserveUsers.length; i++) {
              var date = _this.reserveUsers[i].today
              if (((moment(date + ' ' + '00:00:00').diff(moment(currentDay + ' ' + '00:00:00'))) / 86400000) < diff) {
                alert('所选时段已超过允许预约的时间范围，请重新选择')
                _this.submitBtnEnable = true
                return
              }
            }
          }
          if (_this.reserve.signInModel !== 1 && parseInt(_this.reserve.signDuration) > 0 && currentDay == date && (parseInt(startArr[0]) < h || parseInt(startArr[0]) == h &&
              parseInt(startArr[1]) < m)) {
            if (confirm('您预约的时段中包含当前时间段，需要在' + _this.reserve.signDuration + '分钟内签到，确认预约？')) {
              _this.submit()
            }
            return
          }
          _this.submit()
        },
        submit: function () {
          //处理提交数据，提交选中区域ID
          var _this = this
          for (var i = 0; i < _this.reserveUsers.length; i++) {
            _this.reserveUsers[i]['remark'] = _this.submitReserveDialog.remark
          }
          if (_this.teamReserve) {
            location.href = location.origin + '' + '/front/third/apps/reserve/team?itemId=' + itemId
                + '&reserveId=' + _this.reserve.id
                + '&starttime=' + _this.reserveUsers[0].starttime
                + '&endtime=' + _this.reserveUsers[0].endtime
                + '&remark=' + encodeURIComponent(_this.reserveUsers[0].remark)
                + '&intervalIds=' + encodeURIComponent(_this.reserveUsers[0].intervalIds)
                + '&fidEnc=' + fidEnc
                + '&jumpType=3'
            _this.submitBtnEnable = true
            return
          }
          //需要填写表单
          if (_this.reserveItem.isForms && _this.reserveItem.version === 0) {
            var data = {
              itemId: itemId,
              reserveId: _this.reserve.id,
              reserveUsers: _this.reserveUsers,
              timeModel: true,
              token: '879ab5cb2fb041279a66216675e761fc',
              reserveNum: _this.reserve.confirmDialog === 0 ? 1 : _this.choiceReserveNum,
              cycleType: _this.cycleReserve.type,
              startDate: _this.cycleReserve.cycleStartDate,
              endDate: _this.cycleReserve.cycleEndDate
            }
            cacheData(formsDataKey, JSON.stringify(data))
            location.href = location.origin + '' + '/front/third/apps/reserve/item/forms/write?id=' + itemId + '&jumpType=' + jumpType + '&fidEnc=' + fidEnc
            this.submitBtnEnable = true
            return
          }
          if ((_this.reserveItem.isForms === 1 || _this.reserveItem.isAprv === 1) &&
              _this.reserveItem.version === 1 && _this.reserveItem.wechatUrl) {
            var data = {
              itemId: itemId,
              reserveId: _this.reserve.id,
              reserveUsers: _this.reserveUsers,
              timeModel: true,
              token: '879ab5cb2fb041279a66216675e761fc',
              iframeUrl: _this.reserveItem.wechatUrl,
              reserveNum: _this.reserve.confirmDialog === 0 ? 1 : _this.choiceReserveNum,
              cycleType: _this.cycleReserve.type,
              startDate: _this.cycleReserve.cycleStartDate,
              endDate: _this.cycleReserve.cycleEndDate
            }
            cacheData(formsDataKeyNew, JSON.stringify(data))
            location.href = location.origin + '' + '/front/third/apps/reserve/form/aprv?id=' + itemId + '&jumpType=' +
                jumpType + '&fidEnc=' + fidEnc
            _this.submitBtnEnable = true
            return
          }
          _this.tipTitle = '努力预约中，请稍稍等待片刻'
          _this.loadingShow = true
          $.post('data/apps/reserve/multiple/submit', {
            itemId: itemId,
            reserveId: _this.reserve.id,
            reserveUsers: JSON.stringify(_this.reserveUsers),
            token: null,
            reserveNum: _this.reserve.confirmDialog === 0 ? 1 : _this.choiceReserveNum,
            cycleType: _this.cycleReserve.type,
            startDate: _this.cycleReserve.cycleStartDate,
            endDate: _this.cycleReserve.cycleEndDate,
            fidEnc: fidEnc
          }).then(function (res) {
            if (!res.success) {
              if (_this.reserve.selectMode === 0) {
                popup.alert(res.msg, '确定', function () {
                  location.reload()
                })
              }
              if (_this.reserve.selectMode === 1 &&
                  res.hasOwnProperty('data') &&
                  res.data.hasOwnProperty('errData') && res.data.errData.length > 0) {
                reserveUtils.reserveClashReload(_this, res)
              } else {
                popup.alert(res.msg, '确定', function () {
                  location.reload()
                })
              }
              _this.submitBtnEnable = true
              _this.submitReserveDialog.show = false
              _this.loadingShow = false
            } else if (res.data.hasOwnProperty('errData') && res.data.errData.length > 0) {
              _this.submitBtnEnable = true
              _this.loadingShow = false
              _this.cycleReserve.reserveUsers = res.data.reserveUsers
              _this.cycleReserve.errList = res.data.errData
              _this.cycleReserve.errorShow = true
            } else {
              _this.submitBtnEnable = true
              _this.loadingShow = false
              _this.submitReserveDialog.show = false
              if (_this.reserve.id === 14191) {
                location.href = 'https://portal.hunau.edu.cn/payservice/payment/preOrder?reserveId=' + res.data.id
                    + '&uname=' + encodeURIComponent(_this.uname)
                    + '&sno=' +  encodeURIComponent(_this.sno)
                    + '&starttime=' +  encodeURIComponent(_this.reserveUsers[0].starttime)
                    + '&endtime=' +  encodeURIComponent(_this.reserveUsers[0].endtime)
                    + '&itemName=' +  encodeURIComponent(_this.reserveItem.name)
                    + '&itemProperty=' + encodeURIComponent(JSON.stringify(_this.reserveItem.propertyValues))
                    + '&ua=thirdParty'
                    + '&backStep=' + (jumpType + 1)
                    + '&reserveIndexUrl=' + encodeURIComponent(_this.reserveIndexUrl)
                return
              }
              var msg = '预约成功！'
              if (_this.reserve.id === 12876) {
                msg = '预约成功，请按时抵达，如行程有变请登录本系统更改或取消'
              }
              popup.alert(msg, '确定', function () {
                location.href = _this.reserveIndexUrl
              })
            }
          })
        },
        timeEquals: function (time1, time2) {
          //时间1大于时间2返回1，时间1等于时间2返回0，时间1小于时间2返回-1
          var time1Arr = time1.split(':')
          var time2Arr = time2.split(':')
          if (parseInt(time1Arr[0]) == parseInt(time2Arr[0]) && parseInt(time1Arr[1]) > parseInt(time2Arr[1])
              || parseInt(time1Arr[0]) > parseInt(time2Arr[0])) {
            return 1
          } else if (parseInt(time1Arr[0]) == parseInt(time2Arr[0]) && parseInt(time1Arr[1]) == parseInt(time2Arr[1])) {
            return 0
          }
          return -1
        },
        submitReserveDialogShow: function () {
          var _this = this
          //检验是否登录
          if (!_this.loginStatus) {
            location.href = 'redirect:https://passport2.chaoxing.com/mlogin?loginType=1&newversion=true&refer=https%3A%2F%2Freserve.chaoxing.com%2Ffront%2Fthird%2Fapps%2Freserve%2Fitem%2Freserve%3FitemId%3D26367%26fidEnc%3Dbc16a533e9870b41%26reserveId%3D2454'.substring(9)
            return
          }
          if (_this.submitReserveDialog.remark.length > 50) {
            popup.alert('预约事由最多50字')
            return
          }
          if (!_this.choseIntervalList.length) {
            popup.alert('请选择时段后再次提交')
            return
          }
          //构造预约数据
          var reserveUsers = []
          for (var i = 0; i < _this.multipleSortChoseIntervalInfoArr.length; i++) {
            var temp = _this.multipleSortChoseIntervalInfoArr[i]
            var startTimeStr = temp.today + ' ' + temp.startTime
            var endTimeStr = temp.today + ' ' + temp.endTime
            if (_this.reserve.deptId === 212154 || _this.reserve.id === 16333) { //灰度测试id：16333
              if (moment(endTimeStr).diff(moment(startTimeStr)) < 3600000) {
                popup.alert('请预约小时的整数倍时间段')
                return
              }
              if ((moment(endTimeStr).diff(moment(startTimeStr)) % 3600000) !== 0) {
                popup.alert('请预约小时的整数倍时间段')
                return
              }
              // //校验剩余时间段是否为小时的整数倍 TODO 定制方觉得效果不好，暂时屏蔽待定制方确认新的方案
              // if (!reserveUtils.verifyFreeIntervalIsHours(_this)) {
              //   popup.alert('所选时间段的前后剩余时间不是1小时的整数倍')
              //   return
              // }
            }
            reserveUsers.push({
              itemId: itemId,
              starttime: startTimeStr,
              endtime: endTimeStr,
              today: temp.today,
              yearWeek: temp.yearWeek,
              yearMonth: temp.yearMonth
            })
          }
          _this.reserveUsers = $.extend(true, [], reserveUsers)
          for (var i = 0; i < _this.reserveUsers.length; i++) {
            var intervalIdArr = []
            var idx = 0
            for (var j = 0; j < _this.choseIntervalList.length; j++) {
              var temp = _this.choseIntervalList[j]
              var starttime = temp[0].date + ' ' + temp[0].intervalData.startTime
              var endtime = temp[0].date + ' ' + temp[0].intervalData.endTime
              if (temp.length === 2) {
                if (_this.timeEquals(temp[0].intervalData.startTime, temp[1].intervalData.startTime) === 1) {
                  starttime = temp[1].date + ' ' + temp[1].intervalData.startTime
                }
                if (this.timeEquals(temp[1].intervalData.endTime, temp[0].intervalData.endTime) === 1) {
                  endtime = temp[1].date + ' ' + temp[1].intervalData.endTime
                }
              }
              if (_this.reserveUsers[i].starttime === starttime && _this.reserveUsers[i].endtime === endtime) {
                idx = j
                break
              }
            }
            for (var j = 0; j < _this.choseIntervalList[idx].length; j++) {
              intervalIdArr.push(_this.choseIntervalList[idx][j].intervalData.id)
            }
            for (var j = 0; j < _this.selectIntervalList[idx].length; j++) {
              intervalIdArr.push(_this.selectIntervalList[idx][j].intervalData.id)
            }
            _this.reserveUsers[i]['intervalIds'] = JSON.stringify(intervalIdArr)
          }
          _this.submitReserveDialog.remark = ''
          $.post('data/apps/reserve/verify/data', {
            reserveId: _this.reserve.id,
            reserveUsers: JSON.stringify(_this.reserveUsers),
            timeModel: 1,
            fidEnc: fidEnc,
            itemId: itemId,
            reserveNum: _this.reserveNum === 0 ? _this.reserveNum : _this.reserveNum ? _this.reserveNum : 1,
            date: _this.allIntervalList[_this.choseIntervalList[0][0].allIntervalListIndex].date,
            intervalIdStr: JSON.stringify(intervalIdArr),
            administrator: _this.isAdministrator
          }).then(function (json) {
            if (!json.success) {
              if (_this.reserve.selectMode === 0) {
                popup.alert(json.msg)
                return
              }
              if (_this.reserve.selectMode === 1 &&
                  json.hasOwnProperty('data') &&
                  json.data.hasOwnProperty('errData')
                  && json.data.errData.length > 0) {
                reserveUtils.reserveClashReload(_this, json)
                return
              }
              alert(json.msg)
              return
            }
            _this.effectiveReserveNum = json.data.reserveNum
            if (_this.effectiveReserveNum <= 0) {
              _this.choiceReserveNum = 0
              popup.alert('当前时段已约满，请刷新页面重新选择', '确认', function () {
                location.reload()
              })
              return
            }
            if (_this.reserve.confirmDialog === 0) {
              _this.submitReserve()
              return
            }
            _this.submitReserveDialog.show = true
          })
        },
        cancelReserveShow: function (reserveUser, intervalData, date) {
          var _this = this
          if (!intervalData.userShow) {
            operateData('data/apps/reserve/reserveUser/isSign', {id: reserveUser.id}).then(function (json) {
              if (json.success && !json.data.isSign) {
                _this.cancelReserveShowDialog.uuid = json.data.user.uuid
                _this.cancelReserveDialogSetValue(reserveUser, intervalData, date, _this)
              }
            })
          } else {
            _this.cancelReserveDialogSetValue(reserveUser, intervalData, date, _this)
          }
        },
        cancelReserveDialogSetValue: function (reserveUser, intervalData, date, _this) {
          date = new Date(date)
          _this.cancelReserveShowDialog.title = moment(date).format('YYYY年MM月DD日')
              + ' ' + reserveUtils.toWeek(date.getDay())
              + ' ' + intervalData.startTime + '-' + intervalData.endTime
          this.cancelReserveShowDialog.timeAlias = ''
          if (this.openTimeAlias && intervalData.timeAlias) {
            this.cancelReserveShowDialog.timeAlias = intervalData.timeAlias
            if (intervalData.endTimeAlias) {
              this.cancelReserveShowDialog.timeAlias += '-' + intervalData.endTimeAlias
            }
          }
          _this.cancelReserveShowDialog.id = reserveUser.id
          _this.cancelReserveShowDialog.item = reserveUser
          _this.cancelReserveShowDialog.itemId = reserveUser.itemId
          _this.cancelReserveShowDialog.reserveId = reserveUser.reserveId
          _this.cancelReserveShowDialog.remark = reserveUser.remark
          _this.cancelReserveShowDialog.userName = intervalData.userShow ? reserveUser.uname : usrinf.name
          _this.cancelReserveShowDialog.showCancelBtn = intervalData.userShow ? intervalData.userShow && reserveUser.uid === usrinf.uid : true
          if (_this.teamReserve && !(reserveUser.teamLeaderCancel === 0 || (reserveUser.teamLeaderCancel === 1 && reserveUser.leader && reserveUser.leader === 1))) {
            _this.cancelReserveShowDialog.showCancelBtn = false
          }
          _this.cancelReserveShowDialog.msg = '确认取消预约？'
          if (reserveUser.teamLeaderCancel === 1 && reserveUser.leader && reserveUser.leader === 1) {
            _this.cancelReserveShowDialog.msg = '取消后，同组成员的预约将一起取消，确认取消？'
          }
          _this.cancelReserveShowDialog.startTime = moment(date).format('YYYY-MM-DD') + ' ' + intervalData.startTime + ':00'
          _this.cancelReserveShowDialog.show = true
        },
        cancelReserveConfirm: function () {
          var _this = this
          var cancelLimit = _this.reserve.cancelLimit,
              leastCancelDays = _this.reserve.leastCancelDays,
              leastCancelTime = _this.reserve.leastCancelTime,
              now = moment()
          var timeDifference = moment(_this.cancelReserveShowDialog.startTime).diff(moment(), 'minutes')
          doRequest('data/apps/reserve/special/rule', {
            reserveId: _this.cancelReserveShowDialog.reserveId,
            itemId: _this.cancelReserveShowDialog.itemId
          }, false).then(function (json) {
            if (json.success) {
              if (json.data.reserveSpecialRule) {
                cancelLimit = json.data.reserveSpecialRule.cancelLimit
                leastCancelDays = json.data.reserveSpecialRule.leastCancelDays
                leastCancelTime = json.data.reserveSpecialRule.leastCancelTime
              }
              if (json.data.reserveRoleSpecialRule) {
                cancelLimit = json.data.reserveRoleSpecialRule.cancelLimit
                leastCancelDays = json.data.reserveRoleSpecialRule.leastCancelDays
                leastCancelTime = json.data.reserveRoleSpecialRule.leastCancelTime
              }
              now = moment(json.data.serverNow)
            }
          })
          if (cancelLimit === -2) {
            popup.alert('预约成功后不允许取消预约')
            return
          }
          if (cancelLimit !== -1 && cancelLimit !== 0 && timeDifference < (cancelLimit * 60)) {
            popup.alert('距离预约开始时间不足' + cancelLimit + '小时，无法取消')
            return
          }
          if (cancelLimit === 0) {
            var beforDate = moment(_this.cancelReserveShowDialog.startTime).clone().add(-leastCancelDays, 'days'),
                beforDateTime = moment(beforDate.format('YYYY-MM-DD') + ' ' + leastCancelTime + ':00')
            if (now.diff(beforDateTime) > 0) {
              popup.alert('无法取消，距离预约开始时间提前' + leastCancelDays + '天的' + leastCancelTime + '点前可取消')
              return
            }
          }
          _this.cancelReserveShowDialog.confirmShow = true
        },
        cancelReserve: function () {
          var _this = this
          var allCancel = _this.cancelReserveShowDialog.allCancel
          if (_this.cancelReserveShowDialog.item.teamLeaderCancel === 1 &&
              _this.cancelReserveShowDialog.item.leader &&
              _this.cancelReserveShowDialog.item.leader === 1) {
            allCancel = 1
          }
          _this.loadingShow = true
          operateData('data/apps/reserve/item/user/cancel', {
            id: _this.cancelReserveShowDialog.id,
            allCancel: allCancel
          }).then(function (res) {
            _this.loadingShow = false
            if (!res.success) {
              popup.alert(res.msg)
              return
            }
            popup.alert('取消成功', '确定', function () {
              location.reload()
            })
          })
        },
        closeDialog: function () {
          this.submitReserveDialog.show = false
          this.cancelReserveShowDialog.show = false
          this.showDetail = false
          this.isRequired = false //重置校验状态
          this.choiceReserveNum = 1
        },
        getIntervalClass: function (intervalData) {
          var height = intervalData.height ? intervalData.height : 1
          var classStr = 'row' + height
          if (intervalData.available == 0) {
            classStr += ' other_order'
          } else if (intervalData.mySelf) {
            classStr += ' my_order'
          } else if (intervalData.select) {
            classStr += ' select'
          } else if (intervalData.userNum <= intervalData.userCount) {
            classStr += ' other_order'
          }
          return classStr
        },
        dateEquals: function (date1, date2) { //date1>date2 返回1/date1<date2 返回-1
          if (moment(date1).diff(moment(date2)) > 0) {
            return 1
          }
          if (moment(date1).diff(moment(date2)) < 0) {
            return -1
          }
        },
        sortReserveInterval: function (list) {
          var _this = this
          var arr = JSON.parse(JSON.stringify(list))
          for (var i = 0; i < arr.length; i++) {
            for (var j = 0; j < arr.length - i - 1; j++) {
              if (_this.timeEquals(arr[j].startTime, arr[j + 1].startTime) == 1) {
                var temp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = temp
              }
            }
          }
          return arr
        },
        subtractChoiceReserveNum: function () {
          var _this = this
          //存在余量
          if (_this.effectiveReserveNum > 0) {
            if (_this.choiceReserveNum > 1) {
              _this.choiceReserveNum--
            }
            _this.$forceUpdate()
            return
          }
          _this.choiceReserveNum = 0
          _this.$forceUpdate()
        },
        addChoiceReserveNum: function () {
          var _this = this
          //存在余量
          if (_this.effectiveReserveNum > 0) {
            if (_this.choiceReserveNum < _this.effectiveReserveNum) {
              _this.choiceReserveNum++
            }
            _this.$forceUpdate()
            return
          }
          _this.choiceReserveNum = 0
          _this.$forceUpdate()
        },
        validateNumber: function () {
          var _this = this
          if (isNaN(_this.choiceReserveNum) || _this.choiceReserveNum < 1) {
            // 如果输入的不是数字，清空输入框
            _this.choiceReserveNum = 1;
          }
          if (_this.choiceReserveNum > _this.effectiveReserveNum) {
            _this.choiceReserveNum = _this.effectiveReserveNum
          }
        },
        goCyclePage: function () {
          var _this = this
          if (_this.cycleReserve.isFirst) {
            _this.cycleReserve.cycleEndDate = initCycleEndDate(_this)
            _this.cycleReserve.cycleStartDate = _this.allIntervalList[_this.choseIntervalList[0][0].allIntervalListIndex].date
            initCycleDateList(_this)
            _this.cycleReserve.isFirst = false
          }
          _this.cycleReserve.show = true
        },
        selectCycleStartDate: function () {
          var _this = this
          IosSelectCmp.itemSelPicker(1, [_this.cycleDateList], {
            title: '开始重复日期',
            oneLevelId: _this.cycleReserve.cycleStartDate,
            itemHeight: 0.6786,
            headerHeight: 0.819,
            relation: [1, 0, 0, 0],
            cssUnit: 'rem',
            callback: function (selectOneObj) {
              _this.cycleReserve.cycleStartDate = selectOneObj.value
              _this.$forceUpdate()
            }
          })
        },
        selectCycleEndDate: function () {
          var _this = this
          IosSelectCmp.itemSelPicker(1, [_this.cycleDateList], {
            title: '结束重复日期',
            oneLevelId: _this.cycleReserve.cycleEndDate,
            itemHeight: 0.6786,
            headerHeight: 0.819,
            relation: [1, 0, 0, 0],
            cssUnit: 'rem',
            callback: function (selectOneObj) {
              _this.cycleReserve.cycleEndDate = selectOneObj.value
              _this.$forceUpdate()
            }
          })
        },
        check: function (type) {
          var _this = this
          _this.cycleReserve.type = type
          switch (type) {
            case 0:
              _this.cycleReserve.cycleTips = '仅预约当天'
              break
            case 1:
              _this.cycleReserve.cycleTips = '每天重复'
              break
            case 2:
              _this.cycleReserve.cycleTips = '每周的' + toWeek(moment(_this.allIntervalList[_this.choseIntervalList[0][0].allIntervalListIndex].date).day()) + '重复'
              break
            case 3:
              _this.cycleReserve.cycleTips = '每两周的' + toWeek(moment(_this.allIntervalList[_this.choseIntervalList[0][0].allIntervalListIndex].date).day()) + '重复'
              break
            case 4:
              _this.cycleReserve.cycleTips = '每月的' + _this.allIntervalList[_this.choseIntervalList[0][0].allIntervalListIndex].date.split('-')[2] + '日重复'
              break
            case 5:
              _this.cycleReserve.cycleTips = '工作日重复'
              break
            default:
              break
          }
          _this.$forceUpdate()
        },
        confirm: function () {
          var _this = this
          if (moment(_this.cycleReserve.cycleStartDate + ' 00:00:00').diff(moment(_this.cycleReserve.cycleEndDate + ' 00:00:00')) >= 0) {
            popup.alert('结束时间必须大于开始时间')
            return
          }
          _this.cycleReserve.show = false
        },
        cancelCycleReserve: function () {
          var _this = this
          operateData('data/apps/reserve/item/user/cancel', {id: _this.cycleReserve.reserveUsers[0].id, allCancel: 1}).then(function (res) {
            if (!res.success) {
              popup.alert(res.msg)
              return
            }
            popup.alert('取消成功', '确定', function () {
              location.reload()
            })
          })
        },
        confirmCycleReserve: function () {
          var _this = this
          _this.cycleReserve.errList = []
          _this.cycleReserve.errorShow = false
          popup.alert('预约成功', '确定', function () {
            if (jumpType == 1) {
              window.history.go(-1)
            } else {
              window.history.go(-2)
            }
          })
        },
        checkAllCancel: function () {
          var _this = this
          _this.cancelReserveShowDialog.allCancel = _this.cancelReserveShowDialog.allCancel === 0 ? 1 : 0
        },
        submitReserveDialogClose: function () {
          this.cycleReserve.type = 0
          this.cycleReserve.cycleTips = '仅预约当天'
          this.submitReserveDialog.show = false
          this.isRequired = false //重置校验状态
          this.choiceReserveNum = 1
        },
        closeErrorDialog: function () {
          this.reserveClash.totalDurationErrShow = false
          this.reserveClash.reserveNumErrShow = false
          this.reserveClash.existRserveShow = false
          this.reserveClash.numLimitErrShow = false
          this.reserveClash.singleDurationErrShow = false
          this.reserveClash.list = []
          this.reserveClash.show = false
          this.$forceUpdate()
        },
        //获取超出预约时间总长度错误提示语
        getTotalReserveTimeErrMsg: function () {
          return reserveUtils.getTotalReserveTimeErrMsg(this.reserve.reserveDurationType)
        }
      },
      mounted: function () {
        var _this = this
        operateData('data/apps/reserve/free/login', {reserveId: reserveId}).then(function (res) {
          if (res.success) {
            _this.freeLogin = res.data.freeLogin
            _this.loginStatus = res.data.loginStatus
            getReserveInfo(_this)
          } else {
            popup.alert(res.msg)
          }
        })
      }
    })
  })
