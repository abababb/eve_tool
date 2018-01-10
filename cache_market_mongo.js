var assert = require('assert')
var { MongoClient } = require('mongodb')

var fetchMarket = require('./fetch/listOrdersInRegion.js')
var universe = require('./model/universe.js')
var config = require('./config.js')

let url = 'mongodb://localhost:27017/market'
let regionEndPage = {}

let fetchOneRegionPage = (regionPage) => (resolve, reject) => {
  let page = regionPage.page
  let regionID = regionPage.region
  let regionPageInfo = regionID + ' ' + page

  if (page > regionEndPage[regionID]) {
    resolve()
  } else {
    fetchMarket.fetchByRegionPage(regionID, page)
      .then(res => res.json())
      .then(res => {
        let orderCount = res.length
        if (!orderCount) {
          // 该页订单数为0时置为最后页
          regionEndPage[regionID] = page
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
  }
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
  // 获取所有星域ID和页数数组，初始化最后一页
  regions.map(region => {
    regionEndPage[region.data.regionID] = config.cacheMarketPageLimit
    let pages = Array.from(Array(config.cacheMarketPageLimit).keys())
    pages.map(page => {
      regionPages.push({region: region.data.regionID.toString(), page: page + 1})
    })
  })
  regionPages.reduce((seq, regionPage) => {
    // 开始逐页拉取api数据插入数据库
    return seq.then(() => {
      return new Promise(fetchOneRegionPage(regionPage))
    })
  }, Promise.resolve().then(() => {
    // 第一步清空原数据库
    return new Promise(dropMarket())
  }))
})
