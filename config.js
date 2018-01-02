/**
 *  一些参数配置
 */

var Config = (function () {
  function Config () {};

  // 假买单利润差界限
  Config.scamProfitLimit = 100000000

  // 多商品运输纳入考虑的利润界限
  Config.orderProfitLimit = 30000

  // 官方api接口host
  Config.apiHost = 'https://esi.tech.ccp.is/latest'

  // mongodb地址
  Config.mongoUrl = 'mongodb://localhost:27017'

  // 价格模糊区间
  Config.priceRange = 0.1

  // 运输容积
  Config.shipCapacity = 17000

  // 去掉手续费和税的盈利比
  Config.profitRate = 0.96

  // 买单最小数量限制
  Config.buyMinVolumeLimit = 1000

  // redis数据库select
  Config.redisDb = 3

  // 单商品运输考虑最大利润界限
  Config.profitLimit = 20000000

  // 多商品运输考虑最大利润界限
  Config.profitLimitMulti = 2000000

  // 能用的成本金额
  Config.myMoney = 1000000000

  // 安等过滤
  Config.securityLimit = 0.5

  // 获取市场数据页数最大值
  Config.cacheMarketPageLimit = 35

  return Config
}())

module.exports = Config
