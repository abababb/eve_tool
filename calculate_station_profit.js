/**
 *  计算任意两站之间的运送多商品利润
 */
var redis = require('redis')
var bluebird = require('bluebird')
var calculator = require('./controller/calculator.js')
var config = require('./config.js')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

let client = redis.createClient()
client.select(config.redisDb)
client.del('station_profit')

// 计算一对站之间往返运输多种商品最大利润及商品购买方案，并缓存
var getStationPairProfit = function (fromStation, toStation, allTypes, orderStore) {
  let fromStationKey = 'station:' + fromStation.station_id
  let toStationKey = 'station:' + toStation.station_id

  client.sinterAsync(fromStationKey + ':types', toStationKey + ':types').then(function (commonTypes) {
    commonTypes = allTypes.filter(function (type) {
      return commonTypes.indexOf(type.id) !== -1
    })

    let promises = []

    // 计算一种商品的利润信息
    commonTypes.map(function (commonType) {
      promises.push(new Promise(function (resolve, reject) {
        let fromToOrders = []
        fromToOrders.push(orderStore[fromStationKey + ':type:' + commonType.id])
        fromToOrders.push(orderStore[toStationKey + ':type:' + commonType.id])
        calculator.setType(commonType)
        fromToOrders = fromToOrders.map(function (orders) {
          orders = orders.map(function (order) {
            return JSON.parse(order)
          })
          return calculator.getStationTypeOrdersInfo(orders)
        })
        let profit = calculator.calculateRouteProfit.apply(calculator, fromToOrders)
        let reverseProfit = calculator.calculateRouteProfit.apply(calculator, fromToOrders.reverse())

        let profitInfo = {
          type: commonType,
          profit: profit,
          reverse_profit: reverseProfit,
          fromStation: fromToOrders.pop(),
          toStation: fromToOrders.pop()
        }
        resolve(profitInfo)
      }))
    })

    Promise.all(promises).then(function (typeInfo) {
      // 综合所有商品利润信息计算起点到终点的利润商品路线
      let fromTo = typeInfo.filter(function (type) {
        return type.profit.profit > config.orderProfitLimit && (type.toStation.highest_buy_avg - type.fromStation.lowest_sell_avg < config.scamProfitLimit)
      }).sort(function (type1, type2) {
        return type1.profit.profit - type2.profit.profit
      }).reduce(function (acc, cur) {
        let fromToOrder = {
          type: cur.type,
          amount: cur.profit.amount,
          profit: cur.profit.profit,
          buy_price: cur.fromStation.lowest_sell_avg,
          sell_price: cur.toStation.highest_buy_avg
        }
        acc.orders.push(fromToOrder)
        acc.profit += parseFloat(cur.profit.profit)
        acc.volume += parseFloat(cur.profit.amount * cur.type.volume)
        acc.cost += parseFloat(cur.profit.amount * cur.fromStation.lowest_sell_avg)
        return acc
      }, {
        from: fromStation,
        to: toStation,
        orders: [],
        profit: 0,
        volume: 0,
        cost: 0
      })
      fromTo.profit = fromTo.profit.toFixed(2)
      fromTo.volume = fromTo.volume.toFixed(2)
      fromTo.cost = fromTo.cost.toFixed(2)

      // 终点到起点的利润商品列表和路线
      let toFrom = typeInfo.filter(function (type) {
        return type.reverse_profit.profit > config.orderProfitLimit && (type.fromStation.highest_buy_avg - type.toStation.lowest_sell_avg < config.scamProfitLimit)
      }).sort(function (type1, type2) {
        return type1.reverse_profit.profit - type2.reverse_profit.profit
      }).reduce(function (acc, cur) {
        let toFromOrder = {
          type: cur.type,
          amount: cur.reverse_profit.amount,
          profit: cur.reverse_profit.profit,
          buy_price: cur.toStation.lowest_sell_avg,
          sell_price: cur.fromStation.highest_buy_avg
        }
        acc.orders.push(toFromOrder)
        acc.profit += parseFloat(cur.reverse_profit.profit)
        acc.volume += parseFloat(cur.reverse_profit.amount * cur.type.volume)
        acc.cost += parseFloat(cur.reverse_profit.amount * cur.toStation.lowest_sell_avg)
        return acc
      }, {
        from: toStation,
        to: fromStation,
        orders: [],
        profit: 0,
        volume: 0,
        cost: 0
      })
      toFrom.profit = toFrom.profit.toFixed(2)
      toFrom.volume = toFrom.volume.toFixed(2)
      toFrom.cost = toFrom.cost.toFixed(2)

      // 缓存并输出console
      if (parseInt(fromTo.profit) > 0) {
        client.zadd('station_profit', parseInt(fromTo.profit), JSON.stringify(fromTo))
        console.log('from: ' + fromStation.station_id + ', to: ' + toStation.station_id + ', profit: ' + fromTo.profit)
      }
      if (parseInt(toFrom.profit) > 0) {
        client.zadd('station_profit', parseInt(toFrom.profit), JSON.stringify(toFrom))
        console.log('from: ' + toStation.station_id + ', to: ' + fromStation.station_id + ', profit: ' + toFrom.profit)
      }

      // 同步执行同一起点到另一个终点的所有计算
      if (toStations[fromStation.station_id].length) {
        getStationPairProfit(fromStation, toStations[fromStation.station_id].pop(), allTypes, orderStore)
      } else {
        delete toStations[fromStation.station_id]
        if (Object.keys(toStations).length === 0 && toStations.constructor === Object) {
          client.quit()
        }
      }
    })
  })
}

