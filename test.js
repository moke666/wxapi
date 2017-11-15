//填入自己的appid
var appId='xxxxxxxxxxxxxxxxxxx';

//填入自己的appSecret
var appSecret='ssssssssssssssssssssssssssssssssss';

const wxapi=require('./index')(appId,appSecret);

(async ()=> {
    /** */
    var access = await wxapi.getAccessToken();
    console.log(`access-token:${access}`);
    /** */
    var jstoken = await wxapi.getJsapiTicket();
    console.log(`js-token:${jstoken}`);

    var signature = await wxapi.createSignature('www.moke.com');
    console.log(`signature:${JSON.stringify(signature) }`);

    var authUrl = wxapi.createAuthUrl('www.moke.com')
    console.log(`authUrl:${authUrl}`);
})();

