class P {
  STATE = {
    PENDING: "pending",
    FULFILLED: "fulfilled",
    REJECTED: "rejected",
  };

  currentState = this.STATE.PENDING;
  callbacks = [];
  result = null;

  constructor(cb) {
    cb(this.resolve, this.reject);
  }

  resolve = (value) => {
    this._fulfill();
    this.result = value;

    this.callbacks.reduce(
      (prevValue, cbObj) =>
        cbObj.type !== "catchable" ? cbObj.cb(prevValue) : prevValue,
      this.result
    );
  };

  reject = (error) => {
    this._reject();
    this.result = error;

    this.callbacks.reduce(
      (prevValue, cbObj) =>
        cbObj.type !== "thenable" ? cbObj.cb(prevValue) : prevValue,
      this.result
    );
  };

  _fulfill() {
    this.currentState = this.STATE.FULFILLED;
  }

  _reject() {
    this.currentState = this.STATE.REJECTED;
  }

  isPending() {
    return this.currentState === this.STATE.PENDING;
  }

  isFulfilled() {
    return this.currentState === this.STATE.FULFILLED;
  }

  isRejected() {
    return this.currentState === this.STATE.REJECTED;
  }

  then(onFulfill, onReject) {
    if (this.isPending()) {
      if (onFulfill) this.callbacks.push({ type: "thenable", cb: onFulfill });
      if (onReject) this.callbacks.push({ type: "catchable", cb: onReject });
    } else if (this.isFulfilled()) {
      this.result = onFulfill(this.result);
    } else if (this.isRejected()) {
      try {
        this.result = onReject(this.result);
        this._fulfill();
      } catch (err) {
        this.result = err;
      }
    }

    return this;
  }

  catch(onReject) {
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
  }

  finally(onAny) {
    if (this.isPending()) {
      this.callbacks.push({ type: "any", cb: onAny });
    } else {
      onAny();
    }

    return this;
  }

  fold() {
    return this.result;
  }

  static resolve(value) {
    return new Promise((res) => res(value));
  }

  static reject(value) {
    return new Promise((_, rej) => rej(value));
  }

  static fold(promise) {
    return promise.fold();
  }

  static all(promises = []) {
    const promisesArr = Array.from(promises);
    if (!promisesArr.length) return P.resolve([]);

    return promisesArr.map(P.fold);
  }
}

// Instance methods:

// P.prototype.then = function (onFulfill, onReject) {
//   if (this.isPending()) {
//     if (onFulfill) this.callbacks.push({ type: "thenable", cb: onFulfill });
//     if (onReject) this.callbacks.push({ type: "catchable", cb: onReject });
//   } else if (this.isFulfilled()) {
//     this.result = onFulfill(this.result);
//   } else if (this.isRejected()) {
//     try {
//       this.result = onReject(this.result);
//       this._fulfill();
//     } catch (err) {
//       this.result = err;
//     }
//   }

//   return this;
// };

// P.prototype.catch = function (onReject) {
//   if (this.isPending()) {
//     this.callbacks.push({ type: "catchable", cb: onReject });
//   } else if (this.isRejected()) {
//     try {
//       this.result = onReject(this.result);
//       this._fulfill();
//     } catch (err) {
//       this.result = err;
//     }
//   }

//   return this;
// };

// P.prototype.finally = function (onAny) {
//   if (this.isPending()) {
//     this.callbacks.push({ type: "any", cb: onAny });
//   } else {
//     onAny();
//   }

//   return this;
// };

// P.prototype.fold = function () {
//   return this.result;
// };

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
