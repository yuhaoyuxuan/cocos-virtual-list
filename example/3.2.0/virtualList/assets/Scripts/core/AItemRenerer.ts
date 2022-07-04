import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;
/**
 * 单项渲染基类 T数据结构
 * @author slf
 *  */
 @ccclass('AItemRenderer')
export default class AItemRenderer<T> extends Component {
    @property({displayName:"是否添加点击事件"})
    isClick:boolean = false;

    protected callback: Function;       //回调函数
    protected cbThis: any;              //回调作用域

    private _data: T;//数据结构
    public get data(): T {
        return this._data;
    }
    public set data(v: T) {
        this._data = v;
        this.dataChanged();
    }

    /**数据发生变化 子类重写*/
    protected dataChanged(): void { }

    /**刷新数据 */
    public refreshData(): void {
        this.dataChanged();
    }

    /**销毁 */
    public onDestroy(): void {
        this._data = null;   
    }

    /**
     * 设置点击回调
     * @param cb 回调函数
     * @param cbT 回调作用域
     */
     public setTouchCallback(cb?: Function, cbT?: any): void {
        this.callback = cb;
        this.cbThis = cbT;
        this
        if (this.node) {
            if (this.node.hasEventListener(Node.EventType.TOUCH_END)) {
                this.node.off(Node.EventType.TOUCH_END, this.onClickCallback, this);
            }
            this.node.on(Node.EventType.TOUCH_END, this.onClickCallback, this);
        }
    }

    /**
     * 预制体点击回调 会携带data
     * @param e 
     */
    protected onClickCallback(e: Event): void {
        this.callback && this.callback.call(this.cbThis, this.data);
    }
}
