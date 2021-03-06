var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var config = require('../config.js')

var Market = (function () {
  function Market () {}

  Market.mongoUrl = config.mongoUrl + '/market'

  Market.getStationTypeMinSell = function (regionID, stationID, callback) {
    this.getCollection(regionID, function (collection, db) {
      let aggregate = [
        {
          $match: {
            location_id: parseInt(stationID),
            is_buy_order: false
          }
        },
        {
          $group: {
            _id: {
              type: '$type_id'
            },
            min_sell: {
              $min: '$price'
            }
          }
        }
      ]
      collection.aggregate(aggregate).toArray(function (err, results) {
        assert.equal(null, err)
        callback(results)
        db.close()
      })
    })
  }

  Market.getCollection = function (regionID, callback) {
    MongoClient.connect(this.mongoUrl, function (err, db) {
      assert.equal(null, err)
      var collection = db.collection(regionID)
      callback(collection, db)
    })
  }
  return Market
}())

module.exports = Market
