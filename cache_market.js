/*
 * redis缓存所有市场数据，结构有4种：
 * 1. station:60004822:type:15613 (set)
 * // 2. order:4733073958 (hash) (暂时用不上这种结构的数据)
 * 3. station:60004822:types (set)
 * 4. type:42:stations (set)
 */

var redis = require('redis')
var fetchMarket = require('./api/listOrdersInRegion.js')
var universe = require('./model/universe.js')

var client = redis.createClient()
client.select(3)
client.flushdb()

var storeOneOrder = function (order) {
  let type = order.type_id
  let station = order.location_id
  // let oid = order.order_id

  let typeSetKey = 'type:' + type + ':stations'
  client.sadd(typeSetKey, station)
  let stationSetKey = 'station:' + station + ':types'
  client.sadd(stationSetKey, type)
  let stationTypeSetKey = 'station:' + station + ':type:' + type
  client.sadd(stationTypeSetKey, JSON.stringify(order))
  /*
  let orderHashKey = 'order:' + oid
  client.hmset(orderHashKey, Object.keys(order).reduce(function (r, k) {
    return r.concat(k, order[k])
  }, []))
  */
}

var storeOneRegionPage = function (page, regionID) {
  fetchMarket.fetchByRegionPage(regionID, page).then(function (data) {
    if (data.length) {
      data.forEach(function (order) {
        storeOneOrder(order)
      })
      // console.log(regionID, page)
      page++
      storeOneRegionPage(page, regionID)
    } else {
      completeRegions.push(regionID)
      if (completeRegions.length === regionCount) {
        client.quit()
      }
    }
  })
}

var completeRegions = []
var regionCount = 0

universe.getAllRegions(function (regions) {
  regionCount = regions.length
  // console.log(regionCount)
  regions.map(function (region) {
    storeOneRegionPage(1, region.data.regionID)
  })
})
