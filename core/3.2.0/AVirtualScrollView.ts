import { _decorator, Component, Node, Prefab, Vec2, Layout, ScrollView, Rect, UITransform, instantiate, Vec3 } from 'cc';
import AItemRenderer from "./AItemRenerer";

const {ccclass, property} = _decorator;

/**
 * 虚拟滚动视图 扩展ScrollView
 * 渲染预制体必需挂载 AItemRenderer子类
 * @author slf
 */
@ccclass
export default class AVirtualScrollView extends ScrollView {
    /**渲染预制体必需挂载 AItemRenderer子类 */
    @property({ type: Prefab, serializable: true, displayName: "渲染预制体" })
    itemRenderer:  Prefab = null;

    /**子项点击 回调函数  回调作用域*/
    protected callback: Function;       
    protected cbThis: any;              

    /**最大渲染预制体 垂直数量 */
    private verticalCount:number;
    /**最大渲染预制体 水平数量 */
    private horizontalCount:number;
    /**预制体宽高 */
    private itemW:number;
    private itemH:number;
    /**定时器 */
    private interval:number;
    /**预制体池 */
    private itemPool:any[];
    /**预制体列表 */
    private itemList:any[];
    /**预制体渲染类列表 */
    private itemRendererList:any[];
    /**数据列表 */
    private dataList:any[];
    /**开始坐标 */
    private startPos:Vec2;
    /**布局*/
    private contentLayout:Layout;

    /**强制刷新 */
    private forcedRefresh:boolean;
    /**刷新 */
    private refresh:boolean;
    
    private _uiTransform:UITransform;

    onLoad(){

        this.itemList = [];
        this.itemPool = [];
        this.itemRendererList = [];
        this.contentLayout = this.content.getComponent(Layout);
        this.contentLayout.enabled = false;
        this._uiTransform = this.node.getComponent(UITransform);
        
        //起始位置
        let itemNode:UITransform = this.itemRenderer.data.getComponent(UITransform);
        this.startPos = new Vec2(itemNode.width*itemNode.anchorX+this.contentLayout.paddingLeft,-(itemNode.height*itemNode.anchorY+this.contentLayout.paddingTop));
        //预制体宽高
        this.itemW = itemNode.width+this.contentLayout.spacingX;
        this.itemH = itemNode.height+this.contentLayout.spacingY;
        //垂直、水平最大预制体数量
        this.horizontalCount = Math.ceil(this._uiTransform.width/this.itemW)+1;
        this.verticalCount = Math.ceil(this._uiTransform.height/this.itemH)+1;
        
        if(this.contentLayout.type == Layout.Type.GRID){
            if(this.contentLayout.startAxis == Layout.AxisDirection.HORIZONTAL){
                this.horizontalCount = Math.floor(this._uiTransform.width/this.itemW);
            }else{
                this.verticalCount = Math.floor(this._uiTransform.height/this.itemH);
            }
        }
    }

    protected onDestroy(): void {
        this.dataList = null;
        this.itemList = null;
        this.itemRendererList = null;
        clearInterval(this.interval);
    }

