/**
 *  缓存空间站对到队列里
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
client.del('station_pair')
client.quit()

// 获取所有站
calculator.getAllStations(function (stations) {
  // 根据设定安等过滤站
  calculator.filterStationsBySecurity(stations, function (stationSolarSystems) {
    let pairStore = []
    while (stationSolarSystems.length > 1) {
      // 随意取一个站作为起点
      let fromStation = stationSolarSystems.pop()
      let toStations = stationSolarSystems.slice(0)
      while (toStations.length) {
        pairStore.push([fromStation, toStations.pop()])
      }
    }
    addOneBatch(pairStore)
  })
})

var addOneBatch = function (pairStore) {
  let client = redis.createClient()
  client.select(config.redisDb)

  let promises = []
  let batchSize = 200000
  let currentPairCount = pairStore.length
  for (var i = 0; i < Math.min(batchSize, currentPairCount); i++) {
    promises.push(new Promise(function (resolve, reject) {
      let pair = pairStore.pop()
      let toStation = pair.pop()
      let fromStation = pair.pop()
      client.lpushAsync('station_pair', JSON.stringify([fromStation, toStation])).then(function (res) {
        resolve()
      })
    }))
  }
  Promise.all(promises).then(function (data) {
    console.log(pairStore.length)
    client.quit()
    if (pairStore.length) {
      addOneBatch(pairStore)
    }
  })
}
