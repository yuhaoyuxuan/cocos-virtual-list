import AItemRenderer from "./AItemRenerer";

const { ccclass, property } = cc._decorator;

/**
 * 虚拟滚动视图 扩展cc.ScrollView
 * 渲染预制体必需挂载 AItemRenderer子类
 * @author slf
 */
@ccclass
export default class AVirtualScrollView extends cc.ScrollView {
    /**渲染预制体必需挂载 AItemRenderer子类 */
    @property({ type: cc.Prefab, serializable: true, displayName: "渲染预制体" })
    itemRenderer: cc.Prefab = null;
    @property({ displayName: "启动虚拟列表" })
    virtualList: boolean = true;
    /**开启滑动到底部 发送回调 */
    @property({ tooltip: "无限滑动，到底后发送回调事件", visible() { return this.virtualList } })
    infiniteScroll = false;
    @property({ tooltip: "子项自适应大小", visible() { return this.virtualList } })
    autoChildrenSize = false;

    private infiniteScrollCb: Function;
    private infiniteScrollThis: any;

    /**子项点击 回调函数  回调作用域*/
    protected callback: Function;
    protected cbThis: any;

    /**最大渲染预制体 垂直数量 */
    private verticalCount: number;
    /**最大渲染预制体 水平数量 */
    private horizontalCount: number;
    /**预制体宽高 */
    private itemW: number;
    private itemH: number;
    /**定时器 */
    private interval: number;
    /**预制体池 */
    private itemPool: any[];
    /**预制体列表 */
    private itemList: cc.Node[];
    /**预制体渲染类列表 */
    private itemRendererList: any[];
    /**数据列表 */
    private dataList: any[];
    /**方向布局 */
    private direction: cc.Vec2 = new cc.Vec2();
    /**方向间隙 */
    private padding: cc.Vec2 = new cc.Vec2();
    /**开始坐标 */
    private startPos: cc.Vec2 = new cc.Vec2();
    /**布局*/
    private contentLayout: cc.Layout;
    /**是否移动到底部  无限滚动回调*/
    private moveBottom: boolean;

    private _uiTransform: cc.Node;

    private isInit: boolean;

    /**强制刷新 */
    private forcedRefresh: boolean;
    /**刷新 */
    private refresh: boolean;

    /**节点锚点 */
    private anchorPoint: cc.Vec2;
    /**位置对应节点大小 */
    private posToSize: { [key: number]: cc.Size } = {};

    protected onLoad(): void {
        this.isInit = true;
        this.itemList = [];
        this.itemPool = [];
        this.itemRendererList = [];

        if (this.virtualList) {
            this.contentLayout = this.content.getComponent(cc.Layout);
            this.contentLayout.enabled = false;
            this._uiTransform = this.node;
            this.resetSize();
            this.node.on(cc.Node.EventType.SIZE_CHANGED, this.onSelfSizeChange, this);

            if (this.autoChildrenSize && this.contentLayout.type == cc.Layout.Type.GRID) {
                this.autoChildrenSize = false;
                console.error("子项自适应大小 暂不支持网格布局");
            }

            // //起始位置
            // let itemNode: cc.Node = this.itemRenderer.data;
            // this.startPos = new cc.Vec2(itemNode.width * itemNode.anchorX + this.contentLayout.paddingLeft, -(itemNode.height * itemNode.anchorY + this.contentLayout.paddingTop));
            // //预制体宽高
            // this.itemW = itemNode.width + this.contentLayout.spacingX;
            // this.itemH = itemNode.height + this.contentLayout.spacingY;
            // //垂直、水平最大预制体数量
            // this.horizontalCount = Math.ceil(this.node.width / this.itemW) + 1;
            // this.verticalCount = Math.ceil(this.node.height / this.itemH) + 1;

            // if (this.contentLayout.type == cc.Layout.Type.GRID) {
            //     if (this.contentLayout.startAxis == cc.Layout.AxisDirection.HORIZONTAL) {
            //         this.horizontalCount = Math.floor(this.node.width / this.itemW);
            //     } else {
            //         this.verticalCount = Math.floor(this.node.height / this.itemH);
            //     }
            // }
        }

        if (this.dataList) {
            this.refreshData(this.dataList);
        }
    }

