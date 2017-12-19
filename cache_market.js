/*
 * redis缓存所有市场数据，结构有4种：
 * 1. station:60004822:type:15613 (set)
 * // 2. order:4733073958 (hash) (暂时用不上这种结构的数据)
 * 3. station:60004822:types (set)
 * 4. type:42:stations (set)
 */

var config = require('./config.js')
var redis = require('redis')
var fetchMarket = require('./fetch/listOrdersInRegion.js')
var universe = require('./model/universe.js')
var bluebird = require('bluebird')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

var client = redis.createClient()
client.select(config.redisDb)
client.flushdb()

var storeOneRegionPage = function (page, regionID, callback) {
  fetchMarket.fetchByRegionPage(regionID, page).then(function (data) {
    if (data.length) {
      let promises = []
      data.map(function (order) {
        promises.push(
          new Promise(function (resolve, reject) {
            let type = order.type_id
            let station = order.location_id

            let typeSetKey = 'type:' + type + ':stations'
            client.saddAsync(typeSetKey, station).then(function (res) {
              let stationSetKey = 'station:' + station + ':types'
              client.saddAsync(stationSetKey, type).then(function (res) {
                let stationTypeSetKey = 'station:' + station + ':type:' + type
                client.saddAsync(stationTypeSetKey, JSON.stringify(order)).then(function (res) {
                  resolve()
                })
              })
            })
          })
        )
      })
      Promise.all(promises).then(function (res) {
        console.log(regionID, page)
        page++
        storeOneRegionPage(page, regionID, callback)
      })
    } else {
      callback()
    }
  }).catch(function (error) {
    console.log(error)
    console.log('网络错误，重新发起请求')
    storeOneRegionPage(page, regionID, callback)
  })
}

universe.getAllRegions(function (regions) {
  let promises = []
  regions.map(function (region) {
    promises.push(new Promise(function (resolve, reject) {
      storeOneRegionPage(1, region.data.regionID, function () {
        resolve()
      })
    }))
  })
  Promise.all(promises).then(function (res) {
    client.quit()
  })
})
