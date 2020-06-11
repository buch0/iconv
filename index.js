const util = require('./util.js');
const fs = require('fs');
const url = require('url');
const path = require('path');
const puppeteer = require('puppeteer');

const sleep = ms => new Promise((r, j) => setTimeout(r, ms));

(async() => {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36';

  const videoConverter = async (ytObj) => {
    let response = null;

    let getHeaders = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate',
    };

    let postHeaders = {
      'User-Agent': userAgent,
      'Content-Type': 'application/json; charset=UTF-8',
      'Content-Length': 0,
      'Accept-Encoding': 'gzip, deflate',
    };

    let audioUrl = ytObj.audio_url
    let videoUrl = ytObj.video_url


    let postData = `aaa`;
    postHeaders['Content-Length'] = postData.length;
    
    const fileDate = new Date().toLocaleString().replace(/\x2f/g, '.').replace(/\x3a/g, '-');

    {
      response = await util.request({
        url:  audioUrl,
        method: 'GET',
        headers: getHeaders,
        data: '',
        encoding: null
      });
  
  
      fs.appendFileSync(`./audio/${fileDate}.webm`, response.body, 'binary');
    }

    console.log('bp 1');

    for(let i = 0; i < 0xdeadbeef; i++) {
      getHeaders['Range'] = `bytes=${i}-${i+0xFFFFF}`;
      response = await util.request({
        url: videoUrl,
        method: 'GET',
        headers: getHeaders,
        data: '',
      });

      if(response.body.length < 100)
        break;

      fs.appendFileSync(`./videos/${fileDate}.webm`, response.body, 'binary');

      i += 0xFFFFF;
    }
    console.log('bp 2');

    const spawn = require('child_process').spawn;

    const cmd  = 'F:\\Softwares\\ffmpeg-20200604-7f81785-win64-static\\bin\\ffmpeg.exe';
    const args = [
      '-y', 
      '-i', `./videos/${fileDate}.webm`,
      '-i', `./audio/${fileDate}.webm`,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-strict', 'experimental', 
      `./outputs/${fileDate}.mp4`
    ];

    const proc = spawn(cmd, args);
  };
  const videoCollector = async (options = {}, copData ,browser, page) => {
    let result;

    if(true) { 
      let videoCookies;
      
      await page.goto(copData.video_url + copData.video_id, {waitUntil: 'domcontentloaded'});

      result = await page.evaluate(() => {
        const sleep = ms => new Promise((r, j) => setTimeout(r, ms));

        let audio_url = '';
        let video_url = '';

        let xx = 0;
        return (async() => {
            // hooking utility
            const hooking = {
              hook: function(baseClass, target, addition) {
                if(baseClass !== null && typeof baseClass == 'function') {
                  if (baseClass.prototype[target]) baseClass = baseClass.prototype;
                  else if (!baseClass[target]) throw new Error('no hook destination');
                  const origin = baseClass[target];
                  baseClass[target] = function() {
                      arguments[arguments.length] = origin;
                      arguments.length++;
                      return addition.apply(this, arguments);
                  };
                } else {
                  baseClass = null;
                  const origin = target;
                  target = function() {
                      arguments[arguments.length] = origin;
                      arguments.length++;
                      return addition.apply(this, arguments);
                  };
                }
              }
            };

            // set to max quality
            (async () => { var elem_settings_button = document.querySelector('.ytp-settings-button').click(); var elem_quality_menu = document.querySelectorAll('.ytp-panel > div > .ytp-menuitem'); elem_quality_menu = elem_quality_menu[elem_quality_menu.length - 1]; elem_quality_menu.click(); for(;;) {  var elem_quality_menu = document.querySelector('.ytp-quality-menu'); if(elem_quality_menu != null) { var elem_menu_item = elem_quality_menu.querySelectorAll('.ytp-menuitem')[0]; elem_menu_item.click(); } await sleep(1000); }})();
            (async () => { var elem_settings_button = document.querySelector('.ytp-settings-button').click(); var elem_quality_menu = document.querySelectorAll('.ytp-panel > div > .ytp-menuitem'); elem_quality_menu = elem_quality_menu[elem_quality_menu.length - 2]; elem_quality_menu.click(); for(;;) {  var elem_quality_menu = document.querySelector('.ytp-quality-menu'); if(elem_quality_menu != null) { var elem_menu_item = elem_quality_menu.querySelectorAll('.ytp-menuitem')[0]; elem_menu_item.click(); } await sleep(1000); }})();



            // grabbing video download urls
            hooking.hook(window.XMLHttpRequest, 'open', function () {
              console.log('%cstart hooking', 'color: green');

              console.log(arguments);
              const origin = arguments[arguments.length - 1];
              origin.apply(this, arguments);
 
              const url = decodeURIComponent(arguments[1]);
              if(url.includes('googlevideo.com')) {
                if(url.includes('video/')) {
                  if(xx > 2) {
                    let u = new URLSearchParams(url);
                    u.set('range', '0-'); u.set('rbuf', '0');
                  
  
                    video_url = decodeURIComponent(u.toString());
                  }

                    xx++;
                } else if(url.includes('audio/')) {
                  let u = new URLSearchParams(url);
                  u.set('range', '0-'); u.set('rbuf', '0');
                 
                  audio_url = decodeURIComponent(u.toString());
                }
              }

              console.log('%cend hooking', 'color: green');
            });

          let time = Date.now();

          for(;;) {
            if(audio_url != '' && video_url != '')
              break;
              
            await sleep(10);
          }
          return { audio_url: audio_url, video_url: video_url };
        })();
      });


      console.log(result);

      videoConverter(result);

      await browser.close();
    } else {
      
    }
  };

  const main = async() => {

    if(process.argv.length != 3)
      return;

    const copCount = 1;
    const copData = {
      video_url: 'https://www.youtube.com/watch?v=',
      video_id: process.argv[2]
    };

    await Promise.all(new Array(copCount).fill(1).map(async (v, i) => {
      let browser = await puppeteer.launch({ headless: true });
      let page = await browser.newPage();

      await page.setUserAgent(userAgent);
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      });

      if(true) {
        // なるべくロードを早くさせる
        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
          const reqUrl = url.parse(interceptedRequest.url())
          const reqExt = path.extname(reqUrl.pathname)
          const reqHost = reqUrl.hostname
          // resources from 3rd party domains
          if (reqHost === 'ignoreMe') {
            interceptedRequest.abort();
          // exclude unnecessary resources
          } else if (reqExt === '.jpg' || reqExt === '.png' || reqExt === '.gif' || reqExt === '.css') {
            interceptedRequest.abort();
          } else {
            interceptedRequest.continue();
          }
        });

        // なるべくロードを早くさせる
        await page.evaluateOnNewDocument(() => {
          const sleep = ms => new Promise((r, j) => setTimeout(r, ms));
          window.setInterval = () => {};
        
          (async() => {
            while(true) {
              if(document.documentElement !== null) {

                document.documentElement.setAttribute('style', 'display: none');
                break;
              }
              await sleep(1);
            }
            while(true) {
              if(document.body !== null) {
              
                break;
              }
              await sleep(1);
            }
          })();
        });
      }

      await videoCollector(null, copData, browser, page);
    }));
  };

  await main();
})();