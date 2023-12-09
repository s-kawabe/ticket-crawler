import { chromium } from 'playwright';
import readline from 'readline';
import fs from 'fs';
import axios from 'axios';
import querystring from 'querystring';
import { validURL } from './utils.js';

const LINE_API_TOKEN = 'NcuPqEuEIUxrJTvLooSl70HO9noTG4QPMaFPWE740Jh';

const runCrawlPia = async (url: string, expectedTexts: string[]) => {
  console.log('---------------------------------');
  console.log('サイトを巡回します... 🐘');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  const element = await page.$('.item_result_wrapper ol:first-child');
  if (element) {
    try {
      console.log('チケットが見つかりました！ LINEに画像を送るゾウ🐘');
      await element.screenshot({ path: './script/assets/ticket.png' });

      await axios({
        method: 'post',
        url: 'https://notify-api.line.me/api/notify',
        headers: {
          Authorization: `Bearer ${LINE_API_TOKEN}`,
        },
        data: querystring.stringify({
          imageFile: '@script/assets/ticket.png',
          message: 'リセールで希望のチケットが出てるよ！🐘',
        }),
      });
    } catch (err) {
      console.error(err);
    }
  } else {
    console.log('チケットが見つかりませんでした... 🐘');
  }
  await browser.close();
};

(() => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`
    リセール巡回ぞうさん🐘 (beta) 
    
    ／￣￣￣￣￣￣＼
    |  ・  Ｕ      |
    | |ι           |つ  == 3
    Ｕ｜｜ ￣￣ ｜｜
       ￣        ￣
    ----------------------------------
  `);
  rl.question(
    'ぴあのリセールページのURLを入力してね！🐘（※公演日や人数を絞り込んだ後のURLがおすすめです） > ',
    async (url) => {
      if (!validURL(url)) {
        console.log('> URLの形式が不正だぱおん..🐘');
        rl.close();
        return;
      }

      rl.question(
        '探す対象の文字列を入力してね！複数指定する場合はカンマで区切ってください🐘（例: "1列", "1列,2列,3列"） > ',
        async (expectedText) => {
          console.log(url, expectedText);
          await runCrawlPia(url, expectedText.split(','));
          rl.close();
        },
      );
    },
  );
})();
