/**
 *  从redis读取利润数据, 获取利润大于设定值的所有路线详情
 */
var universeModel = require('../model/universe.js')
var marketRoute = require('../fetch/getRoute.js')
var config = require('../config.js')

var redis = require('redis')
var bluebird = require('bluebird')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

var getRouteDetail = function (route, callback) {
  var promises = []
  promises.push(
    new Promise(function (resolve, reject) {
      universeModel.getSolarSystemInfo(function (info) {
        resolve(info)
      }, route.to.solar_system)
    })
  )
  promises.push(
    new Promise(function (resolve, reject) {
      universeModel.getSolarSystemInfo(function (info) {
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
      callback(route)
    })
  })
}

var StationRoutes = (function () {
  function StationRoutes () {}

  StationRoutes.getAllRouteDetail = function (callback) {
    let client = redis.createClient()
    client.select(config.redisDb)

    client.zrangebyscoreAsync('station_profit', config.profitLimit, '+inf').then(function (routes) {
      routes = routes.filter(function (route) {
        route = JSON.parse(route)
        return (route.cost < config.myMoney) &&
          (route.volume < config.shipCapacity)
      })
      let promises = []
      routes.map(function (route) {
        route = JSON.parse(route)
        promises.push(
          new Promise(function (resolve, reject) {
            getRouteDetail(route, function (routeDetail) {
              resolve(routeDetail)
            })
          })
        )
      })
      Promise.all(promises).then(function (routes) {
        routes.sort(function (route1, route2) {
          return route1.profit - route2.profit
        })
        callback(routes)
      })
      client.quit()
    })
  }
  return StationRoutes
}())

module.exports = StationRoutes
