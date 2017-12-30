var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var config = require('../config.js')

var staStations = (function () {
  function staStations () {}

  staStations.mongoUrl = config.mongoUrl + '/bsd'

  staStations.getSecurityMap = function (callback) {
    // Connection URL

    MongoClient.connect(this.mongoUrl, function (err, db) {
      assert.equal(null, err)
      var station = db.collection('staStations')
      var query = {
        'security': {
          '$gte': config.securityLimit
        }
      }
      var fields = {
        'stationID': true,
        'security': true,
        'regionID': true,
        'solarSystemID': true
      }
      station.find(query, fields).toArray(function (err, results) {
        assert.equal(null, err)
        callback(results)
        db.close()
      })
    })
  }
  return staStations
}())

module.exports = staStations
