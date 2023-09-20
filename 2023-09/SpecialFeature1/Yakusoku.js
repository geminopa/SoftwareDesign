class Yakusoku {
    constructor(executor) {
        this.state = "pending";
        // ↑内部状態。pending / fulfilled / rejected
        this.resolvedValue = null;
        this.rejectedValue = null;
        this.thenFunctions = []; // ①then()に渡された関数を保持

        // 成功時に呼ばれる関数
        const resolve = (resolvedValue) => {
            if (this.state !== "pending") {
                return;
            }
            this.state =  "fulfilled";
            this.resolvedValue = resolvedValue;

            // ②then()に渡された関数をすべて実行
            for (const thenFunction of this.thenFunctions) {
                // ⑤実行結果に対してresolve(), reject()を呼び出す
                try {
                    const ret = thenFunction.onFulfilled(resolvedValue);
                    if (isThenable(ret)) {
                        // 戻り値がthenableならthen()に渡す
                        ret.then(thenFunction.resolve, thenFunction.reject);
                    }
                    else {
                        // Yakusokuオブジェクトでなければfulfilled
                        thenFunction.resolve(ret);
                    }
                }
                catch (err) {
                    // 例外が発生したらrejected
                    thenFunction.reject(err);
                }
            }
        };

        // 失敗時に呼ばれる関数
        const reject = (rejectedValue) => {
            if (this.state !== "pending") {
                return; // 内部状態の変更は一度だけ
            }
            this.state = "rejected";
            this.rejectedValue = rejectedValue;

            // ③then()に渡された関数をすべて実行
            for (const thenFunction of this.thenFunctions) {
                // ⑥実行結果に対してresolve(), reject()を呼び出す
                try {
                    const ret = thenFunction.onRejected(rejectedValue);
                    if (isThenable(ret)) {
                        // 戻り値がYakusokuオブジェクトならthen()に渡す
                        ret.then(thenFunction.resolve, thenFunction.reject);
                    }
                    else {
                        // Yakusokuオブジェクトでなければfulfilled
                        thenFunction.resolve(ret);
                    }
                }
                catch (err) {
                    // 例外が発生したらrejected
                    thenFunction.reject(err);
                }
            }
        };

        try {
            executor(resolve, reject);
        }
        catch (err) {
            // 例外が発生したらrejectedにする
            reject(err);
        }
    }

    then(onFulfilled, onRejected) {
        if (typeof onFulfilled !== "function") {
            onFulfilled = (value) => {
                // identity function
                return value;
            };
        }
        if (typeof onRejected !== "function") {
            onRejected = (value) => {
                // thrower function
                throw value;    // 入力値を例外として送出
            };
        }

        if (this.state === "pending") {
            // ⑦then()からYakusokuオブジェクトを返すため、新しいYakusokuオブジェクトを作ってresolve,rejectもあとで呼び出すために記録
            return new Yakusoku((resolve, reject) => {
                this.thenFunctions.push({ onFulfilled, onRejected, resolve, reject });
            });
        }

        try {
            if (this.state === "fulfilled") {
                // ⑨then()からYakusokuオブジェクトを返すため、onFulfilled()の結果をYakusokuオブジェクトでラップ
                return wrapWithYakusoku(onFulfilled(this.resolvedValue));
            }
            if (this.state === "rejected") {
                // ⑩then()からYakusokuオブジェクトを返すため、onRejected()の結果をYakusokuオブジェクトでラップ
                return wrapWithYakusoku(onRejected(this.rejectedValue));
            }
        }
        catch (err) {
            // ⑧onFUlfilled(), onRejected()内で送出された例外を捕捉し、「失敗するYakusokuオブジェクト」として返す
            return new Yakusoku((resolve, reject) => {
                reject(err);
            })
        }
    }

    catch(onRejected) {
        return this.then(undefined, onRejected);
        // ↑1番目の引数をidentify functionにする
    }
}

const fs = require("fs");
function readFileYakusoku(path) {
    return new Yakusoku((resolve, reject) => {  // Yakusokuのコンストラクタに関数を指定
        fs.readFile(path, (err, data) => {  // 関数内で非同期処理関数を実行
            if (err === null) {
                resolve(data);  // 成功したら結果をresolve()に渡す
            } else {
                reject(err);    // 失敗したらエラーをreject()に渡す
            }
        })
    });
}

readFileYakusoku("./sample.txt")  // 実行
    .then((data) => {   // 正常終了したらこちら
        console.log(data);
    }, (err) => {   // エラーが発生したらこちら
        console.log(err);
    });

function isThenable(value) {
    if (value === null || value === undefined) {
        return false;
    }
    return typeof value.then === "function";
}

function wrapWithYakusoku(value) {
    if (isThenable(value)) {
        return value;
    }
    return new Yakusoku((resolve) => {
        resolve(value);
    });
}