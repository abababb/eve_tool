var MongoClient = require('mongodb').MongoClient
var assert = require('assert')

var staStations = (function () {
  function staStations () {}

  staStations.getSecurityMap = function (callback) {
    // Connection URL
    var url = 'mongodb://localhost:27017/import'

    MongoClient.connect(url, function (err, db) {
      assert.equal(null, err)
      var station = db.collection('staStations')
      var query = {
        'security': {
          '$gte': 0.5
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