    private onSelfSizeChange() {
        this.unschedule(this.delayRefresh);
        this.scheduleOnce(this.delayRefresh, 0.5);
    }

    private delayRefresh(): void {
        this.resetSize();
        if (this.dataList != null) {
            this.refreshData(this.dataList);
        }
    }

    /**重置大小 */
    public resetSize(): void {
        let widget = this.content.getComponent(cc.Widget);
        if (widget) {
            widget.updateAlignment();
        } else {
            widget = this.getComponent(cc.Widget);
            widget && widget.updateAlignment();
        }


        let nodeUITransform: cc.Node = this.itemRenderer.data;
        this.anchorPoint = nodeUITransform.getAnchorPoint().clone();
        let nodeWidth = nodeUITransform.width;
        let nodeHeight = nodeUITransform.height;

        //自适应节点大小
        if (this.autoChildrenSize) {
            nodeWidth = this.posToSize[0]?.width ?? nodeUITransform.width;
            nodeHeight = this.posToSize[0]?.height ?? nodeUITransform.height;
        }
        //方向布局
        this.direction.x = this.contentLayout.horizontalDirection == cc.Layout.HorizontalDirection.LEFT_TO_RIGHT ? 1 : -1;
        this.direction.y = this.contentLayout.verticalDirection == cc.Layout.VerticalDirection.TOP_TO_BOTTOM ? -1 : 1;

        //上下左右间隙
        this.padding.x = (this.contentLayout.horizontalDirection == cc.Layout.HorizontalDirection.LEFT_TO_RIGHT ? this.contentLayout.paddingLeft : this.contentLayout.paddingRight);
        this.padding.y = (this.contentLayout.verticalDirection == cc.Layout.VerticalDirection.TOP_TO_BOTTOM ? this.contentLayout.paddingTop : this.contentLayout.paddingBottom);

        //第一个节点大小 计算起始位置
        this.startPos.x = (nodeWidth - nodeWidth * this.anchorPoint.x + this.padding.x) * this.direction.x;
        this.startPos.y = (nodeHeight - nodeHeight * this.anchorPoint.y + this.padding.y) * this.direction.y;


        //预制体宽高  
        this.itemW = nodeUITransform.width + this.contentLayout.spacingX;
        this.itemH = nodeUITransform.height + this.contentLayout.spacingY;

        let hCount = (this._uiTransform.width + this.contentLayout.spacingX - this.contentLayout.paddingLeft) / this.itemW;
        let vCount = (this._uiTransform.height + this.contentLayout.spacingY - this.contentLayout.paddingTop) / this.itemH;

        //垂直、水平最大预制体数量  如果自适应子项大小  用默认节点大小计算最大渲染数量
        this.horizontalCount = Math.ceil(hCount) + 1;
        this.verticalCount = Math.ceil(vCount) + 1;

        if (this.contentLayout.type == cc.Layout.Type.GRID) {
            if (this.contentLayout.startAxis == cc.Layout.AxisDirection.HORIZONTAL) {
                this.horizontalCount = Math.floor(hCount);
            } else {
                this.verticalCount = Math.floor(vCount);
            }
        }
    }

    protected onDestroy(): void {
        this.dataList = null;
        this.itemList = null;
        this.itemRendererList = null;
        this.posToSize = null;
        this.itemPool.forEach(item => {
            item.destroy();
        })
        this.itemPool = null;
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.node.targetOff(this);
    }

    /**利用cc.ScrollView本身方法 来标记滑动中 */
    setContentPosition(position: cc.Vec2) {
        super.setContentPosition(position);
        this.refresh = true;
    }

    /**
    * 设置列表 子项点击回调
    * 回调会携带当前子项的 data
    * @param cb 回调
    * @param cbT 作用域
    */
    public setTouchItemCallback(cb: Function, cbT: any): void {
        this.callback = cb;
        this.cbThis = cbT;
    }

