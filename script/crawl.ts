import { chromium, type Browser, type Locator, type Page } from 'playwright';
import readline from 'readline';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { validURL } from './utils.js';

const LINE_API_TOKEN = 'NcuPqEuEIUxrJTvLooSl70HO9noTG4QPMaFPWE740Jh';

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
    for (const text of expectedTexts) {
      const stringTextbox = await textbox.innerHTML();
      if (stringTextbox.includes('２階') && stringTextbox.includes(text)) {
        try {
          console.log('チケットが見つかりました！ LINEに画像を送るゾウ🐘');
          await element.screenshot({ path: './script/assets/ticket.png' });
          await element.click();
          const form = new FormData();
          form.append('imageFile', fs.createReadStream('script/assets/ticket.png'));
          form.append('message', `リセールで希望のチケットが出てるよ！🐘\n${page.url()}`);
          await axios({
            method: 'post',
            url: 'https://notify-api.line.me/api/notify',
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${LINE_API_TOKEN}`,
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

const runCrawlPia = async (url: string, expectedTexts: string[]) => {
  console.log('---------------------------------');
  console.log('サイトを巡回してくるゾウ〜 🐘');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);

  while (true) {
    const elements = page.locator('.item_result_wrapper ol');
    const result = await loopCheckTicketCards({ elements, browser, page, expectedTexts });
    if (result) {
      await browser.close();
      return;
    }

    const nextPage = page.locator('.pager_arr_last');
    const hasNextPage = (await nextPage.count()) !== 0;
    if (hasNextPage) {
      await nextPage.click();
    } else {
      console.log('チケットが見つかりませんでした... 🐘');
      await browser.close();
      return;
    }
  }
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

      await runCrawlPia(url, ['３０扉']);
    },
  );
})();
