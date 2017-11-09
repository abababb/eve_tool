/*
 * 
 * 1. 获取所有market相关type_id, 属性volume(V)。 foreach type_id
 *
 * 2. 获取所有region_id, foreach region_id
 *
 * 3. GET /markets/{region_id}/orders/ 接口获取该区域订单买卖数据
 *   格式：
 *   {
 *      "order_id": 911383703,
 *      "type_id": 42,
 *      "location_id": 60008488,
 *      "volume_total": 21983,
 *      "volume_remain": 21983,
 *      "min_volume": 1,
 *      "price": 1461.57,
 *      "is_buy_order": false,
 *      "duration": 365,
 *      "issued": "2017-11-09T01:25:40Z",
 *      "range": "region"
 *    },
 *
 * 4. 根据location_id, 即staStations表内的stationID过滤security >= 0.5的订单, 同时取得solarSystemID
 *
 * 5. 过滤出订单所有region合并，
 *    找出某站Tj的type_id物品, 所有订单最低价sell(Sj)，最高价buy(Bj)。
 *
 *    设定一个计算价格模糊区间, 比如2%。
 *
 *    最低卖出价(Si) =  (在最低卖出价 到 最低卖出价 * (1 + 价格区间) 之间的所有单：(单价 * 订单量)总和) / 总订单量(Svj)
 *    最高买入价(Bj) =  (在最高买入价 到 最高买入价 * (1 - 价格区间) 之间的所有单：(单价 * 订单量)总和) / 总订单量(Bvj)
 *
 *    将订单数据变为T的集合。
 *
 *    两个站Ti, Tj之间:
 *    买卖收益系数 k = (1 - 手续费率 - 税率);
 *    单位货仓容积利润 = (Bi - Sj) * k / V
 *    有效市场单量(Mij) = min(Svj, Bvi), 
 *    设置市场单量过滤功能，比如Mij * V > 2000 (最小装货容积) 才关心, 实际一次运送单量 Mij = min(10000(货船最大容积) / V , Mij)
 *
 * 6. GET /route/{origin}/{destination}/ 接口用两个solarSystemID获取跳数Jij。
 *
 * 7. 假设所有订单数据里有N个站，N * (N -1) 个 Pij = (Bi - Sj) * Mij * k / Jij 中，找出最大值P。Jij 需要调用跳数接口(N * (N - 1)) / 2次。
 *
 * 8. 所有type_id计算出max(P)对应的type_id。即单位跳数体积利润最大商品。Jij即最佳路线。
 *
 * 9. 也可以不考虑跳数，仅算单程买卖最大利润。
 *
 * 10. todo: 多次买卖路线规划。
 *
 *
 * 其他说明：获取订单价格数据接口可以考虑redis缓存。
 *
 */
