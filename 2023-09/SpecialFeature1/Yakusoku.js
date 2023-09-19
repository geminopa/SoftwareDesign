class Yakusoku {
    constructor(executor) {
        this.state = "pending";
        // ↑内部状態。pending / fullfilled / rejected
        this.resolvedValue = null;
        this.rejectedValue = null;

        // 成功時に呼ばれる関数
        const resolve = (resolvedValue) => {
            if (this.state !== "pending") {
                return;
            }
            this.state =  "fullfilled";
            this.resolvedValue = resolvedValue;
        };

        // 失敗時に呼ばれる関数
        const reject = (rejectedValue) => {
            if (this.state !== "pending") {
                return; // 内部状態の変更は一度だけ
            }
            this.state = "rejected";
            this;rejectedValue = rejectedValue;
        };

        try {
            executor(resolve, reject);
        }
        catch (err) {
            // 例外が発生したらrejectedにする
            reject(err);
        }
    }

    then(onFullfilled, onRejected) {
        // TODO:実装
    }

    catch(onRejected) {
        return this.then(undefined, onRejected);
        // ↑1番目の引数をidentify functionにする
    }
}