    /**选中数据 */
    private onItemTap(data: any): void {
        this.callback && this.callback.call(this.cbThis, data);
    }

    /**
 * 设置列表 无限滚动到底部后 回调
 * @param cb 回调
 * @param cbT 作用域
 */
    public setInfiniteScrollCallback(cb: () => void, cbT: any): void {
        this.infiniteScrollCb = cb;
        this.infiniteScrollThis = cbT;
    }

    /**无限滚动到底部后 回调 */
    private onInfiniteScrollCallback(): void {
        this.moveBottom = false;
        if (this.infiniteScrollCb) {
            console.log("发送回调");
            this.infiniteScrollCb.call(this.infiniteScrollThis);
        }
    }

    /**
     * 刷新数据
     * @param data 数据源 单项|队列
     */
    public refreshData(data: any | any[]): void {
        if (Array.isArray(data)) {
            this.dataList = data;
        } else {
            this.dataList = [data];
        }

        if (!this.isInit) {
            return;
        }

        if (this.interval) {
            clearInterval(this.interval);
        }
        this.addItem();

        if (this.virtualList) {
            this.refreshContentSize();
            this.forcedRefresh = true;
            this.refresh = true;
            this.interval = setInterval(this.refreshItem.bind(this), 1000 / 10);
            this.refreshItem();
        }

    }


    /**添加预制体 */
    private addItem(): void {
        let len: number = 0;
        if (this.virtualList) {
            switch (this.contentLayout.type) {
                case cc.Layout.Type.HORIZONTAL:
                    len = this.horizontalCount;
                    break;
                case cc.Layout.Type.VERTICAL:
                    len = this.verticalCount;
                    break;
                case cc.Layout.Type.GRID:
                    len = this.horizontalCount * this.verticalCount;
                    break;
            }
            len = Math.min(len, this.dataList.length);
        } else {
            len = this.dataList.length;
        }

        let itemListLen = this.itemList.length;
        if (itemListLen < len) {
            let itemRenderer: AItemRenderer<any> = null;
            for (var i = itemListLen; i < len; i++) {
                let child = this.itemPool.length > 0 ? this.itemPool.shift() : cc.instantiate(this.itemRenderer);
                this.content.addChild(child);
                this.itemList.push(child);
                itemRenderer = child.getComponent(AItemRenderer);
                this.itemRendererList.push(itemRenderer);

                if (itemRenderer.isClick) {
                    itemRenderer.setTouchCallback(this.onItemTap, this);
                }
                if (this.autoChildrenSize) {
                    child.on(cc.Node.EventType.SIZE_CHANGED, this.delayChangeRefreshMark.bind(this, child), this);
                }
            }
        } else {
            let cL: number = this.content.childrenCount;
            let item;
            while (cL > len) {
                item = this.itemList[cL - 1];
                this.content.removeChild(item);
                this.itemList.splice(cL - 1, 1);
                this.itemRendererList.splice(cL - 1, 1);
                this.itemPool.push(item);
                cL = this.content.childrenCount;
            }
        }

        if (!this.virtualList) {
            this.dataList.forEach((v, idx) => {
                this.itemRendererList[idx].data = v;
            });
        }
    }

    /**延迟一帧标记刷新列表数据 */
    private delayChangeRefreshMark(node: cc.Node) {
        let pos = this.posToSize[node['nowDataIdx']];
        //记录数据源索引Node改变后的大小
        if (pos) {
            if (pos.width == node.width && pos.height == node.height) {
                return;
            }
            pos.width = node.width;
            pos.height = node.height;
        } else {
            pos = node.getContentSize().clone();
        }
        console.log("预刷新子项状态===" + node['nowDataIdx']);
        this.posToSize[node['nowDataIdx']] = pos;
        //延迟一帧刷新
        // this.unschedule(this.changeRefreshMark);
        // this.scheduleOnce(this.changeRefreshMark, 0);

        //立即刷新
        this.refresh = true;
        this.refreshItem();
    }

