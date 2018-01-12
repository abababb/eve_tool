var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var config = require('../config.js')

var staStations = (function () {
  function staStations () {}

  staStations.mongoUrl = config.mongoUrl + '/bsd'

  staStations.getRegionByStationID = (stationID, callback) => {
    MongoClient.connect(staStations.mongoUrl, function (err, db) {
      assert.equal(null, err)
      var station = db.collection('staStations')
      var query = {
        'stationID': parseInt(stationID)
      }
      var fields = {
        'regionID': true
      }
      station.findOne(query, fields, function (err, results) {
        assert.equal(null, err)
        db.close()
        let regionID = ''
        if (results) {
          regionID = results.regionID.toString()
        }
        callback(regionID)
      })
    })
  }

  staStations.getSecurityMap = function (callback) {
    MongoClient.connect(staStations.mongoUrl, function (err, db) {
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
