// Generated by CoffeeScript 1.7.1
var File, Folder, async, fs, getFileClass, log, moment, pathHelpers, processAttachement, sharing, updateParentModifDate;

fs = require('fs');

async = require('async');

moment = require('moment');

File = require('../models/file');

Folder = require('../models/folder');

sharing = require('../helpers/sharing');

pathHelpers = require('../helpers/path');

log = require('printit')({
  prefix: 'files'
});

processAttachement = function(req, res, next, download) {
  var contentHeader, file, id, stream;
  id = req.params.id;
  file = req.file;
  if (download) {
    contentHeader = "attachment; filename=" + file.name;
  } else {
    contentHeader = "inline";
  }
  res.setHeader('Content-Disposition', contentHeader);
  stream = file.getBinary("file", (function(_this) {
    return function(err, resp, body) {
      if (err) {
        return next(err);
      }
    };
  })(this));
  return stream.pipe(res);
};

updateParentModifDate = function(file, callback) {
  return Folder.byFullPath({
    key: file.path
  }, (function(_this) {
    return function(err, parents) {
      var parent;
      if (err) {
        return callback(err);
      } else if (parents.length > 0) {
        parent = parents[0];
        parent.lastModification = moment().toISOString();
        return parent.save(callback);
      } else {
        return callback();
      }
    };
  })(this));
};

getFileClass = function(file) {
  var fileClass;
  switch (file.type.split('/')[0]) {
    case 'image':
      fileClass = "image";
      break;
    case 'application':
      fileClass = "document";
      break;
    case 'text':
      fileClass = "document";
      break;
    case 'audio':
      fileClass = "music";
      break;
    case 'video':
      fileClass = "video";
      break;
    default:
      fileClass = "file";
  }
  return fileClass;
};

module.exports.fetch = function(req, res, next, id) {
  return File.request('all', {
    key: id
  }, function(err, file) {
    if (err || !file || file.length === 0) {
      if (err) {
        return next(err);
      } else {
        return res.send({
          error: true,
          msg: 'File not found'
        }, 404);
      }
    } else {
      req.file = file[0];
      return next();
    }
  });
};

module.exports.find = function(req, res) {
  return res.send(req.file);
};

module.exports.all = function(req, res, next) {
  return File.all(function(err, files) {
    if (err) {
      return next(err);
    } else {
      return res.send(files);
    }
  });
};

module.exports.create = function(req, res, next) {
  var fullPath;
  if (!req.body.name || req.body.name === "") {
    return next(new Error("Invalid arguments"));
  } else {
    fullPath = "" + req.body.path + "/" + req.body.name;
    return File.byFullPath({
      key: fullPath
    }, (function(_this) {
      return function(err, sameFiles) {
        var createFile, data, file, fileClass, now;
        if (sameFiles.length > 0) {
          return res.send({
            error: true,
            msg: "This file already exists"
          }, 400);
        } else {
          file = req.files["file"];
          now = moment().toISOString();
          fileClass = getFileClass(file);
          data = {
            name: req.body.name,
            path: req.body.path,
            creationDate: now,
            lastModification: now,
            mime: file.type,
            size: file.size,
            tags: [],
            "class": fileClass
          };
          createFile = function() {
            return File.createNewFile(data, file, (function(_this) {
              return function(err, newfile) {
                var who;
                who = req.guestEmail || 'owner';
                return sharing.notifyChanges(who, newfile, function(err) {
                  if (err) {
                    console.log(err);
                  }
                  return res.send(newfile, 200);
                });
              };
            })(this));
          };
          return Folder.byFullPath({
            key: data.path
          }, function(err, parents) {
            var parent;
            if (parents.length > 0) {
              parent = parents[0];
              data.tags = parent.tags;
              parent.lastModification = now;
              return parent.save(function(err) {
                if (err) {
                  return next(err);
                } else {
                  return createFile();
                }
              });
            } else {
              return createFile();
            }
          });
        }
      };
    })(this));
  }
};

