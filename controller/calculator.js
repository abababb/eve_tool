/*
 *
 * 1. 获取所有market相关type_id, 属性volume(V)。 redis搜索pattern: 'type:*:stations'
 *
 * 2. 拿到比如 smembers type:626:stations 的所有station_id，根据staStations表内的stationID过滤security >= 0.5的station, 同时取得solarSystemID
 *
 * 3. 对于某站Tj, 即例如: smembers station:61001112:type:626, 拿到所有订单ID,
 *    取出如order:5006837001的相关订单信息, 订单格式:
 *    {
 *       "order_id": 911383703,
 *       "type_id": 42,
 *       "location_id": 60008488,
 *       "volume_total": 21983,
 *       "volume_remain": 21983,
 *       "min_volume": 1,
 *       "price": 1461.57,
 *       "is_buy_order": false,
 *       "duration": 365,
 *       "issued": "2017-11-09T01:25:40Z",
 *       "range": "region"
 *    },
 *
 *    计算所有订单最低价sell(Sj)，最高价buy(Bj)。
 *
 *    设定一个计算价格模糊区间, 比如2%。
 *
 *    最低卖出价(Sj) =  (在最低卖出价 到 最低卖出价 * (1 + 价格区间) 之间的所有单：(单价 * 订单量)总和) / 总订单量(Svj)
 *    最高买入价(Bj) =  (在最高买入价 到 最高买入价 * (1 - 价格区间) 之间的所有单：(单价 * 订单量)总和) / 总订单量(Bvj)
 *
 * 4. 两个站Ti, Tj之间:
 *    买卖收益系数 k = (1 - 手续费率 - 税率);
 *    单位货仓容积利润 = (Bi - Sj) * k / V
 *    有效市场单量(Mij) = min(Svj, Bvi),
 *    实际一次运送单量 Mij = min(10000(货船最大容积) / V , Mij)
 *
 * 5. GET /route/{origin}/{destination}/ 接口用两个solarSystemID获取跳数Jij。(也可以不考虑跳数，仅算单程买卖最大利润。)
 *
 * 6. 假设所有订单数据里有N个站，N * (N -1) 个 Pij = (Bi - Sj) * Mij * k / Jij 中，找出最大值P。Jij 需要调用跳数接口(N * (N - 1)) / 2次。
 *
 * 7. 所有type_id计算出max(P)对应的type_id。即单位跳数体积利润最大商品。Jij即最佳路线。
 *
 */

var staStationModel = require('../model/staStations.js')
var typeModel = require('../model/typeIDs.js')
var redis = require('redis')
var bluebird = require('bluebird')
var config = require('../config.js')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

