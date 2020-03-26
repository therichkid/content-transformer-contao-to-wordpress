# content-transformer-contao-to-wordpress

## Introduction

The purpose of this node script is to transform content (news and articles) from a Contao v3.x CMS, exported as .csv, so it then can easily be imported into WordPress by using one of the many CSV import plugins.

Contao (at least in v3.x) stores it's content in a very unusual manner into the database. Each news and article creates a table row in the corresponding table (`tl_news`, ...) which holds information like `id, headline, author` (as ID) and a `teaser`. This I will refer to as **container**. The **content** on the other hand is stored in another table, the `tl_content` table. This table contains then, as the name suggests, the content of the container. Each container has multiple entries here (One-to-many relationship). The mapping is as following:

`content.pid === container.id && content.ptable === [container table name] || null`

The entries for each container are sorted by `content.sorting` ascending. In addition, the Contao and WordPress CMSes are using different time formats for storing their content.

This script is doing all of that automatically.

## What the script can do

- Transform **News**
- Transform **Articles**
- Add Categories based on the Pages and News Archive tables
- Remap Categories
- Only keep content from whitelisted Categories
- Add and remap Authors
- Remove empty containers
- Create ready-to-use .csv files to be imported into WordPress via a Plugin

## What the script can't do

- Media files can't be transformed that are attached to the content. Contao stores this information in a binary format that won't be parsed correctly when using .csv.

## Preparations

The script needs the following files from the Contao database in the **import** folder:

- `tl_content.csv`
- `tl_news.csv`
- `tl_article.csv`
- `tl_page.csv`
- `tl_news_archive.csv`
- `tl_user.csv`

A database table export in .csv format can be done via phpMyAdmin.

**Important**: The first row needs to be the column names.

## How to run

Needs `node` and `npm` to be installed.

`npm install`

`node content-transformer.js`

### Remap categories:

- Modify `categoryRemap` map
- Key: old category name in Contao
- Value: new category name in WordPress

### Whitelist content:

- Create array of categories that should be whitelisted (e.g. `articleWhitelist`)
- Add `passWhitelistFilter` function in `transformer` after the `addFields()` was called, like so:
```javascript
const transformer = async () => {
  ...
  articles = addFields(...);
  articles = passWhitelistFilter(articles, articleWhitelist);
  ...
}
```

### Remap users

- Modify `userRemap` map
- Key: old user name in Contao
- Value: new user name in WordPress

## Result

The script creates two files in the export folder:

- `articles.csv`
- `news.csv`

These files can then be imported into WordPress. Following WordPress plugins were tested successfully:

- [WP All Import](https://wordpress.org/plugins/wp-all-import/)
- [WP Ultimate CSV Importer](https://de.wordpress.org/plugins/wp-ultimate-csv-importer/)