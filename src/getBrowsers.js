import browserslist from "browserslist";
/** @type {Record<string, {versions: Record<string, string>, releases: Record<string, string>}>} */
const aliases = {
  tizen: {
    versions: {
      6.5: "chrome 85",
      6: "chrome 76",
      5.5: "chrome 69",
      5: "chrome 63",
      4: "chrome 56",
      3: "chrome 47",
      2.4: "safari 7, chrome 27", // WebKit r152340
      2.3: "safari 7, chrome 27", // WebKit r152340
    },
    releases: {
      2022: "6.5",
      2021: "6",
      2020: "5.5",
      2019: "5",
      2018: "4",
      2017: "3",
      2016: "2.4",
      2015: "2.3",
    },
  },
  webos: {
    versions: {
      22: "chrome 87",
      6: "chrome 79",
      5: "chrome 68",
      4.5: "chrome 53",
      4: "chrome 53",
      3.5: "chrome 38",
      3: "chrome 38",
      2: "safari 7, chrome 27", // WebKit 538.2
      1: "safari 7, chrome 27", // WebKit 537.41
    },
    releases: {
      2022: "22",
      2021: "6",
      2020: "5",
      2019: "4.5",
      2018: "4",
      2017: "3.5",
      2016: "3",
      2015: "2",
      2014: "1",
    },
  },
};

/**
 * @param {string} target
 */
export default function getBrowsers(target) {
  /** @type {Array<import('browserslist').Query & {browser?: string, version?: string}>} */
  const parsed = browserslist.parse(target);
  let tv = false;
  for (let i = 0; i < parsed.length; i += 1) {
    const query = parsed[i];
    const browser = (query.browser ?? "").toLowerCase();
    if (browser === "tizen" || browser === "webos") {
      tv = true;
    }
  }

  if (!tv) {
    return browserslist(target);
  }
  return browserslist(
    parsed
      .map((query) => {
        if (query.compose !== "or" || query.type !== "browser_version") {
          throw new Error(
            `complex TV queries not (yet) supported: ${JSON.stringify(query)}`
          );
        }
        const browser = (query.browser ?? "").toLowerCase();
        let version = query.version ?? "";
        const browserAlias = aliases[browser];
        if (browserAlias) {
          const releaseAlias = browserAlias.releases[version];
          if (releaseAlias) {
            version = releaseAlias;
          }
          const versionAlias = browserAlias.versions[version];
          if (!versionAlias) {
            throw new Error(`${browser} version: ${version} unknown`);
          }
          return versionAlias;
        }
        return `${query.browser} ${query.version}`;
      })
      .join(", ")
  );
}
