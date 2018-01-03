var JSONStream = require('JSONStream')
var es = require('event-stream')
var assert = require('assert')
var { MongoClient } = require('mongodb')

var fetchMarket = require('./fetch/listOrdersInRegion.js')
var universe = require('./model/universe.js')

let url = 'mongodb://localhost:27017/market'

let fetchOneRegionPage = (regionPage) => (resolve, reject) => {
  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err)

    let page = regionPage.page + 1
    let regionID = regionPage.region.data.regionID.toString()
    fetchMarket.fetchByRegionPage(regionID, page)
      .then(res => {
        let stream = res.body
          .pipe(JSONStream.parse('*'))
          .pipe(es.map((data, next) => {
            db.collection(regionID).insertOne(data, next)
          }))

        stream.on('end', () => {
          console.log(regionID + ' ' + page)
          db.close()
          resolve()
        })
      }).catch(err => {
        console.log(err)
        resolve()
      })
  })
}

let dropMarket = () => (resolve, reject) => {
  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err)
    db.dropDatabase((err, result) => {
      assert.equal(null, err)
      db.close()
      console.log('market已清空')
      resolve()
    })
  })
}

universe.getAllRegions(function (regions) {
  let regionPages = []
  regions.map(region => {
    let pages = Array.from(Array(30).keys())
    pages.map(page => {
      regionPages.push({region: region, page: page})
    })
  })
  regionPages.reduce((seq, regionPage) => {
    return seq.then(() => {
      return new Promise(fetchOneRegionPage(regionPage))
    })
  }, Promise.resolve().then(() => {
    return new Promise(dropMarket())
  }))
})
