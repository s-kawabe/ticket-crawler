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
