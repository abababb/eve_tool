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
  universeModel.getSolarSystemInfo(toInfo => {
    universeModel.getSolarSystemInfo(fromInfo => {
      route.to.solar_system = Object.assign({}, {id: route.to.solar_system})
      route.to.solar_system = Object.assign(route.to.solar_system, toInfo)
      route.from.solar_system = Object.assign({}, {id: route.from.solar_system})
      route.from.solar_system = Object.assign(route.from.solar_system, fromInfo)

      marketRoute.getSecureRoute(route.from.solar_system.id, route.to.solar_system.id)
        .then(res => res.json())
        .then(function (routeDetail) {
          route.jumps = routeDetail.length
          route.detail = routeDetail
          route.total_volume = parseInt(route.amount * route.type.volume)
          route.cost = parseInt(route.amount * route.from.lowest_sell_avg)
          callback(route)
        })
    }, route.from.solar_system)
  }, route.to.solar_system)
}

var TypeRoutes = (function () {
  function TypeRoutes () {}

  TypeRoutes.getAllRouteDetail = function (callback) {
    let client = redis.createClient()
    client.select(config.redisDb)

    client.zrangebyscoreAsync('type_profit', config.profitLimit, '+inf').then(function (routes) {
      routes = routes.filter(function (route) {
        route = JSON.parse(route)
        return (parseInt(route.amount * route.from.lowest_sell_avg) < config.myMoney) &&
          (route.to.highest_buy_avg - route.from.lowest_sell_avg < config.scamProfitLimit)
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

  return TypeRoutes
}())

module.exports = TypeRoutes
