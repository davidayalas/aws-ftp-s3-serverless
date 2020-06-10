const utilities = {};

utilities.install = function (Vue) {

  Vue.prototype.$trimSlash = (path) => {
     return path ? path.replace(/^\/+|\/+$/g, '') : path;
  }

  Vue.prototype.$cleanDoubleSlash = (path) => {
    return path ? path.replace(/\/\//g, '/') : path;
  }

  const _generateFormData = (formData, file, path) => {
    let fd = new FormData();
    let filename = "";
    for(var k in formData){
      if(["endpoint"].indexOf(k)===-1){
        if(k==="key"){
            filename = formData[k].replace("${filename}",path+"${filename}");
            fd.append(k, filename);
        }else{
            fd.append(k, formData[k]);
        }
      }
    }
    fd.append('file', file);
    return fd;
  }

  Vue.prototype.$generateFormData = _generateFormData;

  Vue.prototype.$getRequest = async(url) => {
    const response = await fetch(url, {
        method: 'GET', 
        mode: 'cors', 
        credentials: 'omit',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': window.localStorage.getItem("token")
        },
        redirect: 'follow',
    });
    return await response.json(); // parses JSON response into native JavaScript objects
  }

  const _postRequest = async(url, data, auth=false) => {
    const response = await fetch(url, {
        method: 'POST', 
        mode: 'cors', 
        credentials: 'omit',
        headers: {
        //'Content-Type': 'application/json',
        ...auth && {'Authorization': window.localStorage.getItem("token")}
        },
        redirect: 'follow',
        body: data,
    });
    return response;
  }


  Vue.prototype.$postRequest = _postRequest;

  Vue.prototype.$downloadFile = async(url, name) => {
    const response = await fetch(url, {method: 'GET'});
    const blob = await response.blob();
    var href = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a); 
    a.click();  
    setTimeout(() => { window.URL.revokeObjectURL(href); }, 60000); 
    a.remove();
  }

  Vue.prototype.$traverseFileTree = async (item) => {
    return await getAllFileEntries(item);
  }

  async function getFile(entry){
    return new Promise((resolve) => {
      entry.file(function(file) {
        resolve({binary : file, name : entry.name, path : entry.fullPath})
      });
    });
  }

  /*
    From stack overflow, great response to use readers in async/await mode 
    https://stackoverflow.com/questions/3590058/does-html5-allow-drag-drop-upload-of-folders-or-a-folder-tree/53058574#53058574
  */

  // Drop handler function to get all files
  async function getAllFileEntries(dataTransferItemList) {
    let fileEntries = [];
    // Use BFS to traverse entire directory/file structure
    let queue = [];
    // Unfortunately dataTransferItemList is not iterable i.e. no forEach
    for (let i = 0; i < dataTransferItemList.length; i++) {
      queue.push(dataTransferItemList[i].webkitGetAsEntry());
    }
    while (queue.length > 0) {
      let entry = queue.shift();
      if (entry.isFile) {
        const file = await getFile(entry);
        fileEntries.push(file);
      } else if (entry.isDirectory) {
        queue.push(...await readAllDirectoryEntries(entry.createReader()));
      }
    }
    return fileEntries;
  }

  // Get all the entries (files or sub-directories) in a directory 
  // by calling readEntries until it returns empty array
  async function readAllDirectoryEntries(directoryReader) {
    let entries = [];
    let readEntries = await readEntriesPromise(directoryReader);
    while (readEntries.length > 0) {
      entries.push(...readEntries);
      readEntries = await readEntriesPromise(directoryReader);
    }
    return entries;
  }

  // Wrap readEntries in a promise to make working with readEntries easier
  // readEntries will return only some of the entries in a directory
  // e.g. Chrome returns at most 100 entries at a time
  async function readEntriesPromise(directoryReader) {
    try {
      return await new Promise((resolve, reject) => {
        directoryReader.readEntries(resolve, reject);
      });
    } catch (err) {
      console.log(err);
    }
  }

}

export default utilities;