    /**利用ScrollView本身方法 来标记滑动中 */
    _setContentPosition(position: Vec3){
        super['_setContentPosition'](position);
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
     * 刷新数据
     * @param data 数据源 单项|队列
     */
    public refreshData(data: any | any[]): void {
        if (Array.isArray(data)) {
            this.dataList = data;
        } else {
            this.dataList = [data];
        }

        if(this.interval){
            clearInterval(this.interval);
        }

        this.addItem();
        this.refreshContentSize();
        this.forcedRefresh = true;
        this.refresh = true;
        this.interval = setInterval(this.refreshItem.bind(this),1000/10);
    }


    /**添加预制体 */
    private addItem():void{
        let len:number = 0;
        switch(this.contentLayout.type){
            case Layout.Type.HORIZONTAL:
                len = this.horizontalCount;
            break;
            case Layout.Type.VERTICAL:
                len = this.verticalCount;
            break;
            case Layout.Type.GRID:
                len = this.horizontalCount*this.verticalCount;
            break;
        }
        len = Math.min(len,this.dataList.length);

        let itemListLen = this.itemList.length;
        if(itemListLen<len){
            let itemRenderer = null;
            for(var i = itemListLen;i<len;i++){
                let child = this.itemPool.length>0 ? this.itemPool.shift() : instantiate(this.itemRenderer);
                this.content.addChild(child);
                this.itemList.push(child);
                itemRenderer = child.getComponent(AItemRenderer);
                this.itemRendererList.push(itemRenderer);

                if(itemRenderer.isClick){
                    itemRenderer.setTouchCallback(this.onItemTap, this);
                }
            }
        }else{
            let cL:number = this.content.children.length;
            let item;
            while(cL>len){
                item = this.itemList[cL-1];
                this.content.removeChild(item);
                this.itemList.splice(cL-1,1);
                this.itemRendererList.splice(cL-1,1);
                this.itemPool.push(item);
                cL = this.content.children.length;
            }
        }
    }

    /**根据数据数量 改变content宽高 */
    private refreshContentSize():void
    {
        let layout:Layout = this.contentLayout;
        let dataListLen:number = this.dataList.length;
        switch(this.contentLayout.type){
            case Layout.Type.VERTICAL:
                this.content.getComponent(UITransform).height = layout.paddingTop + dataListLen * this.itemH + layout.paddingBottom;
            break;
            case Layout.Type.HORIZONTAL:
                this.content.getComponent(UITransform).width = layout.paddingLeft + dataListLen * this.itemW + layout.paddingRight;
            break;
            case Layout.Type.GRID:
                if(this.contentLayout.startAxis == Layout.AxisDirection.HORIZONTAL){
                    this.content.getComponent(UITransform).height = layout.paddingTop + Math.ceil(dataListLen/this.horizontalCount) * this.itemH + layout.paddingBottom;
                }else if(this.contentLayout.startAxis == Layout.AxisDirection.VERTICAL){
                    this.content.getComponent(UITransform).width = layout.paddingLeft + Math.ceil(dataListLen/this.verticalCount) * this.itemW + layout.paddingRight;
                }
            break;
        }
    }

    /**刷新预制体位置 和 数据填充 */
    private refreshItem():void
    {
        if(!this.refresh){
            return;
        }

        switch(this.contentLayout.type){
            case Layout.Type.HORIZONTAL:
                this.refreshHorizontal();
            break;
            case Layout.Type.VERTICAL:
                this.refreshVertical();
            break;
            case Layout.Type.GRID:
                this.refreshGrid();
            break;
        }


        this.refresh = false;
        this.forcedRefresh = false;
    }

    /**刷新水平 */
    private refreshHorizontal(){
        let start = Math.floor(Math.abs(this.getContentPosition().x)/this.itemW);
        if(start<0 || this.getContentPosition().x > 0){                //超出边界处理
            start = 0;   
        }
        let end = start + this.horizontalCount;
        if(end>this.dataList.length){//超出边界处理
            end = this.dataList.length;
            start = Math.max(end-this.horizontalCount,0);
        }
        let tempV = 0;
        let itemListLen = this.itemList.length;
        let item:Node,pos:Vec3,idx;
        for(var i = 0; i < itemListLen; i++){
            idx = (start + i) % itemListLen;
            item = this.itemList[idx];
            pos = item.getPosition();
            tempV = this.startPos.x + ((start + i) * this.itemW);
            if(pos.x != tempV || this.forcedRefresh){
                console.log("修改的数据="+(start+i))
                pos.x = tempV;
                item.position = pos;
                this.itemRendererList[idx].data = this.dataList[start+i];
            }
        }
    }

    /**刷新垂直 */
    private refreshVertical():void
    {
        let start  = Math.floor(Math.abs(this.getContentPosition().y)/this.itemH);
        if(start<0 || this.getContentPosition().y < 0){
            start = 0;   
        }

        let end = start+this.verticalCount;
        if(end>this.dataList.length){
            end = this.dataList.length;
            start = Math.max(end-this.verticalCount,0);
        }
        
        let tempV = 0;
        let itemListLen = this.itemList.length;
        let item:Node,pos:Vec3,idx;
        for(var i = 0;i<itemListLen;i++){
            idx = (start+i)%itemListLen;
            item = this.itemList[idx];
            pos = item.getPosition();
            tempV = this.startPos.y+(-(start+i)*this.itemH);
            if(pos.y != tempV || this.forcedRefresh){
                console.log("修改的数据="+(start+i))
                pos.y = tempV;
                item.position = pos;
                this.itemRendererList[idx].data = this.dataList[start+i];
            }
        }
    }

    /**刷新网格 */
    private refreshGrid():void
    {   
        //是否垂直方向 添加网格
        let isVDirection = this.contentLayout.startAxis == Layout.AxisDirection.VERTICAL;
        let start = Math.floor(Math.abs(this.getContentPosition().y)/this.itemH) * this.horizontalCount;
        if(isVDirection){
            start = Math.floor(Math.abs(this.getContentPosition().x)/this.itemW) * this.verticalCount;
            if(this.getContentPosition().x > 0){
                start = 0;
            }
        }else if(this.getContentPosition().y < 0){
            start = 0;
        }

        if(start<0){
            start = 0;   
        }
        
        let end = start + this.horizontalCount*this.verticalCount;
        if(end>this.dataList.length){
            end = this.dataList.length;
            start = Math.max(end-this.horizontalCount*this.verticalCount,0);
        }
        
        let tempX = 0;
        let tempY = 0;
        let itemListLen = this.itemList.length;
        let item:Node,pos:Vec3,idx;
        for(var i = 0;i<itemListLen;i++){
            idx = (start+i)%itemListLen;
            item = this.itemList[idx];
            pos = item.getPosition();
            if(isVDirection){
                tempX = this.startPos.x + (Math.floor((start+i)/this.verticalCount)) * this.itemW;
                tempY = this.startPos.y+ -((start+i)%this.verticalCount) * this.itemH;
            }else{
                tempX = this.startPos.x + ((start+i)%this.horizontalCount) * this.itemW;
                tempY = this.startPos.y+ -(Math.floor((start+i)/this.horizontalCount)) * this.itemH;
            }
            
            if(pos.y != tempY || pos.x != tempX || this.forcedRefresh){
                console.log("修改的数据="+(start+i))
                pos.x = tempX;
                pos.y = tempY;
                item.position = pos;
                this.itemRendererList[idx].data = this.dataList[start+i];
            }
        }
    }
}
