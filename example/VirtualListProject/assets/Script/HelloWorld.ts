// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import AVirtualScrollView from "./core/AVirtualScrollView";

const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

    @property(AVirtualScrollView)
    test1: AVirtualScrollView = null;
    @property(AVirtualScrollView)
    test2: AVirtualScrollView = null;
    @property(AVirtualScrollView)
    test3: AVirtualScrollView = null;
    @property(AVirtualScrollView)
    test4: AVirtualScrollView = null;

    start () {
        cc.debug.setDisplayStats(true);
        var dataL:string[]=[];
        for(var i = 0;i<100;i++){
            dataL.push(i+"");
        }

        this.test1.refreshData(dataL);
        this.test2.refreshData(dataL);
        this.test3.refreshData(dataL);
        this.test4.refreshData(dataL);
    }
}