var calculator = (function () {
  let priceRange = config.priceRange
  let shipCapacity = config.shipCapacity
  let profitRate = config.profitRate
  let buyMinVolumeLimit = config.buyMinVolumeLimit

  function calculator () {}

  calculator.type = {
    id: 42,
    volume: 0.5,
    name: 'abc'
  }

  calculator.getStations = function (callback) {
    let self = this
    let typeKey = 'type:' + self.type.id + ':stations'
    let client = redis.createClient()
    client.select(3)
    // 拿到某类型的所有站
    client.smembersAsync(typeKey).then(function (stations) {
      // 过滤高安站, 并获取星系信息
      self.filterStationsBySecurity(stations, function (stationSolarSystems) {
        // 获取站内订单
        Promise.all(stationSolarSystems.map(function (stationSolarSystem) {
          let stationID = stationSolarSystem.station_id
          let stationTypeKey = 'station:' + stationID + ':type:' + self.type.id
          return client.smembersAsync(stationTypeKey)
        })).then(function (orderList) {
          // 站内订单对应信息
          Object.keys(stationSolarSystems).map(function (key) {
            stationSolarSystems[key].orders = orderList[key].map(function (orderStr) {
              return JSON.parse(orderStr)
            })
          })
          callback(stationSolarSystems)
          client.quit()
        })
      })
    })
  }

  calculator.filterStationsBySecurity = function (stations, callback) {
    staStationModel.getSecurityMap(function (stationSecurityMap) {
      let highsecStations = stationSecurityMap.map(function (station) {
        return station.stationID
      })
      let stationSolarSystemInfo = {}
      stationSecurityMap.forEach(function (station) {
        stationSolarSystemInfo[station.stationID] = station.solarSystemID
      })
      let stationSolarSystems = stations.filter(function (stationID) {
        return highsecStations.indexOf(parseInt(stationID)) !== -1
      }).map(function (stationID) {
        return {
          station_id: parseInt(stationID),
          solar_system: stationSolarSystemInfo[stationID]
        }
      })
      callback(stationSolarSystems)
    })
  }

  calculator.getStationTypeOrdersInfo = function (orders) {
    let bOrders = orders.filter(function (order) {
      return order.is_buy_order === true && order.min_volume <= buyMinVolumeLimit
    })
    let sOrders = orders.filter(function (order) {
      return order.is_buy_order === false
    })
    let bPrices = bOrders.map(function (order) {
      return order.price
    })
    let sPrices = sOrders.map(function (order) {
      return order.price
    })
    // 最高买入
    let hBuy = 0
    // 最低卖出
    let lSell = 0
    if (bPrices.length) {
      hBuy = Math.max.apply(null, bPrices)
    }
    if (sPrices.length) {
      lSell = Math.max.apply(null, sPrices)
    }

    let hBuyPriceOrders = bOrders.filter(function (order) {
      let highBuyPriceEnd = hBuy * (1 - priceRange)
      return order.price >= highBuyPriceEnd
    })
    let lSellPriceOrders = sOrders.filter(function (order) {
      let lowSellPriceEnd = lSell * (1 + priceRange)
      return order.price <= lowSellPriceEnd
    })

    // 平均最高买入
    let hBuyAvg = 0
    // 平均最高买入单量
    let hBuyVolume = 0

    if (hBuyPriceOrders.length) {
      let totalHighBuyPrice = 0
      hBuyPriceOrders.forEach(function (order) {
        totalHighBuyPrice += order.price * order.volume_remain
        hBuyVolume += order.volume_remain
      })
      if (hBuyVolume > 0) {
        hBuyAvg = totalHighBuyPrice / hBuyVolume
      }
    }

    // 平均最低卖出
    let lSellAvg = 0
    // 平均最低卖出单量
    let lSellVolume = 0

    if (lSellPriceOrders.length) {
      let totalLowSellPrice = 0
      lSellPriceOrders.forEach(function (order) {
        totalLowSellPrice += order.price * order.volume_remain
        lSellVolume += order.volume_remain
      })
      if (lSellVolume > 0) {
        lSellAvg = totalLowSellPrice / lSellVolume
      }
    }

    return {
      highest_buy_avg: hBuyAvg.toFixed(2),
      lowest_sell_avg: lSellAvg.toFixed(2),
      highest_buy_volume: hBuyVolume,
      lowest_sell_volume: lSellVolume
    }
  }

  calculator.getStationOrderPriceVolume = function (callback) {
    let self = this
    this.getStations(function (stationOrders) {
      let stationOrderArray = []
      stationOrders.forEach(function (stationOrder) {
        let orders = stationOrder.orders
        let solarSystem = stationOrder.solar_system
        let stationID = stationOrder.station_id
        let priceInfo = {
          solar_system: solarSystem,
          station: stationID
        }
        priceInfo = Object.assign(priceInfo, self.getStationTypeOrdersInfo(orders))
        stationOrderArray.push(priceInfo)
      })
      callback(stationOrderArray)
    })
  }

  calculator.calculateRouteProfit = function (fromStation, toStation) {
    let amount = Math.min(fromStation.lowest_sell_volume, toStation.highest_buy_volume)
    amount = Math.min((shipCapacity / this.type.volume).toFixed(0), amount)
    let profit = Math.max(amount * profitRate * (toStation.highest_buy_avg - fromStation.lowest_sell_avg), 0)
    if (profit <= 0) {
      amount = 0
    }
    return {
      profit: profit.toFixed(2),
      amount: amount
    }
  }

  calculator.getMostProfitableRoute = function (callback) {
    let self = this
    this.getStationOrderPriceVolume(function (stationPrices) {
      let stationPairs = []
      stationPrices.forEach(function (stationOrder) {
        let otherStationOrders = stationPrices.slice(0)
        otherStationOrders.splice(stationPrices.indexOf(stationOrder), 1)
        otherStationOrders.forEach(function (otherStationOrder) {
          stationPairs.push({
            from: stationOrder,
            to: otherStationOrder
          })
        })
      })
      stationPairs = stationPairs.map(function (pair) {
        let profitInfo = self.calculateRouteProfit(pair.from, pair.to)
        pair.profit = profitInfo.profit
        pair.amount = profitInfo.amount
        return pair
      }).filter(function (pair) {
        return pair.profit > 0
      }).sort(function (pair1, pair2) {
        return pair1.profit - pair2.profit
      })
      if (stationPairs.length) {
        let stationPair = stationPairs.pop()
        stationPair.type = self.type
        callback(stationPair)
      } else {
        let noPair = 0
        callback(noPair)
      }
    })
  }

  calculator.setType = function (type) {
    this.type = type
  }

  calculator.getAllTypes = function (callback) {
    let key = 'type:*:stations'
    let client = redis.createClient()
    client.select(config.redisDb)
    client.keysAsync(key).then(function (types) {
      let typeIDList = types.map(function (typeKey) {
        let typeID = typeKey.split(':')[1]
        return typeID
      })
      typeModel.getIDVolumes(function (info) {
        client.quit()
        callback(info)
      }, typeIDList)
    })
  }

  calculator.getAllStations = function (callback) {
    let key = 'station:*:types'
    let client = redis.createClient()
    client.select(config.redisDb)
    client.keysAsync(key).then(function (stations) {
      let stationIDList = stations.map(function (stationKey) {
        let stationID = stationKey.split(':')[1]
        return stationID
      })
      client.quit()
      callback(stationIDList)
    })
  }

  return calculator
}())

module.exports = calculator
