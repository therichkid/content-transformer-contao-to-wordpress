# content-transformer-contao-to-wordpress

## Used libraries

| Project         | Status                                           |
| --------------- | ------------------------------------------------ |
| [csv-parser]    | [![csv-parser-status]][csv-parser-package]       |
| [csv-writer]    | [![csv-writer-status]][csv-writer-package]       |
| [sanitize-html] | [![sanitize-html-status]][sanitize-html-package] |

[csv-parser]: https://github.com/mafintosh/csv-parser
[csv-writer]: https://github.com/ryu1kn/csv-writer
[sanitize-html]: https://github.com/apostrophecms/sanitize-html
[csv-parser-status]: https://img.shields.io/npm/v/csv-parser.svg
[csv-writer-status]: https://img.shields.io/npm/v/csv-writer.svg
[sanitize-html-status]: https://img.shields.io/npm/v/sanitize-html.svg
[csv-parser-package]: https://www.npmjs.com/package/csv-parser
[csv-writer-package]: https://www.npmjs.com/package/csv-writer
[sanitize-html-package]: https://www.npmjs.com/package/sanitize-html

## Introduction

The purpose of this node script is to transform content (news and articles) from a Contao v3.x CMS, exported as .csv, so it then can easily be imported into WordPress by using one of the many CSV import plugins.

Contao (at least in v3.x) stores its content in a very unusual manner into the database. Each news and article creates a table row in the corresponding table (`tl_news, tl_article`) which holds information like `id, headline, author` (as ID) and a `teaser`. This I will refer to as **container**. The **content** for the container on the other hand is stored in another table, the `tl_content` table. This table contains then, as the name suggests, the content of the containers. Each container has multiple entries here (One-to-many relationship). The mapping is as following:

`content.pid === container.id && (content.ptable === [container table name] || null)`

The entries for each container are sorted by `content.sorting` ascending. In addition, the Contao and WordPress CMSes are using different time formats for storing their content.

This script's main purpose is to merge the content back to the container.

## What the script can do

- Transform **news**
- Transform **articles**
- Add categories based on the pages and news archive tables
- Remap categories
- Only keep content from whitelisted categories
- Add and remap authors
- Remove empty containers
- Create ready-to-use .csv files to be imported into WordPress via a plugin

## What the script can't do

- Media files can't be transformed that are attached to the content. Contao stores this information in a binary format that won't be exported correctly to .csv.

## Preparations

The script needs the following files from the Contao database in the **import** folder:

| File name             | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `tl_content.csv`      | Huge table that includes the content for all news and articles |
| `tl_news.csv`         | Container table for news                                       |
| `tl_article.csv`      | Container table for articles                                   |
| `tl_page.csv`         | Used to add the category to news and articles                  |
| `tl_news_archive.csv` | Used to add the category to news and articles                  |
| `tl_user.csv`         | Has information about the user names                           |

A database table export in .csv format can be done via phpMyAdmin.

**Important**: The first row needs to be the column names.

## User settings

Set the options in the beginning of the `content-transformer.js` file.

### Filter content by date:

- Set `useDateFilter` to true
- Set the options in `datefilter`:
  - `timeStamp`: Date in [Unix timestamp format](https://www.unixtimestamp.com/index.php) as Integer
  - `operator`: As String
    - `"<"`: Keep all content **older** than the timestamp
    - `">"`: Keep all content **newer** than the timestamp

### Sanitize content:

- Set `useSanitizer` to true.

What it does:

- Remove Contao tags in square brackets
- Use standard settings from `sanitize-html`
- Remove empty paragraphs

### Whitelist content:

- Set `useNewsWhitelist` or `useArticleWhitelist` to true
- Add categories as string to `newsWhitelist` or `articleWhitelist` array that should be whitelisted

### Remap categories:

- Modify `categoryRemap` map
- Key: old category name in Contao
- Value: new category name in WordPress

### Remap users

- Modify `userRemap` map
- Key: old user name in Contao
- Value: new user name in WordPress

## How to run

Needs `node` and `npm` to be installed.

`npm install`

`node content-transformer.js`

## Result

The script creates two files in the export folder:

- `articles.csv`
- `news.csv`

These files can then be imported into WordPress. Following WordPress plugins were tested successfully:

- [WP Ultimate CSV Importer](https://de.wordpress.org/plugins/wp-ultimate-csv-importer/)
