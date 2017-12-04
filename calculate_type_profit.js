/**
 *  计算所有商品利润并存入redis, 结构zset, 利润是score
 */
var calculator = require('./controller/calculator.js')
var redis = require('redis')
var bluebird = require('bluebird')
var config = require('./config.js')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

var calculate = function (types, client) {
  if (types.length) {
    let type = types.pop()
    let cal = Object.assign({}, calculator)
    cal.setType(type)
    cal.getMostProfitableRoute(function (route) {
      if (route) {
        client.zadd('type_profit', parseInt(route.profit), JSON.stringify(route))
        console.log('type: ' + type.name + ', profit: ' + route.profit)
      }
      calculate(types, client)
    })
  } else {
    client.quit()
  }
}

var calculateAll = function () {
  calculator.getAllTypes(function (types) {
    let client = redis.createClient()
    client.select(config.redisDb)
    client.del('type_profit')

    /*
    let condition = function (type) {
      return (type.id > 1000 && type.id <= 5000)
    }
    types = types.filter(function (type) {
      return condition(type)
    })
    */
    calculate(types, client)
  })
}

calculateAll()
