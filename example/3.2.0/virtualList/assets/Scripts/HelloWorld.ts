import { _decorator, Component, Node } from 'cc';
import AVirtualScrollView from './core/AVirtualScrollView';
const { ccclass, property } = _decorator;

@ccclass('HelloWorld')
export class HelloWorld extends Component {
    @property({ type: [AVirtualScrollView] })
    public lists: AVirtualScrollView[] = [];
    start() {
        var dataL: string[] = [];
        for (var i = 0; i < 100; i++) {
            dataL.push(i + "");
        }
        this.lists.forEach(list => {
            list.refreshData(dataL);
        })
    }
}

