---
{"title": "The File Module's listFiles fails whole on one missing key", "modules": ["cms"], "areas": ["backend"], "topics": ["files", "media"]}
---

# The File Module's listFiles fails whole on one missing key

`listFiles({ id })` does not list stored files. It refuses a call without `id`, then asks the file
provider for a download URL of each key in turn and answers `{ id, url }` for each
(`@medusajs/file` 2.22.7 `dist/services/file-module-service.js`, `listFiles`). `retrieveFile` does the
same for one key.

What a missing key does depends on the file provider. The local provider checks the file and throws
`NOT_FOUND` (`@medusajs/file-local` 2.22.7 `dist/services/local-file.js`, `getPresignedDownloadUrl`),
so one missing key rejects the whole `listFiles` call and none of the other files come back. S3 only
signs the key and never checks it (`@medusajs/file-s3` 2.22.7 `dist/services/s3-file.js:226-235`), so
a missing key comes back with a URL that answers 404, valid for `download_file_duration`.

So reading several stored keys through `listFiles` breaks a whole read locally as soon as one file is
gone, and on S3 a missing file cannot be told apart from a present one. Read each key with
`retrieveFile`, leave out a `NOT_FOUND`, and do not count on the File Module to say a file is gone.
`FileMediaProvider.retrieve` does this.