    /**标记刷新列表等定时刷新数据 */
    private changeRefreshMark(): void {
        // console.log("刷新子项状态");
        this.refresh = true;
    }

    /**根据数据数量 改变content宽高 */
    private refreshContentSize(): void {
        let layout: cc.Layout = this.contentLayout;
        let dataListLen: number = this.dataList.length;
        let value: number;
        switch (this.contentLayout.type) {
            case cc.Layout.Type.VERTICAL:
                value = layout.paddingTop + layout.paddingBottom;
                if (this.autoChildrenSize) {
                    for (let i: number = 0; i < dataListLen; i++) {
                        value += (this.posToSize[i]?.height ?? this.itemH - this.contentLayout.spacingY) + this.contentLayout.spacingY;
                    }
                } else {
                    value += dataListLen * this.itemH;
                }
                //排列方向从下到上排序的话，scrollview底层会计算content的位置，导致位置不对，content的高度最小值改为父容器的大小
                if (this.contentLayout.verticalDirection == cc.Layout.VerticalDirection.BOTTOM_TO_TOP) {
                    value = Math.max(value, this.content.parent?.height ?? 0)
                }

                this.content.height = value;
                break;
            case cc.Layout.Type.HORIZONTAL:
                value = layout.paddingLeft + layout.paddingRight;
                if (this.autoChildrenSize) {
                    for (let i: number = 0; i < dataListLen; i++) {
                        value += (this.posToSize[i]?.width ?? this.itemW - this.contentLayout.spacingX) + this.contentLayout.spacingX;
                    }
                } else {
                    value += dataListLen * this.itemW;
                }

                //排列方向从右到左排序的话，scrollview底层会计算content的位置，导致位置不对，content的宽度最小值改为父容器的大小
                if (this.contentLayout.horizontalDirection == cc.Layout.HorizontalDirection.RIGHT_TO_LEFT) {
                    value = Math.max(value, this.content.parent?.width ?? 0)
                }

                this.content.width = value;
                break;
            case cc.Layout.Type.GRID:
                if (this.contentLayout.startAxis == cc.Layout.AxisDirection.HORIZONTAL) {
                    this.content.height = layout.paddingTop + Math.ceil(dataListLen / this.horizontalCount) * this.itemH + layout.paddingBottom;
                } else if (this.contentLayout.startAxis == cc.Layout.AxisDirection.VERTICAL) {
                    this.content.width = layout.paddingLeft + Math.ceil(dataListLen / this.verticalCount) * this.itemW + layout.paddingRight;
                }
                break;
        }
    }

    /**刷新预制体位置 和 数据填充 */
    private refreshItem(): void {
        this.moveBottom && this.onInfiniteScrollCallback();
        if (!this.refresh) {
            return;
        }
        switch (this.contentLayout.type) {
            case cc.Layout.Type.HORIZONTAL:
                this.refreshHorizontal();
                break;
            case cc.Layout.Type.VERTICAL:
                this.refreshVertical();
                break;
            case cc.Layout.Type.GRID:
                this.refreshGrid();
                break;
        }
        this.refreshContentSize();
        this.refresh = false;
        this.forcedRefresh = false;
    }

    /**刷新水平 */
    private refreshHorizontal() {
        let start = this.getStart(); // Math.floor(Math.abs(this.getContentPosition().x) / this.itemW);
        // if (start < 0 || this.getContentPosition().x > 0) {                //超出边界处理
        //     start = 0;
        // }
        let end = start + this.horizontalCount;
        if (end > this.dataList.length) {//超出边界处理
            end = this.dataList.length;
            start = Math.max(end - this.horizontalCount, 0);
        }
        let tempV = 0;
        let itemListLen = this.itemList.length;
        let item:cc.Node, idx;
        for (var i = 0; i < itemListLen; i++) {
            idx = (start + i) % itemListLen;
            item = this.itemList[idx];
            tempV = this.getPos(start + i); // this.startPos.x + ((start + i) * this.itemW);
            if (item.x != tempV || this.forcedRefresh) {
                console.log("修改的数据=" + (start + i))
                item.x = tempV;
                this.itemRendererList[idx].node.nowDataIdx = start + i;
                this.itemRendererList[idx].data = this.dataList[start + i];

                //记录位置和node大小
                this.posToSize[start + i] = item.getContentSize().clone();

                if (this.infiniteScroll && start > 0 && start + i == this.dataList.length - 1) {
                    this.moveBottom = true;
                }
            }
        }
    }

