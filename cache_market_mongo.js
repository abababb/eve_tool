var assert = require('assert')
var { MongoClient } = require('mongodb')
var redis = require('redis')
var bluebird = require('bluebird')

var fetchMarket = require('./fetch/FetchMarket.js')
var universe = require('./model/universe.js')
var config = require('./config.js')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

let init = () => {
  let client = redis.createClient()
  client.select(config.redisDb)
  client.delAsync('region_list').then(res => {
    universe.getAllRegions(function (regions) {
      let promises = regions.map(region => client.lpushAsync('region_list', region.data.regionID))
      Promise.all(promises).then(() => {
        console.log('done')
        client.quit()
      })
    })
  })
}

// 初始化最后一页
let regionEndPage = config.cacheMarketPageLimit
let url = 'mongodb://localhost:27017/market'

let fetchOneRegionPage = (regionPage) => (resolve, reject) => {
  let page = regionPage.page
  let regionID = regionPage.region
  let regionPageInfo = regionID + ' ' + page

  if (page > regionEndPage) {
    resolve()
  } else {
    fetchMarket.fetchByRegionPage(regionID, page)
      .then(res => res.json())
      .then(res => {
        let orderCount = res.length
        if (!orderCount) {
          // 该页订单数为0时置为最后页
          regionEndPage = page
          resolve()
        } else {
          MongoClient.connect(url, function (err, db) {
            assert.equal(null, err)
            db.collection(regionID).insertMany(res, () => {
              console.log(regionPageInfo)
              db.close()
              resolve()
            })
          })
        }
      })
      .catch(err => {
        console.log(err)
        resolve()
      })
  }
}

let dropMarket = (regionID) => (resolve, reject) => {
  MongoClient.connect(url, function (err, db) {
    assert.equal(null, err)
    db.collection(regionID, (err, regionOrders) => {
      assert.equal(null, err)
      regionOrders.remove({}, (err, result) => {
        assert.equal(null, err)
        db.close()
        console.log(regionID + ' 已清空')
        resolve()
      })
    })
  })
}

let cacheOneRegion = () => {
  let client = redis.createClient()
  client.select(config.redisDb)
  client.lpopAsync('region_list').then(regionID => {
    // 获取星域ID页数数组
    let regionPages = []
    let pages = Array.from(Array(config.cacheMarketPageLimit).keys())
    pages.map(page => {
      regionPages.push({region: regionID, page: page + 1})
    })
    regionPages.reduce((seq, regionPage) => {
      // 第二步：开始逐页拉取api数据插入数据库
      return seq.then(() => {
        if (regionPage.page === regionPages.length) {
          client.rpushAsync('region_list', regionID).then(() => client.quit())
        }
        return new Promise(fetchOneRegionPage(regionPage))
      })
    }, Promise.resolve().then(() => {
      // 第一步：清空星域数据
      return new Promise(dropMarket(regionID))
    }))
  })
}

let action = process.argv[2]
switch (action) {
  case 'init':
    init()
    break
  case 'cache':
    cacheOneRegion()
    break
  default:
    console.log('可用方法: init, cache')
    break
}
