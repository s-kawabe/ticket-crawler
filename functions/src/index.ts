import { chromium, type Browser, type Locator, type Page } from 'playwright';
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
  'https://cloak.pia.jp/resale/item/list?areaCd=&prefectureCd=&hideprefectures=01&perfFromDate=2023%2F12%2F22&perfToDate=&numSht=2&priceFrom=&priceTo=&eventCd=2326012%2C2326013%2C2326014%2C2326015%2C2326016%2C2323152%2C2330550%2C2330540%2C2330743%2C2330491%2C2330492%2C2330493%2C2330708%2C2330536%2C2330586%2C2330856%2C2332972%2C2332973&perfCd=&rlsCd=&lotRlsCd=&eventPerfCdList=&stkStkndCd=&stkCliCd=&invalidCondition=&preAreaCd=&prePrefectureCd=&totalCount=11&beforeSearchCondition=%7B%22event_cd%22%3A%222326012%2C2326013%2C2326014%2C2326015%2C2326016%2C2323152%2C2330550%2C2330540%2C2330743%2C2330491%2C2330492%2C2330493%2C2330708%2C2330536%2C2330586%2C2330856%2C2332972%2C2332973%22%2C%22event_perf_cd_list%22%3A%22%22%2C%22perf_cd%22%3A%22%22%2C%22rls_cd%22%3A%22%22%2C%22lot_rls_cd%22%3A%22%22%2C%22stk_stknd_cd%22%3A%22%22%2C%22stk_cli_cd%22%3A%22%22%2C%22invalid_condition%22%3A%22%22%2C%22area_cd%22%3A%22%22%2C%22prefecture_cd%22%3A%22%22%2C%22perf_from_date%22%3A%222023%2F12%2F22%22%2C%22perf_to_date%22%3A%22%22%2C%22num_sht%22%3A%22%22%2C%22price_from%22%3A%22%22%2C%22price_to%22%3A%22%22%2C%22sort_condition%22%3A%22entry_date_time%2Cdesc%22%2C%22page%22%3A1%7D&ma_token=96r4j5mxIQ6JnHd&sortCondition=entry_date_time%2Cdesc#';

/**
 * スケジュール実行されるメイン関数
 */
export const scheduledCrawlFunc = onSchedule('every 5 minutes', async (event) => {
  dumpExecuteLog();

  await runCrawlPia(CLOAK_RESALE_URL, ['XAﾌﾞﾛｯｸ', 'XBﾌﾞﾛｯｸ', 'XCﾌﾞﾛｯｸ']);
  await runCrawlPia(CLOAK_RESALE_URL, ['Aﾌﾞﾛｯｸ', 'Bﾌﾞﾛｯｸ', 'Cﾌﾞﾛｯｸ']);
});
