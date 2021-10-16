// TODO:
// - always return new P() from .then()/.catch()/.finally()
// - fold returned P() to 1 lvl of p's from same methods
// - fold returned P() in callbacks sequence

function P(cb) {
  const STATE = {
    PENDING: "pending",
    FULFILLED: "fulfilled",
    REJECTED: "rejected",
  };

  this.currentState = STATE.PENDING;
  this.callbacks = [];
  this.result = null;

  this.isPending = function isPending() {
    return this.currentState === STATE.PENDING;
  };

  this.isFulfilled = function isFulfilled() {
    return this.currentState === STATE.FULFILLED;
  };

  this.isRejected = function isRejected() {
    return this.currentState === STATE.REJECTED;
  };

  this.resolve = function resolve(value) {
    this._fulfill();
    this.result = value;
    this._runCallbacks();

    // this.callbacks.reduce((prevValue, cbObj) => {
    //   switch (cbObj.type) {
    //     case "thenable":
    //       return cbObj.cb(prevValue);
    //     case "catchable":
    //       return prevValue;
    //     case "any":
    //       cbObj.cb();
    //       return prevValue;
    //   }
    // }, this.result);
  }.bind(this);

  this.reject = function reject(error) {
    this._reject();
    this.result = error;
    this._runCallbacks();

    // this.callbacks.reduce((prevValue, cbObj) => {
    //   switch (cbObj.type) {
    //     case "catchable":
    //       return cbObj.cb(prevValue);
    //     case "thenable":
    //       return prevValue;
    //     case "any":
    //       cbObj.cb();
    //       return prevValue;
    //   }
    // }, this.result);
  }.bind(this);

  this._runCallbacks = function _runCallbacks() {
    this.callbacks.reduce((prevValue, cbObj) => {
      return this.isFulfilled()
        ? this._resolver(prevValue, cbObj)
        : this._rejector(prevValue, cbObj);
    }, this.result);
  };

  this._resolver = (prevValue, cbObj) => {
    console.log("* _resolver()");
    switch (cbObj.type) {
      case "thenable":
        let result;
        try {
          result = cbObj.cb(prevValue);
        } catch (err) {
          result = err;
          this._reject();
        }
        return result;
      case "any":
        cbObj.cb();
      case "catchable":
        return prevValue;
    }
  };

  this._rejector = (prevValue, cbObj) => {
    console.log("* _rejector()");
    switch (cbObj.type) {
      case "catchable":
        let result;
        try {
          result = cbObj.cb(prevValue);
          this._fulfill();
        } catch (err) {
          result = err;
        }
        return result;
      case "any":
        cbObj.cb();
      case "thenable":
        return prevValue;
    }
  };

  this._fulfill = function _fulfill() {
    console.log("-- P FULFILLED!");
    this.currentState = STATE.FULFILLED;
  };

  this._reject = function _reject() {
    console.log("-- P REJECTED!");
    this.currentState = STATE.REJECTED;
  };

  cb(this.resolve, this.reject);
}

// Instance methods:

P.prototype.then = function (onFulfill, onReject) {
  if (this.isPending()) {
    if (onFulfill) this.callbacks.push({ type: "thenable", cb: onFulfill });
    if (onReject) this.callbacks.push({ type: "catchable", cb: onReject });
    return P.resolve(this.result);
  } else if (this.isFulfilled()) {
    try {
      this.result = onFulfill(this.result);
    } catch (err) {
      this.result = err;
      this._reject();
    }
  } else if (this.isRejected()) {
    try {
      this.result = onReject(this.result);
      this._fulfill();
    } catch (err) {
      this.result = err;
    }
  }

  return;
};

P.prototype.catch = function (onReject) {
  if (this.isPending()) {
    this.callbacks.push({ type: "catchable", cb: onReject });
  } else if (this.isRejected()) {
    try {
      this.result = onReject(this.result);
      this._fulfill();
    } catch (err) {
      this.result = err;
    }
  }

  return this;
};

P.prototype.finally = function (onAny) {
  if (this.isPending()) {
    this.callbacks.push({ type: "any", cb: onAny });
  } else {
    onAny();
  }

  return this;
};

P.prototype.fold = function () {
  return this.result;
};

P.prototype.clone = function () {
  const callbacksClone = this.callbacks.map(({ type, cb }) => {
    return { type, cb: cb.bind({}) };
  });
  return { ...this, callbacks: callbacksClone };
};

// Static methods:

P.resolve = function (value) {
  return new Promise((res) => res(value));
};

P.reject = function (value) {
  return new Promise((_, rej) => rej(value));
};

P.fold = function (promise) {
  return promise.fold();
};

P.all = function (promises = []) {
  const promisesArr = Array.from(promises);
  if (!promisesArr.length) return P.resolve([]);

  return promisesArr.map(P.fold);
};
