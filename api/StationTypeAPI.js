var marketModel = require('../model/market.js')
var stationModel = require('../model/staStations.js')
var typeIDs = require('../model/typeIDs.js')
var fetchMarket = require('../fetch/FetchMarket.js')

var redis = require('redis')
var bluebird = require('bluebird')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

var StationType = (function () {
  function StationType () {}

  StationType.getCheapTypes = (stationID, callback) => {
    stationModel.getRegionByStationID(stationID, (regionID) => {
      marketModel.getStationTypeMinSell(regionID, stationID, (typeMinSell) => {
        fetchMarket.fetchPrices().then(res => res.json())
          .then(prices => {
            prices = prices.reduce((acc, cur) => {
              acc[cur.type_id] = {
                avg: cur.average_price ? cur.average_price : 0,
                adj: cur.adjusted_price ? cur.adjusted_price : 0
              }
              return acc
            }, {})
            typeMinSell = typeMinSell.filter(type => {
              return prices.hasOwnProperty(type._id.type) &&
                prices[type._id.type].avg > type.min_sell &&
                prices[type._id.type].adj > type.min_sell
            })
              .map(type => {
                return {
                  type_id: type._id.type,
                  min_sell: type.min_sell.toFixed(2),
                  avg: prices[type._id.type].avg.toFixed(2),
                  adj: prices[type._id.type].adj.toFixed(2),
                  profit_avg: (prices[type._id.type].avg - type.min_sell).toFixed(2),
                  profit_adj: (prices[type._id.type].adj - type.min_sell).toFixed(2)
                }
              })
              .sort((type1, type2) => {
                return type2.profit_avg - type1.profit_avg
              })
            typeIDs.getIDVolumes((typeIDInfoList) => {
              typeIDInfoList = typeIDInfoList.reduce((acc, cur) => {
                acc[cur.id] = cur.name
                return acc
              }, {})
              typeMinSell = typeMinSell.map(type => {
                type.name = typeIDInfoList[type.type_id]
                return type
              })
              callback(typeMinSell)
            }, typeMinSell.map(type => type.type_id.toString()))
          })
      })
    })
  }

  return StationType
}())

module.exports = StationType
