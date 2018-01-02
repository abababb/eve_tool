/**
 *  从redis读取利润数据, 获取利润大于设定值的所有路线详情
 */
var universeModel = require('../model/universe.js')
var marketRoute = require('../fetch/getRoute.js')
var config = require('../config.js')

var Fetch = require('node-fetch')
var redis = require('redis')
var bluebird = require('bluebird')
var Rx = require('rxjs/Rx')

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

    marketRoute.getSecureRoute(fromID, toID)
      .then(res => res.json())
      .then(function (routeDetail) {
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
          return route2.profit - route1.profit
        })
        callback(routes)
      })
      client.quit()
    })
  }

  StationRoutes.getStationRouteDetail = function (stationID, callback) {
    let client = redis.createClient()
    client.select(config.redisDb)

    client.zrangebyscoreAsync('station_profit', config.profitLimitMulti, '+inf').then(function (routes) {
      routes = routes.filter(function (route) {
        stationID = parseInt(stationID)
        route = JSON.parse(route)
        return stationID === route.from.station_id &&
          (route.cost < config.myMoney) &&
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
          return route2.profit - route1.profit
          // return route1.jumps - route2.jumps
        })
        callback(routes)
      })
      client.quit()
    })
  }

  StationRoutes.getMultiStationRoute = function (startStation) {
    let startState = {
      position: startStation,
      profit: 0,
      distance: 0,
      jumps: []
    }
    let observable = Rx.Observable.create(observer => {
      jumpNext(startState, observer)
    })
    observable.filter(state => state.profit > config.profitLimit)
      .subscribe(state => console.log(state))
  }

  let jumpNext = function (state, observer) {
    let url = 'http://localhost:8989/station/routes/' + state.position
    Fetch(url).then(res => res.json())
      .then(routes => {
        routes = routes.filter(route => {
          let currentJump = [parseInt(state.position), parseInt(route.to.station_id)]
          return !state.jumps.includes(currentJump)
        })
        if (!routes.length) {
          observer.next(state)
        } else {
          routes.map(route => {
            let routeState = Object.assign({}, state)
            routeState.jumps = state.jumps.slice(0)
            routeState.jumps.push([parseInt(state.position), parseInt(route.to.station_id)])
            routeState.position = route.to.station_id
            routeState.profit = (parseFloat(state.profit, 10) + parseFloat(route.profit, 10)).toFixed(2)
            routeState.distance = state.distance + route.jumps
            jumpNext(routeState, observer)
          })
        }
      })
  }

  return StationRoutes
}())

module.exports = StationRoutes
