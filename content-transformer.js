const csvParser = require("csv-parser");
const fs = require("fs");
const sanitizeHtml = require("sanitize-html");

const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// USER SETTINGS START
const useDateFilter = true;
const dateFilter = {
  timeStamp: 1546300800, // In unix timestamp format: https://www.unixtimestamp.com/index.php
  operator: "<" // Allowed options: <>
};

const addEvents = false;
const useEventDateFilter = true;
const eventDateFilter = {
  timeStamp: 1577836800,
  operator: ">"
};

const useSanitizer = true;

const useNewsWhitelist = false;
const newsWhitelist = [];

const useArticleWhitelist = true;
const articleWhitelist = ["Erfahrungen", "Presse", "Gedichte", "Texte", "Videos"];

const categoryRemap = {
  "BayCIV :: Aktiv": "BayCIV",
  "BayCIV :: Nachrichten": "Netzwerk",
  Pressespiegel: "Presse",
  "SHG MuCIs": "MuCIs",
  "SHG Oberland": "CI-Gruppe Bayerisches Oberland",
  "SHG Campus Lauscher": "Campus Lauscher",
  "SHG OhrRing Bamberg": "SHG OhrRing",
  "CI Gruppe Würzburg": "CI-Gruppe Würzburg",
  "SHG Hören und Leben": "Hören und Leben",
  "SHG Münchner Hörkinder": "Münchner Hörkinder",
  "SHG Ganz Ohr München": "Ganz Ohr – Selbsthilfegruppe im Klinikum rechts der Isar"
};

const userRemap = {
  "Regine Zille": "reginez",
  "Andrea Grätz": "andreag",
  "Peter Muschalek": "peterm",
  "René Zille": "renez",
  "Olaf Dathe": "olafd",
  "Christa Stroehl": "christas"
};

const showStatistics = true;
// USER SETTINGS END

const defaultCsvWriterHeader = [
  { id: "title", title: "Title" },
  { id: "text", title: "Content" },
  { id: "teaser", title: "Excerpt" },
  { id: "date", title: "Date" },
  { id: "user", title: "Author" },
  { id: "category", title: "Category" }
];

const eventCsvWriterHeader = [
  { id: "title", title: "Title" },
  { id: "user", title: "Author" },
  { id: "startTime", title: "Start Time" },
  { id: "endTime", title: "End Time" },
  { id: "location", title: "Location" },
  { id: "category", title: "Category" }
];

const columnsToKeep = {
  content: {
    id: "int",
    pid: "int",
    sorting: "int",
    tstamp: "int",
    type: "string",
    text: "string",
    ptable: "string"
  },
  news: {
    id: "int",
    pid: "int",
    tstamp: "int",
    headline: "string",
    author: "int",
    date: "int",
    teaser: "string"
  },
  article: {
    id: "int",
    pid: "int",
    tstamp: "int",
    title: "string",
    teaser: "string",
    author: "int"
  },
  event: {
    id: "int",
    pid: "int",
    title: "string",
    author: "int",
    startTime: "int",
    endTime: "int",
    location: "string"
  }
};

const importCsv = type => {
  const arr = [];
  return new Promise(resolve => {
    fs.createReadStream(`import/tl_${type}.csv`)
      .pipe(csvParser())
      .on("data", row => {
        arr.push(row);
      })
      .on("end", () => {
        console.log("CSV file successfully processed");
        resolve(arr);
      });
  });
};

const importAllCsv = () => {
  return Promise.all([
    importCsv("content"),
    importCsv("news"),
    importCsv("article"),
    importCsv("news_archive"),
    importCsv("page"),
    importCsv("user"),
    addEvents ? importCsv("calendar_events") : [],
    addEvents ? importCsv("calendar") : []
  ]);
};

const modifyCsv = (arr, type) => {
  const newArr = [];
  for (const row of arr) {
    const stripped = {};
    // Skip content that is not text
    if (type === "content" && row.type !== "text") {
      continue;
    }
    // Skip unpublished containers
    if (type !== "content" && !parseInt(row.published, 10)) {
      continue;
    }
    for (const column in columnsToKeep[type]) {
      if (row[column]) {
        if (columnsToKeep[type][column] === "int") {
          stripped[column] = parseInt(row[column], 10);
        } else if (columnsToKeep[type][column] === "string") {
          stripped[column] = row[column].replace(/\r?\n|\r/g, "");
        }
      }
    }
    newArr.push(stripped);
  }
  return newArr;
};

const createCategoryMap = arr => {
  const map = {};
  for (const row of arr) {
    map[row.id] = row.title.replace(/&.+;\s*/g, "");
  }
  return map;
};

const createUserMap = arr => {
  const map = {};
  for (const row of arr) {
    map[row.id] = row.name;
  }
  return map;
};

