import { _decorator, Component, Node } from 'cc';
import AVirtualScrollView from './core/AVirtualScrollView';
const { ccclass, property } = _decorator;

@ccclass('HelloWorld')
export class HelloWorld extends Component {
    @property({type:AVirtualScrollView})
    public test1:AVirtualScrollView = null;
    @property({type:AVirtualScrollView})
    public test2:AVirtualScrollView = null;
    @property({type:AVirtualScrollView})
    public test3:AVirtualScrollView = null;
    @property({type:AVirtualScrollView})
    public test4:AVirtualScrollView = null;
    start() {
        var dataL:string[]=[];
        for(var i = 0;i<100;i++){
            dataL.push(i+"");
        }

        this.test1.refreshData(dataL);
        this.test2.refreshData(dataL);
        this.test3.refreshData(dataL);
        this.test4.refreshData(dataL);

        // setTimeout(()=>{
        //     dataL[1] = "666";

        //     this.test1.refreshData(dataL);
        //     this.test2.refreshData(dataL);
        //     this.test3.refreshData(dataL);
        //     this.test4.refreshData(dataL);
        // },3000);
    }
}

