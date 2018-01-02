#!/bin/sh

node cache_market.js &&
    node calculate_type_profit.js &&
    node store_station_pair.js &&
    seq 10  | xargs -n1 -P10 sh -c 'node calculate_station_profit.js';
