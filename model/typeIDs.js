var MongoClient = require('mongodb').MongoClient
var assert = require('assert')

var typeIDs = (function () {
  function typeIDs () {}

  typeIDs.getIDVolumes = function (callback, typeIDList) {
    // Connection URL
    var url = 'mongodb://localhost:27017/import_fsd'

    MongoClient.connect(url, function (err, db) {
      assert.equal(null, err)
      var typeInfo = db.collection('typeIDs')
      var query = {
        'id': {
          $in: typeIDList
        }
      }
      var fields = {
        'id': true,
        'volume': true,
        'name.en': true
      }
      typeInfo.find(query, fields).toArray(function (err, types) {
        assert.equal(null, err)
        types = types.map(function (typeInfo) {
          return {
            id: typeInfo.id,
            volume: typeInfo.volume,
            name: typeInfo.name.en
          }
        })
        callback(types)
        db.close()
      })
    })
  }
  return typeIDs
}())

module.exports = typeIDs
