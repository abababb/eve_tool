var JSONStream = require('JSONStream')
var es = require('event-stream')
var assert = require('assert')
var { MongoClient } = require('mongodb')

var fetchMarket = require('./fetch/listOrdersInRegion.js')
var universe = require('./model/universe.js')
var config = require('./config.js')

let url = 'mongodb://localhost:27017/market'

let fetchOneRegionPage = (regionPage) => (resolve, reject) => {
  let page = regionPage.page + 1
  let regionID = regionPage.region.data.regionID.toString()
  let regionPageInfo = regionID + ' ' + page

  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err)
    let fetchStream = (callback) => {
      try {
        fetchMarket.fetchByRegionPage(regionID, page)
          .then(res => {
            res.body
              .pipe(JSONStream.parse('*'))
              .pipe(es.map((data, next) => {
                db.collection(regionID).count({order_id: data.order_id}, (err, count) => {
                  try {
                    assert.equal(null, err)
                    if (count === 0) {
                      db.collection(regionID).insertOne(data, next)
                    } else {
                      next()
                    }
                  } catch (err) {
                    console.log(regionPageInfo, 'collection error', err)
                    next()
                  }
                })
              }))
              .on('end', () => {
                console.log(regionPageInfo)
                callback()
              })
              .on('error', (err) => {
                console.log(regionPageInfo, 'stream error', err)
                fetchStream(callback)
              })
          }).catch(err => {
            console.log(regionPageInfo, 'fetch error', err)
            fetchStream(callback)
          })
      } catch (err) {
        console.log(regionPageInfo, 'other error', err)
        fetchStream(callback)
      }
    }
    fetchStream(() => {
      db.close()
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
    let pages = Array.from(Array(config.cacheMarketPageLimit).keys())
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