// state.js
// G global state
'use strict';

//全局变量
var GameState = {
    id: undefined,
    state: undefined,
    room: {
        type: undefined,
        path: undefined,
        name: undefined
    },
    items: new Map(),
    events: [],
    status: new Map(),
    score: {},
    relation:{
        team: null,
        follower: null,
        party: undefined,
    },
    skills: {
        enable_skills: {
            "unarmed": {name:null,id:null},
            "force": {name:null,id:null},
            "parry": {name:null,id:null},
            "dodge": {name:null,id:null},
            "sword": {name:null,id:null},
            "throwing": {name:null,id:null},
            "blade": {name:null,id:null},
            "whip": {name:null,id:null},
            "club": {name:null,id:null},
            "staff": {name:null,id:null},
            },
        perform:null,
        items: null,
        limit: undefined,
        sk_group: undefined,
        books:null
    },
    store:{
        max_store_count: undefined,
        sum: undefined,
        stores: []
    },
    packs:{
        items:[],
        eqs: [],
        eq_group: undefined,
        max_item_count: undefined,
        money: undefined
    },
    yaota:{
        yaoyuan: 0,
        Flag: false,
        Count: 0,
    },
    wsdelay: {
        delay:undefined,
        SetTime: undefined,
        SetCount: undefined
    },
    selfStatus: [],
    fight:{
        in_fight: false,
        fight_id: ""
    },
    cookie: undefined,
    connected: false
};
