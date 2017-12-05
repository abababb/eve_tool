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

// 计算一对站之间往返运输多种商品最大利润及商品购买方案，并缓存
var getStationPairProfit = function (fromStation, toStation, allTypes, callback) {
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
        Promise.all([client.smembersAsync(fromStationKey + ':type:' + commonType.id), client.smembersAsync(toStationKey + ':type:' + commonType.id)])
          .then(function (fromToOrders) {
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
          })
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

      // 输出console并缓存
      let profitDetails = []
      if (parseInt(fromTo.profit) > 0) {
        profitDetails.push({
          score: parseInt(fromTo.profit),
          detail: JSON.stringify(fromTo)
        })
        console.log('from: ' + fromStation.station_id + ', to: ' + toStation.station_id + ', profit: ' + fromTo.profit)
      }
      if (parseInt(toFrom.profit) > 0) {
        profitDetails.push({
          score: parseInt(fromTo.profit),
          detail: JSON.stringify(fromTo)
        })
        console.log('from: ' + toStation.station_id + ', to: ' + fromStation.station_id + ', profit: ' + toFrom.profit)
      }
      Promise.all(
        profitDetails.map(function (profitDetail) {
          return client.zaddAsync('station_profit', profitDetail.score, profitDetail.detail)
        })
      ).then(function (data) {
        callback()
      })
    })
  })
}

// 获取所有商品
calculator.getAllTypes(function (types) {
  calculateOnePair(types)
})

var calculateOnePair = function (types) {
  client.lpopAsync('station_pair').then(function (pair) {
    pair = JSON.parse(pair)
    let toStation = pair.pop()
    let fromStation = pair.pop()
    getStationPairProfit(fromStation, toStation, types, function () {
      client.llenAsync('station_pair').then(function (pairCount) {
        if (pairCount > 0) {
          calculateOnePair(types)
        } else {
          client.quit()
        }
      })
    })
  })
}
