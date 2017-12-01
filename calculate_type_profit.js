/**
 *  计算所有商品利润并存入redis, 结构zset, 利润是score
 */
var calculator = require('./controller/calculator.js')
var typeModel = require('./model/typeIDs.js')
var redis = require('redis')
var bluebird = require('bluebird')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

var getAllTypes = function (callback) {
  let key = 'type:*:stations'
  let client = redis.createClient()
  client.select(3)
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
  getAllTypes(function (types) {
    let client = redis.createClient()
    client.select(3)
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
