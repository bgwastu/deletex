# DeleteX

A web application that allows you to delete content on X (formerly known as Twiter) without having to log in or giving any third-party app access to your account.

See it in action at [deletex.wastu.net](https://deletex.wastu.net).

## Features

* Delete all type of content on X (post, repost, and comments)
* Powerful filtering options (date range, content type, min/max likes, min/max reposts, etc.)
* Full-text search

## How it works

DeleteX uses your X archive data to generate a userscript that you can run in your browser to delete your tweets. The script will run in your browser and will only delete the tweets you selected.

## Privacy

DeleteX uses [PGLite](https://pglite.dev) as local storage to store your X archive data and the generated userscript. This means that your data is processed locally and never leaves your device.