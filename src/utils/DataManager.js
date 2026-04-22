class Data {
    data;
    callback;

    constructor(data, callback) {
        this.data = data;
        this.callback = callback;
    }

    set data(value) {
        this.data = value;
    }
}

export default class DataManager {
    data;
    callbacks = [];

    constructor(data) {
        this.data = data;
    }

    bind(callback) {
        this.callbacks.push(callback);
        callback?.(this.data);
    }

    filter() {

    }
}
