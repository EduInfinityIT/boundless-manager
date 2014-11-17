A toolkit for Boundless Translation Group
Still developing... More detailed README will be written when I tag v0.1.0

## INSTALL
Make sure that you have nodejs installed.
`npm install`

## USAGE

`node index.js [-c "Comment"] [-f folderId] filenames`

e.g:

`node index.js -c "这周大家辛苦啦~" -f 0B6UgJRpqqF3ZQ2NrNUozNUd5Tzg week_2/*.srt`

You can get the folderId from the url, for example if you have a google drive
folder with this url: https://drive.google.com/?ddrp=1#folders/0B47OYYGSTDn5cVNsVmdYNVJOb3M,
 then the folderId is `0B47OYYGSTDn5cVNsVmdYNVJOb3M`

## TBD

- handle errors & retry during uploading
- file transferring from google drive to Transifex
- metadata management
