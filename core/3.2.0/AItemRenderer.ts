import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;


/**
 * 单项渲染基类 T数据结构
 * @author slf
 *  */
@ccclass('ItemRenderer')
export abstract class AItemRenderer<T> extends Component {
    /**调用列表 回调函数  回调作用域*/
    protected callback: Function;
    protected cbThis: any;

    protected _data: T
    public get data(): T {
        return this._data;
    }

    public set data(value: T) {
        this._data = value;
        this.dataChanged();
    }

    public refreshData(): void {
        this.dataChanged();
    }

    /**数据发生变化子类重写 */
    protected abstract dataChanged(): void
    /**注册回调 */
    public registerCallback(cb: Function, cbT?: any): void {
        this.callback = cb;
        this.cbThis = cbT;
    }
    /**派发回调 */
    protected emitCallback() {
        this.callback && this.callback.call(this.cbThis, this._data);
    }

}

