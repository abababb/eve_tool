/*
 *
 * 1. 获取所有market相关type_id, 属性volume(V)。 foreach type_id
 *
 * 2. 获取所有region_id, foreach region_id
 *
 * 3. GET /markets/{region_id}/orders/ 接口获取该区域订单买卖数据
 *   格式：
 *   {
 *      "order_id": 911383703,
 *      "type_id": 42,
 *      "location_id": 60008488,
 *      "volume_total": 21983,
 *      "volume_remain": 21983,
 *      "min_volume": 1,
 *      "price": 1461.57,
 *      "is_buy_order": false,
 *      "duration": 365,
 *      "issued": "2017-11-09T01:25:40Z",
 *      "range": "region"
 *    },
 *
 * 4. 根据location_id, 即staStations表内的stationID过滤security >= 0.5的订单, 同时取得solarSystemID
 *
 * 5. 过滤出订单所有region合并，
 *    找出某站Tj的type_id物品, 所有订单最低价sell(Sj)，最高价buy(Bj)。
 *
 *    设定一个计算价格模糊区间, 比如2%。
 *
 *    最低卖出价(Sj) =  (在最低卖出价 到 最低卖出价 * (1 + 价格区间) 之间的所有单：(单价 * 订单量)总和) / 总订单量(Svj)
 *    最高买入价(Bj) =  (在最高买入价 到 最高买入价 * (1 - 价格区间) 之间的所有单：(单价 * 订单量)总和) / 总订单量(Bvj)
 *
 *    将订单数据变为T的集合。
 *
 *    两个站Ti, Tj之间:
 *    买卖收益系数 k = (1 - 手续费率 - 税率);
 *    单位货仓容积利润 = (Bi - Sj) * k / V
 *    有效市场单量(Mij) = min(Svj, Bvi),
 *    实际一次运送单量 Mij = min(10000(货船最大容积) / V , Mij)
 *
 * 6. GET /route/{origin}/{destination}/ 接口用两个solarSystemID获取跳数Jij。
 *
 * 7. 假设所有订单数据里有N个站，N * (N -1) 个 Pij = (Bi - Sj) * Mij * k / Jij 中，找出最大值P。Jij 需要调用跳数接口(N * (N - 1)) / 2次。
 *
 * 8. 所有type_id计算出max(P)对应的type_id。即单位跳数体积利润最大商品。Jij即最佳路线。
 *
 * 9. 也可以不考虑跳数，仅算单程买卖最大利润。
 *
 * 10. todo: 多次买卖路线规划。
 *
 *
 * 其他说明：获取订单价格数据接口可以考虑redis缓存。
 *
 */

var staStations = require('./model/staStations.js')
var universe = require('./model/universe.js')
var fetchMarket = require('./api/listOrdersInRegion.js')
var marketRoute = require('./api/getRoute.js')

var page = 1
var priceRange = 0.1 // 价格模糊区间
var typeId = '42'
var typeVolumn = 0.01
var shipCapacity = 10000
var profitRate = 0.96

var filterHighsecOrders = function (marketData, callback) {
  staStations.getSecurityMap(function (stationSecurityMap) {
    var highsecStations = stationSecurityMap.map(function (station) {
      return station.stationID
    })
    var stationSolarSystemInfo = {}
    stationSecurityMap.forEach(function (station) {
      stationSolarSystemInfo[station.stationID] = station.solarSystemID
    })
    marketData = marketData.filter(function (order) {
      return highsecStations.indexOf(order.location_id) !== -1
    }).map(function (order) {
      order.solar_system = stationSolarSystemInfo[order.location_id]
      return order
    })
    callback(marketData)
  })
}

var getTypeOrders = function (callback) {
  universe.getAllRegions(function (regions) {
    Promise.all(regions.map(function (region) {
      return fetchMarket.fetchByRegionTypePage(region.data.regionID, typeId, page)
    })).then(function (ordersList) {
      let marketData = ordersList.reduce(function (acc, cur) {
        return acc.concat(cur)
      }, [])
      filterHighsecOrders(marketData, callback)
    })
  })
}

// 到第4步
var getStationTypeOrders = function (callback) {
  getTypeOrders(function (marketData) {
    let stationOrders = {}
    marketData.forEach(function (order) {
      if (!stationOrders.hasOwnProperty(order.location_id)) {
        stationOrders[order.location_id] = []
      }
      stationOrders[order.location_id].push(order)
    })
    callback(stationOrders)
  })
}

// 到第5步前半
var getStationTypeOrderPriceVolume = function (callback) {
  getStationTypeOrders(function (stationOrders) {
    let stationOrderArray = []
    for (const stationID in stationOrders) {
      if (stationOrders.hasOwnProperty(stationID)) {
        let orders = stationOrders[stationID]
        let solarSystem = orders.map(function (order) {
          return order.solar_system
        }).reduce(function (accumulator, currentValue) {
          return currentValue
        })
        let bOrders = orders.filter(function (order) {
          return order.is_buy_order === true
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

        let priceInfo = {
          solar_system: solarSystem,
          highest_buy_avg: hBuyAvg.toFixed(2),
          lowest_sell_avg: lSellAvg.toFixed(2),
          highest_buy_volume: hBuyVolume,
          lowest_sell_volume: lSellVolume,
          station: stationID
        }
        stationOrderArray.push(priceInfo)
      }
    }
    callback(stationOrderArray)
  })
}

var calculateRouteProfit = function (fromStation, toStation) {
  let amount = Math.min(fromStation.lowest_sell_volume, toStation.highest_buy_volume)
  amount = Math.min((shipCapacity / typeVolumn).toFixed(0), amount)
  let profit = amount * profitRate * (toStation.highest_buy_avg - fromStation.lowest_sell_avg)
  return {
    profit: profit.toFixed(2),
    amount: amount
  }
}

// 到第7步
var getMostProfitableRoute = function (callback) {
  getStationTypeOrderPriceVolume(function (stationPrices) {
    // console.log(stationPrices)
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
      let profitInfo = calculateRouteProfit(pair.from, pair.to)
      pair.profit = profitInfo.profit
      pair.amount = profitInfo.amount
      return pair
    }).filter(function (pair) {
      return pair.profit > 0
    }).sort(function (pair1, pair2) {
      return pair1.profit - pair2.profit
    })
    if (stationPairs.length) {
      stationPairs.pop()
      callback(stationPairs.pop())
    }
  })
}

getMostProfitableRoute(function (route) {
  var promises = []
  promises.push(
    new Promise(function (resolve, reject) {
      universe.getSolarSystemInfo(function (info) {
        resolve(info)
      }, route.to.solar_system)
    })
  )
  promises.push(
    new Promise(function (resolve, reject) {
      universe.getSolarSystemInfo(function (info) {
        resolve(info)
      }, route.from.solar_system)
    })
  )
  Promise.all(promises).then(function (infos) {
    let fromID = route.from.solar_system
    route.from.solar_system = {
      id: fromID
    }
    Object.assign(route.from.solar_system, infos.pop())
    let toID = route.to.solar_system
    route.to.solar_system = {
      id: toID
    }
    Object.assign(route.to.solar_system, infos.pop())

    marketRoute.getSecureRoute(fromID, toID).then(function (routeDetail) {
      route.jumps = routeDetail.length
      route.detail = routeDetail
      console.log(route)
    })
  })
})
