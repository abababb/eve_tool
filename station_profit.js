/**
 *  计算任意两站之间的运送多商品利润
 */
var redis = require('redis')
var bluebird = require('bluebird')
var calculator = require('./controller/calculator.js')
var typeModel = require('./model/typeIDs.js')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

let client = redis.createClient()
client.select(3)

let scamProfitLimit = 100000000 // 假买单利润差界限
let orderProfitLimit = 50000 // 纳入考虑的利润界限

let toStation = '60008494' // Domain
let fromStation = '60003760' // Jita

let fromStationKey = 'station:' + fromStation
let toStationKey = 'station:' + toStation

client.sinterAsync(fromStationKey + ':types', toStationKey + ':types').then(function (commonTypes) {
  typeModel.getIDVolumes(function (commonTypes) {
    let promises = []

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
      let fromTo = typeInfo.filter(function (type) {
        return type.profit.profit > orderProfitLimit && (type.toStation.highest_buy_avg - type.fromStation.lowest_sell_avg < scamProfitLimit)
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

      let toFrom = typeInfo.filter(function (type) {
        return type.reverse_profit.profit > orderProfitLimit && (type.fromStation.highest_buy_avg - type.toStation.lowest_sell_avg < scamProfitLimit)
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
      console.log(fromTo, toFrom)

      client.quit()
    })
  }, commonTypes)
})
