# DeleteX

DeleteX is a local-first web application for reviewing an X archive, filtering posts, and generating an experimental browser script for selected deletions.

See it at [deletex.wastu.net](https://deletex.wastu.net).

## Features

- Import `tweets.js` from an X archive
- Search and filter posts, reposts, and replies
- Keep selected posts while searching and filtering
- Confirm selected posts in a guided deletion workflow
- English and Bahasa Indonesia interface
- Local IndexedDB storage with complete browser-data removal

## Privacy

Archive content is parsed and stored in IndexedDB in the user's browser. DeleteX does not upload archive content and includes no analytics SDK.

## Deletion Notice

The generated browser script uses X's internal web operations and is experimental. X prohibits non-API website automation, may change these operations without notice, and may restrict accounts that use them. Deleted posts cannot be recovered.

For a supported integration, use X OAuth and the official Delete Post API.
