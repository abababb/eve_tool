var marketModel = require('../model/market.js')

var redis = require('redis')
var bluebird = require('bluebird')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

var StationType = (function () {
  function StationType () {}

  StationType.getMinSell = (stationID, callback) => {
    marketModel.getStationTypeMinSell(stationID, (data) => {
      callback(data)
    })
  }

  return StationType
}())

module.exports = StationType
