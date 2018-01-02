var JSONStream = require('JSONStream')
var es = require('event-stream')
var assert = require('assert')
var { MongoClient } = require('mongodb')

var fetchMarket = require('./fetch/listOrdersInRegion.js')

let url = 'mongodb://localhost:27017/market'

let regionID = '10000002'
let pages = Array.from(Array(30).keys())

let fetchOneRegionPage = (page) => (resolve, reject) => {
  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err)

    fetchMarket.fetchByRegionPage(regionID, page)
      .then(res => {
        let stream = res.body
          .pipe(JSONStream.parse('*'))
          .pipe(es.map((data, next) => {
            db.collection(regionID).insertOne(data, next)
            return data
          }))

        stream.on('end', () => {
          console.log(regionID + ' ' + page)
          db.close()
          resolve()
        })
      })
  })
}

let dropRegion = (regionID) => (resolve, reject) => {
  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err)
    db.collection(regionID, (err, collection) => {
      assert.equal(null, err)
      collection.remove({}, (err, removed) => {
        assert.equal(null, err)
        db.close()
        console.log(regionID + ' 已清空')
        resolve()
      })
    })
  })
}

pages.reduce((seq, page) =>
  seq.then(() => {
    return new Promise(fetchOneRegionPage(page + 1))
  }), Promise.resolve().then(() => { return new Promise(dropRegion(regionID)) }))
