files = require './files'
folders = require './folders'

module.exports =

    'fileid':
        param: files.fetch

    'files':
        get: files.all
        post: files.create
    'files/:fileid':
        get: files.find
        patch: files.modify
        delete: files.destroy
    'files/:fileid/attach/:name':
        get: files.getAttachment
    'files/:fileid/download/:name':
        get: files.downloadAttachment

    # public access to the file
    'public/file:fileid':
        get: files.downloadAttachment
    'fileshare/:fileid':
        get: files.getPublicLink
    'fileshare/:fileid/send':
        post: files.sendPublicLinks

    'folders':
        post: folders.create
    'folders/:id':
        get: folders.find
        patch: folders.modify
        delete: folders.destroy
    'folders/:id/zip/:name':
        get: folders.zip

    'folders/files':
        post: folders.findFiles
    'folders/folders':
        post: folders.findFolders

    'search/folders':
        post: folders.search
    'search/files':
        post: files.search