// 用于存储脚本运行状态，最后结束关闭redis client
var toStations = {}

// 过滤符合安等设定的站的所有商品订单，存储在一个object里，
// 避免多次查询redis，但会占用比较大内存
var getStationTypeOrders = function (stationSolarSystems, callback) {
  let client = redis.createClient()
  client.select(config.redisDb)
  let key = 'station:*:type:*'
  client.keysAsync(key).then(function (stationTypes) {
    let orderStore = {}
    let promises = []
    let secureStationIDs = stationSolarSystems.map(function (stationSolarSystem) {
      return stationSolarSystem.station_id
    })

    stationTypes = stationTypes.filter(function (stationTypeKey) {
      let stationID = stationTypeKey.split(':')[1]
      stationID = parseInt(stationID)
      return secureStationIDs.indexOf(stationID) !== -1
    }).map(function (stationTypeKey) {
      promises.push(client.smembersAsync(stationTypeKey))
      return stationTypeKey
    })
    Promise.all(promises).then(function (ordersList) {
      Object.keys(stationTypes).map(function (key) {
        orderStore[stationTypes[key]] = ordersList[key]
      })

      callback(orderStore)
      client.quit()
    })
  })
}

// 获取所有商品
calculator.getAllTypes(function (types) {
  // 获取所有站
  calculator.getAllStations(function (stations) {
    // 根据设定安等过滤站
    calculator.filterStationsBySecurity(stations, function (stationSolarSystems) {
      // 获取所有站商品订单信息，存一个Object里
      getStationTypeOrders(stationSolarSystems, function (orderStore) {
        // 执行过滤出的所有站点之间两两运输利润计算，并缓存结果
        while (stationSolarSystems.length > 1) {
          // 随意取一个站作为起点
          let fromStation = stationSolarSystems.pop()
          // 将剩余全作为终点一一遍历计算
          toStations[fromStation.station_id] = stationSolarSystems.slice(0)
          getStationPairProfit(fromStation, toStations[fromStation.station_id].pop(), types, orderStore)
          // 发出某一起点的计算请求后，以终点里的任一站做起点，其余作终点，循环至只剩一个起点和终点
          // 假设有N个站，该算法几乎同时跑N-1个getStationPairProfit方法
        }
      })
    })
  })
})
