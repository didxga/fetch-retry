(function(global) {
    
    function Entry(times, response) {
        this.times = times;
        this.response = response;
        this.promiseResolve = null;
        this.promiseReject = null;
        var that = this;
        this.promise = new Promise(function(resolve, reject) {
            that.promiseResolve = (resp) => resolve(resp);
            that.promiseReject = (resp) => reject(resp);
        });
    }

    var retry_list = {};
    var initialized = false;
    var timerHandle;

    function retry(delay, times, response) {
        var l = retry_list[new String(delay+1)];
        if(!l) {
            l = [];
            retry_list[new String(delay+1)] = l;
        } 
        var entry = new Entry(times, response)
        l.push(entry);
        if(!initialized) {
            initialized = true;
            startTimer();
        }
        return entry.promise;
    }

    function startTimer() {
        timerHandle = setInterval(function() {
            processEntry();
        }, 1000);
    }

    function processEntry() {
        var entries = retry_list["1"];
        if(entries) {
            entries.forEach(elem => {
                console.log("retry " + elem.response.url)
                fetch(elem.response.url).then(function(response) {
                    if(response.status === 200) {
                        elem.promiseResolve(response);
                        var index = entries.indexOf(elem);
                        entries.splice(index, 1);
                    } else {
                        elem.times--;
                        if(elem.times === 0) {
                            var index = entries.indexOf(elem);
                            entries.splice(index, 1);
                            elem.promiseReject(response);
                        }
                    }
                });
            });
        }
        var c = retry_list["2"];
        var a = 2;
        while(c && c.length > 0) {
            if(retry_list[new String(a-1)] && a===2) {
                retry_list[new String(a-1)].forEach(elem => {
                    if(elem.times === 0) {
                        var index = entries.indexOf(elem);
                        entries.splice(index, 1);
                    }
                });
                retry_list[new String(a-1)] = retry_list[new String(a-1)].concat(c);
            } else {
                retry_list[new String(a-1)] = c;
            }
            c = retry_list[new String(++a)];
        }
        if(a>2) {
            delete retry_list[new String(a-1)];
        }   
        if(retry_list["1"].length === 0) {
            clearInterval(timerHandle);
            initialized = false;
        }
    }

    global.fetchRetry = retry;

})(window);