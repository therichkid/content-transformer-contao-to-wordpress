# content-transformer-contao-to-wordpress

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
- Add `passWhitelistFilter` function in `transformer` after `addFields()` was called, like so:

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
