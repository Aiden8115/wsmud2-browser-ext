// 全局类型声明 - 为浏览器扩展提供全局变量类型

declare var $: any;
declare var jQuery: any;
declare var console: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
};
declare var window: any;
declare var document: any;
declare var setTimeout: (callback: Function, delay?: number) => number;
declare var clearTimeout: (id: number) => void;
declare var setInterval: (callback: Function, delay?: number) => number;
declare var clearInterval: (id: number) => void;
declare var localStorage: any;
declare var sessionStorage: any;
declare var Blob: any;
declare var URL: any;
declare var Date: any;
declare var Map: any;
declare var Set: any;
