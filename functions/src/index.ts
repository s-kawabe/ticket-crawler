import { chromium, type Browser, type Locator, type Page } from 'playwright-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';

import { dumpExecuteLog } from './utils.js';

// see: https://stackoverflow.com/questions/76434349/firebase-cloud-functions-v2-error-when-deploying
setGlobalOptions({ maxInstances: 10 });

const tempDir = os.tmpdir();

/**
 * 一つのチケットに対して、それが希望するチケットであるかチェックする
 */
const loopCheckTicketCards = async ({
  elements,
  browser,
  page,
  expectedTexts,
}: {
  elements: Locator;
  browser: Browser;
  page: Page;
  expectedTexts: string[];
}): Promise<boolean> => {
  if ((await elements.count()) === 0) {
    return false;
  }

  for (let i = 0; i < (await elements.count()); i++) {
    const element = elements.nth(i);
    const textbox = element.locator('.item_result_box .item_result_box_msg');
    // 期待する席の名前が、チケットの文字列の中に入っているかどうか
    for (const text of expectedTexts) {
      const stringTextbox = await textbox.innerHTML();
      if (stringTextbox.includes('2Fｱﾘｰﾅ') && stringTextbox.includes(text)) {
        try {
          console.log('チケットが見つかりました！ LINEに画像を送るゾウ🐘');
          await element.screenshot({ path: './assets/ticket.png' });
          await element.click();
          const form = new FormData();
          const localPath = path.join(tempDir, 'ticket.png');
          form.append('imageFile', fs.createReadStream(localPath));
          form.append('message', `\nリセールで希望のチケットが出てるよ！🐘\n${page.url()}`);
          await axios({
            method: 'post',
            url: 'https://notify-api.line.me/api/notify',
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${process.env.LINE_API_TOKEN}`,
            },
            data: form,
          });

          await browser.close();
          return true;
        } catch (err) {
          console.error(err);
          return false;
        }
      }
    }
  }
  return false;
};

/**
 * 希望する席の種類の条件にもとづいて、一回サイト全体（ページネーション含む）をクローリングする
 * @param expectedTexts 希望する席の種類
 */
const runCrawlPia = async (url: string, expectedTexts: string[]) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, {
    waitUntil: 'load',
  });

  while (true) {
    const elements = page.locator('.item_result_wrapper ol');
    await loopCheckTicketCards({ elements, browser, page, expectedTexts });

    await page.waitForTimeout(1000);

    const nextPage = page.locator('.pager_arr_last a');
    const hasNextPage = (await nextPage.count()) !== 0;
    if (hasNextPage) {
      await nextPage.click();
    } else {
      console.log(`${expectedTexts.join('|')} のチケットが見つかりませんでした... 🐘`);
      await browser.close();
      return;
    }
  }
};

/**
 * ぴあのリセールページのURL (あらかじめ絞り込みを行った後の、クエリパラメータが色々追加された状態のもの)
 */
const CLOAK_RESALE_URL =
  'https://cloak.pia.jp/resale/item/list?areaCd=&prefectureCd=&hideprefectures=01&perfFromDate=2023%2F12%2F22&perfToDate=2023%2F12%2F22&numSht=2&priceFrom=&priceTo=&eventCd=&perfCd=&rlsCd=&lotRlsCd=52359%2C53668%2C64585&eventPerfCdList=&stkStkndCd=&stkCliCd=&invalidCondition=27981843%2C60701680%2C76910770&preAreaCd=&prePrefectureCd=&totalCount=83&beforeSearchCondition=%7B"event_cd"%3A""%2C"event_perf_cd_list"%3A""%2C"perf_cd"%3A""%2C"rls_cd"%3A""%2C"lot_rls_cd"%3A"52359%2C53668%2C64585"%2C"stk_stknd_cd"%3A""%2C"stk_cli_cd"%3A""%2C"invalid_condition"%3A"27981843%2C60701680%2C76910770"%2C"perf_from_date"%3A"2023%2F12%2F19"%2C"perf_to_date"%3A"2023%2F12%2F19"%2C"num_sht"%3A"2"%2C"price_from"%3A""%2C"price_to"%3A""%2C"sort_condition"%3A"entry_date_time%2Cdesc"%2C"page"%3A1%7D&ma_token=96r4j5mxIQ6JnHd&sortCondition=entry_date_time%2Cdesc';

/**
 * スケジュール実行されるメイン関数
 */
export const scheduledCrawlFunc = onSchedule('every 5 minutes', async (event) => {
  dumpExecuteLog();

  console.time('crawl time');
  await runCrawlPia(CLOAK_RESALE_URL, ['XAﾌﾞﾛｯｸ', 'XBﾌﾞﾛｯｸ', 'XCﾌﾞﾛｯｸ']);
  await runCrawlPia(CLOAK_RESALE_URL, ['Aﾌﾞﾛｯｸ', 'Bﾌﾞﾛｯｸ', 'Cﾌﾞﾛｯｸ']);
  console.timeEnd('crawl time');
});