    /**刷新垂直 */
    private refreshVertical(): void {
        let start = this.getStart(); //Math.floor(Math.abs(this.getContentPosition().y) / this.itemH);
        // if (start < 0 || this.getContentPosition().y < 0) {
        //     start = 0;
        // }

        let end = start + this.verticalCount;
        if (end > this.dataList.length) {
            end = this.dataList.length;
            start = Math.max(end - this.verticalCount, 0);
        }

        let tempV = 0;
        let itemListLen = this.itemList.length;
        let item:cc.Node, idx;
        for (var i = 0; i < itemListLen; i++) {
            idx = (start + i) % itemListLen;
            item = this.itemList[idx];
            tempV = this.getPos(start + i); // this.startPos.y + (-(start + i) * this.itemH);
            if (item.y != tempV || this.forcedRefresh) {
                console.log("修改的数据=" + (start + i))
                item.y = tempV;
                this.itemRendererList[idx].node.nowDataIdx = start + i;
                this.itemRendererList[idx].data = this.dataList[start + i];

                //记录位置和node大小
                this.posToSize[start + i] = item.getContentSize().clone();
                if (this.infiniteScroll && start > 0 && start + i == this.dataList.length - 1) {
                    this.moveBottom = true;
                }
            }
        }
    }

    /**刷新网格 */
    private refreshGrid(): void {
        //是否垂直方向 添加网格
        let isVDirection = this.contentLayout.startAxis == cc.Layout.AxisDirection.VERTICAL;
        let start = Math.floor(Math.abs(this.getContentPosition().y) / this.itemH) * this.horizontalCount;
        if (isVDirection) {
            start = Math.floor(Math.abs(this.getContentPosition().x) / this.itemW) * this.verticalCount;
            if (this.getContentPosition().x > 0) {
                start = 0;
            }
        } else if (this.getContentPosition().y < 0) {
            start = 0;
        }

        if (start < 0) {
            start = 0;
        }

        let end = start + this.horizontalCount * this.verticalCount;
        if (end > this.dataList.length) {
            end = this.dataList.length;
            start = Math.max(end - this.horizontalCount * this.verticalCount, 0);
        }

        let tempX = 0;
        let tempY = 0;
        let itemListLen = this.itemList.length;
        let item, idx;
        for (var i = 0; i < itemListLen; i++) {
            idx = (start + i) % itemListLen;
            item = this.itemList[idx];
            if (isVDirection) {
                tempX = this.startPos.x + (Math.floor((start + i) / this.verticalCount)) * this.itemW;
                tempY = this.startPos.y + -((start + i) % this.verticalCount) * this.itemH;
            } else {
                tempX = this.startPos.x + ((start + i) % this.horizontalCount) * this.itemW;
                tempY = this.startPos.y + -(Math.floor((start + i) / this.horizontalCount)) * this.itemH;
            }

            if (item.y != tempY || item.x != tempX || this.forcedRefresh) {
                console.log("修改的数据=" + (start + i))
                item.x = tempX;
                item.y = tempY;
                this.itemRendererList[idx].data = this.dataList[start + i];
                if (this.infiniteScroll && start > 0 && start + i == this.dataList.length - 1) {
                    this.moveBottom = true;
                }
            }
        }
    }