module.exports.modify = function(req, res, next) {
  var body, file, fullPath, isPublic, newName, newPath, previousName, tags, _ref, _ref1;
  log.info("File modification of " + req.file.name + "...");
  file = req.file;
  body = req.body;
  if (body.tags && (Array.isArray(body.tags)) && ((_ref = file.tags) != null ? _ref.toString() : void 0) !== ((_ref1 = body.tags) != null ? _ref1.toString() : void 0)) {
    tags = body.tags;
    tags = tags.filter(function(tag) {
      return typeof tag === 'string';
    });
    return file.updateAttributes({
      tags: tags
    }, (function(_this) {
      return function(err) {
        if (err) {
          return next(new Error("Cannot change tags: " + err));
        } else {
          log.info("Tags changed for " + file.name + ": " + tags);
          return res.send({
            success: 'Tags successfully changed'
          }, 200);
        }
      };
    })(this));
  } else if (!body.name || body.name === "") {
    log.info("No arguments, no modification performed for " + req.file.name);
    return next(new Error("Invalid arguments, name should be specified."));
  } else {
    previousName = file.name;
    newName = body.name;
    isPublic = body["public"];
    newPath = "" + file.path + "/" + newName;
    fullPath = "" + req.body.path + "/" + req.body.name;
    return File.byFullPath({
      key: fullPath
    }, (function(_this) {
      return function(err, sameFiles) {
        var data, modificationSuccess;
        if (err) {
          return next(err);
        }
        modificationSuccess = function(err) {
          if (err) {
            log.raw(err);
          }
          log.info(("File name changed from " + previousName + " ") + ("to " + newName));
          return res.send({
            success: 'File successfully modified'
          });
        };
        if (sameFiles.length > 0) {
          log.info("No modification: Name " + newName + " already exists.");
          return res.send({
            error: true,
            msg: "The name is already in use."
          }, 400);
        } else {
          data = {
            name: newName,
            "public": isPublic,
            lastModification: moment().toISOString()
          };
          if (body.clearance) {
            data.clearance = body.clearance;
          }
          return file.updateAttributes(data, function(err) {
            if (err) {
              return next(new Error('Cannot modify file'));
            } else {
              return updateParentModifDate(file, function(err) {
                if (err) {
                  log.raw(err);
                }
                return file.index(["name"], modificationSuccess);
              });
            }
          });
        }
      };
    })(this));
  }
};

module.exports.destroy = function(req, res, next) {
  var file;
  file = req.file;
  return file.removeBinary("file", (function(_this) {
    return function(err, resp, body) {
      if (err) {
        log.error("Cannot Remove binary for " + file.id);
        return next(err);
      } else {
        return file.destroy(function(err) {
          if (err) {
            log.error("Cannot destroy document " + file.id);
            return next(err);
          } else {
            return updateParentModifDate(file, function(err) {
              if (err) {
                log.raw(err);
              }
              return res.send({
                success: 'File successfully deleted'
              });
            });
          }
        });
      }
    };
  })(this));
};

module.exports.getAttachment = function(req, res, next) {
  return processAttachement(req, res, next, false);
};

module.exports.downloadAttachment = function(req, res, next) {
  return processAttachement(req, res, next, true);
};

module.exports.publicDownloadAttachment = function(req, res, next) {
  return sharing.checkClearance(req.file, req, function(authorized) {
    if (!authorized) {
      return res.send(404);
    } else {
      return processAttachement(req, res, true);
    }
  });
};

module.exports.publicCreate = function(req, res, next) {
  var file;
  file = new File(req.body);
  return sharing.checkClearance(file, req, 'w', function(authorized, rule) {
    if (!rule) {
      return res.send(401);
    } else {
      req.guestEmail = rule.email;
      req.guestId = rule.contactid;
      return module.exports.create(req, res, next);
    }
  });
};

module.exports.search = function(req, res, next) {
  var parts, query, sendResults, tag;
  sendResults = function(err, files) {
    if (err) {
      return next(err);
    } else {
      return res.send(files);
    }
  };
  query = req.body.id;
  query = query.trim();
  if (query.indexOf('tag:') !== -1) {
    parts = query.split();
    parts = parts.filter(function(tag) {
      return tag.indexOf('tag:' !== -1);
    });
    tag = parts[0].split('tag:')[1];
    return File.request('byTag', {
      key: tag
    }, sendResults);
  } else {
    return File.search("*" + query + "*", sendResults);
  }
};

module.exports.updateIndex = function(req, res, next) {
  var file;
  file = req.file;
  return file.index(['name'], function(err) {
    if (err) {
      return next(err);
    } else {
      return res.send(200);
    }
  });
};
