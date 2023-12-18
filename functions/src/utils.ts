import * as logger from 'firebase-functions/logger';
export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const validURL = (url: string) => {
  const pattern = new RegExp(
    // https://cloak.pia.jp/
    '^(https?:\\/\\/)?' +
      '(cloak\\.pia\\.jp)' +
      '(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' +
      '(\\?[;&a-zA-Z\\d%_.~+=-]*)?' +
      '(\\#[-a-zA-Z\\d_]*)?$',
    'i',
  );
  return !!pattern.test(url);
};

export const dumpExecuteLog = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const time = `${mm}/${dd} ${hh}:${min}:${ss}`;

  logger.info(`${time} => クローリングを実行します 🐘`);
};