    /**获取开始索引 */
    private getStart(): number {
        let start: number = 0;
        /**节点高度 */
        let value: number = 0;
        switch (this.contentLayout.type) {
            case cc.Layout.Type.HORIZONTAL:
                if (this.autoChildrenSize) {
                    value = Math.abs(this.content.position.x);
                    for (let item in this.posToSize) {
                        value -= (this.posToSize[item]?.width ?? (this.itemW - this.contentLayout.spacingX)) + this.contentLayout.spacingX;
                        if (value <= 0) {
                            break
                        } else {
                            start++;
                        }
                    }
                } else {
                    start = Math.floor(Math.abs(this.content.position.x) / this.itemW);
                }

                //超出边界处理
                if (this.contentLayout.horizontalDirection == cc.Layout.HorizontalDirection.LEFT_TO_RIGHT && this.content.position.x > 0 || this.contentLayout.horizontalDirection == cc.Layout.HorizontalDirection.RIGHT_TO_LEFT && this.content.position.x < 0) {
                    start = 0;
                }
                break;
            case cc.Layout.Type.VERTICAL:
                if (this.autoChildrenSize) {
                    value = Math.abs(this.content.position.y);
                    for (let item in this.posToSize) {
                        value -= (this.posToSize[item]?.height ?? (this.itemH - this.contentLayout.spacingY)) + this.contentLayout.spacingY;
                        if (value <= 0) {
                            break
                        } else {
                            start++;
                        }
                    }
                } else {
                    start = Math.floor(Math.abs(this.content.position.y) / this.itemH);
                }

                //超出边界处理
                if (this.contentLayout.verticalDirection == cc.Layout.VerticalDirection.TOP_TO_BOTTOM && this.content.position.y < 0 || this.contentLayout.verticalDirection == cc.Layout.VerticalDirection.BOTTOM_TO_TOP && this.content.position.y > 0) {
                    start = 0;
                }
                break;
            case cc.Layout.Type.GRID:
                console.error("暂不支持网格布局");
                break;
        }
        if (start < 0) {
            start = 0;
        }
        return start;
    }

    /**根据索引获取位置 */
    private getPos(idx: number): number {
        let position: number = 0;
        let h: number, w: number;
        switch (this.contentLayout.type) {
            case cc.Layout.Type.HORIZONTAL:
                if (this.autoChildrenSize) {
                    //重置开始位置
                    if (idx == 0) {
                        w = (this.posToSize[0]?.width ?? (this.itemH - this.contentLayout.spacingX));
                        this.startPos.x = w * this.anchorPoint.x * this.direction.x;
                    }
                    position += this.startPos.x + this.padding.x * this.direction.x;
                    for (let i: number = 1; i <= idx; i++) {
                        w = (this.posToSize[i - 1]?.width ?? (this.itemW - this.contentLayout.spacingX));
                        position += (w - w * this.anchorPoint.x + this.contentLayout.spacingX) * this.direction.x;
                        w = (this.posToSize[i]?.width ?? (this.itemW - this.contentLayout.spacingX))
                        position += (w * this.anchorPoint.x) * this.direction.x;
                    }
                } else {
                    position = this.startPos.x + idx * this.itemW * this.direction.x;
                }
                break;
            case cc.Layout.Type.VERTICAL:
                if (this.autoChildrenSize) {
                    //重置开始位置
                    if (idx == 0) {
                        h = (this.posToSize[0]?.height ?? (this.itemH - this.contentLayout.spacingY))
                        this.startPos.y = (h - h * this.anchorPoint.y) * this.direction.y;
                    }
                    position += this.startPos.y + this.padding.y * this.direction.y;
                    for (let i: number = 1; i <= idx; i++) {
                        h = (this.posToSize[i - 1]?.height ?? (this.itemH - this.contentLayout.spacingY)) * this.anchorPoint.y + this.contentLayout.spacingY;
                        position += h * this.direction.y;
                        h = (this.posToSize[i]?.height ?? (this.itemH - this.contentLayout.spacingY))
                        position += (h - h * this.anchorPoint.y) * this.direction.y;
                    }
                } else {
                    position = this.startPos.y + idx * this.itemH * this.direction.y;
                }
                break;
            case cc.Layout.Type.GRID:
                console.error("暂不支持网格布局");
                break;
        }
        return position;
    }

}
