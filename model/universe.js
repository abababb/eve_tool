var MongoClient = require('mongodb').MongoClient
var assert = require('assert')
var config = require('../config.js')

var Universe = (function () {
  function Universe () {}

  Universe.mongoUrl = config.mongoUrl + '/import_fsd'

  Universe.getAllRegions = function (callback) {
    this.getCollection(function (collection, db) {
      var query = {
        'type': 'region',
        'parent': 'eve'
      }
      collection.find(query).toArray(function (err, results) {
        assert.equal(null, err)
        callback(results)
        db.close()
      })
    })
  }

  Universe.getSolarSystemInfo = function (callback, solarSystemID) {
    this.getCollection(function (collection, db) {
      let query = {
        'type': 'solarsystem',
        'data.solarSystemID': solarSystemID
      }
      var fields = {
        '_id': true,
        'parent': true
      }
      collection.findOne(query, fields, function (err, solarSystem) {
        assert.equal(null, err)

        let query = {
          '_id': solarSystem.parent
        }

        collection.findOne(query, fields, function (err, constellation) {
          assert.equal(null, err)
          let info = {
            region: constellation.parent,
            constellation: constellation._id,
            solarSystem: solarSystem._id
          }
          callback(info)
          db.close()
        })
      })
    })
  }

  Universe.getCollection = function (callback) {
    MongoClient.connect(this.mongoUrl, function (err, db) {
      assert.equal(null, err)
      var collection = db.collection('universe')
      callback(collection, db)
    })
  }
  return Universe
}())

module.exports = Universe
