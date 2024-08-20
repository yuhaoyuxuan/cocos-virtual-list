import { _decorator, Component, Node } from 'cc';
import AVirtualScrollView from './core/AVirtualScrollView';
const { ccclass, property } = _decorator;

@ccclass('HelloWorld')
export class HelloWorld extends Component {
    @property({ type: [AVirtualScrollView] })
    public lists: AVirtualScrollView[] = [];
    private idx: number = 0;
    private dataL: string[] = [];
    start() {
        let datas: string[] = []
        for (var i = 0; i < 100; i++) {
            datas.push(i + "");
        }

        this.lists.forEach(list => {
            list?.refreshData(datas);
        })
    }

    onAddItem(): void {
        this.idx++;
        this.dataL.push(this.idx + "");
        this.lists.forEach(list => {
            list?.refreshData(this.dataL);
        })
    }
}