const addContent = (containers, content, type) => {
  for (const container of containers) {
    const matchingTexts = [];
    for (const text of content) {
      if (text.pid === container.id && (!text.ptable || text.ptable === `tl_${type}`)) {
        matchingTexts.push(text);
        if (Math.abs(text.tstamp - container.tstamp) > 50000) {
          // console.log("Warning: Timestamp Mismatch!");
        }
      }
    }
    matchingTexts.sort((a, b) => a.sorting - b.sorting);
    for (const matchingText of matchingTexts) {
      if (!container.text) {
        container.text = "";
      }
      container.text += matchingText.text;
    }
  }
  // Remove empty containers & sanitize text and teaser
  for (let i = containers.length - 1; i >= 0; i--) {
    const container = containers[i];
    if (useDateFilter) {
      if (
        (dateFilter.operator === "<" && container.tstamp > dateFilter.timeStamp) ||
        (dateFilter.operator === ">" && container.tstamp < dateFilter.timeStamp)
      ) {
        containers.splice(i, 1);
        continue;
      }
    }
    if (useSanitizer) {
      container.text = sanitizeContent(container.text);
      container.teaser = sanitizeContent(container.teaser);
    }
    if (!container.text) {
      containers.splice(i, 1);
    }
  }
  return containers;
};

const sanitizeContent = text => {
  if (!text || text.toUpperCase() === "NULL") {
    return "";
  }
  // Remove Contao tags in square brackets
  text = text.replace(/\[nbsp\]/gm, "<br>").replace(/\[[^\]]*\]/gm, " ");
  text = sanitizeHtml(text, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h2"])
  });
  // Remove empty paragraphs
  text = text.replace(/<p>\s*<\/p>/gm, "");
  return text;
};

const convertTimeStamp = timeStamp => {
  const d = new Date(timeStamp * 1000);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")}/${d
    .getFullYear()
    .toString()
    .padStart(4, "0")} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
};

const addFields = (containers, categoryMap, userMap) => {
  for (const container of containers) {
    container.date = convertTimeStamp(container.tstamp);
    container.category = categoryMap[container.pid] || "";
    // Remap category
    if (categoryRemap[container.category]) {
      container.category = categoryRemap[container.category];
    }
    // User and remap user
    container.user = userRemap[userMap[container.author]] || userMap[container.author];
    if (container.headline) {
      container.title = container.headline;
      delete container.headline;
    }
  }
  return containers;
};

const passWhitelistFilter = (containers, whitelist) => {
  const whitelistedContainers = [];
  for (const container of containers) {
    if (whitelist.includes(container.category)) {
      // Add extra category for specific cases
      if (["Texte", "Gedichte"].includes(container.category)) {
        container.category += ", Erfahrungen";
      }
      whitelistedContainers.push(container);
    }
  }
  return whitelistedContainers;
};

const addEventFields = (events, categoryMap, userMap) => {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (useEventDateFilter) {
      if (
        (eventDateFilter.operator === "<" && event.startTime > eventDateFilter.timeStamp) ||
        (eventDateFilter.operator === ">" && event.startTime < eventDateFilter.timeStamp)
      ) {
        events.splice(i, 1);
        continue;
      }
    }
    event.startTime = convertTimeStamp(event.startTime);
    event.endTime = convertTimeStamp(event.endTime);
    event.category = categoryMap[event.pid] || "";
    // Remap category
    if (categoryRemap[event.category]) {
      event.category = categoryRemap[event.category];
    }
    // User and remap user
    event.user = userRemap[userMap[event.author]] || userMap[event.author];
  }
  return events;
};

const exportCsv = async (containers, fileName) => {
  const csvWriter = createCsvWriter({
    path: `export/${fileName}.csv`,
    header: fileName === "events" ? eventCsvWriterHeader : defaultCsvWriterHeader
  });
  csvWriter.writeRecords(containers).then(() => {
    console.log("CSV file successfully created");
  });
};

const addUserStatistics = arrs => {
  const map = {};
  for (const containers of arrs) {
    for (const container of containers) {
      if (container.user) {
        if (!map[container.user]) {
          map[container.user] = 0;
        }
        map[container.user]++;
      }
    }
  }
  return map;
};

const transformer = async () => {
  const [
    rawContent,
    rawNews,
    rawArticles,
    rawNewsArchive,
    rawPages,
    rawUsers,
    rawEvents,
    rawCalendar
  ] = await importAllCsv();
  const content = modifyCsv(rawContent, "content");
  let news = modifyCsv(rawNews, "news");
  let articles = modifyCsv(rawArticles, "article");
  const newsCategoryMap = createCategoryMap(rawNewsArchive);
  const pageCategoryMap = createCategoryMap(rawPages);
  const userMap = createUserMap(rawUsers);
  news = addContent(news, content, "news");
  articles = addContent(articles, content, "article");
  news = addFields(news, newsCategoryMap, userMap);
  articles = addFields(articles, pageCategoryMap, userMap);
  if (useNewsWhitelist) {
    news = passWhitelistFilter(news, newsWhitelist);
  }
  if (useArticleWhitelist) {
    articles = passWhitelistFilter(articles, articleWhitelist);
  }
  if (showStatistics) {
    const userStatistics = addUserStatistics([news, articles]);
    console.log(
      `Containers before Remove: # of News ${rawNews.length}, # of Articles ${rawArticles.length}`
    );
    console.log(
      `Containers after Remove: # of News ${news.length}, # of Articles ${articles.length}.`
    );
    console.log("User Statistics", userStatistics);
  }
  await exportCsv(news, "news");
  await exportCsv(articles, "articles");
  if (addEvents) {
    let events = modifyCsv(rawEvents, "event");
    const eventCategoryMap = createCategoryMap(rawCalendar);
    events = addEventFields(events, eventCategoryMap, userMap);
    await exportCsv(events, "events");
  }
};

transformer();
