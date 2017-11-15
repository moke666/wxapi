const querystring=require('querystring')

const https=require('https')

var wxConfig={};

/**
 * 缓存accessToken
 */
var accessToken={
    token:'',
    expireTime:null,
    expiresIn:0
}

/**
 * 缓存的jsapi_ticket对象
 */
var jsapi={
    ticket:'',
    expireTime:null,
    expiresIn:0
}

/**
 * 获取jsapi_ticket地址
 */
var jsapi_ticket_url='https://api.weixin.qq.com/cgi-bin/ticket/getticket';

/**
 * 获取access_token
 */
var access_token_url='https://api.weixin.qq.com/cgi-bin/token';

/**
 * 对https请求的封装
 * @param {String} url 
 */
var request = function (url) {
    return new Promise((resole, reject) => {
        var req =https.request(url, function (res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                resole(chunk);
            });
        });
        req.on('error', function (e) {
            reject(e);
        });
        req.end();
    });
}

/**
 * 从微信从新获取token
 */
var refreshAccessToken=async function(){
    var param={
        grant_type:'client_credential',
        appid:wxConfig.appid,
        secret:wxConfig.appSecret
    };
    
    var qs= querystring.stringify(param);
    
    var url=access_token_url+'?'+qs;
    var result=JSON.parse( await request(url));
    if(result.access_token){
        accessToken.token =result.access_token;
        accessToken.expiresIn=result.expires_in*1;
        accessToken.expireTime=Date.now()+result.expires_in*1000;
    }else{
        throw new Error(JSON.stringify(result)) ;
        //console.error(`获取微信access_token错误：${JSON.stringify(result)}`)
    }
}

/**
 * 从微信从新获取ticket
 */
var refreshJsapiTicket=async function () {
    var qs=querystring.stringify({
        access_token:await getAccessToken(),
        type:'jsapi'
    });
    var result= JSON.parse(await request(jsapi_ticket_url+'?'+qs)); 
    if(result.errcode==0){
        jsapi.ticket=result.ticket;
        jsapi.expiresIn=result.expires_in;
        jsapi.expireTime=Date.now()+jsapi.expiresIn*1000;
    }else{
        throw new Error(JSON.stringify(result));
    }
}
/**
 * 获取初始沪
 */
var getAccessToken = async function () {
    var now = Date.now();
    if (!accessToken.token || accessToken.expireTime <= now) {
        await refreshAccessToken();
    }
    return accessToken.token;
}

/**
 * 获取jsapi_ticket已缓存
 */
var getJsapiTicket=async function(){
    var now = Date.now();
    if (!jsapi.ticket || jsapi.expireTime <= now) {
        await refreshJsapiTicket();
    }
    return jsapi.ticket;
}

/**
 * 生成签名,url未当前调用页面的完整地址
 */
var createSignature=async function(url){
    var sha1=require('crypto').createHash('sha1');
    var noncestr=getString();

    var param={
        url,
        jsapi_ticket:await getJsapiTicket(),
        noncestr,
        timestamp:Math.ceil(Date.now()/1000) ,
    } 
    var str=stringify(param);

    var signature= sha1.update(str).digest('hex');
    param.signature=signature;
    param.appid=wxConfig.appid;
    return param;
}

/**
 * 拼接参数
 * @param {*} object 
 */
var stringify=function(param){
    var keys = Object.keys(param);
    
    //将keys按ascii由小到大排序，然后拼接成参数字符串
    var str = keys.sort().map(key => {
        return `${key}=${param[key]}`;
    }).join('&');

    return str;
}

/**
 * 生成随机字符串
 */
var getString=function(len=0){
    var res= Math.random().toString().replace('0.','');
    return res; 
}


/**
 * 获取微信openid;scope为true时未非静默方式获取openid.
 */
var createAuthUrl= function (redirectUri,scope=false,state=1) {
    var _scope= 'snsapi_base';
    if(scope){
        _scope='snsapi_userinfo';
    }
    var appId = wxConfig.appid;
    //var redirect_uri = `http://${config.appHost}` + ctx.url;
    var authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${_scope}&state=${state}#wechat_redirect`;
    return authUrl;
}

/**
 * 微信返回code，用于获取openId
 * @param {String} code 
 */
var getOpenId = async (code) => {
    var data = {
        appid: wxConfig.appid,
        secret: wxConfig.appSecret,
        code: code,
        grant_type: 'authorization_code'
    };//这是需要提交的数据  
    var content = stringify(data);
    var url = 'https://api.weixin.qq.com/sns/oauth2/access_token?' + content;
    var res = await request(url);
    return JSON.parse(res);
}

module.exports=(appId,appSecret)=>{
    wxConfig.appid=appId;
    wxConfig.appSecret=appSecret;
    return {
        getAccessToken,
        getJsapiTicket,
        createSignature,
        /**生成 auth2.0授权url */
        createAuthUrl,
        getOpenId,
    }
}

